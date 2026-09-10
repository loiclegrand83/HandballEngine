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
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
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

