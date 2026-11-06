'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { startServer, stopServer, BASE_URL } = require('../helpers/server');

let child;
const json = (method, p, body) => fetch(`${BASE_URL}${p}`, {
  method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
});
const catalog = async () => (await fetch(`${BASE_URL}/api/catalog`)).json();
const versionCount = id => {
  const db = new DatabaseSync(path.join(child.dataDir, 'haweb.db'), { readOnly: true });
  try { return Number(db.prepare('SELECT count(*) AS n FROM exercise_versions WHERE exercise_id = ?').get(id).n); }
  finally { db.close(); }
};

let A;
let B;

before(async () => { child = await startServer(); });
after(async () => { await stopServer(child); });

test('CA1 : un exercice dans deux bibliothèques, stocké une seule fois', async () => {
  const before_ = versionCount('fx_gardien');
  A = await (await json('POST', '/api/libraries', { name: 'A' })).json();
  B = await (await json('POST', '/api/libraries', { name: 'B' })).json();
  assert.ok(A.id && B.id);
  assert.equal((await json('POST', `/api/libraries/${A.id}/exercises`, { exerciseId: 'fx_gardien' })).status, 200);
  assert.equal((await json('POST', `/api/libraries/${B.id}/exercises`, { exerciseId: 'fx_gardien' })).status, 200);
  // idempotent
  assert.equal((await json('POST', `/api/libraries/${B.id}/exercises`, { exerciseId: 'fx_gardien' })).status, 200);
  const g = (await catalog()).find(e => e.id === 'fx_gardien');
  assert.ok(g.libraryIds.includes(A.id) && g.libraryIds.includes(B.id));
  assert.equal(g.libraryIds.filter(id => id === A.id || id === B.id).length, 2);
  assert.equal(versionCount('fx_gardien'), before_);

  await json('POST', '/api/exercises', { id: 'lib_sans', name: 'Sans bibliothèque', thematique: 'attaque' });
  const sans = (await catalog()).find(e => e.id === 'lib_sans');
  assert.deepEqual(sans.libraryIds, []);
});

test('CA2 : renommer, doublon refusé, supprimer une bibliothèque conserve les exercices', async () => {
  let res = await json('PATCH', `/api/libraries/${A.id}`, { name: 'Attaque placée' });
  assert.equal(res.status, 200);
  res = await json('PATCH', `/api/libraries/${B.id}`, { name: 'ATTAQUE placée' });
  assert.equal(res.status, 409);
  res = await json('POST', '/api/libraries', { name: 'Attaque placée' });
  assert.equal(res.status, 409);
  res = await json('DELETE', `/api/libraries/${A.id}`);
  assert.equal(res.status, 200);
  assert.equal((await fetch(`${BASE_URL}/api/exercises/fx_gardien`)).status, 200);
  const g = (await catalog()).find(e => e.id === 'fx_gardien');
  assert.ok(g.libraryIds.includes(B.id));
  assert.ok(!g.libraryIds.includes(A.id));
  const libs = await (await fetch(`${BASE_URL}/api/libraries`)).json();
  assert.ok(!libs.some(l => l.id === A.id));
});

test('CA3 : retirer d\'une bibliothèque ne retire pas des autres', async () => {
  const C = await (await json('POST', '/api/libraries', { name: 'C' })).json();
  await json('POST', `/api/libraries/${C.id}/exercises`, { exerciseId: 'fx_gardien' });
  const res = await json('DELETE', `/api/libraries/${B.id}/exercises/fx_gardien`);
  assert.equal(res.status, 200);
  const g = (await catalog()).find(e => e.id === 'fx_gardien');
  assert.ok(g.libraryIds.includes(C.id));
  assert.ok(!g.libraryIds.includes(B.id));
  assert.equal((await fetch(`${BASE_URL}/api/exercises/fx_gardien`)).status, 200);
});

test('nom vide refusé (400, field name) ; exercice inconnu → 404', async () => {
  const res = await json('POST', '/api/libraries', { name: '   ' });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).field, 'name');
  const res2 = await json('POST', `/api/libraries/${B.id}/exercises`, { exerciseId: 'inconnu' });
  assert.equal(res2.status, 404);
});
