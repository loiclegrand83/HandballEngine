// Accueil : bibliothèques, trames et exercices récents en un clic (CA25, CA28) ; sauvegarde (CA19).
(function () {
  'use strict';

  const { api } = window.HawebAPI;
  const { toast, confirmDialog, renderNav, escapeHtml: esc } = window.HawebUI;
  const $ = id => document.getElementById(id);

  function formatDate(iso) {
    if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  async function load() {
    let recent;
    try {
      recent = await api('GET', '/api/recent');
    } catch (e) {
      $('libCards').innerHTML = `<p class="home-empty">${esc(e.message)}</p>`;
      return;
    }
    const libs = recent.libraries.map(l => `
      <a class="card lib-card" href="/pages/bibliotheque.html?library=${l.id}" data-library="${l.id}">
        <span class="lib-card-name">${esc(l.name)}</span>
        <span class="lib-card-count">${l.count} exercice${l.count > 1 ? 's' : ''}</span>
      </a>`).join('');
    $('libCards').innerHTML = libs + `
      <a class="card lib-card lib-card--all" href="/pages/bibliotheque.html">
        <span class="lib-card-name">Toutes les bibliothèques</span>
        <span class="lib-card-count">Créer, ranger, filtrer</span>
      </a>`;

    $('trameRows').innerHTML = recent.trames.length ? recent.trames.map(t => `
      <li><a class="row-link" href="/pages/seance.html?id=${encodeURIComponent(t.id)}">
        <span class="row-title">${esc(t.titre || 'Sans titre')}</span>
        <span class="row-meta">${esc(formatDate(t.date))} · ${t.duree} min · v${t.versionNo}</span>
      </a></li>`).join('') : '<li class="home-empty">Aucune trame pour l\'instant.</li>';

    $('exRows').innerHTML = recent.exercises.length ? recent.exercises.map(e => `
      <li><a class="row-link" href="/pages/board.html?exercise=${encodeURIComponent(e.id)}">
        <span class="row-title">${esc(e.name || 'Sans nom')}</span>
        <span class="row-meta">${e.duree ? e.duree + ' min · ' : ''}v${e.versionNo}</span>
      </a></li>`).join('') : '<li class="home-empty">Aucun exercice pour l\'instant.</li>';
  }

  $('btnRestore').addEventListener('click', () => $('restoreFile').click());
  $('restoreFile').addEventListener('change', async () => {
    const file = $('restoreFile').files[0];
    $('restoreFile').value = '';
    if (!file) return;
    const ok = await confirmDialog("Remplacer toutes les données par cette sauvegarde ? Une copie de l'état actuel est conservée.", { okLabel: 'Restaurer' });
    if (!ok) return;
    let data;
    try { data = JSON.parse(await file.text()); } catch (e) {
      toast("Ce fichier n'est pas une sauvegarde Handball Engine.", 'err');
      return;
    }
    try {
      const r = await api('POST', '/api/restore', data);
      const c = r.counts;
      toast(`Sauvegarde restaurée : ${c.exercises} exercices, ${c.versions} versions, ${c.libraries} bibliothèques, ${c.trames} trames, ${c.exports} exports, ${c.planning} événements.`, 'ok');
      load();
    } catch (e) { toast(e.message, 'err'); }
  });

  renderNav('accueil');
  load();
})();
