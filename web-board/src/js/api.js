// Accès à l'API locale. Rejette {status, message, field} sur 4xx/5xx, {offline:true, message} sans serveur.
(function () {
  'use strict';

  const OFFLINE_MESSAGE = "Le serveur local est arrêté : la modification n'est pas enregistrée. Relancez Handball Engine.";
  const BANNER_TEXT = "Hors ligne : consultation possible, enregistrement impossible tant que Handball Engine n'est pas relancé.";
  let healthTimer = null;

  function setOffline(offline) {
    let banner = document.getElementById('offlineBanner');
    if (offline) {
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'offlineBanner';
        banner.setAttribute('role', 'alert');
        banner.textContent = BANNER_TEXT;
        document.body.appendChild(banner);
      }
      document.querySelectorAll('[data-write]').forEach(b => { b.disabled = true; b.dataset.offlineDisabled = '1'; });
      if (!healthTimer) {
        healthTimer = setInterval(async () => {
          try {
            const r = await fetch('/api/health', { cache: 'no-store' });
            const body = await r.json();
            if (r.ok && body && body.ok && !r.headers.get('x-haweb-cache')) setOffline(false);
          } catch (e) { /* toujours hors ligne */ }
        }, 10000);
      }
    } else {
      if (banner) banner.remove();
      document.querySelectorAll('[data-offline-disabled]').forEach(b => { b.disabled = false; delete b.dataset.offlineDisabled; });
      clearInterval(healthTimer);
      healthTimer = null;
    }
  }

  async function api(method, path, body) {
    let res;
    try {
      res = await fetch(path, {
        method,
        headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (e) {
      setOffline(true);
      throw { offline: true, message: OFFLINE_MESSAGE };
    }
    // Réponse servie depuis le cache du service worker : le serveur est arrêté.
    if (res.headers.get('x-haweb-cache')) setOffline(true);
    else if (document.getElementById('offlineBanner')) setOffline(false);
    if (res.status === 503 && res.headers.get('x-haweb-offline')) {
      setOffline(true);
      throw { offline: true, message: OFFLINE_MESSAGE };
    }
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
    if (!res.ok) {
      throw { status: res.status, message: (data && data.error) || `Erreur ${res.status}`, field: data && data.field };
    }
    return data;
  }

  window.HawebAPI = { api, setOffline, OFFLINE_MESSAGE };
})();
