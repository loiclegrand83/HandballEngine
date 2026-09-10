'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, stopServer, BASE_URL } = require('../helpers/server');

let serverProcess;
const testIds = [];

before(async () => { serverProcess = await startServer(); });
after(async () => {
  for (const id of testIds) {
    await fetch(`${BASE_URL}/api/exercises/${id}`, { method: 'DELETE' }).catch(() => {});
  }
  await stopServer(serverProcess);
});

function makeId(suffix) {
  const id = `test_ex_${Date.now()}_${suffix}`;
  testIds.push(id);
  return id;
}

test('POST /api/exercises with a valid thematique creates the exercise (200)', async () => {
  const id = makeId('valid');
  const res = await fetch(`${BASE_URL}/api/exercises`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name: 'Test exercise', category: 'none', thematique: 'attaque' }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
});

test('POST /api/exercises without thematique is rejected (400)', async () => {
  const id = makeId('missing-them');
  const res = await fetch(`${BASE_URL}/api/exercises`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name: 'No thematique' }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(body.error, /Thématique/i);
});

test('POST /api/exercises with an invalid thematique is rejected (400)', async () => {
  const id = makeId('bad-them');
  const res = await fetch(`${BASE_URL}/api/exercises`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name: 'Bad thematique', thematique: 'bogus' }),
  });
  assert.equal(res.status, 400);
});

test('POST /api/exercises without a valid id is rejected (400)', async () => {
  const res = await fetch(`${BASE_URL}/api/exercises`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: '../escape', name: 'Bad id', thematique: 'attaque' }),
  });
  assert.equal(res.status, 400);
});

test('GET /api/exercises returns an array including a freshly created exercise', async () => {
  const id = makeId('list');
  await fetch(`${BASE_URL}/api/exercises`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name: 'Listed exercise', thematique: 'defense' }),
  });
  const res = await fetch(`${BASE_URL}/api/exercises`);
  assert.equal(res.status, 200);
  const list = await res.json();
  assert.ok(Array.isArray(list));
  assert.ok(list.some(e => e.id === id));
});

test('DELETE /api/exercises/:id removes the exercise', async () => {
  const id = makeId('delete');
  await fetch(`${BASE_URL}/api/exercises`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name: 'To delete', thematique: 'gardien' }),
  });
  const del = await fetch(`${BASE_URL}/api/exercises/${id}`, { method: 'DELETE' });
  assert.equal(del.status, 200);
  const list = await (await fetch(`${BASE_URL}/api/exercises`)).json();
  assert.ok(!list.some(e => e.id === id));
});
