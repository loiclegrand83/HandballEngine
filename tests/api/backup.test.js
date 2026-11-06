'use strict';

// CA19 : sauvegarde complète puis restauration sur un poste vide → état identique.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { startServer, stopServer, BASE_URL } = require('../helpers/server');
const { isLocalRequest } = require('../../web-board/lib/http');

const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';
const json = async (method, p, body) => {
  const res = await fetch(`${BASE_URL}${p}`, {
    method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json();
  assert.ok(res.ok, `${method} ${p} → ${res.status} ${JSON.stringify(data)}`);
  return data;
};
const omitCreatedAt = ({ createdAt, ...rest }) => rest;

let child;
after(async () => { if (child) await stopServer(child); });

test('sauvegarde sur A, restauration sur B vide : contenu identique', async () => {
  // ── Serveur A ──
  child = await startServer();
  const l1 = await json('POST', '/api/libraries', { name: 'Attaque' });
  await json('POST', '/api/libraries', { name: 'Défense' });
  const e1a = await json('POST', '/api/exercises', { id: 'bk_1', name: 'Un', thematique: 'attaque', duree: 10, notes: 'a' });
  await json('POST', '/api/exercises', { id: 'bk_1', name: 'Un', thematique: 'attaque', duree: 10, notes: 'b' });
  await json('POST', '/api/exercises/bk_1/restore', { versionId: e1a.versionId });
  await json('POST', '/api/exercises', { id: 'bk_2', name: 'Deux', thematique: 'defense', notes: 'a' });
  const e2 = await json('POST', '/api/exercises', { id: 'bk_2', name: 'Deux', thematique: 'defense', notes: 'b' });
  await json('POST', '/api/exercises', { id: 'bk_3', name: 'Trois', thematique: 'gardien' });
  await json('PUT', `/api/versions/${e2.versionId}/snapshot`, { image: JPEG });
  await json('PUT', '/api/exercises/bk_3/draft', { id: 'bk_3', name: 'Trois brouillon', thematique: 'gardien' });
  await json('POST', `/api/libraries/${l1.id}/exercises`, { exerciseId: 'bk_1' });
  const trame = { id: 'bk_tr', titre: 'Trame', date: '2026-11-12', blocs: [{ nom: 'B', notesCoach: '', ateliers: [{ exerciceId: 'bk_2', exerciceVersionId: e2.versionId, dureeOverride: 15 }] }] };
  await json('POST', '/api/seances', trame);
  const t2 = await json('POST', '/api/seances', { ...trame, titre: 'Trame v2' });
  const ex = await json('POST', '/api/seances/bk_tr/exports', { trameVersionId: t2.versionId, html: '<!DOCTYPE html><p>archive</p>' });
  await json('POST', '/api/planning', { id: 'bk_ev', type: 'entrainement', date: '2026-11-12', titre: 'Ent', seanceId: 'bk_tr' });

  const res1 = await fetch(`${BASE_URL}/api/backup`);
  assert.equal(res1.status, 200);
  assert.match(res1.headers.get('content-disposition'), /attachment; filename="handball-engine-sauvegarde-\d{4}-\d{2}-\d{2}\.json"/);
  const b1 = await res1.json();
  assert.ok(fs.readdirSync(path.join(child.dataDir, 'backups')).some(f => f.startsWith('handball-engine-sauvegarde-')));
  await stopServer(child);

  // ── Serveur B, dossier vide ──
  const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'haweb-test-empty-'));
  child = await startServer({ dataDir: emptyDir });
  const r = await json('POST', '/api/restore', b1);
  assert.equal(r.ok, true);
  assert.equal(r.counts.planning, 1);
  const b2 = await (await fetch(`${BASE_URL}/api/backup`)).json();
  assert.deepStrictEqual(omitCreatedAt(b2), omitCreatedAt(b1));

  const resolved = await json('GET', '/api/seances/bk_tr');
  assert.equal(resolved.trame.blocs[0].ateliers[0].exerciceVersionId, e2.versionId);
  assert.ok(resolved.exerciseVersions[e2.versionId]);
  const html = await (await fetch(`${BASE_URL}/api/exports/${ex.exportId}`)).text();
  assert.equal(html, '<!DOCTYPE html><p>archive</p>');

  // ── Sauvegarde abîmée : refusée, rien ne change ──
  const broken = JSON.parse(JSON.stringify(b1));
  broken.exerciseVersions[0].content_hash = '0'.repeat(64);
  const bad = await fetch(`${BASE_URL}/api/restore`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(broken),
  });
  assert.equal(bad.status, 400);
  assert.match((await bad.json()).error, /Rien n'a été modifié/);
  const b3 = await (await fetch(`${BASE_URL}/api/backup`)).json();
  assert.deepStrictEqual(omitCreatedAt(b3), omitCreatedAt(b2));

  const notBackup = await fetch(`${BASE_URL}/api/restore`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hello: 1 }),
  });
  assert.equal(notBackup.status, 400);
  assert.match((await notBackup.json()).error, /pas une sauvegarde Handball Engine/);
});

test('isLocalRequest : seules les adresses de boucle locale sont acceptées', () => {
  const req = addr => ({ socket: { remoteAddress: addr } });
  assert.equal(isLocalRequest(req('127.0.0.1')), true);
  assert.equal(isLocalRequest(req('::1')), true);
  assert.equal(isLocalRequest(req('::ffff:127.0.0.1')), true);
  assert.equal(isLocalRequest(req('192.168.1.20')), false);
  assert.equal(isLocalRequest(req('::ffff:10.0.0.2')), false);
  assert.equal(isLocalRequest({ socket: {} }), false);
});

// Revue M8 : après une restauration, un identifiant de version déjà attribué ne doit jamais être réutilisé
// (les schémas sont mis en cache par identifiant de version).
test('restauration sur un serveur qui a déjà plus de versions : pas de réutilisation d\'identifiant', async () => {
  if (child) await stopServer(child);
  child = await startServer();
  const v1 = await json('POST', '/api/exercises', { id: 'seq_1', name: 'S', thematique: 'attaque', notes: '1' });
  const v2 = await json('POST', '/api/exercises', { id: 'seq_1', name: 'S', thematique: 'attaque', notes: '2' });
  const b = await (await fetch(`${BASE_URL}/api/backup`)).json();
  let maxId = v2.versionId;
  for (let i = 3; i <= 5; i++) {
    const v = await json('POST', '/api/exercises', { id: 'seq_1', name: 'S', thematique: 'attaque', notes: String(i) });
    maxId = v.versionId;
  }
  await json('POST', '/api/restore', b);
  const after = await json('POST', '/api/exercises', { id: 'seq_1', name: 'S', thematique: 'attaque', notes: 'après' });
  assert.ok(after.versionId > maxId, `nouvel identifiant ${after.versionId} doit dépasser ${maxId}`);
  assert.ok(v1.versionId < after.versionId);
});

// Revue 2 : restauration refusée avec le nom des exercices concernés (M4), identifiant hors bornes refusé (M2),
// et schéma SVG jamais servi (M1).
test('restauration : schéma non JPEG/PNG refusé avec le nom de l\'exercice, rien modifié', async () => {
  if (child) await stopServer(child);
  child = await startServer();
  await json('POST', '/api/exercises', { id: 'bad_img', name: 'Mauvais', thematique: 'attaque', notes: 'x' });
  const good = await (await fetch(`${BASE_URL}/api/backup`)).json();
  const hostile = JSON.parse(JSON.stringify(good));
  const target = hostile.exerciseVersions.find(v => v.exercise_id === 'bad_img');
  target.data = JSON.stringify({ ...JSON.parse(target.data), snapshot: 'data:image/svg+xml;base64,PHN2Zy8+' });
  const res = await fetch(`${BASE_URL}/api/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(hostile) });
  const body = await res.json();
  assert.equal(res.status, 422);
  assert.match(body.error, /bad_img/);
  assert.match(body.error, /Rien n'a été modifié/);
});

test('restauration : identifiant de version hors bornes refusé (M2)', async () => {
  const b = await (await fetch(`${BASE_URL}/api/backup`)).json();
  const bad = JSON.parse(JSON.stringify(b));
  if (bad.exerciseVersions.length) bad.exerciseVersions[0].version_id = 2 ** 53 - 1;
  const res = await fetch(`${BASE_URL}/api/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bad) });
  assert.equal(res.status, 400);
});

test('schéma SVG refusé à l\'enregistrement (jamais stocké, donc jamais servi)', async () => {
  const res = await fetch(`${BASE_URL}/api/exercises`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'svg_1', name: 'S', thematique: 'attaque', snapshot: 'data:image/svg+xml;base64,PHN2Zy8+' }) });
  assert.equal(res.status, 400);
});
