// Garantit une image de schéma pour des versions d'exercice (CA15) :
// chaque version sans image est rendue par le board dans une iframe cachée.
(function () {
  'use strict';

  const TIMEOUT_MS = 10000;

  function renderOne(versionId) {
    return new Promise(resolve => {
      const iframe = document.createElement('iframe');
      iframe.setAttribute('aria-hidden', 'true');
      iframe.tabIndex = -1;
      iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:1200px;height:800px;border:0;visibility:hidden;';
      let timer = null;
      const finish = ok => {
        clearTimeout(timer);
        window.removeEventListener('message', onMessage);
        iframe.remove();
        resolve(ok);
      };
      const onMessage = event => {
        if (event.origin !== location.origin) return;
        const d = event.data;
        if (!d || d.type !== 'haweb-snapshot' || Number(d.versionId) !== Number(versionId)) return;
        finish(!!d.ok);
      };
      window.addEventListener('message', onMessage);
      timer = setTimeout(() => finish(false), TIMEOUT_MS);
      iframe.src = `/pages/board.html?render=${encodeURIComponent(versionId)}`;
      document.body.appendChild(iframe);
    });
  }

  // versions : [{versionId, hasSnapshot}] → {missing:[versionId…]}
  async function ensure(versions) {
    const missing = [];
    const seen = new Set();
    for (const v of versions || []) {
      if (!v || v.hasSnapshot || seen.has(v.versionId)) continue;
      seen.add(v.versionId);
      const ok = await renderOne(v.versionId);
      if (!ok) missing.push(v.versionId);
    }
    return { missing };
  }

  window.HawebSnapshots = { ensure };
})();
