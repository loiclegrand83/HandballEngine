// Barre rapide du board : actions fréquentes au clavier et au tactile, sans ouvrir de panneau (CA27, CA24).
// Chargé après keyboard-nav.js (qui ne gère qu'Échap, Tab et les flèches : pas de conflit).
(function () {
  'use strict';

  const board = window.HawebBoard;
  const bar = document.getElementById('quickBar');
  if (!board || !bar) return;

  const exerciseName = document.getElementById('exerciseName');
  const exerciseDuree = document.getElementById('exerciseDuree');
  const quickName = document.getElementById('quickName');
  const quickDuree = document.getElementById('quickDuree');
  const MODES = ['player', 'pass', 'course', 'shot'];

  function setPressed(active) {
    bar.querySelectorAll('[data-quick]').forEach(b => {
      if (MODES.includes(b.dataset.quick)) b.setAttribute('aria-pressed', String(b.dataset.quick === active));
    });
  }

  function run(action) {
    const btn = bar.querySelector(`[data-quick="${action}"]`);
    if (action === 'player') board.selectPlayerTool();
    else if (action === 'pass' || action === 'course' || action === 'shot') board.selectDrawMode(action);
    else if (action === 'undo') board.undo();
    else if (action === 'save') { board.save(); return; }
    if (MODES.includes(action)) setPressed(action);
    if (window.HawebUI && btn) window.HawebUI.pulse(btn);
  }

  bar.addEventListener('click', e => {
    const b = e.target.closest('[data-quick]');
    if (b) run(b.dataset.quick);
  });

  // Un autre outil choisi ailleurs (Dock, sidebar) : la barre ne doit plus indiquer un mode faux.
  window.addEventListener('toolTriggered', () => setPressed(null));
  window.addEventListener('assetSelected', () => setPressed(null));

  function isTyping() {
    const el = document.activeElement;
    if (!el) return false;
    return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable;
  }

  const KEYS = { j: 'player', p: 'pass', c: 'course', t: 'shot' };
  document.addEventListener('keydown', e => {
    if (e.altKey) return;
    const key = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && key === 's') {
      e.preventDefault();
      run('save');
      return;
    }
    if (isTyping()) return;
    if ((e.ctrlKey || e.metaKey) && key === 'z') {
      e.preventDefault();
      run('undo');
      return;
    }
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (KEYS[key]) {
      e.preventDefault();
      run(KEYS[key]);
    }
  });

  // Nom et durée toujours visibles, synchronisés avec la section « Exercice » de la sidebar.
  function pullFromForm() {
    quickName.value = exerciseName.value;
    quickDuree.value = exerciseDuree.value;
  }
  quickName.addEventListener('input', () => { exerciseName.value = quickName.value; exerciseName.dispatchEvent(new Event('input')); });
  quickDuree.addEventListener('input', () => { exerciseDuree.value = quickDuree.value; exerciseDuree.dispatchEvent(new Event('input')); });
  exerciseName.addEventListener('input', () => { if (document.activeElement !== quickName) quickName.value = exerciseName.value; });
  exerciseDuree.addEventListener('input', () => { if (document.activeElement !== quickDuree) quickDuree.value = exerciseDuree.value; });
  window.addEventListener('exerciseLoaded', pullFromForm);
  pullFromForm();

  if (window.HawebUI) window.HawebUI.renderNav('board', { compact: true });
})();
