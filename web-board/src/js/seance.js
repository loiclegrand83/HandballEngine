/* Trame : blocs ordonnés d'exercices à version figée (CA8–CA10), export PDF archivé (CA11–CA16). */
'use strict';

const { api } = window.HawebAPI;
const { toast, confirmDialog, renderNav, escapeHtml, formatDateTime, norm, pulse } = window.HawebUI;

const THEM_LABELS = { attaque: 'Attaque', defense: 'Défense', gardien: 'Gardien', enclenchement: 'Enclenchement' };
const MAX_EXPORT_PER_BLOC = 4; // Q4

let trame = null;            // trame en cours d'édition (format v2)
let exerciseVersions = {};   // versionId → {exerciseId, versionNo, name, notes, description, material, duree, thematique, hasSnapshot, isLatest}
let serverVersion = null;    // {versionId, versionNo} de la version enregistrée affichée
let dirty = false;
let targetBloc = 0;
let readOnly = null;         // {versionId, versionNo, savedAt} quand une ancienne version est affichée
let catalog = [];
let libraries = [];

const $ = id => document.getElementById(id);
const draftKey = id => `haweb-trame-draft-${id}`;

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function newTrame() {
  return { id: 'seance_' + Date.now(), titre: '', date: todayISO(), theme: '', coach: '', objectif: '', blocs: [] };
}

/* ── Durées (CA9) : jamais stockées, toujours recalculées ─────────────── */
function effectiveDuree(a, evs = exerciseVersions) {
  if (!a) return null;
  if (Number.isInteger(a.dureeOverride)) return a.dureeOverride;
  const ev = a.exerciceVersionId != null ? evs[a.exerciceVersionId] : null;
  if (ev && Number.isInteger(ev.duree)) return ev.duree;
  const d = Number(a.duree);
  return Number.isFinite(d) && d > 0 ? d : null;
}

function blocDuree(bloc, evs) {
  return (bloc.ateliers || []).reduce((sum, a) => sum + (effectiveDuree(a, evs) || 0), 0);
}

function computeDureeTotal(s, evs = exerciseVersions) {
  return (s.blocs || []).reduce((sum, b) => sum + blocDuree(b, evs), 0);
}

function entryInfo(a, evs = exerciseVersions) {
  const ev = a.exerciceVersionId != null ? evs[a.exerciceVersionId] : null;
  if (ev) return { ...ev, legacy: false };
  return {
    legacy: a.exerciceVersionId == null,
    name: a.nom || 'Exercice introuvable',
    notes: a.description || '',
    description: a.description || '',
    material: a.materiel || '',
    duree: Number(a.duree) > 0 ? Number(a.duree) : null,
    snapshot: a.snapshot || null,
    hasSnapshot: false,
    isLatest: true,
  };
}

function consolidatedMaterial(s, evs = exerciseVersions) {
  const set = new Set();
  for (const b of s.blocs || []) {
    for (const a of b.ateliers || []) {
      const m = entryInfo(a, evs).material;
      if (m) m.split(/[,;\n]+/).map(x => x.trim()).filter(Boolean).forEach(x => set.add(x));
    }
  }
  return [...set];
}

/* ── Chargement ───────────────────────────────────────────────────────── */
async function loadCatalog() {
  try {
    [catalog, libraries] = await Promise.all([api('GET', '/api/catalog'), api('GET', '/api/libraries')]);
  } catch (e) {
    catalog = catalog || [];
    libraries = libraries || [];
  }
  const sel = $('pLib');
  const current = sel.value;
  sel.innerHTML = '<option value="">Toutes les bibliothèques</option>' +
    libraries.map(l => `<option value="${l.id}">${escapeHtml(l.name)}</option>`).join('');
  sel.value = current;
  renderPicker();
}

// Résout les versions d'exercices inconnues (brouillon local, ancienne version).
async function resolveMissing() {
  const missing = [];
  for (const b of trame.blocs) for (const a of b.ateliers) {
    if (Number.isInteger(a.exerciceVersionId) && !exerciseVersions[a.exerciceVersionId]) missing.push(a.exerciceVersionId);
  }
  for (const vid of [...new Set(missing)]) {
    const fromCatalog = catalog.find(e => e.versionId === vid);
    if (fromCatalog) { exerciseVersions[vid] = evFromCatalog(fromCatalog); continue; }
    try {
      const v = await api('GET', `/api/exercises/versions/${vid}`);
      const d = v.data || {};
      const latest = catalog.find(e => e.id === v.exerciseId);
      let hasSnapshot = false;
      try { hasSnapshot = (await fetch(`/api/versions/${vid}/snapshot`)).ok; } catch (_) { /* hors ligne */ }
      exerciseVersions[vid] = {
        exerciseId: v.exerciseId, versionNo: v.versionNo, name: d.name || v.name || '', notes: d.notes || '',
        description: d.notes || '', material: (d.explanation && d.explanation.material) || '',
        duree: Number.isInteger(d.duree) ? d.duree : null, thematique: d.thematique, hasSnapshot,
        isLatest: !!latest && latest.versionId === vid,
      };
    } catch (e) { /* introuvable ou hors ligne : la ligne l'indique */ }
  }
}

function evFromCatalog(e) {
  return {
    exerciseId: e.id, versionNo: e.versionNo, name: e.name, notes: e.notes, description: e.notes,
    material: e.material || '', duree: e.duree, thematique: e.thematique, hasSnapshot: e.hasSnapshot, isLatest: true,
  };
}

function applyResolved(r) {
  trame = r.trame;
  if (!Array.isArray(trame.blocs)) trame.blocs = [];
  trame.blocs.forEach(b => { if (!Array.isArray(b.ateliers)) b.ateliers = []; });
  exerciseVersions = r.exerciseVersions || {};
  serverVersion = { versionId: r.versionId, versionNo: r.versionNo };
}

async function openTrame(id) {
  let r = null;
  try {
    r = await api('GET', `/api/seances/${encodeURIComponent(id)}`);
  } catch (e) {
    if (!e.offline && e.status !== 404) toast(e.message, 'err');
  }
  const draftText = localStorage.getItem(draftKey(id));
  if (r) {
    applyResolved(r);
  } else {
    trame = { ...newTrame(), id };
    exerciseVersions = {};
    serverVersion = null;
  }
  dirty = false;
  readOnly = null;
  targetBloc = Math.max(0, trame.blocs.length - 1);
  if (draftText && draftText !== JSON.stringify(trame)) $('draftBanner').hidden = false;
  showEditor();
}

/* ── Modifications ────────────────────────────────────────────────────── */
function markDirty() {
  dirty = true;
  try { localStorage.setItem(draftKey(trame.id), JSON.stringify(trame)); } catch (e) { /* stockage plein */ }
  const url = new URL(location.href);
  if (url.searchParams.get('id') !== trame.id) {
    url.searchParams.set('id', trame.id);
    url.searchParams.delete('view');
    history.replaceState(null, '', url.pathname + url.search);
  }
  $('saveState').textContent = 'Modifications non enregistrées';
  refreshComputed();
}

function refreshComputed() {
  $('totalDuree').textContent = `${computeDureeTotal(trame)} min`;
  const mats = consolidatedMaterial(trame);
  $('materialSummary').textContent = mats.length ? mats.join(' · ') : '—';
  trame.blocs.forEach((b, i) => {
    const el = document.querySelector(`[data-bloc-dur="${i}"]`);
    if (el) el.textContent = `${blocDuree(b)} min`;
  });
}

function collectMeta() {
  trame.titre = $('fTitre').value;
  trame.date = $('fDate').value;
  trame.theme = $('fTheme').value;
  trame.coach = $('fCoach').value;
  trame.objectif = $('fObjectif').value;
}

['fTitre', 'fDate', 'fTheme', 'fCoach', 'fObjectif'].forEach(id => {
  $(id).addEventListener('input', () => { if (readOnly) return; collectMeta(); $(id).removeAttribute('aria-invalid'); markDirty(); });
});

function addBloc(nom) {
  trame.blocs.push({ nom, notesCoach: '', ateliers: [] });
  targetBloc = trame.blocs.length - 1;
  markDirty();
  renderBlocs();
  const el = document.querySelector(`[data-bloc="${targetBloc}"]`);
  if (el) { el.scrollIntoView({ block: 'nearest' }); pulse(el); }
}

function addEntry(e) {
  if (readOnly) return;
  if (!trame.blocs.length) { trame.blocs.push({ nom: 'Exercice', notesCoach: '', ateliers: [] }); targetBloc = 0; }
  if (targetBloc >= trame.blocs.length) targetBloc = trame.blocs.length - 1;
  exerciseVersions[e.versionId] = exerciseVersions[e.versionId] || evFromCatalog(e);
  const bloc = trame.blocs[targetBloc];
  bloc.ateliers.push({ exerciceId: e.id, exerciceVersionId: e.versionId, dureeOverride: null });
  markDirty();
  renderBlocs();
  const row = document.querySelector(`[data-entry="${targetBloc}-${bloc.ateliers.length - 1}"]`);
  if (row) { row.scrollIntoView({ block: 'nearest' }); pulse(row); }
}

function move(arr, i, delta) {
  const j = i + delta;
  if (j < 0 || j >= arr.length) return false;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  return true;
}

/* ── Rendu de l'éditeur ───────────────────────────────────────────────── */
function thumbHtml(info, vid, cls) {
  if (info.snapshot) return `<img class="${cls}" src="${escapeHtml(info.snapshot)}" alt="" />`;
  if (vid != null && info.hasSnapshot) return `<img class="${cls}" src="/api/versions/${vid}/snapshot" alt="" loading="lazy" />`;
  return `<span class="${cls} thumb-placeholder" aria-hidden="true">▭</span>`;
}

function renderBlocs() {
  const list = $('blocList');
  if (!trame.blocs.length) {
    list.innerHTML = '<p class="bloc-empty-all">Ajoutez un bloc avec les boutons ci-dessous, puis des exercices depuis le panneau de droite.</p>';
    refreshComputed();
    return;
  }
  const ro = !!readOnly;
  list.innerHTML = trame.blocs.map((bloc, i) => {
    const rows = bloc.ateliers.map((a, j) => {
      const info = entryInfo(a);
      const eff = effectiveDuree(a);
      const vid = a.exerciceVersionId;
      const latest = !info.isLatest && !info.legacy ? catalog.find(e => e.id === a.exerciceId) : null;
      return `<div class="entry" data-entry="${i}-${j}">
        ${thumbHtml(info, vid, 'entry-thumb')}
        <span class="entry-name" title="${escapeHtml(info.name)}">${escapeHtml(info.name)}</span>
        ${info.versionNo ? `<span class="badge">v${info.versionNo}</span>` : ''}
        ${!info.isLatest && !info.legacy ? `<span class="badge badge--warn">Nouvelle version disponible</span>` : ''}
        ${latest && !ro ? `<button type="button" class="btn btn--small" data-act="latest" data-b="${i}" data-e="${j}">Utiliser la dernière version</button>` : ''}
        ${eff == null ? '<span class="badge badge--err">Durée manquante</span>' : ''}
        <span class="entry-spacer"></span>
        ${a.exerciceVersionId != null
          ? `<input class="field-input entry-min" type="number" min="1" max="180" step="1" inputmode="numeric"
               aria-label="Durée en minutes de ${escapeHtml(info.name)}" placeholder="${info.duree ?? ''}"
               value="${Number.isInteger(a.dureeOverride) ? a.dureeOverride : ''}" data-b="${i}" data-e="${j}" ${ro ? 'disabled' : ''} />`
          : `<span class="entry-legacy-dur">${eff ?? '?'}</span>`}
        <span class="entry-min-label">min</span>
        ${ro ? '' : `<button type="button" class="btn btn--icon" data-act="up" data-b="${i}" data-e="${j}" aria-label="Monter">↑</button>
        <button type="button" class="btn btn--icon" data-act="down" data-b="${i}" data-e="${j}" aria-label="Descendre">↓</button>
        <button type="button" class="btn btn--icon" data-act="remove" data-b="${i}" data-e="${j}" aria-label="Retirer de la trame">✕</button>`}
      </div>`;
    }).join('');
    return `<section class="bloc ${i === targetBloc && !ro ? 'is-target' : ''}" data-bloc="${i}">
      <div class="bloc-head">
        <span class="bloc-num">BLOC ${String(i + 1).padStart(2, '0')}</span>
        <input class="field-input bloc-name-input" maxlength="60" value="${escapeHtml(bloc.nom)}" data-b="${i}" aria-label="Nom du bloc ${i + 1}" ${ro ? 'disabled' : ''} />
        <span class="bloc-dur" data-bloc-dur="${i}">${blocDuree(bloc)} min</span>
        ${ro ? '' : `<button type="button" class="btn btn--icon" data-act="bup" data-b="${i}" aria-label="Monter le bloc">↑</button>
        <button type="button" class="btn btn--icon" data-act="bdown" data-b="${i}" aria-label="Descendre le bloc">↓</button>
        <button type="button" class="btn btn--icon" data-act="bremove" data-b="${i}" aria-label="Supprimer le bloc">✕</button>`}
      </div>
      <div class="bloc-ateliers-list">${rows || '<p class="bloc-empty">Aucun exercice — cliquez « + » dans le panneau de droite.</p>'}</div>
      <textarea class="field-input bloc-notes" rows="1" data-field="notesCoach" data-b="${i}" placeholder="Consignes du coach (facultatif)" ${ro ? 'disabled' : ''}>${escapeHtml(bloc.notesCoach || '')}</textarea>
    </section>`;
  }).join('');
  refreshComputed();
  updatePickerTarget();
}

$('blocList').addEventListener('click', async e => {
  if (readOnly) return;
  const btn = e.target.closest('[data-act]');
  if (btn) {
    const i = Number(btn.dataset.b);
    const j = Number(btn.dataset.e);
    const bloc = trame.blocs[i];
    const act = btn.dataset.act;
    let changed = false;
    if (act === 'up') changed = move(bloc.ateliers, j, -1);
    else if (act === 'down') changed = move(bloc.ateliers, j, 1);
    else if (act === 'remove') { bloc.ateliers.splice(j, 1); changed = true; }
    else if (act === 'bup') { changed = move(trame.blocs, i, -1); if (changed) targetBloc = i - 1; }
    else if (act === 'bdown') { changed = move(trame.blocs, i, 1); if (changed) targetBloc = i + 1; }
    else if (act === 'bremove') {
      if (bloc.ateliers.length && !(await confirmDialog(`Supprimer le bloc « ${bloc.nom} » et ses ${bloc.ateliers.length} exercice(s) de la trame ?`, { okLabel: 'Supprimer' }))) return;
      trame.blocs.splice(i, 1);
      targetBloc = Math.min(targetBloc, Math.max(0, trame.blocs.length - 1));
      changed = true;
    } else if (act === 'latest') {
      const a = bloc.ateliers[j];
      const latest = catalog.find(x => x.id === a.exerciceId);
      if (latest) {
        exerciseVersions[latest.versionId] = evFromCatalog(latest);
        a.exerciceVersionId = latest.versionId;
        changed = true;
        toast(`« ${latest.name} » utilise maintenant la version n°${latest.versionNo}`, 'ok');
      }
    }
    if (changed) { markDirty(); renderBlocs(); }
    return;
  }
  const blocEl = e.target.closest('[data-bloc]');
  if (blocEl) {
    const i = Number(blocEl.dataset.bloc);
    if (i !== targetBloc) {
      targetBloc = i;
      document.querySelectorAll('.bloc.is-target').forEach(el => el.classList.remove('is-target'));
      blocEl.classList.add('is-target');
      updatePickerTarget();
    }
  }
});

$('blocList').addEventListener('focusin', e => {
  const blocEl = e.target.closest('[data-bloc]');
  if (blocEl && !readOnly && Number(blocEl.dataset.bloc) !== targetBloc) {
    targetBloc = Number(blocEl.dataset.bloc);
    document.querySelectorAll('.bloc.is-target').forEach(el => el.classList.remove('is-target'));
    blocEl.classList.add('is-target');
    updatePickerTarget();
  }
});

$('blocList').addEventListener('input', e => {
  if (readOnly) return;
  const t = e.target;
  const i = Number(t.dataset.b);
  if (t.classList.contains('bloc-name-input')) { trame.blocs[i].nom = t.value; markDirty(); return; }
  if (t.dataset.field === 'notesCoach') { trame.blocs[i].notesCoach = t.value; markDirty(); return; }
  if (t.classList.contains('entry-min')) {
    const a = trame.blocs[i].ateliers[Number(t.dataset.e)];
    const raw = t.value.trim();
    const n = Number(raw);
    if (raw === '') { a.dureeOverride = null; t.removeAttribute('aria-invalid'); }
    else if (Number.isInteger(n) && n >= 1 && n <= 180) { a.dureeOverride = n; t.removeAttribute('aria-invalid'); }
    else { t.setAttribute('aria-invalid', 'true'); return; }
    markDirty();
    updateEntryBadges(i, Number(t.dataset.e));
  }
});

// Met à jour le badge « Durée manquante » sans reconstruire la ligne (garde le focus).
function updateEntryBadges(i, j) {
  const row = document.querySelector(`[data-entry="${i}-${j}"]`);
  if (!row) return;
  const missing = effectiveDuree(trame.blocs[i].ateliers[j]) == null;
  let badge = row.querySelector('.badge--err');
  if (missing && !badge) {
    badge = document.createElement('span');
    badge.className = 'badge badge--err';
    badge.textContent = 'Durée manquante';
    row.querySelector('.entry-spacer').before(badge);
  } else if (!missing && badge) badge.remove();
}

/* ── Panneau de droite : catalogue (mêmes filtres que la bibliothèque) ── */
function updatePickerTarget() {
  const b = trame && trame.blocs[targetBloc];
  $('pickerTarget').textContent = readOnly ? 'Lecture seule' : (b ? `Ajout dans : BLOC ${String(targetBloc + 1).padStart(2, '0')} · ${b.nom}` : 'Le premier « + » crée un bloc « Exercice ».');
}

function renderPicker() {
  const lib = $('pLib').value ? Number($('pLib').value) : null;
  const them = $('pThem').value;
  const q = norm($('pSearch').value.trim());
  const list = catalog.filter(e =>
    (lib == null || e.libraryIds.includes(lib)) &&
    (!them || e.thematique === them) &&
    (!q || norm(e.name + ' ' + e.notes).includes(q)));
  $('pickerList').innerHTML = list.length ? list.map(e => `
    <div class="pick-card" data-pick="${escapeHtml(e.id)}">
      ${thumbHtml({ hasSnapshot: e.hasSnapshot }, e.versionId, 'pick-thumb')}
      <span class="pick-body">
        <span class="pick-name">${escapeHtml(e.name)}</span>
        <span class="pick-meta"><span class="badge badge--${escapeHtml(e.thematique)}">${escapeHtml(THEM_LABELS[e.thematique] || '—')}</span> ${e.duree ? e.duree + ' min' : 'durée ?'}</span>
      </span>
      <button type="button" class="btn btn--primary btn--icon pick-add" data-add="${escapeHtml(e.id)}" aria-label="Ajouter ${escapeHtml(e.name)}" title="Ajouter au bloc cible">+</button>
    </div>`).join('') : '<p class="picker-empty">Aucun exercice ne correspond à ces filtres.</p>';
}

let pickTimer = null;
$('pSearch').addEventListener('input', () => { clearTimeout(pickTimer); pickTimer = setTimeout(renderPicker, 150); });
$('pThem').addEventListener('change', renderPicker);
$('pLib').addEventListener('change', renderPicker);
$('pickerList').addEventListener('click', e => {
  const b = e.target.closest('[data-add]');
  if (!b) return;
  const ex = catalog.find(x => x.id === b.dataset.add);
  if (ex) addEntry(ex);
});

/* ── Vues ─────────────────────────────────────────────────────────────── */
function setView(view) {
  $('editorView').hidden = view !== 'editor';
  $('trameList').hidden = view !== 'list';
  $('documentView').hidden = view !== 'document';
  $('btnBackEditor').hidden = view === 'editor';
  $('btnPrint').hidden = view !== 'document';
  $('btnSave').hidden = view !== 'editor';
  $('btnExport').hidden = view === 'list';
  document.body.dataset.view = view;
}

function showEditor() {
  setView('editor');
  $('readonlyBanner').hidden = !readOnly;
  if (readOnly) $('readonlyText').textContent = `Version n°${readOnly.versionNo} du ${formatDateTime(readOnly.savedAt)} — lecture seule.`;
  $('fTitre').value = trame.titre || '';
  $('fDate').value = trame.date || '';
  $('fTheme').value = trame.theme || '';
  $('fCoach').value = trame.coach || '';
  $('fObjectif').value = trame.objectif || '';
  ['fTitre', 'fDate', 'fTheme', 'fCoach', 'fObjectif'].forEach(id => { $(id).disabled = !!readOnly; });
  document.querySelectorAll('[data-addbloc]').forEach(b => { b.disabled = !!readOnly; });
  $('btnSave').disabled = !!readOnly;
  $('btnExport').disabled = !!readOnly;
  $('saveState').textContent = readOnly ? '' : (dirty ? 'Modifications non enregistrées'
    : (serverVersion ? `Version n°${serverVersion.versionNo}` : 'Nouvelle trame'));
  renderBlocs();
  renderPicker();
}

document.querySelectorAll('[data-addbloc]').forEach(b => b.addEventListener('click', () => addBloc(b.dataset.addbloc)));

/* ── Enregistrement ───────────────────────────────────────────────────── */
async function saveSeance() {
  if (readOnly) return false;
  collectMeta();
  document.querySelectorAll('[aria-invalid="true"]').forEach(el => el.removeAttribute('aria-invalid'));
  try {
    const r = await api('POST', '/api/seances', trame);
    localStorage.removeItem(draftKey(trame.id));
    dirty = false;
    serverVersion = { versionId: r.versionId, versionNo: r.versionNo };
    $('draftBanner').hidden = true;
    $('saveState').textContent = `Version n°${r.versionNo}`;
    toast(r.created ? `Trame enregistrée — version n°${r.versionNo}` : 'Aucun changement', 'ok');
    pulse($('btnSave'));
    const url = new URL(location.href);
    url.searchParams.set('id', trame.id);
    history.replaceState(null, '', url.pathname + url.search);
    return true;
  } catch (err) {
    toast(err.message, 'err');
    const field = { titre: 'fTitre', date: 'fDate' }[err.field];
    if (field) $(field).setAttribute('aria-invalid', 'true');
    return false;
  }
}

$('btnSave').addEventListener('click', saveSeance);
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 's') {
    e.preventDefault();
    if (!$('editorView').hidden) saveSeance();
  }
});

/* ── Brouillon local ──────────────────────────────────────────────────── */
$('btnDraftResume').addEventListener('click', async () => {
  const text = localStorage.getItem(draftKey(trame.id));
  $('draftBanner').hidden = true;
  if (!text) return;
  try {
    trame = JSON.parse(text);
    dirty = true;
    await resolveMissing();
    targetBloc = Math.max(0, trame.blocs.length - 1);
    showEditor();
    $('saveState').textContent = 'Modifications non enregistrées';
    toast('Modifications reprises. Enregistrez pour créer une version.', 'ok');
  } catch (e) { toast('Brouillon illisible.', 'err'); }
});
$('btnDraftIgnore').addEventListener('click', () => {
  localStorage.removeItem(draftKey(trame.id));
  $('draftBanner').hidden = true;
});

/* ── Mes trames ───────────────────────────────────────────────────────── */
async function showList() {
  setView('list');
  $('draftBanner').hidden = true;
  $('readonlyBanner').hidden = true;
  const cards = $('trameCards');
  cards.innerHTML = '<p>Chargement…</p>';
  let list = [];
  try { list = await api('GET', '/api/seances'); } catch (e) { cards.innerHTML = `<p>${escapeHtml(e.message)}</p>`; return; }
  if (!list.length) { cards.innerHTML = '<p class="list-empty">Aucune trame enregistrée.</p>'; return; }
  const resolved = await Promise.all(list.map(t => api('GET', `/api/seances/${encodeURIComponent(t.id)}`).catch(() => null)));
  cards.innerHTML = list.map((t, k) => {
    const r = resolved[k];
    const dur = r ? computeDureeTotal(r.trame, r.exerciseVersions) : 0;
    return `<article class="card trame-card" data-trame="${escapeHtml(t.id)}">
      <h3 class="trame-card-title">${escapeHtml(t.titre || 'Sans titre')}</h3>
      <p class="trame-card-meta">${escapeHtml(formatDate(t.date))} · ${r ? 'version n°' + r.versionNo : ''} · ${dur} min</p>
      <div class="trame-card-actions">
        <button type="button" class="btn btn--primary btn--small" data-open="${escapeHtml(t.id)}">Ouvrir</button>
        <button type="button" class="btn btn--small" data-versions="${escapeHtml(t.id)}">Versions</button>
        <button type="button" class="btn btn--small" data-exports="${escapeHtml(t.id)}">Exports</button>
        <button type="button" class="btn btn--danger btn--small" data-del="${escapeHtml(t.id)}" data-write>Supprimer</button>
      </div>
      <div class="trame-card-extra" data-extra="${escapeHtml(t.id)}"></div>
    </article>`;
  }).join('');
}

$('trameCards').addEventListener('click', async e => {
  const open = e.target.closest('[data-open]');
  if (open) {
    history.replaceState(null, '', `${location.pathname}?id=${encodeURIComponent(open.dataset.open)}`);
    await openTrame(open.dataset.open);
    return;
  }
  const vers = e.target.closest('[data-versions]');
  if (vers) {
    const id = vers.dataset.versions;
    const box = document.querySelector(`[data-extra="${CSS.escape(id)}"]`);
    try {
      const vs = await api('GET', `/api/seances/${encodeURIComponent(id)}/versions`);
      box.innerHTML = `<ul class="mini-list">${vs.map(v =>
        `<li><button type="button" class="btn btn--small" data-showversion="${v.versionId}">v${v.versionNo} · ${escapeHtml(formatDateTime(v.savedAt))} · ${escapeHtml(v.titre)}</button></li>`).join('')}</ul>`;
    } catch (err) { toast(err.message, 'err'); }
    return;
  }
  const exps = e.target.closest('[data-exports]');
  if (exps) {
    const id = exps.dataset.exports;
    const box = document.querySelector(`[data-extra="${CSS.escape(id)}"]`);
    try {
      const xs = await api('GET', `/api/seances/${encodeURIComponent(id)}/exports`);
      box.innerHTML = xs.length ? `<ul class="mini-list">${xs.map(x => `<li>
        <span>${escapeHtml(formatDateTime(x.exportedAt))} — version n°${x.trameVersionNo}</span>
        <a class="btn btn--small" href="/api/exports/${x.exportId}" target="_blank" rel="noopener">Ouvrir l'archive</a>
        <button type="button" class="btn btn--small" data-showversion="${x.trameVersionId}">Rouvrir cette version</button>
      </li>`).join('')}</ul>` : '<p>Aucun export pour cette trame.</p>';
    } catch (err) { toast(err.message, 'err'); }
    return;
  }
  const show = e.target.closest('[data-showversion]');
  if (show) {
    try {
      const r = await api('GET', `/api/seances/versions/${show.dataset.showversion}`);
      applyResolved(r);
      readOnly = { versionId: r.versionId, versionNo: r.versionNo, savedAt: r.savedAt };
      dirty = false;
      history.replaceState(null, '', `${location.pathname}?id=${encodeURIComponent(r.trameId)}`);
      showEditor();
    } catch (err) { toast(err.message, 'err'); }
    return;
  }
  const del = e.target.closest('[data-del]');
  if (del) {
    const card = del.closest('[data-trame]');
    const title = card.querySelector('.trame-card-title').textContent;
    if (!(await confirmDialog(`Supprimer la trame « ${title} » ? Ses versions et ses exports restent archivés.`, { okLabel: 'Supprimer' }))) return;
    try {
      await api('DELETE', `/api/seances/${encodeURIComponent(del.dataset.del)}`);
      toast('Trame supprimée', 'ok');
      showList();
    } catch (err) { toast(err.message, 'err'); }
  }
});

$('btnResumeVersion').addEventListener('click', () => {
  // La version reprise devient le contenu de l'éditeur ; Enregistrer créera une nouvelle version.
  readOnly = null;
  markDirty();
  showEditor();
  toast('Version reprise. Enregistrez pour créer une nouvelle version.', 'ok');
});
$('btnLeaveReadonly').addEventListener('click', () => openTrame(trame.id));

$('btnList').addEventListener('click', showList);
$('btnBackEditor').addEventListener('click', () => {
  if (trame) showEditor(); else openTrame(newTrame().id);
});
$('btnNew').addEventListener('click', () => {
  trame = newTrame();
  exerciseVersions = {};
  serverVersion = null;
  dirty = false;
  readOnly = null;
  targetBloc = 0;
  $('draftBanner').hidden = true;
  history.replaceState(null, '', location.pathname);
  showEditor();
  $('fTitre').focus();
});

/* ── Document imprimable (CA11–CA16) ──────────────────────────────────── */
function buildDocument(resolved, { versionNo, exportedAt, preview = false }) {
  const t = resolved.trame;
  const evs = resolved.exerciseVersions || {};
  const total = computeDureeTotal(t, evs);
  const mats = consolidatedMaterial(t, evs);
  const d = new Date(exportedAt);
  const p = n => String(n).padStart(2, '0');
  const dateFr = `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  const when = `${dateFr} à ${p(d.getHours())}:${p(d.getMinutes())}`;
  const summary = t.blocs.map((b, i) => `${i + 1}. ${escapeHtml(b.nom)} — ${blocDuree(b, evs)} min`).join(' · ');

  const blocsHtml = t.blocs.map((b, i) => {
    const ateliers = (b.ateliers || []).map(a => {
      const info = entryInfo(a, evs);
      const vid = a.exerciceVersionId;
      const src = info.snapshot || (vid != null ? `/api/versions/${vid}/snapshot` : '');
      return `<article class="doc-atelier">
        ${src ? `<img class="doc-schema" src="${escapeHtml(src)}" alt="Schéma de ${escapeHtml(info.name)}" />` : '<div class="doc-schema doc-schema--none">Schéma indisponible</div>'}
        <h4 class="doc-atelier-name">${escapeHtml(info.name)}${info.versionNo ? ` <span class="doc-version">v${info.versionNo}</span>` : ''}</h4>
        <p class="doc-line"><span class="doc-label">Durée</span> ${effectiveDuree(a, evs) ?? '—'} min</p>
        <p class="doc-line"><span class="doc-label">Description</span> <span class="doc-text">${escapeHtml(info.description || info.notes || '—')}</span></p>
        <p class="doc-line"><span class="doc-label">Matériel</span> ${escapeHtml(info.material || 'Non renseigné')}</p>
      </article>`;
    }).join('');
    return `<section class="doc-bloc">
      <div class="doc-bloc-header"><span class="doc-bloc-num">BLOC ${String(i + 1).padStart(2, '0')}</span> · <span class="doc-bloc-name">${escapeHtml(b.nom)}</span> · ${blocDuree(b, evs)} min</div>
      <div class="doc-bloc-grid">${ateliers || '<p class="doc-empty">Aucun exercice</p>'}</div>
      ${b.notesCoach && b.notesCoach.trim() ? `<p class="doc-consignes"><span class="doc-label">Consignes du coach</span> ${escapeHtml(b.notesCoach)}</p>` : ''}
    </section>`;
  }).join('');

  $('docPage').innerHTML = `
    <header class="doc-header">
      <p class="doc-brand">Handball Engine · Trame d'entraînement</p>
      <h1 class="doc-seance-title">${escapeHtml(t.titre || 'Trame sans titre')}</h1>
      <p class="doc-meta">${escapeHtml(formatDate(t.date))}${t.theme ? ' · Thème : ' + escapeHtml(t.theme) : ''}${t.coach ? ' · Coach : ' + escapeHtml(t.coach) : ''}</p>
      <p class="doc-total">Durée totale : ${total} min</p>
      <p class="doc-version-line">Trame version n°${versionNo} · ${preview ? 'aperçu du' : 'exportée le'} ${when}</p>
      ${t.objectif ? `<p class="doc-objectif"><span class="doc-label">Objectif</span> ${escapeHtml(t.objectif)}</p>` : ''}
      <p class="doc-material"><span class="doc-label">Matériel</span> ${escapeHtml(mats.length ? mats.join(' · ') : 'Non renseigné')}</p>
      <p class="doc-summary">${summary}</p>
    </header>
    ${blocsHtml}
    <section class="doc-notes"><h2 class="doc-notes-title">Notes du coach</h2><div class="doc-notes-lines"></div></section>
    <footer class="doc-footer">Handball Engine · ${escapeHtml(t.titre || '')} · v${versionNo} · ${dateFr}</footer>`;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

async function buildArchive(resolved, versionNo, exportedAt) {
  const css = await (await fetch('/src/css/trame-print.css')).text();
  const clone = $('docPage').cloneNode(true);
  for (const img of clone.querySelectorAll('img')) {
    const src = img.getAttribute('src');
    if (src && !src.startsWith('data:')) img.setAttribute('src', await blobToDataUrl(await (await fetch(src)).blob()));
  }
  const d = new Date(exportedAt);
  const p = n => String(n).padStart(2, '0');
  const titre = escapeHtml(resolved.trame.titre || 'Trame');
  return '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>' + titre + ' — version n°' + versionNo + '</title><style>' +
    css + '</style></head><body><div class="no-print archive-banner">Archive du ' +
    `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}` + ' — trame « ' + titre + ' » version n°' + versionNo +
    '. Imprimez avec Ctrl+P.</div><div id="documentView">' + clone.outerHTML + '</div></body></html>';
}

function highlightEntry(i, j) {
  const el = j == null ? document.querySelector(`[data-bloc="${i}"]`) : document.querySelector(`[data-entry="${i}-${j}"]`);
  if (!el) return;
  el.classList.add('row-error');
  el.scrollIntoView({ block: 'nearest' });
  setTimeout(() => el.classList.remove('row-error'), 4000);
}

// Contrôles bloquants avant export : renvoie un message ou null.
function exportBlocker() {
  if (!trame.titre || !trame.titre.trim()) { $('fTitre').setAttribute('aria-invalid', 'true'); return 'Donnez un titre à la trame avant l\'export.'; }
  if (!trame.blocs.some(b => b.ateliers.length)) return 'Ajoutez au moins un exercice avant l\'export.';
  for (let i = 0; i < trame.blocs.length; i++) {
    const b = trame.blocs[i];
    for (let j = 0; j < b.ateliers.length; j++) {
      if (effectiveDuree(b.ateliers[j]) == null) {
        highlightEntry(i, j);
        return `Renseignez la durée de « ${entryInfo(b.ateliers[j]).name} » (bloc n°${i + 1}) avant l'export.`;
      }
    }
    if (b.ateliers.length > MAX_EXPORT_PER_BLOC) {
      highlightEntry(i);
      return `Le bloc n°${i + 1} contient plus de 4 exercices : il ne tiendrait pas sur une page. Scindez-le en deux blocs.`;
    }
  }
  return null;
}

async function exportPdf() {
  if (readOnly) return;
  collectMeta();
  if (dirty || !serverVersion) {
    if (!(await saveSeance())) return;
  }
  const blocker = exportBlocker();
  if (blocker) { toast(blocker, 'err'); return; }
  $('btnExport').disabled = true;
  try {
    const resolved = await api('GET', `/api/seances/versions/${serverVersion.versionId}`);
    const ensure = Object.entries(resolved.exerciseVersions).map(([vid, ev]) => ({ versionId: Number(vid), hasSnapshot: ev.hasSnapshot }));
    if (ensure.some(v => !v.hasSnapshot)) toast('Préparation des schémas…', 'ok');
    const { missing } = await window.HawebSnapshots.ensure(ensure);
    const missingNames = missing.map(vid => resolved.exerciseVersions[vid].name);
    for (const b of resolved.trame.blocs) for (const a of b.ateliers) {
      if (a.exerciceVersionId == null && !a.snapshot) missingNames.push(a.nom || 'Exercice');
    }
    if (missingNames.length) {
      toast(`Schéma indisponible pour : ${[...new Set(missingNames)].join(', ')}. Ouvrez ces exercices dans le Board puis réessayez.`, 'err');
      return;
    }
    const exportedAt = new Date().toISOString();
    buildDocument(resolved, { versionNo: resolved.versionNo, exportedAt });
    setView('document');
    await waitImages();
    // Un bloc plus haut qu'une page se couperait à l'impression : on le signale avant d'archiver.
    const tallIndex = findTallBloc();
    if (tallIndex !== null) {
      toast(`Le bloc n°${tallIndex + 1} est trop long pour une page A4 (descriptions trop longues). Raccourcissez les descriptions ou scindez le bloc.`, 'err');
      return;
    }
    const html = await buildArchive(resolved, resolved.versionNo, exportedAt);
    await api('POST', `/api/seances/${encodeURIComponent(trame.id)}/exports`, { trameVersionId: resolved.versionId, html });
    toast(`PDF archivé (version n°${resolved.versionNo}). Choisissez « Enregistrer au format PDF » dans la fenêtre d'impression.`, 'ok');
    window.print();
  } catch (err) {
    toast(err.message || 'Export impossible.', 'err');
  } finally {
    $('btnExport').disabled = false;
  }
}

// Hauteur utile d'une page A4 à 186 mm de large (273 mm de haut, en pixels écran), avec marge.
const MAX_BLOC_PX = 1000;

// Renvoie l'index du premier bloc plus haut qu'une page, ou null.
function findTallBloc() {
  const blocs = [...$('docPage').querySelectorAll('.doc-bloc')];
  const i = blocs.findIndex(b => b.getBoundingClientRect().height > MAX_BLOC_PX);
  return i >= 0 ? i : null;
}

function waitImages() {
  const imgs = [...$('docPage').querySelectorAll('img')];
  return Promise.all(imgs.map(img => img.complete ? null : new Promise(r => { img.onload = img.onerror = r; })));
}

$('btnExport').addEventListener('click', () => {
  if (document.body.dataset.view === 'document') { setView('editor'); showEditor(); }
  exportPdf();
});
$('btnPrint').addEventListener('click', () => window.print());

async function showDocumentPreview() {
  if (!serverVersion) { toast('Enregistrez la trame pour afficher son aperçu.', 'warn'); return; }
  const resolved = await api('GET', `/api/seances/versions/${serverVersion.versionId}`);
  buildDocument(resolved, { versionNo: resolved.versionNo, exportedAt: new Date().toISOString(), preview: true });
  setView('document');
}

/* ── Démarrage ────────────────────────────────────────────────────────── */
async function init() {
  renderNav('trames');
  await loadCatalog();
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (id && /^[a-zA-Z0-9_-]{1,64}$/.test(id)) {
    await openTrame(id);
    if (params.get('view') === 'document') await showDocumentPreview();
  } else {
    trame = newTrame();
    showEditor();
  }
}

init();
