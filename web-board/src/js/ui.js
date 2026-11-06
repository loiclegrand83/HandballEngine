// Composants d'interface communs : toast, confirmation, navigation, pulsation (CA22, CA26).
(function () {
  'use strict';

  const NAV = [
    ['accueil', 'Accueil', '/', '⌂'],
    ['bibliotheques', 'Bibliothèques', '/pages/bibliotheque.html', '▤'],
    ['trames', 'Trames', '/pages/seance.html', '☰'],
    ['board', 'Board', '/pages/board.html', '◫'],
    ['planning', 'Planning', '/pages/planning.html', '▦'],
    ['guide', 'Guide', '/pages/guide.html', '?'],
  ];

  let toastEl = null;
  let toastTimer = null;

  function toast(message, type = 'ok') {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.id = 'hawebToast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.className = `toast toast--${type}`;
    // force un reflow pour rejouer la transition
    void toastEl.offsetWidth;
    toastEl.classList.add('toast--show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('toast--show'), type === 'err' ? 6000 : 3500);
  }

  function confirmDialog(message, { okLabel = 'Confirmer', cancelLabel = 'Annuler', danger = true } = {}) {
    return new Promise(resolve => {
      const dlg = document.createElement('dialog');
      dlg.className = 'haweb-dialog';
      const p = document.createElement('p');
      p.textContent = message;
      const actions = document.createElement('div');
      actions.className = 'haweb-dialog-actions';
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'btn';
      cancel.textContent = cancelLabel;
      const ok = document.createElement('button');
      ok.type = 'button';
      ok.className = danger ? 'btn btn--danger' : 'btn btn--primary';
      ok.dataset.confirm = 'ok';
      ok.textContent = okLabel;
      actions.append(cancel, ok);
      dlg.append(p, actions);
      document.body.appendChild(dlg);
      const close = value => { dlg.close(); dlg.remove(); resolve(value); };
      cancel.addEventListener('click', () => close(false));
      ok.addEventListener('click', () => close(true));
      dlg.addEventListener('cancel', e => { e.preventDefault(); close(false); });
      dlg.showModal();
      ok.focus();
    });
  }

  // Version compacte (board) : icônes en une rangée, libellé conservé pour l'accessibilité.
  function renderNav(activeKey, { compact = false } = {}) {
    const host = document.getElementById('appNav');
    if (!host) return;
    host.classList.add('app-nav');
    host.classList.toggle('app-nav--compact', compact);
    host.setAttribute('aria-label', 'Navigation principale');
    host.innerHTML = compact ? '' : '<span class="app-nav-brand">Handball Engine</span>';
    for (const [key, label, href, icon] of NAV) {
      const a = document.createElement('a');
      a.href = href;
      a.dataset.nav = key;
      if (compact) {
        a.title = label;
        a.dataset.icon = icon;
        const span = document.createElement('span');
        span.className = 'app-nav-label';
        span.textContent = label;
        a.appendChild(span);
      } else {
        a.textContent = label;
      }
      if (key === activeKey) a.setAttribute('aria-current', 'page');
      host.appendChild(a);
    }
  }

  function pulse(el) {
    if (!el) return;
    el.classList.remove('haweb-pulse');
    void el.offsetWidth;
    el.classList.add('haweb-pulse');
    setTimeout(() => el.classList.remove('haweb-pulse'), 200);
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function formatDateTime(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  }

  window.HawebUI = { toast, confirmDialog, renderNav, pulse, escapeHtml, formatDateTime, norm };
})();
