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
  dureeTotal: 0,
  objectif: '',
  blocs: [],
};

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
    await loadSeance(editId);
    showEditor();
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
    dureeTotal: 0,
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
    if (found) seance = found;
  } catch(e) {
    toast('Erreur chargement séance', 'err');
  }
  renderEditor();
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
  document.getElementById('fDuree').value    = seance.dureeTotal || '';

  renderBlocList();
  updateMaterialSummary();
}

function collectMeta() {
  seance.titre      = document.getElementById('fTitre').value.trim();
  seance.date       = document.getElementById('fDate').value;
  seance.theme      = document.getElementById('fTheme').value.trim();
  seance.coach      = document.getElementById('fCoach').value.trim();
  seance.objectif   = document.getElementById('fObjectif').value.trim();
  seance.dureeTotal = parseInt(document.getElementById('fDuree').value) || 0;
}

function renderBlocList() {
  const container = document.getElementById('blocList');
  container.innerHTML = '';

  seance.blocs.forEach((bloc, idx) => {
    const el = createBlocEl(bloc, idx);
    container.appendChild(el);
  });
}

function createBlocEl(bloc, idx) {
  const typeLabels = {
    echauffement: 'Échauffement',
    exercice:     'Exercice',
    opposition:   'Opposition libre',
    retour_calme: 'Retour au calme',
  };

  const div = document.createElement('div');
  div.className = 'bloc';
  div.dataset.type = bloc.type;

  const ex = allExercises.find(e => e.id === bloc.exerciceId);
  const snap = ex?.explanation?.steps?.[0]?.snapshot || null;

  div.innerHTML = `
    <div class="bloc-header">
      <span class="bloc-num">BLOC ${String(idx + 1).padStart(2, '0')}</span>
      <span class="bloc-type-badge">${typeLabels[bloc.type] || bloc.type}</span>
      <span class="bloc-name">${ex ? ex.name : (bloc.type === 'opposition' ? 'Opposition libre' : '— Aucun exercice —')}</span>
      <span class="bloc-duration">${bloc.duree ? bloc.duree + ' min' : ''}</span>
      <div class="bloc-actions">
        <button class="bloc-action-btn" title="Monter" data-action="up" data-idx="${idx}">↑</button>
        <button class="bloc-action-btn" title="Descendre" data-action="down" data-idx="${idx}">↓</button>
        <button class="bloc-action-btn danger" title="Supprimer" data-action="del" data-idx="${idx}">✕</button>
      </div>
    </div>
    <div class="bloc-body">
      <div class="bloc-thumb">
        ${snap
          ? `<img src="${snap}" alt="schéma" />`
          : `<div class="bloc-thumb-empty">Schéma<br>disponible<br>à la sauvegarde<br>de l'exercice</div>`}
      </div>
      <div class="bloc-fields">
        <div>
          <label class="field-label">Exercice</label>
          <div style="display:flex;gap:6px;align-items:center;">
            <span style="font-family:'Barlow Condensed',sans-serif;font-size:0.88rem;color:var(--text);flex:1;">
              ${ex ? ex.name : '—'}
            </span>
            <button class="btn" style="height:30px;padding:0 10px;font-size:0.72rem;" data-action="pick" data-idx="${idx}">
              ${ex ? 'Changer' : 'Choisir'}
            </button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label class="field-label">Durée (min)</label>
            <input class="field-input" type="number" min="1" max="120"
              value="${bloc.duree || ''}" data-field="duree" data-idx="${idx}" placeholder="15" />
          </div>
          <div>
            <label class="field-label">Type de bloc</label>
            <select class="field-select" data-field="type" data-idx="${idx}">
              <option value="echauffement"  ${bloc.type === 'echauffement'  ? 'selected' : ''}>Échauffement</option>
              <option value="exercice"      ${bloc.type === 'exercice'      ? 'selected' : ''}>Exercice</option>
              <option value="opposition"    ${bloc.type === 'opposition'    ? 'selected' : ''}>Opposition libre</option>
              <option value="retour_calme"  ${bloc.type === 'retour_calme'  ? 'selected' : ''}>Retour au calme</option>
            </select>
          </div>
        </div>
        <div>
          <label class="field-label">Notes coach (consignes spécifiques à cette séance)</label>
          <textarea class="field-textarea" rows="2" data-field="notesCoach" data-idx="${idx}"
            placeholder="Insister sur…">${bloc.notesCoach || ''}</textarea>
        </div>
      </div>
    </div>
  `;

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
      if (field === 'type') {
        seance.blocs[i].type = input.value;
        div.dataset.type = input.value;
        div.querySelector('.bloc-type-badge').textContent =
          { echauffement:'Échauffement', exercice:'Exercice',
            opposition:'Opposition libre', retour_calme:'Retour au calme' }[input.value] || input.value;
      } else if (field === 'duree') {
        seance.blocs[i].duree = parseInt(input.value) || 0;
        div.querySelector('.bloc-duration').textContent = seance.blocs[i].duree ? seance.blocs[i].duree + ' min' : '';
      } else if (field === 'notesCoach') {
        seance.blocs[i].notesCoach = input.value;
      }
      updateMaterialSummary();
    });
  });

  return div;
}

function addBloc(type) {
  seance.blocs.push({ type, exerciceId: null, duree: type === 'echauffement' ? 15 : type === 'retour_calme' ? 10 : 20, notesCoach: '' });
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
    const ex = allExercises.find(e => e.id === bloc.exerciceId);
    const mat = ex?.explanation?.material?.trim();
    if (mat) mat.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean).forEach(m => materials.add(m));
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

function openExercisePicker(blocIdx) {
  modalCallback = (exId) => {
    seance.blocs[blocIdx].exerciceId = exId;
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
  const q   = document.getElementById('modalSearch').value.toLowerCase();
  const cat = document.getElementById('modalCat').value;

  const filtered = allExercises.filter(ex => {
    const matchCat  = !cat || ex.category === cat;
    const matchQ    = !q || ex.name.toLowerCase().includes(q) || (ex.notes || '').toLowerCase().includes(q);
    return matchCat && matchQ;
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
      <div class="ex-card-cat" data-cat="${ex.category}">${catLabel(ex.category)}</div>
      ${ex.notes ? `<div class="ex-card-notes">${ex.notes}</div>` : ''}
    `;
    card.addEventListener('click', () => {
      if (modalCallback) modalCallback(ex.id);
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
    const dur     = s.dureeTotal   || 0;
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
          await loadSeance(id);
          showEditor();
        } else if (btn.dataset.action === 'doc') {
          await loadSeance(id);
          showDocument();
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
  const typeLabels = {
    echauffement: 'Échauffement',
    exercice:     'Exercice',
    opposition:   'Opposition libre',
    retour_calme: 'Retour au calme',
  };

  // Matériel consolidé
  const materials = new Set();
  seance.blocs.forEach(bloc => {
    const ex = allExercises.find(e => e.id === bloc.exerciceId);
    const mat = ex?.explanation?.material?.trim();
    if (mat) mat.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean).forEach(m => materials.add(m));
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
        ${seance.dureeTotal ? `
        <div class="doc-seance-meta-item">
          <span class="doc-seance-meta-label">Durée totale</span>
          <span class="doc-seance-meta-value">${seance.dureeTotal} min</span>
        </div>` : ''}
      </div>
      ${seance.objectif ? `<div class="doc-seance-objectif">${seance.objectif}</div>` : ''}
    </div>

    <div class="doc-material-bar">
      <span class="doc-material-label">⬡ Matériel</span>
      <span class="doc-material-value">${materials.size > 0 ? [...materials].join(' · ') : 'Non renseigné dans les exercices'}</span>
    </div>
  `;

  // Blocs
  seance.blocs.forEach((bloc, idx) => {
    const ex     = allExercises.find(e => e.id === bloc.exerciceId);
    const steps  = ex?.explanation?.steps || [];
    const snap   = steps[0]?.snapshot || null;
    const name   = ex ? ex.name : (bloc.type === 'opposition' ? 'Opposition libre' : 'Exercice libre');

    const blocEl = document.createElement('div');
    blocEl.className = 'doc-bloc';
    blocEl.dataset.type = bloc.type;

    // Header du bloc
    blocEl.innerHTML = `
      <div class="doc-bloc-header">
        <div class="doc-bloc-rail"></div>
        <div class="doc-bloc-label">
          <span class="doc-bloc-num">BLOC ${String(idx + 1).padStart(2, '0')}</span>
          <span class="doc-bloc-type">${typeLabels[bloc.type] || bloc.type}</span>
          ${bloc.duree ? `<span class="doc-bloc-dur">${bloc.duree} min</span>` : ''}
        </div>
        <div class="doc-bloc-name">${name}</div>
      </div>
      <div class="doc-bloc-body">
        <div class="doc-bloc-schema">
          ${snap
            ? `<img src="${snap}" alt="schéma ${name}" />`
            : `<div class="doc-bloc-schema-empty">Schéma<br>non disponible</div>`}
        </div>
        <div class="doc-bloc-content" id="doc-bloc-content-${idx}"></div>
      </div>
    `;

    page.appendChild(blocEl);

    const content = blocEl.querySelector(`#doc-bloc-content-${idx}`);

    // Notes coach
    if (bloc.notesCoach?.trim()) {
      const notes = document.createElement('div');
      notes.className = 'doc-bloc-notes-coach';
      notes.textContent = bloc.notesCoach;
      content.appendChild(notes);
    }

    // Étapes de l'exercice
    if (steps.length > 0) {
      steps.forEach((step, si) => {
        const stepEl = document.createElement('div');
        stepEl.className = 'doc-step';
        stepEl.innerHTML = `
          <div class="doc-step-num">Étape ${step.step || si + 1}</div>
          ${step.description ? `<div class="doc-step-desc">${step.description}</div>` : ''}
          ${step.attention ? `
            <div class="doc-step-attention">
              <span class="doc-step-attention-icon">⚠</span>
              <span>${step.attention}</span>
            </div>` : ''}
        `;
        content.appendChild(stepEl);
      });
    } else if (bloc.type === 'opposition') {
      const oppEl = document.createElement('div');
      oppEl.className = 'doc-step';
      oppEl.innerHTML = `
        <div class="doc-step-desc">Opposition libre — application des principes travaillés en séance.</div>
        <div class="doc-step-attention">
          <span class="doc-step-attention-icon">⚠</span>
          <span>Observer l'application des thèmes tactiques abordés.</span>
        </div>
      `;
      content.appendChild(oppEl);
    }

    // Zone annotation tablette
    const annotEl = document.createElement('div');
    annotEl.className = 'doc-annotation-zone';
    annotEl.textContent = 'Zone annotations';
    content.appendChild(annotEl);
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
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function catLabel(cat) {
  return { echauffement:'Échauffement', offensif:'Offensif', defensif:'Défensif',
           montee_balle:'Montée de balle', physique:'Physique' }[cat] || cat;
}

let toastTimer = null;
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 2800);
}
