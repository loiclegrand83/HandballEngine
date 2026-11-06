'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, stopServer, BASE_URL } = require('../helpers/server');

let serverProcess;

before(async () => { serverProcess = await startServer(); });
after(async () => { await stopServer(serverProcess); });

test('security headers are present on a normal response', async () => {
  const res = await fetch(`${BASE_URL}/pages/board.html`);
  assert.equal(res.status, 200);
  assert.ok(res.headers.get('content-security-policy'), 'CSP header missing');
  assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.match(res.headers.get('content-security-policy'), /frame-ancestors 'self'/);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
});

test('static file serving blocks path traversal outside the project root', async () => {
  const res = await fetch(`${BASE_URL}/../../../../etc/passwd`);
  assert.notEqual(res.status, 200);
});

test('DELETE on an id containing path-traversal characters is rejected (400), not 500', async () => {
  const res = await fetch(`${BASE_URL}/api/exercises/${encodeURIComponent('../../etc/passwd')}`, { method: 'DELETE' });
  assert.equal(res.status, 400);
});

test('POST with an oversized body is rejected (413)', async () => {
  const bigNotes = 'x'.repeat(2 * 1024 * 1024); // 2 Mo > la limite de 1 Mo
  const res = await fetch(`${BASE_URL}/api/exercises`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'test_ex_oversize', name: 'x', thematique: 'attaque', notes: bigNotes }),
  });
  assert.equal(res.status, 413);
});

test('a static asset request ignores an appended query string (regression check)', async () => {
  const res = await fetch(`${BASE_URL}/src/css/styles.css?v=123`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /css/);
});

test('no permissive CORS header is set (same-origin-only app, regression check)', async () => {
  const res = await fetch(`${BASE_URL}/pages/board.html`);
  assert.equal(res.headers.get('access-control-allow-origin'), null);
});


// Contrôles d'origine : Host, Origin et Content-Type (revue de code, corrections de sécurité).
// fetch (undici) ne permet pas de forcer l'en-tête Host : on passe par http.request.
function rawGet(pathname, headers) {
  const http = require('http');
  const { hostname, port } = new URL(BASE_URL);
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname, port, path: pathname, method: 'GET', headers }, res => {
      res.resume(); res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject); req.end();
  });
}

test('Host étranger refusé (403) : protection contre le DNS rebinding', async () => {
  assert.equal(await rawGet('/api/exercises', { Host: 'evil.example' }), 403);
  assert.equal(await rawGet('/api/exercises', { Host: `127.0.0.1:${new URL(BASE_URL).port}` }), 200);
});

test('Origin étrangère refusée (403) sur une écriture', async () => {
  const res = await fetch(`${BASE_URL}/api/exercises`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://evil.example' },
    body: JSON.stringify({ id: 'sec_origin', name: 'x', thematique: 'attaque' }),
  });
  assert.equal(res.status, 403);
});

test('écriture en text/plain refusée (415) : pas de POST cross-site sans préflight', async () => {
  const res = await fetch(`${BASE_URL}/api/exercises`, {
    method: 'POST', headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ id: 'sec_plain', name: 'x', thematique: 'attaque' }),
  });
  assert.equal(res.status, 415);
});

test('Origin locale acceptée : écriture JSON depuis localhost autorisée', async () => {
  const res = await fetch(`${BASE_URL}/api/exercises`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: BASE_URL },
    body: JSON.stringify({ id: 'sec_ok', name: 'OK', thematique: 'attaque', notes: '' }),
  });
  assert.equal(res.status, 200);
});

test('chemin statique hors liste blanche refusé (404) : code du serveur non servi', async () => {
  const res = await fetch(`${BASE_URL}/server.js`);
  assert.equal(res.status, 404);
  const res2 = await fetch(`${BASE_URL}/pages/../server.js`);
  assert.equal(res2.status, 404);
});
