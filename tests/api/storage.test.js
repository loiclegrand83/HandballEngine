'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const { startServer, stopServer, makeDataDir, BASE_URL } = require('../helpers/server');

let child;
let dataDir;
let before_ = {};

const sha = buf => crypto.createHash('sha256').update(buf).digest('hex');
const post = (p, body) => fetch(`${BASE_URL}${p}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const bibliFiles = () => fs.readdirSync(path.join(dataDir, 'bibli')).filter(f => f.endsWith('.json')).sort();

before(async () => {
  dataDir = makeDataDir();
  for (const f of fs.readdirSync(path.join(dataDir, 'bibli'))) {
    const full = path.join(dataDir, 'bibli', f);
    before_[f] = { sha: sha(fs.readFileSync(full)), mtimeMs: fs.statSync(full).mtimeMs };
  }
  child = await startServer({ dataDir });
});
after(async () => { await stopServer(child); });

test('import fidèle : chaque fichier de bibli est restitué à l\'identique et les fichiers ne bougent pas (CA7)', async () => {
  const db = new DatabaseSync(path.join(dataDir, 'haweb.db'), { readOnly: true });
  try {
    for (const f of bibliFiles()) {
      const full = path.join(dataDir, 'bibli', f);
      const text = fs.readFileSync(full, 'utf8');
      const parsed = JSON.parse(text);
      const res = await fetch(`${BASE_URL}/api/exercises/${parsed.id}`);
      assert.equal(res.status, 200, f);
      assert.deepStrictEqual(await res.json(), parsed);
      const row = db.prepare('SELECT data FROM exercise_versions WHERE exercise_id = ? AND version_no = 1').get(parsed.id);
      assert.equal(row.data, text, `texte brut identique pour ${f}`);
      assert.equal(sha(fs.readFileSync(full)), before_[f].sha, `sha256 inchangé pour ${f}`);
      assert.equal(fs.statSync(full).mtimeMs, before_[f].mtimeMs, `mtime inchangé pour ${f}`);
    }
    const lib = db.prepare("SELECT id FROM libraries WHERE name = 'Mes exercices'").get();
    assert.ok(lib, 'bibliothèque « Mes exercices » créée à l\'import (Q6)');
  } finally {
    db.close();
  }
});

test('ré-import idempotent : redémarrer ne crée aucune version', async () => {
  const count = () => {
    const db = new DatabaseSync(path.join(dataDir, 'haweb.db'), { readOnly: true });
    try { return Number(db.prepare('SELECT count(*) AS n FROM exercise_versions').get().n); } finally { db.close(); }
  };
  const n1 = count();
  await stopServer(child);
  child = await startServer({ dataDir });
  assert.equal(count(), n1);
});

test('CA5 : un enregistrement identique (hors updatedAt) ne crée pas de version', async () => {
  const x = { id: 'st_ca5', name: 'CA5', thematique: 'attaque', duree: 10, notes: 'a', updatedAt: '2026-01-01T00:00:00Z' };
  const r1 = await (await post('/api/exercises', x)).json();
  assert.equal(r1.created, true);
  assert.equal(r1.versionNo, 1);
  const r2 = await (await post('/api/exercises', { ...x, updatedAt: '2026-02-02T00:00:00Z' })).json();
  assert.equal(r2.created, false);
  const versions = await (await fetch(`${BASE_URL}/api/exercises/st_ca5/versions`)).json();
  assert.equal(versions.length, 1);
  const r3 = await (await post('/api/exercises', { ...x, notes: 'b' })).json();
  assert.equal(r3.created, true);
  assert.equal(r3.versionNo, 2);
});

test('CA18 : champs obligatoires validés avec un message clair', async () => {
  const base = { id: 'st_ca18', name: 'Valide', thematique: 'attaque' };
  let res = await post('/api/exercises', { ...base, name: '' });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).field, 'name');
  res = await post('/api/exercises', { ...base, duree: 0 });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).field, 'duree');
  res = await post('/api/exercises', { ...base, duree: 'abc' });
  assert.equal(res.status, 400);
  const { thematique, ...noThem } = base;
  res = await post('/api/exercises', noThem);
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /Thématique/);
});

test('les données et le code serveur ne sont pas servis en statique', async () => {
  for (const p of ['/data/haweb.db', '/data/bibli/fx_gardien.json', '/lib/db.js']) {
    const res = await fetch(`${BASE_URL}${p}`);
    assert.equal(res.status, 404, p);
  }
});

test('suppression logique : l\'exercice disparaît de la liste mais ses versions restent lisibles', async () => {
  const r = await (await post('/api/exercises', { id: 'st_del', name: 'A supprimer', thematique: 'defense' })).json();
  const del = await fetch(`${BASE_URL}/api/exercises/st_del`, { method: 'DELETE' });
  assert.equal(del.status, 200);
  const list = await (await fetch(`${BASE_URL}/api/exercises`)).json();
  assert.ok(!list.some(e => e.id === 'st_del'));
  const v = await fetch(`${BASE_URL}/api/exercises/versions/${r.versionId}`);
  assert.equal(v.status, 200);
});

test('brouillon : PUT …/draft ne crée aucune version', async () => {
  await post('/api/exercises', { id: 'st_draft', name: 'Brouillon', thematique: 'attaque' });
  const res = await fetch(`${BASE_URL}/api/exercises/st_draft/draft`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'st_draft', name: 'Brouillon modifié', thematique: 'attaque' }),
  });
  assert.equal(res.status, 200);
  const versions = await (await fetch(`${BASE_URL}/api/exercises/st_draft/versions`)).json();
  assert.equal(versions.length, 1);
  const draft = await (await fetch(`${BASE_URL}/api/exercises/st_draft/draft`)).json();
  assert.equal(draft.data.name, 'Brouillon modifié');
});
