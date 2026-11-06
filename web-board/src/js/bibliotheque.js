// Page Bibliothèques : bibliothèques (CA1–CA3), filtres combinés (CA4), détail et historique (CA6).
(function () {
  'use strict';

  const { api } = window.HawebAPI;
  const { toast, confirmDialog, renderNav, escapeHtml: esc, formatDateTime, norm } = window.HawebUI;

  const THEM_LABELS = { attaque: 'Attaque', defense: 'Défense', gardien: 'Gardien', enclenchement: 'Enclenchement' };
  const SOURCE_LABELS = { import: 'Importée', save: 'Enregistrée' };

  const state = {
    catalog: [],
    libraries: [],
    lib: null,         // id de la bibliothèque active, null = tous
    them: '',
    q: '',
    selectedId: null,
    viewVersion: null, // version affichée en lecture seule
    versions: [],
  };

  const $ = id => document.getElementById(id);
  const libList = $('libList');
  const exGrid = $('exGrid');
  const detail = $('detail');
  const fSearch = $('fSearch');
  const fThematique = $('fThematique');
  const btnAddToLib = $('btnAddToLib');
  const addDialog = $('addDialog');

  // ── Chargement ──────────────────────────────────────────
  async function loadAll() {
    const [catalog, libraries] = await Promise.all([api('GET', '/api/catalog'), api('GET', '/api/libraries')]);
    state.catalog = catalog || [];
    state.libraries = libraries || [];
    if (state.lib != null && !state.libraries.some(l => l.id === state.lib)) state.lib = null;
    renderLibs();
    renderGrid();
  }

  function readUrl() {
    const p = new URLSearchParams(location.search);
    const lib = Number(p.get('library'));
    state.lib = Number.isInteger(lib) && lib > 0 ? lib : null;
    state.them = p.get('them') || '';
    state.q = p.get('q') || '';
    fSearch.value = state.q;
    fThematique.value = state.them;
  }

  function writeUrl() {
    const p = new URLSearchParams();
    if (state.lib != null) p.set('library', state.lib);
    if (state.them) p.set('them', state.them);
    if (state.q) p.set('q', state.q);
    const qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
  }

  // ── Colonne gauche ──────────────────────────────────────
  function renderLibs() {
    const rows = [`<li class="lib-row ${state.lib == null ? 'active' : ''}">
      <button type="button" class="lib-item" data-lib="">Tous les exercices <span class="lib-count">(${state.catalog.length})</span></button></li>`];
    for (const l of state.libraries) {
      rows.push(`<li class="lib-row ${state.lib === l.id ? 'active' : ''}" data-row="${l.id}">
        <button type="button" class="lib-item" data-lib="${l.id}"><span class="lib-name">${esc(l.name)}</span> <span class="lib-count">(${l.count})</span></button>
        <button type="button" class="btn btn--icon" data-rename="${l.id}" data-write title="Renommer" aria-label="Renommer ${esc(l.name)}">✎</button>
        <button type="button" class="btn btn--icon" data-delete="${l.id}" data-write title="Supprimer" aria-label="Supprimer ${esc(l.name)}">🗑</button>
      </li>`);
    }
    libList.innerHTML = rows.join('');
    const active = state.libraries.find(l => l.id === state.lib);
    $('activeLib').textContent = active ? `Bibliothèque : ${active.name}` : 'Tous les exercices';
    btnAddToLib.hidden = !active;
  }

  libList.addEventListener('click', async e => {
    const pick = e.target.closest('[data-lib]');
    if (pick) {
      state.lib = pick.dataset.lib === '' ? null : Number(pick.dataset.lib);
      writeUrl();
      renderLibs();
      renderGrid();
      return;
    }
    const ren = e.target.closest('[data-rename]');
    if (ren) return startRename(Number(ren.dataset.rename));
    const del = e.target.closest('[data-delete]');
    if (del) {
      const lib = state.libraries.find(l => l.id === Number(del.dataset.delete));
      if (!lib) return;
      const ok = await confirmDialog(`Supprimer la bibliothèque « ${lib.name} » ? Les exercices sont conservés.`, { okLabel: 'Supprimer' });
      if (!ok) return;
      try {
        await api('DELETE', `/api/libraries/${lib.id}`);
        toast(`Bibliothèque « ${lib.name} » supprimée. Les exercices sont conservés.`, 'ok');
        if (state.lib === lib.id) { state.lib = null; writeUrl(); }
        await loadAll();
        renderDetail();
      } catch (err) { toast(err.message, 'err'); }
    }
  });

  function startRename(id) {
    const lib = state.libraries.find(l => l.id === id);
    const row = libList.querySelector(`[data-row="${id}"]`);
    if (!lib || !row) return;
    row.innerHTML = `<input class="field-input lib-rename-input" maxlength="60" value="${esc(lib.name)}" aria-label="Nouveau nom" />`;
    const input = row.querySelector('input');
    input.focus();
    input.select();
    let done = false;
    const finish = async save => {
      if (done) return;
      done = true;
      if (save && input.value.trim() && input.value.trim() !== lib.name) {
        try {
          await api('PATCH', `/api/libraries/${id}`, { name: input.value });
          toast('Bibliothèque renommée', 'ok');
        } catch (err) { toast(err.message, 'err'); }
      }
      await loadAll();
      renderDetail();
    };
    input.addEventListener('keydown', ev => {
      if (ev.key === 'Enter') { ev.preventDefault(); finish(true); }
      if (ev.key === 'Escape') { ev.preventDefault(); finish(false); }
    });
    input.addEventListener('blur', () => finish(false));
  }

  $('newLibForm').addEventListener('submit', async e => {
    e.preventDefault();
    const input = $('newLibName');
    try {
      const lib = await api('POST', '/api/libraries', { name: input.value });
      input.value = '';
      input.removeAttribute('aria-invalid');
      toast(`Bibliothèque « ${lib.name} » créée`, 'ok');
      await loadAll();
      renderDetail();
    } catch (err) {
      input.setAttribute('aria-invalid', 'true');
      toast(err.message, 'err');
    }
  });

  // ── Grille ──────────────────────────────────────────────
  function visible() {
    const q = norm(state.q);
    return state.catalog.filter(e =>
      (state.lib == null || e.libraryIds.includes(state.lib)) &&
      (!state.them || e.thematique === state.them) &&
      (!q || norm(e.name + ' ' + e.notes).includes(q)));
  }

  function thumb(e, cls = 'ex-thumb') {
    return e.hasSnapshot
      ? `<img class="${cls}" src="/api/versions/${e.versionId}/snapshot" alt="Schéma de ${esc(e.name)}" loading="lazy" />`
      : `<div class="${cls} ex-thumb--placeholder" aria-hidden="true">▭</div>`;
  }

  function renderGrid() {
    const list = visible();
    if (!list.length) {
      exGrid.innerHTML = `<div class="empty-state">Aucun exercice ne correspond à ces filtres.<br>
        <button type="button" class="btn" id="btnClearFilters">Effacer les filtres</button></div>`;
      return;
    }
    exGrid.innerHTML = list.map(e => `
      <button type="button" class="card ex-card ${e.id === state.selectedId ? 'selected' : ''}" data-id="${esc(e.id)}">
        ${thumb(e)}
        <span class="ex-card-body">
          <span class="ex-card-title">${esc(e.name)}</span>
          <span class="ex-card-meta">
            <span class="badge badge--${esc(e.thematique)}">${esc(THEM_LABELS[e.thematique] || e.thematique || '—')}</span>
            <span>${e.duree ? e.duree + ' min' : 'durée ?'}</span>
          </span>
        </span>
      </button>`).join('');
  }

  exGrid.addEventListener('click', e => {
    if (e.target.closest('#btnClearFilters')) {
      state.lib = null; state.them = ''; state.q = '';
      fSearch.value = ''; fThematique.value = '';
      writeUrl(); renderLibs(); renderGrid();
      return;
    }
    const card = e.target.closest('.ex-card');
    if (card) selectExercise(card.dataset.id);
  });

  let searchTimer = null;
  fSearch.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.q = fSearch.value.trim(); writeUrl(); renderGrid(); }, 150);
  });
  fThematique.addEventListener('change', () => { state.them = fThematique.value; writeUrl(); renderGrid(); });

  // ── Dialogue « + Ajouter un exercice » ──────────────────
  btnAddToLib.addEventListener('click', () => {
    const lib = state.libraries.find(l => l.id === state.lib);
    if (!lib) return;
    $('addDialogLib').textContent = lib.name;
    const absent = state.catalog.filter(e => !e.libraryIds.includes(lib.id));
    $('addDialogList').innerHTML = absent.length
      ? absent.map(e => `<button type="button" class="btn add-item" data-add="${esc(e.id)}">${esc(e.name)}</button>`).join('')
      : '<p>Tous les exercices sont déjà dans cette bibliothèque.</p>';
    addDialog.showModal();
  });
  $('addDialogClose').addEventListener('click', () => addDialog.close());
  $('addDialogList').addEventListener('click', async e => {
    const b = e.target.closest('[data-add]');
    if (!b) return;
    const lib = state.libraries.find(l => l.id === state.lib);
    try {
      await api('POST', `/api/libraries/${state.lib}/exercises`, { exerciseId: b.dataset.add });
      addDialog.close();
      toast(`Ajouté à ${lib ? lib.name : 'la bibliothèque'}`, 'ok');
      await loadAll();
      renderDetail();
    } catch (err) { toast(err.message, 'err'); }
  });

  // ── Détail ──────────────────────────────────────────────
  async function selectExercise(id) {
    state.selectedId = id;
    state.viewVersion = null;
    renderGrid();
    try {
      state.versions = await api('GET', `/api/exercises/${encodeURIComponent(id)}/versions`);
    } catch (err) { state.versions = []; }
    await renderDetail();
  }

  function schemaHtml(versionId, hasSnapshot, name) {
    return hasSnapshot
      ? `<img class="schema" src="/api/versions/${versionId}/snapshot" alt="Schéma de ${esc(name)}" />`
      : `<div class="schema-wait" id="schemaWait">Préparation du schéma…</div>`;
  }

  async function renderDetail() {
    const e = state.catalog.find(x => x.id === state.selectedId);
    if (!e) {
      detail.innerHTML = '<p class="detail-empty">Sélectionnez un exercice pour voir son schéma, ses bibliothèques et son historique.</p>';
      return;
    }
    const vv = state.viewVersion;
    let data;
    try {
      data = vv ? vv.data : await api('GET', `/api/exercises/${encodeURIComponent(e.id)}`);
    } catch (err) { data = {}; }
    const versionId = vv ? vv.versionId : e.versionId;
    const hasSnap = vv ? vv.hasSnapshot : e.hasSnapshot;
    const name = String(data.name || e.name || '');
    const material = (data.explanation && data.explanation.material) || '';
    const libChecks = state.libraries.map(l => `
      <label><input type="checkbox" data-libcheck="${l.id}" data-write ${e.libraryIds.includes(l.id) ? 'checked' : ''} ${vv ? 'disabled' : ''} /> ${esc(l.name)}</label>`).join('');
    const history = state.versions.map(v => {
      const src = v.source === 'restore'
        ? `Restaurée depuis v${(state.versions.find(x => x.versionId === v.restoredFrom) || {}).versionNo || '?'}`
        : (SOURCE_LABELS[v.source] || 'Enregistrée');
      return `<li><button type="button" class="${vv && vv.versionId === v.versionId ? 'active' : ''}" data-version="${v.versionId}">v${v.versionNo} · ${esc(formatDateTime(v.savedAt))} · ${esc(v.name || '')} · ${esc(src)}</button></li>`;
    }).join('');

    detail.innerHTML = `
      ${vv ? `<div class="version-banner">Version n°${vv.versionNo} du ${esc(formatDateTime(vv.savedAt))} (lecture seule)</div>` : ''}
      ${schemaHtml(versionId, hasSnap, name)}
      <h2 class="detail-title">${esc(name)}</h2>
      <dl class="detail-fields">
        <dt>Thématique</dt><dd>${esc(THEM_LABELS[data.thematique] || data.thematique || '—')}</dd>
        <dt>Durée</dt><dd>${Number.isInteger(data.duree) ? data.duree + ' min' : 'Non renseignée'}</dd>
        <dt>Matériel</dt><dd>${esc(material || 'Non renseigné')}</dd>
        <dt>Notes</dt><dd>${esc(data.notes || '—')}</dd>
      </dl>
      ${vv
        ? `<div class="detail-actions">
             <button type="button" class="btn btn--primary" id="btnRestore" data-write>Restaurer cette version</button>
             <button type="button" class="btn" id="btnBackCurrent">Revenir à la version actuelle</button>
           </div>`
        : `<h3 class="detail-section-title">Bibliothèques</h3>
           <div class="lib-checks">${libChecks || '<span>Aucune bibliothèque.</span>'}</div>
           <div class="detail-actions">
             <a class="btn btn--primary" href="/pages/board.html?exercise=${encodeURIComponent(e.id)}">Ouvrir dans le Board</a>
             <button type="button" class="btn btn--danger" id="btnDeleteEx" data-write>Supprimer l'exercice</button>
           </div>`}
      <h3 class="detail-section-title">Historique</h3>
      <ul class="history panel-scroll" id="historyList">${history}</ul>`;

    if (!hasSnap) ensureSchema(versionId, e.id);
  }

  async function ensureSchema(versionId, exerciseId) {
    const { missing } = await window.HawebSnapshots.ensure([{ versionId, hasSnapshot: false }]);
    if (state.selectedId !== exerciseId) return;
    const wait = $('schemaWait');
    if (missing.length) {
      if (wait) wait.textContent = 'Schéma indisponible : ouvrez cet exercice dans le Board.';
      return;
    }
    const entry = state.catalog.find(x => x.versionId === versionId);
    if (entry) entry.hasSnapshot = true;
    if (state.viewVersion && state.viewVersion.versionId === versionId) state.viewVersion.hasSnapshot = true;
    if (wait) wait.outerHTML = `<img class="schema" src="/api/versions/${versionId}/snapshot" alt="Schéma" />`;
    renderGrid();
  }

  detail.addEventListener('change', async e => {
    const cb = e.target.closest('[data-libcheck]');
    if (!cb) return;
    const libId = Number(cb.dataset.libcheck);
    const lib = state.libraries.find(l => l.id === libId);
    try {
      if (cb.checked) {
        await api('POST', `/api/libraries/${libId}/exercises`, { exerciseId: state.selectedId });
        toast(`Ajouté à ${lib.name}`, 'ok');
      } else {
        await api('DELETE', `/api/libraries/${libId}/exercises/${encodeURIComponent(state.selectedId)}`);
        toast(`Retiré de ${lib.name}`, 'ok');
      }
      await loadAll();
      await renderDetail();
    } catch (err) {
      cb.checked = !cb.checked;
      toast(err.message, 'err');
    }
  });

  detail.addEventListener('click', async e => {
    const vbtn = e.target.closest('[data-version]');
    if (vbtn) {
      try {
        const v = await api('GET', `/api/exercises/versions/${vbtn.dataset.version}`);
        const current = state.catalog.find(x => x.id === state.selectedId);
        if (current && v.versionId === current.versionId) state.viewVersion = null;
        else {
          let hasSnapshot = false;
          try { hasSnapshot = (await fetch(`/api/versions/${v.versionId}/snapshot`, { method: 'GET' })).ok; } catch (_) { /* hors ligne */ }
          state.viewVersion = { ...v, hasSnapshot };
        }
        await renderDetail();
      } catch (err) { toast(err.message, 'err'); }
      return;
    }
    if (e.target.closest('#btnBackCurrent')) { state.viewVersion = null; return renderDetail(); }
    if (e.target.closest('#btnRestore')) {
      const vv = state.viewVersion;
      try {
        const r = await api('POST', `/api/exercises/${encodeURIComponent(state.selectedId)}/restore`, { versionId: vv.versionId });
        if (r.created) toast(`Version n°${vv.versionNo} restaurée (nouvelle version n°${r.versionNo})`, 'ok');
        else toast(r.message || 'Cette version est déjà la version actuelle.', 'warn');
        await loadAll();
        await selectExercise(state.selectedId);
      } catch (err) { toast(err.message, 'err'); }
      return;
    }
    if (e.target.closest('#btnDeleteEx')) {
      const ex = state.catalog.find(x => x.id === state.selectedId);
      const ok = await confirmDialog(`Supprimer l'exercice « ${ex.name} » ? Il disparaît de toutes les bibliothèques. Ses versions restent conservées dans les trames qui l'utilisent.`, { okLabel: 'Supprimer' });
      if (!ok) return;
      try {
        await api('DELETE', `/api/exercises/${encodeURIComponent(ex.id)}`);
        toast(`Exercice « ${ex.name} » supprimé`, 'ok');
        state.selectedId = null;
        await loadAll();
        renderDetail();
      } catch (err) { toast(err.message, 'err'); }
    }
  });

  // ── Démarrage ───────────────────────────────────────────
  renderNav('bibliotheques');
  readUrl();
  loadAll().catch(err => {
    exGrid.innerHTML = `<div class="empty-state">${esc(err.message || 'Chargement impossible.')}</div>`;
  });
})();
