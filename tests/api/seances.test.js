'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, stopServer, BASE_URL } = require('../helpers/server');

let serverProcess;
const testIds = [];

before(async () => { serverProcess = await startServer(); });
after(async () => {
  for (const id of testIds) {
    await fetch(`${BASE_URL}/api/seances/${id}`, { method: 'DELETE' }).catch(() => {});
  }
  await stopServer(serverProcess);
});

function makeId(suffix) {
  const id = `test_seance_${Date.now()}_${suffix}`;
  testIds.push(id);
  return id;
}

test('POST /api/seances saves a Séance with Blocs/Ateliers and it round-trips exactly', async () => {
  const id = makeId('roundtrip');
  const seance = {
    id,
    titre: 'Test séance',
    date: '2026-09-10',
    blocs: [
      { nom: 'Échauffement', ateliers: [{ exerciceId: 'e1', nom: 'Exo', description: 'd', materiel: 'Plots', duree: 15 }], notesCoach: '' },
      { nom: 'Opposition libre', ateliers: [], notesCoach: '' },
    ],
  };
  const res = await fetch(`${BASE_URL}/api/seances`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(seance),
  });
  assert.equal(res.status, 200);

  const list = await (await fetch(`${BASE_URL}/api/seances`)).json();
  const saved = list.find(s => s.id === id);
  assert.ok(saved, 'saved séance should be present in the list');
  assert.equal(saved.blocs.length, 2);
  assert.equal(saved.blocs[0].ateliers.length, 1);
  assert.equal(saved.blocs[0].ateliers[0].duree, 15);
  assert.equal(saved.blocs[1].ateliers.length, 0);
});

test('Séance JSON never carries a dureeTotal field (always derived client-side)', async () => {
  const id = makeId('no-duree-total');
  await fetch(`${BASE_URL}/api/seances`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, titre: 'No duree total', date: '2026-09-10', blocs: [] }),
  });
  const list = await (await fetch(`${BASE_URL}/api/seances`)).json();
  const saved = list.find(s => s.id === id);
  assert.equal('dureeTotal' in saved, false);
});

test('DELETE /api/seances/:id removes the séance', async () => {
  const id = makeId('delete');
  await fetch(`${BASE_URL}/api/seances`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, titre: 'To delete', date: '2026-09-10', blocs: [] }),
  });
  const del = await fetch(`${BASE_URL}/api/seances/${id}`, { method: 'DELETE' });
  assert.equal(del.status, 200);
  const list = await (await fetch(`${BASE_URL}/api/seances`)).json();
  assert.ok(!list.some(s => s.id === id));
});
