/* ══════════════════════════════════════════════════════════════
   PLANNING — Calendrier entraînements & matchs
══════════════════════════════════════════════════════════════ */

let events = [];       // toutes les entrées planning chargées du serveur
let allSeances = [];   // pour le lien "Séance liée"
let seancesLoaded = false; // false tant que allSeances n'a pas été chargé avec succès (évite les faux positifs "introuvable")
let viewDate = new Date(); // jour d'ancrage de la vue affichée (mois ou semaine)
let viewMode = 'month';    // 'month' | 'week'
let editingId = null;    // id de l'événement en cours d'édition (null = création)
let editingType = 'entrainement';
let toastTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
  bindToolbar();
  bindModal();
  await loadSeancesForLink(); // allSeances doit être chargé avant le premier rendu (détection des références orphelines)
  loadEvents();
});

// Lundi de la semaine contenant d (Lundi = 0 ... Dimanche = 6, même convention que le rendu mensuel).
function mondayOf(d) {
  const offset = (d.getDay() + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - offset);
  return monday;
}

/* ══════════════════════════════════════════════════════════════
   CHARGEMENT
══════════════════════════════════════════════════════════════ */
async function loadEvents() {
  try {
    const res = await fetch('/api/planning');
    events = await res.json();
  } catch(e) {
    toast('Erreur chargement planning', 'err');
    events = [];
  }
  renderCalendar();
}

async function loadSeancesForLink() {
  try {
    const res = await fetch('/api/seances');
    allSeances = await res.json();
    const sel = document.getElementById('fSeanceLink');
    for (const s of allSeances) {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.titre || '(sans titre)';
      sel.appendChild(opt);
    }
    seancesLoaded = true;
  } catch(e) {
    // lien vers séance optionnel — pas bloquant si indisponible, mais la détection
    // de référence orpheline reste désactivée tant que allSeances n'est pas fiable
  }
}

/* ══════════════════════════════════════════════════════════════
   CALENDRIER — RENDU
══════════════════════════════════════════════════════════════ */
const MONTH_NAMES = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
];

function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  grid.innerHTML = '';
  grid.classList.toggle('calendar-grid--week', viewMode === 'week');
  const btnViewMonth = document.getElementById('btnViewMonth');
  const btnViewWeek  = document.getElementById('btnViewWeek');
  btnViewMonth.classList.toggle('active', viewMode === 'month');
  btnViewWeek.classList.toggle('active', viewMode === 'week');
  btnViewMonth.setAttribute('aria-pressed', String(viewMode === 'month'));
  btnViewWeek.setAttribute('aria-pressed', String(viewMode === 'week'));

  let gridStart, cellCount, currentMonth;
  if (viewMode === 'week') {
    gridStart = mondayOf(viewDate);
    cellCount = 7;
    currentMonth = null; // pas de notion de "hors mois" en vue semaine
    const gridEnd = new Date(gridStart);
    gridEnd.setDate(gridStart.getDate() + 6);
    const startLabel = `${gridStart.getDate()} ${MONTH_NAMES[gridStart.getMonth()]}` +
      (gridStart.getFullYear() !== gridEnd.getFullYear() ? ` ${gridStart.getFullYear()}` : '');
    document.getElementById('monthLabel').textContent =
      `${startLabel} – ${gridEnd.getDate()} ${MONTH_NAMES[gridEnd.getMonth()]} ${gridEnd.getFullYear()}`;
  } else {
    const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // Lundi = 0 ... Dimanche = 6
    gridStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1 - startOffset);
    cellCount = 42;
    currentMonth = viewDate.getMonth();
    document.getElementById('monthLabel').textContent = `${MONTH_NAMES[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
  }

  const todayIso = todayISO();

  for (let i = 0; i < cellCount; i++) {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + i);
    const iso = isoDate(cellDate);

    const cell = document.createElement('div');
    cell.className = 'day-cell';
    if (currentMonth !== null && cellDate.getMonth() !== currentMonth) cell.classList.add('other-month');
    if (iso === todayIso) cell.classList.add('today');

    const num = document.createElement('div');
    num.className = 'day-num';
    num.textContent = cellDate.getDate();
    cell.appendChild(num);

    const evWrap = document.createElement('div');
    evWrap.className = 'day-events';
    const dayEvents = events.filter(e => e.date === iso).sort((a,b) => (a.heure||'').localeCompare(b.heure||''));
    for (const ev of dayEvents) {
      const chip = document.createElement('div');
      chip.className = `event-chip event-chip--${ev.type}`;
      if (ev.type === 'match' && ev.scoreNous != null && ev.scoreEux != null) {
        chip.classList.add(ev.scoreNous > ev.scoreEux ? 'won' : ev.scoreNous < ev.scoreEux ? 'lost' : '');
        chip.textContent = `vs ${ev.adversaire || '?'} ${ev.scoreNous}-${ev.scoreEux}`;
      } else if (ev.type === 'match') {
        chip.textContent = `vs ${ev.adversaire || '?'}`;
      } else {
        chip.textContent = ev.titre || 'Entraînement';
        if (ev.seanceId && seancesLoaded && !allSeances.some(s => s.id === ev.seanceId)) {
          chip.classList.add('event-chip--orphan');
          chip.textContent += ' ⚠ séance introuvable';
          chip.title = 'La séance liée à cet événement a été supprimée de la bibliothèque.';
        }
      }
      chip.addEventListener('click', evt => { evt.stopPropagation(); openModal(ev); });
      evWrap.appendChild(chip);
    }
    cell.appendChild(evWrap);

    cell.addEventListener('click', () => openModal(null, iso));
    grid.appendChild(cell);
  }
}

/* ══════════════════════════════════════════════════════════════
   TOOLBAR
══════════════════════════════════════════════════════════════ */
function bindToolbar() {
  document.getElementById('btnHome').addEventListener('click', () => {
    window.location.href = '../index.html';
  });
  document.getElementById('btnPrevMonth').addEventListener('click', () => {
    if (viewMode === 'week') {
      const d = new Date(viewDate);
      d.setDate(d.getDate() - 7);
      viewDate = d;
    } else {
      viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    }
    renderCalendar();
  });
  document.getElementById('btnNextMonth').addEventListener('click', () => {
    if (viewMode === 'week') {
      const d = new Date(viewDate);
      d.setDate(d.getDate() + 7);
      viewDate = d;
    } else {
      viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    }
    renderCalendar();
  });
  document.getElementById('btnToday').addEventListener('click', () => {
    viewDate = new Date();
    renderCalendar();
  });
  document.getElementById('btnViewMonth').addEventListener('click', () => {
    viewMode = 'month';
    renderCalendar();
  });
  document.getElementById('btnViewWeek').addEventListener('click', () => {
    viewMode = 'week';
    renderCalendar();
  });
  document.getElementById('btnAddEntrainement').addEventListener('click', () => openModal(null, todayISO(), 'entrainement'));
  document.getElementById('btnAddMatch').addEventListener('click', () => openModal(null, todayISO(), 'match'));
}

/* ══════════════════════════════════════════════════════════════
   MODALE ÉVÉNEMENT
══════════════════════════════════════════════════════════════ */
function bindModal() {
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('btnCancelEvent').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target.id === 'modalOverlay') closeModal();
  });
  document.getElementById('btnSaveEvent').addEventListener('click', saveEvent);
  document.getElementById('btnDeleteEvent').addEventListener('click', deleteCurrentEvent);
  document.getElementById('fSeanceLink').addEventListener('change', updateOpenSeanceButton);
  document.getElementById('btnOpenSeance').addEventListener('click', () => {
    const id = document.getElementById('fSeanceLink').value;
    if (id) window.open('seance.html?id=' + encodeURIComponent(id), '_blank', 'noopener,noreferrer');
  });
}

// Sélectionne seanceId dans #fSeanceLink sans jamais le perdre silencieusement :
// si aucune <option> ne correspond (séance supprimée), une option temporaire est
// injectée pour que le champ conserve la valeur au lieu de retomber sur "" au
// prochain Enregistrer (ce qui effacerait la référence orpheline sans confirmation).
function setSeanceLinkValue(seanceId) {
  const sel = document.getElementById('fSeanceLink');
  const previousPlaceholder = sel.querySelector('option[data-orphan-placeholder]');
  if (previousPlaceholder) previousPlaceholder.remove();

  if (seanceId && !allSeances.some(s => s.id === seanceId)) {
    const opt = document.createElement('option');
    opt.value = seanceId;
    opt.textContent = 'Séance introuvable (supprimée)';
    opt.dataset.orphanPlaceholder = 'true';
    sel.appendChild(opt);
  }

  sel.value = seanceId || '';
}

function updateOpenSeanceButton() {
  const hasLink = !!document.getElementById('fSeanceLink').value;
  document.getElementById('btnOpenSeance').style.display = hasLink ? '' : 'none';
}

function openModal(event, defaultDate, forcedType) {
  editingId = event ? event.id : null;
  editingType = event ? event.type : (forcedType || 'entrainement');

  document.getElementById('modalTitle').textContent =
    editingId ? 'Modifier' : (editingType === 'match' ? 'Nouveau match' : 'Nouvel entraînement');
  document.getElementById('btnDeleteEvent').style.display = editingId ? '' : 'none';

  document.getElementById('fieldsEntrainement').style.display = editingType === 'entrainement' ? '' : 'none';
  document.getElementById('fieldsMatch').style.display = editingType === 'match' ? '' : 'none';

  document.getElementById('fDate').value = event ? event.date : (defaultDate || todayISO());

  if (editingType === 'entrainement') {
    document.getElementById('fTitre').value = event?.titre || '';
    document.getElementById('fHeure').value = event?.heure || '';
    setSeanceLinkValue(event?.seanceId || '');
    updateOpenSeanceButton();
    document.getElementById('fNotesEnt').value = event?.notes || '';
  } else {
    document.getElementById('fAdversaire').value = event?.adversaire || '';
    document.getElementById('fHeureMatch').value = event?.heure || '';
    document.getElementById('fLieu').value = event?.lieu || 'domicile';
    document.getElementById('fScoreNous').value = event?.scoreNous ?? '';
    document.getElementById('fScoreEux').value = event?.scoreEux ?? '';
    document.getElementById('fNotesMatch').value = event?.notes || '';
  }

  document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
  editingId = null;
}

async function saveEvent() {
  const date = document.getElementById('fDate').value;
  if (!date) { toast('Date requise', 'warn'); return; }

  let data;
  if (editingType === 'entrainement') {
    const titre = document.getElementById('fTitre').value.trim();
    if (!titre) { toast('Titre requis', 'warn'); return; }
    data = {
      id: editingId || 'planning_' + Date.now(),
      type: 'entrainement',
      date,
      titre,
      heure: document.getElementById('fHeure').value,
      seanceId: document.getElementById('fSeanceLink').value || null,
      notes: document.getElementById('fNotesEnt').value,
    };
  } else {
    const adversaire = document.getElementById('fAdversaire').value.trim();
    if (!adversaire) { toast('Adversaire requis', 'warn'); return; }
    const scoreNousVal = document.getElementById('fScoreNous').value;
    const scoreEuxVal  = document.getElementById('fScoreEux').value;
    data = {
      id: editingId || 'planning_' + Date.now(),
      type: 'match',
      date,
      adversaire,
      heure: document.getElementById('fHeureMatch').value,
      lieu: document.getElementById('fLieu').value,
      scoreNous: scoreNousVal === '' ? null : Number(scoreNousVal),
      scoreEux: scoreEuxVal === '' ? null : Number(scoreEuxVal),
      notes: document.getElementById('fNotesMatch').value,
    };
  }

  try {
    const res = await fetch('/api/planning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      toast('Événement enregistré', 'ok');
      closeModal();
      await loadEvents();
    } else {
      toast('Erreur sauvegarde', 'err');
    }
  } catch(e) {
    toast('Erreur réseau', 'err');
  }
}

async function deleteCurrentEvent() {
  if (!editingId) return;
  if (!confirm('Supprimer cet événement ?')) return;
  try {
    await fetch(`/api/planning/${editingId}`, { method: 'DELETE' });
    toast('Événement supprimé', 'ok');
    closeModal();
    await loadEvents();
  } catch(e) {
    toast('Erreur suppression', 'err');
  }
}

/* ══════════════════════════════════════════════════════════════
   UTILITAIRES
══════════════════════════════════════════════════════════════ */
function todayISO() {
  return isoDate(new Date());
}

function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 2800);
}
