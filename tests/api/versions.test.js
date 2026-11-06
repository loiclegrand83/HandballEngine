'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, stopServer, BASE_URL } = require('../helpers/server');

let child;
const json = (method, p, body) => fetch(`${BASE_URL}${p}`, {
  method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
});
// JPEG 1×1 minimal valide
const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

before(async () => { child = await startServer(); });
after(async () => { await stopServer(child); });

test('CA6 : restaurer v1 crée v4 sans rien effacer ; restaurer la version courante ne crée rien', async () => {
  const base = { id: 'vr_ex', name: 'Versions', thematique: 'attaque' };
  const v1 = await (await json('POST', '/api/exercises', { ...base, notes: 'a' })).json();
  await json('POST', '/api/exercises', { ...base, notes: 'b' });
  const v3 = await (await json('POST', '/api/exercises', { ...base, notes: 'c' })).json();
  assert.equal(v3.versionNo, 3);

  const r = await (await json('POST', '/api/exercises/vr_ex/restore', { versionId: v1.versionId })).json();
  assert.equal(r.versionNo, 4);
  const versions = await (await fetch(`${BASE_URL}/api/exercises/vr_ex/versions`)).json();
  assert.equal(versions.length, 4);
  assert.equal(versions[0].source, 'restore');
  assert.equal(versions[0].restoredFrom, v1.versionId);
  const cur = await (await fetch(`${BASE_URL}/api/exercises/vr_ex`)).json();
  assert.equal(cur.notes, 'a');
  for (const v of versions.slice(1)) {
    assert.equal((await fetch(`${BASE_URL}/api/exercises/versions/${v.versionId}`)).status, 200);
  }
  const again = await (await json('POST', '/api/exercises/vr_ex/restore', { versionId: r.versionId })).json();
  assert.equal(again.created, false);
});

test('restaurer la version d\'un autre exercice → 404', async () => {
  const other = await (await json('POST', '/api/exercises', { id: 'vr_other', name: 'Autre', thematique: 'defense' })).json();
  const res = await json('POST', '/api/exercises/vr_ex/restore', { versionId: other.versionId });
  assert.equal(res.status, 404);
});

test('vignette : type refusé (400), PUT valide puis GET image/jpeg ; image embarquée non remplaçable (409)', async () => {
  const r = await (await json('POST', '/api/exercises', { id: 'vr_snap', name: 'Snap', thematique: 'gardien' })).json();
  let res = await json('PUT', `/api/versions/${r.versionId}/snapshot`, { image: 'data:text/html,<b>x</b>' });
  assert.equal(res.status, 400);
  assert.equal((await fetch(`${BASE_URL}/api/versions/${r.versionId}/snapshot`)).status, 404);
  res = await json('PUT', `/api/versions/${r.versionId}/snapshot`, { image: JPEG });
  assert.equal(res.status, 200);
  const img = await fetch(`${BASE_URL}/api/versions/${r.versionId}/snapshot`);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/jpeg');
  assert.match(img.headers.get('cache-control'), /immutable/);

  const e = await (await json('POST', '/api/exercises', { id: 'vr_emb', name: 'Emb', thematique: 'gardien', snapshot: JPEG })).json();
  res = await json('PUT', `/api/versions/${e.versionId}/snapshot`, { image: JPEG });
  assert.equal(res.status, 409);
});
