'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, stopServer, BASE_URL } = require('../helpers/server');

let child;
const json = (method, p, body) => fetch(`${BASE_URL}${p}`, {
  method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
});

before(async () => { child = await startServer(); });
after(async () => { await stopServer(child); });

test('CA16 : export archivé avec date et numéro de version, relu octet pour octet', async () => {
  const t = await (await json('POST', '/api/seances', { id: 'ex_tr1', titre: 'Export', date: '2026-11-12', blocs: [] })).json();
  const html = '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>É</title></head><body><p>Trame « export » — version n°1</p></body></html>';
  const res = await json('POST', '/api/seances/ex_tr1/exports', { trameVersionId: t.versionId, html });
  assert.equal(res.status, 200);
  const created = await res.json();
  assert.equal(created.trameVersionNo, 1);
  assert.ok(created.exportedAt);

  const list = await (await fetch(`${BASE_URL}/api/seances/ex_tr1/exports`)).json();
  assert.equal(list.length, 1);
  assert.equal(list[0].trameVersionNo, 1);
  assert.equal(list[0].trameVersionId, t.versionId);

  const got = await fetch(`${BASE_URL}/api/exports/${created.exportId}`);
  assert.equal(got.status, 200);
  assert.match(got.headers.get('content-type'), /text\/html/);
  assert.match(got.headers.get('content-security-policy'), /default-src 'none'/);
  const body = Buffer.from(await got.arrayBuffer());
  assert.ok(body.equals(Buffer.from(html, 'utf8')), 'corps identique octet pour octet');
});

test('une version d\'une autre trame est refusée (400) ; un document invalide aussi', async () => {
  const other = await (await json('POST', '/api/seances', { id: 'ex_tr2', titre: 'Autre', date: '2026-11-12', blocs: [] })).json();
  let res = await json('POST', '/api/seances/ex_tr1/exports', { trameVersionId: other.versionId, html: '<!DOCTYPE html><p>x</p>' });
  assert.equal(res.status, 400);
  const mine = (await (await fetch(`${BASE_URL}/api/seances/ex_tr1/versions`)).json())[0];
  res = await json('POST', '/api/seances/ex_tr1/exports', { trameVersionId: mine.versionId, html: '<script>x</script>' });
  assert.equal(res.status, 400);
});
