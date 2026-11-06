// Enregistre le service worker (installation hors ligne et installation de l'application).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('[PWA] service worker non enregistré', err);
    });
  });
}
