'use strict';

// CA17 : un arrêt brutal (SIGKILL) pendant des écritures ne perd aucune donnée acquittée.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { startServer, stopServer, waitExit, makeDataDir, BASE_URL, FIXTURES_DIR } = require('../helpers/server');

const espagnole = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'bibli', 'fx_espagnole.json'), 'utf8'));

async function hammer(child, count, killAt, makeRequest) {
  const acked = [];
  for (let i = 0; i < count; i++) {
    try {
      const res = await makeRequest(i);
      if (res.status === 200) {
        acked.push(i);
        if (acked.length === killAt) child.kill('SIGKILL');
      }
    } catch (e) {
      break; // serveur tué
    }
  }
  return acked;
}

test('exercices : SIGKILL au 120e accusé, aucune version acquittée perdue', async () => {
  const dataDir = makeDataDir();
  let child = await startServer({ dataDir });
  const acked = await hammer(child, 300, 120, i => fetch(`${BASE_URL}/api/exercises`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...espagnole, notes: 'n' + i }),
  }));
  await waitExit(child);
  assert.ok(acked.length >= 120);

  child = await startServer({ dataDir });
  await stopServer(child);

  const db = new DatabaseSync(path.join(dataDir, 'haweb.db'), { readOnly: true });
  try {
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    const notes = new Set();
    for (const r of db.prepare("SELECT data FROM exercise_versions").all()) {
      const d = JSON.parse(r.data); // chaque data passe JSON.parse
      if (d.id === 'fx_espagnole') notes.add(d.notes);
    }
    for (const i of acked) assert.ok(notes.has('n' + i), `version acquittée n${i} présente`);
    const orphans = db.prepare(`SELECT count(*) AS n FROM exercises e
      WHERE e.current_version_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM exercise_versions v WHERE v.version_id = e.current_version_id)`).get();
    assert.equal(Number(orphans.n), 0);
  } finally {
    db.close();
  }
  const planningDir = path.join(dataDir, 'planning');
  assert.deepEqual(fs.readdirSync(planningDir).filter(f => /\.tmp-/.test(f)), []);
});

test('planning : SIGKILL pendant les écritures, chaque fichier reste un JSON valide', async () => {
  const dataDir = makeDataDir();
  let child = await startServer({ dataDir });
  const acked = await hammer(child, 100, 40, i => fetch(`${BASE_URL}/api/planning`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: `ev_${i % 10}`, type: 'match', date: '2026-09-20', adversaire: 'Club ' + i, heure: '', lieu: 'domicile' }),
  }));
  await waitExit(child);
  assert.ok(acked.length >= 40);

  child = await startServer({ dataDir });
  await stopServer(child);

  const planningDir = path.join(dataDir, 'planning');
  const files = fs.readdirSync(planningDir);
  assert.deepEqual(files.filter(f => /\.tmp-/.test(f)), [], 'aucun fichier temporaire restant');
  for (const f of files.filter(f => f.endsWith('.json'))) {
    assert.doesNotThrow(() => JSON.parse(fs.readFileSync(path.join(planningDir, f), 'utf8')), f);
  }
  // le dernier accusé pour chaque id est bien sur disque
  const last = new Map();
  for (const i of acked) last.set(`ev_${i % 10}`, i);
  for (const [id, i] of last) {
    const d = JSON.parse(fs.readFileSync(path.join(planningDir, `${id}.json`), 'utf8'));
    assert.ok(Number(d.adversaire.split(' ')[1]) >= i, `${id} contient au moins l'écriture acquittée ${i}`);
  }
});
