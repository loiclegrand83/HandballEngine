'use strict';

/* ══════════════════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════════════════ */
let seance = {
  id: null,
  titre: '',
  date: todayISO(),
  theme: '',
  coach: '',
  objectif: '',
  blocs: [],
};

// Durée totale = somme des durées de tous les Ateliers, jamais persistée (AD-9) — recalculée à chaque affichage.
function computeDureeTotal(s) {
  return (s.blocs || []).reduce((total, bloc) =>
    total + (bloc.ateliers || []).reduce((sum, a) => sum + (parseInt(a.duree, 10) || 0), 0), 0);
}

let allExercises = [];
let modalCallback = null; // fonction appelée quand l'utilisateur sélectionne un exercice

/* ══════════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  await loadExercises();

  const params = new URLSearchParams(location.search);
  const editId = params.get('id');

  if (editId) {
    const ok = await loadSeance(editId);
    if (ok) {
      showEditor();
    } else {
      history.replaceState(null, '', location.pathname); // évite de re-déclencher le "introuvable" au rechargement
      await renderLibrary();
      showLibrary();
    }
  } else if (params.get('view') === 'library') {
    await renderLibrary();
    showLibrary();
  } else {
    newSeance();
    showEditor();
  }

  bindToolbar();
  bindModal();
});

/* ══════════════════════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════════════════════ */
function showEditor()  {
  document.getElementById('editorView').style.display   = '';
  document.getElementById('libraryView').style.display  = 'none';
  document.getElementById('documentView').style.display = 'none';
  document.getElementById('btnDocView').style.display   = '';
  document.getElementById('btnSave').style.display      = '';
  document.getElementById('btnLibrary').style.display   = '';
  document.getElementById('btnPrint').style.display     = 'none';
  document.getElementById('btnBackEdit').style.display  = 'none';
}

function showDocument() {
  buildDocument();
  document.getElementById('editorView').style.display   = 'none';
  document.getElementById('libraryView').style.display  = 'none';
  document.getElementById('documentView').style.display = '';
  document.getElementById('btnDocView').style.display   = 'none';
  document.getElementById('btnSave').style.display      = 'none';
  document.getElementById('btnLibrary').style.display   = 'none';
  document.getElementById('btnPrint').style.display     = '';
  document.getElementById('btnBackEdit').style.display  = '';
}

function showLibrary() {
  document.getElementById('editorView').style.display   = 'none';
  document.getElementById('libraryView').style.display  = '';
  document.getElementById('documentView').style.display = 'none';
  document.getElementById('btnDocView').style.display   = 'none';
  document.getElementById('btnSave').style.display      = 'none';
  document.getElementById('btnLibrary').style.display   = '';
  document.getElementById('btnPrint').style.display     = 'none';
  document.getElementById('btnBackEdit').style.display  = 'none';
}

/* ══════════════════════════════════════════════════════════════
   TOOLBAR
══════════════════════════════════════════════════════════════ */
function bindToolbar() {
  document.getElementById('btnSave').addEventListener('click', saveSeance);
  document.getElementById('btnDocView').addEventListener('click', () => {
    collectMeta();
    showDocument();
  });
  document.getElementById('btnPrint').addEventListener('click', () => window.print());
  document.getElementById('btnBackEdit').addEventListener('click', showEditor);
  document.getElementById('btnLibrary').addEventListener('click', async () => {
    await renderLibrary();
    showLibrary();
  });
  document.getElementById('btnHome').addEventListener('click', () => {
    window.location.href = '../index.html';
  });
  document.getElementById('btnNewSeance').addEventListener('click', () => {
    if (seance.blocs.length > 0 && !confirm('Créer une nouvelle séance ? Les modifications non sauvegardées seront perdues.')) return;
    newSeance();
    showEditor();
  });
}

/* ══════════════════════════════════════════════════════════════
   SÉANCE — CRUD
══════════════════════════════════════════════════════════════ */
function newSeance() {
  seance = {
    id: 'seance_' + Date.now(),
    titre: '',
    date: todayISO(),
    theme: '',
    coach: '',
    objectif: '',
    blocs: [],
  };
  renderEditor();
}

async function loadSeance(id) {
  try {
    const res = await fetch('/api/seances');
    const list = await res.json();
    const found = list.find(s => s.id === id);
    if (found) {
      seance = found;
      renderEditor();
      return true;
    }
    toast('Séance introuvable', 'err');
    return false;
  } catch(e) {
    toast('Erreur chargement séance', 'err');
    return false;
  }
}

async function saveSeance() {
  collectMeta();
  if (!seance.titre.trim()) { toast('Titre requis', 'warn'); return; }

  try {
    const res = await fetch('/api/seances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(seance),
    });
    if (res.ok) toast('Séance sauvegardée', 'ok');
    else toast('Erreur sauvegarde', 'err');
  } catch(e) {
    toast('Erreur réseau', 'err');
  }
}

async function deleteSeance(id) {
  if (!confirm('Supprimer cette séance ?')) return;
  try {
    await fetch(`/api/seances/${id}`, { method: 'DELETE' });
    await renderLibrary();
    toast('Séance supprimée', 'ok');
  } catch(e) {
    toast('Erreur suppression', 'err');
  }
}

/* ══════════════════════════════════════════════════════════════
   EXERCICES
══════════════════════════════════════════════════════════════ */
async function loadExercises() {
  try {
    const res = await fetch('/api/exercises');
    allExercises = await res.json();
  } catch(e) {
    allExercises = [];
  }
}

/* ══════════════════════════════════════════════════════════════
   ÉDITEUR — RENDU
══════════════════════════════════════════════════════════════ */
function renderEditor() {
  // Champs méta
  document.getElementById('fTitre').value    = seance.titre    || '';
  document.getElementById('fDate').value     = seance.date     || todayISO();
  document.getElementById('fTheme').value    = seance.theme    || '';
  document.getElementById('fCoach').value    = seance.coach    || '';
  document.getElementById('fObjectif').value = seance.objectif || '';

  renderBlocList();
  updateMaterialSummary();
}

function updateDureeTotalDisplay() {
  document.getElementById('fDureeTotal').value = computeDureeTotal(seance);
}

function collectMeta() {
  seance.titre      = document.getElementById('fTitre').value.trim();
  seance.date       = document.getElementById('fDate').value;
  seance.theme      = document.getElementById('fTheme').value.trim();
  seance.coach      = document.getElementById('fCoach').value.trim();
  seance.objectif   = document.getElementById('fObjectif').value.trim();
}

function renderBlocList() {
  const container = document.getElementById('blocList');
  container.innerHTML = '';

  seance.blocs.forEach((bloc, idx) => {
    const el = createBlocEl(bloc, idx);
    container.appendChild(el);
  });
  updateDureeTotalDisplay();
}

const BLOC_PRESET_LABELS = ['Échauffement', 'Exercice', 'Opposition libre', 'Retour au calme'];

function blocDataType(nom) {
  const match = BLOC_PRESET_LABELS.find(label => label.toLowerCase() === (nom || '').trim().toLowerCase());
  return match || 'default';
}

function createBlocEl(bloc, idx) {
  const div = document.createElement('div');
  div.className = 'bloc';
  div.dataset.type = blocDataType(bloc.nom);

  const totalDuree = (bloc.ateliers || []).reduce((sum, a) => sum + (a.duree || 0), 0);

  div.innerHTML = `
    <div class="bloc-header">
      <span class="bloc-num">BLOC ${String(idx + 1).padStart(2, '0')}</span>
      <input class="field-input bloc-name-input" type="text" data-field="nom" data-idx="${idx}"
        value="${escapeHtml(bloc.nom)}" placeholder="Nom du bloc" />
      <span class="bloc-duration">${totalDuree ? totalDuree + ' min' : ''}</span>
      <div class="bloc-actions">
        <button class="bloc-action-btn" title="Monter" data-action="up" data-idx="${idx}">↑</button>
        <button class="bloc-action-btn" title="Descendre" data-action="down" data-idx="${idx}">↓</button>
        <button class="bloc-action-btn danger" title="Supprimer" data-action="del" data-idx="${idx}">✕</button>
      </div>
    </div>
    <div class="bloc-body">
      <div class="bloc-fields">
        <div class="bloc-ateliers-list" id="bloc-ateliers-${idx}"></div>
        <div>
          <button class="btn" style="height:30px;padding:0 10px;font-size:0.72rem;" data-action="pick" data-idx="${idx}">
            + Ajouter un atelier
          </button>
        </div>
        <div>
          <label class="field-label">Notes coach (consignes spécifiques à cette séance)</label>
          <textarea class="field-textarea" rows="2" data-field="notesCoach" data-idx="${idx}"
            placeholder="Insister sur…">${bloc.notesCoach || ''}</textarea>
        </div>
      </div>
    </div>
  `;

  const ateliersList = div.querySelector(`#bloc-ateliers-${idx}`);
  const ateliers = bloc.ateliers || [];
  if (ateliers.length === 0) {
    ateliersList.innerHTML = '<div class="bloc-thumb-empty">— Aucun exercice —</div>';
  } else {
    ateliers.forEach((atelier, aidx) => {
      ateliersList.appendChild(createAtelierEl(bloc, idx, atelier, aidx));
    });
  }

  // Events
  div.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const i = parseInt(btn.dataset.idx);
      if (action === 'up')   moveBloc(i, -1);
      if (action === 'down') moveBloc(i,  1);
      if (action === 'del')  removeBloc(i);
      if (action === 'pick') openExercisePicker(i);
    });
  });

  div.querySelectorAll('[data-field]').forEach(input => {
    input.addEventListener('change', () => {
      const i     = parseInt(input.dataset.idx);
      const field = input.dataset.field;
      if (field === 'nom') {
        seance.blocs[i].nom = input.value;
        div.dataset.type = blocDataType(input.value);
      } else if (field === 'notesCoach') {
        seance.blocs[i].notesCoach = input.value;
      }
      updateMaterialSummary();
    });
  });

  return div;
}

function createAtelierEl(bloc, blocIdx, atelier, atelierIdx) {
  const snap = atelier.snapshot || null;

  const row = document.createElement('div');
  row.className = 'atelier-row';
  row.innerHTML = `
    <div class="bloc-thumb">
      ${snap
        ? `<img src="${snap}" alt="schéma" />`
        : `<div class="bloc-thumb-empty">Schéma<br>disponible<br>à la sauvegarde<br>de l'exercice</div>`}
    </div>
    <div style="flex:1; min-width: 180px;">
      <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
        <span style="font-family:'Barlow Condensed',sans-serif;font-size:0.88rem;color:var(--text);flex:1;min-width:120px;">
          ${escapeHtml(atelier.nom) || '—'}
        </span>
        <input class="field-input" type="number" min="1" max="120" style="width:70px;"
          value="${atelier.duree || ''}" data-atelier-field="duree" placeholder="min" />
        <button class="bloc-action-btn" title="Monter" data-atelier-action="up">↑</button>
        <button class="bloc-action-btn" title="Descendre" data-atelier-action="down">↓</button>
        <button class="btn" style="height:30px;padding:0 10px;font-size:0.72rem;" data-atelier-action="pick">Changer</button>
        <button class="bloc-action-btn danger" title="Supprimer" data-atelier-action="del">✕</button>
      </div>
    </div>
  `;

  row.querySelectorAll('[data-atelier-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const action = btn.dataset.atelierAction;
      if (action === 'up')   moveAtelier(blocIdx, atelierIdx, -1);
      if (action === 'down') moveAtelier(blocIdx, atelierIdx,  1);
      if (action === 'del')  removeAtelier(blocIdx, atelierIdx);
      if (action === 'pick') openExercisePicker(blocIdx, atelierIdx);
    });
  });

  row.querySelectorAll('[data-atelier-field]').forEach(input => {
    input.addEventListener('change', () => {
      const field = input.dataset.atelierField;
      if (field === 'duree') {
        seance.blocs[blocIdx].ateliers[atelierIdx].duree = parseInt(input.value) || 0;
        renderBlocList();
      }
    });
  });

  return row;
}

function removeAtelier(blocIdx, atelierIdx) {
  seance.blocs[blocIdx].ateliers.splice(atelierIdx, 1);
  renderBlocList();
  updateMaterialSummary();
}

function moveAtelier(blocIdx, atelierIdx, dir) {
  const ateliers = seance.blocs[blocIdx].ateliers;
  const to = atelierIdx + dir;
  if (to < 0 || to >= ateliers.length) return;
  [ateliers[atelierIdx], ateliers[to]] = [ateliers[to], ateliers[atelierIdx]];
  renderBlocList();
}

function addBloc(presetNom) {
  seance.blocs.push({ nom: presetNom, ateliers: [], notesCoach: '' });
  renderBlocList();
  updateMaterialSummary();
}

function removeBloc(idx) {
  seance.blocs.splice(idx, 1);
  renderBlocList();
  updateMaterialSummary();
}

function moveBloc(idx, dir) {
  const to = idx + dir;
  if (to < 0 || to >= seance.blocs.length) return;
  [seance.blocs[idx], seance.blocs[to]] = [seance.blocs[to], seance.blocs[idx]];
  renderBlocList();
}

/* ══════════════════════════════════════════════════════════════
   MATÉRIEL CONSOLIDÉ
══════════════════════════════════════════════════════════════ */
function updateMaterialSummary() {
  const materials = new Set();
  seance.blocs.forEach(bloc => {
    (bloc.ateliers || []).forEach(atelier => {
      const mat = atelier.materiel?.trim();
      if (mat) mat.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean).forEach(m => materials.add(m));
    });
  });

  const el = document.getElementById('materialSummary');
  if (materials.size === 0) {
    el.innerHTML = '<span class="material-summary-empty">Renseigner le matériel dans chaque exercice via le Board</span>';
  } else {
    el.textContent = [...materials].join(' · ');
  }
}

/* ══════════════════════════════════════════════════════════════
   MODALE SÉLECTION EXERCICE
══════════════════════════════════════════════════════════════ */
function bindModal() {
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });
  document.getElementById('modalSearch').addEventListener('input', filterModal);
  document.getElementById('modalCat').addEventListener('change', filterModal);
}

function openExercisePicker(blocIdx, atelierIdx) {
  modalCallback = (ex) => {
    const atelier = {
      exerciceId: ex.id,
      nom: ex.name || '',
      description: ex.notes || '',
      materiel: ex.explanation?.material || '',
      duree: 15,
      snapshot: ex.explanation?.steps?.[0]?.snapshot || null,
    };
    if (!seance.blocs[blocIdx].ateliers) seance.blocs[blocIdx].ateliers = [];
    if (atelierIdx === undefined) {
      seance.blocs[blocIdx].ateliers.push(atelier);
    } else {
      atelier.duree = seance.blocs[blocIdx].ateliers[atelierIdx].duree; // garde la durée déjà ajustée
      seance.blocs[blocIdx].ateliers[atelierIdx] = atelier;
    }
    renderBlocList();
    updateMaterialSummary();
  };
  document.getElementById('modalSearch').value = '';
  document.getElementById('modalCat').value    = '';
  filterModal();
  document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
  modalCallback = null;
}

function filterModal() {
  const q     = document.getElementById('modalSearch').value.toLowerCase();
  const them  = document.getElementById('modalCat').value;

  const filtered = allExercises.filter(ex => {
    const matchThem = !them || ex.thematique === them;
    const matchQ    = !q || ex.name.toLowerCase().includes(q) || (ex.notes || '').toLowerCase().includes(q);
    return matchThem && matchQ;
  });

  const grid = document.getElementById('exGrid');
  grid.innerHTML = '';

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="ex-empty">Aucun exercice trouvé</div>';
    return;
  }

  filtered.forEach(ex => {
    const card = document.createElement('div');
    card.className = 'ex-card';
    card.innerHTML = `
      <div class="ex-card-name">${ex.name}</div>
      <div class="ex-card-cat" data-cat="${ex.thematique}">${thematiqueLabel(ex.thematique)}</div>
      ${ex.notes ? `<div class="ex-card-notes">${ex.notes}</div>` : ''}
    `;
    card.addEventListener('click', () => {
      if (modalCallback) modalCallback(ex);
      closeModal();
    });
    grid.appendChild(card);
  });
}

/* ══════════════════════════════════════════════════════════════
   BIBLIOTHÈQUE SÉANCES
══════════════════════════════════════════════════════════════ */
async function renderLibrary() {
  let seances = [];
  try {
    const res = await fetch('/api/seances');
    seances = await res.json();
  } catch(e) { /* vide */ }

  seances.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const container = document.getElementById('libGrid');
  container.innerHTML = '';

  if (seances.length === 0) {
    container.innerHTML = '<div class="lib-empty">Aucune séance sauvegardée</div>';
    return;
  }

  seances.forEach(s => {
    const card = document.createElement('div');
    card.className = 'lib-card';
    const nbBlocs = s.blocs?.length || 0;
    const dur     = computeDureeTotal(s);
    card.innerHTML = `
      <div class="lib-card-date">${formatDate(s.date)}</div>
      <div class="lib-card-title">${s.titre || 'Sans titre'}</div>
      ${s.theme ? `<div class="lib-card-theme">${s.theme}</div>` : ''}
      <div class="lib-card-meta">${nbBlocs} bloc${nbBlocs > 1 ? 's' : ''}${dur ? ' · ' + dur + ' min' : ''}${s.coach ? ' · ' + s.coach : ''}</div>
      <div class="lib-card-actions">
        <button class="lib-btn" data-action="edit" data-id="${s.id}">Ouvrir</button>
        <button class="lib-btn" data-action="doc"  data-id="${s.id}">Document</button>
        <button class="lib-btn danger" data-action="del" data-id="${s.id}">Supprimer</button>
      </div>
    `;
    card.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (btn.dataset.action === 'edit') {
          if (await loadSeance(id)) showEditor();
        } else if (btn.dataset.action === 'doc') {
          if (await loadSeance(id)) showDocument();
        } else if (btn.dataset.action === 'del') {
          await deleteSeance(id);
        }
      });
    });
    container.appendChild(card);
  });
}

/* ══════════════════════════════════════════════════════════════
   VUE DOCUMENT IMPRIMABLE
══════════════════════════════════════════════════════════════ */
function buildDocument() {
  // Matériel consolidé
  const materials = new Set();
  seance.blocs.forEach(bloc => {
    (bloc.ateliers || []).forEach(atelier => {
      const mat = atelier.materiel?.trim();
      if (mat) mat.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean).forEach(m => materials.add(m));
    });
  });

  const page = document.getElementById('docPage');

  // En-tête
  page.innerHTML = `
    <div class="doc-seance-header">
      <div class="doc-seance-tag">Handball Engine · Feuille de route séance</div>
      <div class="doc-seance-title">${seance.titre || 'Séance sans titre'}</div>
      <div class="doc-seance-meta-row">
        <div class="doc-seance-meta-item">
          <span class="doc-seance-meta-label">Date</span>
          <span class="doc-seance-meta-value">${formatDate(seance.date)}</span>
        </div>
        ${seance.theme ? `
        <div class="doc-seance-meta-item">
          <span class="doc-seance-meta-label">Thématique</span>
          <span class="doc-seance-meta-value">${seance.theme}</span>
        </div>` : ''}
        ${seance.coach ? `
        <div class="doc-seance-meta-item">
          <span class="doc-seance-meta-label">Coach</span>
          <span class="doc-seance-meta-value">${seance.coach}</span>
        </div>` : ''}
        ${computeDureeTotal(seance) ? `
        <div class="doc-seance-meta-item">
          <span class="doc-seance-meta-label">Durée totale</span>
          <span class="doc-seance-meta-value">${computeDureeTotal(seance)} min</span>
        </div>` : ''}
      </div>
      ${seance.objectif ? `<div class="doc-seance-objectif">${seance.objectif}</div>` : ''}
    </div>

    <div class="doc-material-bar">
      <span class="doc-material-label">⬡ Matériel</span>
      <span class="doc-material-value">${materials.size > 0 ? escapeHtml([...materials].join(' · ')) : 'Non renseigné dans les exercices'}</span>
    </div>
  `;

  // Blocs
  seance.blocs.forEach((bloc, idx) => {
    const ateliers   = bloc.ateliers || [];
    const totalDuree = ateliers.reduce((sum, a) => sum + (a.duree || 0), 0);

    const blocEl = document.createElement('div');
    blocEl.className = 'doc-bloc';
    blocEl.dataset.type = blocDataType(bloc.nom);

    // Header du bloc
    blocEl.innerHTML = `
      <div class="doc-bloc-header">
        <div class="doc-bloc-rail"></div>
        <div class="doc-bloc-label">
          <span class="doc-bloc-num">BLOC ${String(idx + 1).padStart(2, '0')}</span>
          ${totalDuree ? `<span class="doc-bloc-dur">${totalDuree} min</span>` : ''}
        </div>
        <div class="doc-bloc-name">${escapeHtml(bloc.nom) || 'Bloc sans nom'}</div>
      </div>
      <div class="doc-bloc-body" id="doc-bloc-body-${idx}"></div>
    `;

    page.appendChild(blocEl);

    const body = blocEl.querySelector(`#doc-bloc-body-${idx}`);

    if (ateliers.length === 0) {
      const emptyEl = document.createElement('div');
      emptyEl.className = 'doc-bloc-schema-empty';
      emptyEl.textContent = 'Aucun exercice';
      body.appendChild(emptyEl);
    } else {
      const gridEl = document.createElement('div');
      gridEl.className = 'doc-bloc-grid';
      ateliers.forEach(atelier => {
        const cellEl = document.createElement('div');
        cellEl.className = 'doc-atelier-cell';
        cellEl.innerHTML = `
          <div class="doc-atelier-schema">
            ${atelier.snapshot
              ? `<img src="${atelier.snapshot}" alt="schéma ${escapeHtml(atelier.nom) || 'exercice'}" />`
              : `<div class="doc-bloc-schema-empty">Schéma<br>non disponible</div>`}
          </div>
          <div class="doc-atelier-name">${escapeHtml(atelier.nom) || '—'}${atelier.duree ? ` <span class="doc-atelier-dur">${atelier.duree} min</span>` : ''}</div>
          ${atelier.description ? `<div class="doc-atelier-desc">${escapeHtml(atelier.description)}</div>` : ''}
          ${atelier.materiel?.trim() ? `<div class="doc-atelier-materiel">⬡ ${escapeHtml(atelier.materiel)}</div>` : ''}
        `;
        gridEl.appendChild(cellEl);
      });
      body.appendChild(gridEl);
    }

    // Notes coach
    if (bloc.notesCoach?.trim()) {
      const notes = document.createElement('div');
      notes.className = 'doc-bloc-notes-coach';
      notes.textContent = bloc.notesCoach;
      body.appendChild(notes);
    }

    // Zone annotation tablette
    const annotEl = document.createElement('div');
    annotEl.className = 'doc-annotation-zone';
    annotEl.textContent = 'Zone annotations';
    body.appendChild(annotEl);
  });

  // Pied de page
  const footer = document.createElement('div');
  footer.className = 'doc-footer';
  footer.innerHTML = `
    <span class="doc-footer-brand"><strong>Handball Engine</strong> · Feuille de route</span>
    <span class="doc-footer-page">${formatDate(seance.date)}</span>
  `;
  page.appendChild(footer);
}

/* ══════════════════════════════════════════════════════════════
   UTILITAIRES
══════════════════════════════════════════════════════════════ */
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function thematiqueLabel(them) {
  return { attaque:'Attaque', defense:'Défense', gardien:'Gardien',
           enclenchement:'Enclenchement' }[them] || them || '—';
}

let toastTimer = null;
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 2800);
}
