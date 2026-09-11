'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, stopServer, BASE_URL } = require('../helpers/server');

let serverProcess;
const testIds = [];

before(async () => { serverProcess = await startServer(); });
after(async () => {
  for (const id of testIds) {
    await fetch(`${BASE_URL}/api/planning/${id}`, { method: 'DELETE' }).catch(() => {});
  }
  await stopServer(serverProcess);
});

function makeId(suffix) {
  const id = `test_planning_${Date.now()}_${suffix}`;
  testIds.push(id);
  return id;
}

test('POST /api/planning creates a Match event with adversaire', async () => {
  const id = makeId('match');
  const res = await fetch(`${BASE_URL}/api/planning`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, type: 'match', date: '2026-09-20', adversaire: 'Club Test', heure: '', lieu: 'domicile' }),
  });
  assert.equal(res.status, 200);
  const list = await (await fetch(`${BASE_URL}/api/planning`)).json();
  const saved = list.find(e => e.id === id);
  assert.equal(saved.adversaire, 'Club Test');
});

test('a planning event linking a Séance survives that Séance being deleted (orphan-detection precondition)', async () => {
  const seanceId = makeId('linked-seance');
  const eventId = makeId('linked-event');
  await fetch(`${BASE_URL}/api/seances`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: seanceId, titre: 'Linked', date: '2026-09-10', blocs: [] }),
  });
  await fetch(`${BASE_URL}/api/planning`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: eventId, type: 'entrainement', date: '2026-09-15', titre: 'Ent', seanceId, heure: '', notes: '' }),
  });

  await fetch(`${BASE_URL}/api/seances/${seanceId}`, { method: 'DELETE' });

  const allSeances = await (await fetch(`${BASE_URL}/api/seances`)).json();
  assert.ok(!allSeances.some(s => s.id === seanceId), 'séance should be gone');

  const events = await (await fetch(`${BASE_URL}/api/planning`)).json();
  const ev = events.find(e => e.id === eventId);
  assert.equal(ev.seanceId, seanceId, 'the dangling seanceId must still be present for the client-side orphan check to find');
});

test('a very old event date (multi-year history) is returned unfiltered by GET /api/planning', async () => {
  const id = makeId('old');
  await fetch(`${BASE_URL}/api/planning`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, type: 'match', date: '2019-03-15', adversaire: 'Vieux Club', heure: '', lieu: 'domicile' }),
  });
  const list = await (await fetch(`${BASE_URL}/api/planning`)).json();
  assert.ok(list.some(e => e.id === id), 'old-dated event must not be filtered out server-side');
});

test('DELETE /api/planning/:id removes the event', async () => {
  const id = makeId('delete');
  await fetch(`${BASE_URL}/api/planning`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, type: 'match', date: '2026-09-10', adversaire: 'X', heure: '', lieu: 'domicile' }),
  });
  const del = await fetch(`${BASE_URL}/api/planning/${id}`, { method: 'DELETE' });
  assert.equal(del.status, 200);
  const list = await (await fetch(`${BASE_URL}/api/planning`)).json();
  assert.ok(!list.some(e => e.id === id));
});
