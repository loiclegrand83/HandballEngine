'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, stopServer, BASE_URL } = require('../helpers/server');

let child;
const json = (method, p, body) => fetch(`${BASE_URL}${p}`, {
  method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
});
const catalog = async () => (await fetch(`${BASE_URL}/api/catalog`)).json();

before(async () => { child = await startServer(); });
after(async () => { await stopServer(child); });

test('CA10 : une entrée garde la version exacte de l\'exercice après sa modification', async () => {
  const v1 = (await catalog()).find(e => e.id === 'fx_defense');
  const trame = {
    id: 'tr_ca10', titre: 'Trame CA10', date: '2026-11-12',
    blocs: [{ nom: 'Défense', notesCoach: '', ateliers: [{ exerciceId: 'fx_defense', exerciceVersionId: v1.versionId, dureeOverride: null }] }],
  };
  assert.equal((await json('POST', '/api/seances', trame)).status, 200);
  const current = await (await fetch(`${BASE_URL}/api/exercises/fx_defense`)).json();
  const r2 = await (await json('POST', '/api/exercises', { ...current, notes: 'Notes modifiées' })).json();
  assert.equal(r2.created, true);

  const got = await (await fetch(`${BASE_URL}/api/seances/tr_ca10`)).json();
  assert.equal(got.trame.blocs[0].ateliers[0].exerciceVersionId, v1.versionId);
  const ev = got.exerciseVersions[v1.versionId];
  assert.equal(ev.isLatest, false);
  assert.equal(ev.notes, current.notes);
  assert.equal(ev.material, '5 plots, 2 ballons');
  assert.equal(ev.duree, 20);
});

test('CA9 : un champ dureeTotal est refusé', async () => {
  const res = await json('POST', '/api/seances', { id: 'tr_total', titre: 'T', date: '2026-11-12', blocs: [], dureeTotal: 45 });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /calculée automatiquement/);
});

test('CA18 : titre vide et version d\'un autre exercice refusés', async () => {
  let res = await json('POST', '/api/seances', { id: 'tr_bad', titre: '  ', date: '2026-11-12', blocs: [] });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).field, 'titre');
  const gardien = (await catalog()).find(e => e.id === 'fx_gardien');
  res = await json('POST', '/api/seances', {
    id: 'tr_bad', titre: 'Mauvais lien', date: '2026-11-12',
    blocs: [{ nom: 'B', ateliers: [{ exerciceId: 'fx_defense', exerciceVersionId: gardien.versionId, dureeOverride: null }] }],
  });
  assert.equal(res.status, 400);
  res = await json('POST', '/api/seances', { id: 'tr_bad', titre: 'Date', date: '2026-02-30', blocs: [] });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).field, 'date');
});

test('versions de trame : identique → created:false ; modifiée → version n°2', async () => {
  const t = { id: 'tr_ver', titre: 'Versions', date: '2026-11-12', blocs: [] };
  const r1 = await (await json('POST', '/api/seances', t)).json();
  assert.equal(r1.versionNo, 1);
  const r2 = await (await json('POST', '/api/seances', t)).json();
  assert.equal(r2.created, false);
  const r3 = await (await json('POST', '/api/seances', { ...t, titre: 'Versions bis' })).json();
  assert.equal(r3.versionNo, 2);
  const versions = await (await fetch(`${BASE_URL}/api/seances/tr_ver/versions`)).json();
  assert.equal(versions.length, 2);
  const old = await (await fetch(`${BASE_URL}/api/seances/versions/${r1.versionId}`)).json();
  assert.equal(old.trame.titre, 'Versions');
  assert.equal(old.versionNo, 1);
});
