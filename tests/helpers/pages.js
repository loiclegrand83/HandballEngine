'use strict';

// Pages contrôlées par les tests S8 (CA20–CA23) et préparation d'une trame 5 blocs × 3 entrées.
const VIEWPORTS = [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }];

async function prepareTrame5x3(request) {
  const id = 'layout_5x3';
  const catalog = await (await request.get('/api/catalog')).json();
  const blocs = Array.from({ length: 5 }, (_, i) => ({
    nom: `Bloc ${i + 1}`,
    notesCoach: '',
    ateliers: [0, 1, 2].map(j => {
      const e = catalog[(i + j) % catalog.length];
      return { exerciceId: e.id, exerciceVersionId: e.versionId, dureeOverride: e.duree == null ? 10 : null };
    }),
  }));
  const res = await request.post('/api/seances', { data: { id, titre: 'Trame 5×3', date: '2026-11-12', blocs } });
  if (res.status() !== 200) throw new Error('préparation de la trame impossible : ' + (await res.text()));
  return id;
}

async function pageUrls(request) {
  const trameId = await prepareTrame5x3(request);
  return [
    { name: 'accueil', url: '/', ready: '#libCards .lib-card' },
    { name: 'board', url: '/pages/board.html?exercise=fx_gardien', ready: '#quickBar' },
    { name: 'trame', url: `/pages/seance.html?id=${trameId}`, ready: '.entry' },
    { name: 'planning', url: '/pages/planning.html', ready: '.calendar-grid' },
    { name: 'bibliotheques', url: '/pages/bibliotheque.html', ready: '#exGrid .ex-card' },
    { name: 'guide', url: '/pages/guide.html', ready: '.guide-card' },
  ];
}

module.exports = { VIEWPORTS, pageUrls, prepareTrame5x3 };
