const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const config = require('./lib/config');
const { PORT, DATA_DIR, PLANNING_DIR, APP_DIR } = config;
const { sendJson, sendError, readJsonBody, isLocalRequest, HttpError } = require('./lib/http');
const { writeFileAtomic, cleanTmpFiles } = require('./lib/fs-atomic');
const { SCHEMA_VERSION } = require('./lib/db');
const { isValidId, validateExercise, validateTrame } = require('./lib/validate');
const exercises = require('./lib/exercises');
const trames = require('./lib/trames');
const libraries = require('./lib/libraries');
const backup = require('./lib/backup');
const { importLegacy } = require('./lib/import-legacy');

const MAX_BODY_BYTES = 1 * 1024 * 1024; // 1 Mo
const EXPORT_BODY_BYTES = 20 * 1024 * 1024; // 20 Mo : archive HTML avec images
const RESTORE_BODY_BYTES = 200 * 1024 * 1024; // 200 Mo : sauvegarde complète

fs.mkdirSync(PLANNING_DIR, { recursive: true });
cleanTmpFiles(PLANNING_DIR);
importLegacy();

const MIME_TYPES = {
  '.html': 'text/html',
  '.js':   'text/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  // SAMEORIGIN : le rendu des schémas se fait dans une iframe de la même origine (S3)
  'X-Frame-Options':        'SAMEORIGIN',
  'Referrer-Policy':        'no-referrer',
  'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; script-src 'self' 'unsafe-inline'; frame-ancestors 'self'",
};

function setSecurityHeaders(res) {
  Object.entries(SECURITY_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
}

function idParam(raw) {
  let id;
  try { id = decodeURIComponent(raw); } catch (e) { id = ''; }
  if (!isValidId(id)) throw new HttpError(400, 'ID invalide ou manquant', 'id');
  return id;
}

function intParam(raw) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(404, 'Introuvable');
  return n;
}

// ─── Planning : un fichier JSON par événement, écrit de façon atomique ─────────
function planningList() {
  const items = [];
  for (const file of fs.readdirSync(PLANNING_DIR).filter(f => f.endsWith('.json'))) {
    try { items.push(JSON.parse(fs.readFileSync(path.join(PLANNING_DIR, file), 'utf-8'))); }
    catch (e) { console.error(`Erreur lecture ${file}`, e); }
  }
  return items;
}

// ─── Table des routes : [méthode, regex, handler(req, res, ...groupes)] ────────
const routes = [
  ['GET', /^\/api\/health$/, (req, res) => sendJson(res, 200, { ok: true, schemaVersion: SCHEMA_VERSION })],

  // Exercices
  ['GET', /^\/api\/exercises$/, (req, res) => sendJson(res, 200, exercises.listCurrent())],
  ['POST', /^\/api\/exercises$/, async (req, res) => {
    const data = await readJsonBody(req, MAX_BODY_BYTES);
    const err = validateExercise(data);
    if (err) return sendError(res, 400, err.message, err.field);
    const r = exercises.saveExercise(data);
    sendJson(res, 200, { success: true, created: r.created, versionId: r.versionId, versionNo: r.versionNo });
  }],
  ['GET', /^\/api\/exercises\/versions\/([^/]+)$/, (req, res, vid) => {
    const v = exercises.getVersion(intParam(vid));
    if (!v) return sendError(res, 404, 'Version introuvable');
    sendJson(res, 200, v);
  }],
  ['GET', /^\/api\/exercises\/([^/]+)\/versions$/, (req, res, id) => sendJson(res, 200, exercises.listVersions(idParam(id)))],
  ['POST', /^\/api\/exercises\/([^/]+)\/restore$/, async (req, res, id) => {
    const exId = idParam(id);
    const body = await readJsonBody(req, MAX_BODY_BYTES);
    if (!body || !Number.isInteger(body.versionId)) return sendError(res, 400, 'Version à restaurer manquante.', 'versionId');
    sendJson(res, 200, exercises.restore(exId, body.versionId));
  }],
  ['GET', /^\/api\/versions\/([^/]+)\/snapshot$/, (req, res, vid) => {
    const snap = exercises.getSnapshot(intParam(vid));
    if (!snap) return sendError(res, 404, 'Schéma indisponible');
    res.writeHead(200, { 'Content-Type': snap.contentType, 'Cache-Control': 'public, max-age=31536000, immutable' });
    res.end(snap.buffer);
  }],
  ['PUT', /^\/api\/versions\/([^/]+)\/snapshot$/, async (req, res, vid) => {
    const versionId = intParam(vid);
    const body = await readJsonBody(req, MAX_BODY_BYTES);
    sendJson(res, 200, exercises.putSnapshot(versionId, body && body.image));
  }],
  ['GET', /^\/api\/exercises\/([^/]+)\/draft$/, (req, res, id) => {
    const d = exercises.getDraft(idParam(id));
    if (!d) return sendError(res, 404, 'Aucun brouillon');
    sendJson(res, 200, d);
  }],
  ['PUT', /^\/api\/exercises\/([^/]+)\/draft$/, async (req, res, id) => {
    const exId = idParam(id);
    const data = await readJsonBody(req, MAX_BODY_BYTES);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return sendError(res, 400, 'Brouillon invalide.');
    sendJson(res, 200, { success: true, ...exercises.putDraft(exId, data) });
  }],
  ['DELETE', /^\/api\/exercises\/([^/]+)\/draft$/, (req, res, id) => {
    exercises.deleteDraft(idParam(id));
    sendJson(res, 200, { success: true });
  }],
  ['GET', /^\/api\/exercises\/([^/]+)$/, (req, res, id) => {
    const d = exercises.getCurrent(idParam(id));
    if (!d) return sendError(res, 404, 'Exercice introuvable');
    sendJson(res, 200, d);
  }],
  ['DELETE', /^\/api\/exercises\/([^/]+)$/, (req, res, id) => {
    exercises.softDelete(idParam(id));
    sendJson(res, 200, { success: true });
  }],

  // Catalogue et bibliothèques
  ['GET', /^\/api\/catalog$/, (req, res) => sendJson(res, 200, exercises.listCatalog())],
  ['GET', /^\/api\/libraries$/, (req, res) => sendJson(res, 200, libraries.list())],
  ['POST', /^\/api\/libraries$/, async (req, res) => {
    const body = await readJsonBody(req, MAX_BODY_BYTES);
    sendJson(res, 201, libraries.create(body && body.name));
  }],
  ['PATCH', /^\/api\/libraries\/([^/]+)$/, async (req, res, id) => {
    const body = await readJsonBody(req, MAX_BODY_BYTES);
    sendJson(res, 200, libraries.rename(intParam(id), body && body.name));
  }],
  ['DELETE', /^\/api\/libraries\/([^/]+)$/, (req, res, id) => sendJson(res, 200, libraries.remove(intParam(id)))],
  ['POST', /^\/api\/libraries\/([^/]+)\/exercises$/, async (req, res, id) => {
    const body = await readJsonBody(req, MAX_BODY_BYTES);
    const libId = intParam(id);
    if (!body || !isValidId(body.exerciseId)) return sendError(res, 400, "Identifiant d'exercice invalide.", 'exerciseId');
    sendJson(res, 200, libraries.addExercise(libId, body.exerciseId));
  }],
  ['DELETE', /^\/api\/libraries\/([^/]+)\/exercises\/([^/]+)$/, (req, res, id, exId) =>
    sendJson(res, 200, libraries.removeExercise(intParam(id), idParam(exId)))],

  // Trames (API historique /api/seances)
  ['GET', /^\/api\/seances$/, (req, res) => sendJson(res, 200, trames.listCurrent())],
  ['POST', /^\/api\/seances$/, async (req, res) => {
    const t = await readJsonBody(req, MAX_BODY_BYTES);
    const err = validateTrame(t, vid => exercises.getVersionRow(vid));
    if (err) return sendError(res, 400, err.message, err.field);
    const r = trames.save(t);
    sendJson(res, 200, { success: true, created: r.created, versionId: r.versionId, versionNo: r.versionNo });
  }],
  ['GET', /^\/api\/seances\/versions\/([^/]+)$/, (req, res, vid) => {
    const r = trames.getResolvedVersion(intParam(vid));
    if (!r) return sendError(res, 404, 'Version de trame introuvable');
    sendJson(res, 200, r);
  }],
  ['GET', /^\/api\/seances\/([^/]+)\/versions$/, (req, res, id) => sendJson(res, 200, trames.listVersions(idParam(id)))],
  ['POST', /^\/api\/seances\/([^/]+)\/exports$/, async (req, res, id) => {
    const trameId = idParam(id);
    const body = await readJsonBody(req, EXPORT_BODY_BYTES);
    sendJson(res, 200, trames.createExport(trameId, body && body.trameVersionId, body && body.html));
  }],
  ['GET', /^\/api\/seances\/([^/]+)\/exports$/, (req, res, id) => sendJson(res, 200, trames.listExports(idParam(id)))],
  ['GET', /^\/api\/exports\/([^/]+)$/, (req, res, exportId) => {
    const ex = trames.getExport(intParam(exportId));
    if (!ex) return sendError(res, 404, 'Export introuvable');
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src data:; style-src 'unsafe-inline'");
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(ex.html);
  }],
  ['GET', /^\/api\/seances\/([^/]+)$/, (req, res, id) => {
    const r = trames.getResolved(idParam(id));
    if (!r) return sendError(res, 404, 'Trame introuvable');
    sendJson(res, 200, r);
  }],
  ['DELETE', /^\/api\/seances\/([^/]+)$/, (req, res, id) => {
    trames.softDelete(idParam(id));
    sendJson(res, 200, { success: true });
  }],

  // Planning (fichiers)
  ['GET', /^\/api\/planning$/, (req, res) => sendJson(res, 200, planningList())],
  ['POST', /^\/api\/planning$/, async (req, res) => {
    const data = await readJsonBody(req, MAX_BODY_BYTES);
    if (!data || !isValidId(data.id)) return sendError(res, 400, 'ID invalide ou manquant', 'id');
    writeFileAtomic(path.join(PLANNING_DIR, `${data.id}.json`), JSON.stringify(data, null, 2));
    sendJson(res, 200, { success: true });
  }],
  ['DELETE', /^\/api\/planning\/([^/]+)$/, (req, res, id) => {
    const file = path.join(PLANNING_DIR, `${idParam(id)}.json`);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    sendJson(res, 200, { success: true });
  }],

  // Accueil : reprise rapide (CA28)
  ['GET', /^\/api\/recent$/, (req, res) => {
    const libs = libraries.list().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0, 6);
    const trameRows = trames.listCurrentRows().slice(0, 5).map(r => {
      const resolved = trames.getResolved(r.data.id);
      return {
        id: r.data.id, titre: r.data.titre || '', date: r.data.date || '', versionNo: r.versionNo, savedAt: r.savedAt,
        duree: resolved ? trames.totalDuree(resolved.trame, resolved.exerciseVersions) : 0,
      };
    });
    const exs = exercises.listRecent(5);
    sendJson(res, 200, { libraries: libs, trames: trameRows, exercises: exs });
  }],

  // Sauvegarde complète (localhost uniquement)
  ['GET', /^\/api\/backup$/, (req, res) => {
    if (!isLocalRequest(req)) return sendError(res, 403, 'Accès refusé');
    const now = new Date();
    const text = JSON.stringify(backup.createBackup());
    backup.storeBackupCopy(text, now);
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${backup.backupFileName(now)}.json"`,
    });
    res.end(text);
  }],
  ['POST', /^\/api\/restore$/, async (req, res) => {
    if (!isLocalRequest(req)) return sendError(res, 403, 'Accès refusé');
    const body = await readJsonBody(req, RESTORE_BODY_BYTES);
    sendJson(res, 200, backup.restoreBackup(body));
  }],

  // Arrêt (localhost uniquement)
  ['POST', /^\/api\/shutdown$/, (req, res) => {
    if (!isLocalRequest(req)) return sendError(res, 403, 'Accès refusé');
    sendJson(res, 200, { ok: true });
    console.log('Arrêt du serveur demandé par le navigateur.');
    setTimeout(() => process.exit(0), 200);
  }],
];

async function handleApi(req, res, urlPath) {
  for (const [method, re, handler] of routes) {
    const m = re.exec(urlPath);
    if (!m || (method !== '*' && method !== req.method)) continue;
    try {
      await handler(req, res, ...m.slice(1));
    } catch (e) {
      if (res.headersSent) return true;
      if (e instanceof HttpError) {
        if (e.status === 413) res.setHeader('Connection', 'close');
        sendError(res, e.status, e.message, e.field);
      } else {
        console.error('Erreur serveur', e);
        sendError(res, 500, 'Erreur serveur');
      }
    }
    return true;
  }
  sendError(res, 404, 'Route inconnue');
  return true;
}

// Données locales et code serveur : jamais servis en statique
const BLOCKED_PREFIXES = ['/data/', '/lib/', '/scripts/', '/.omc/', '/.git/'];
function isBlockedStatic(urlPath) {
  return BLOCKED_PREFIXES.some(p => urlPath.startsWith(p)) || /\.db(-wal|-shm)?$/.test(urlPath);
}

function serveStatic(req, res, urlPath) {
  let decoded;
  try { decoded = decodeURIComponent(urlPath); } catch (e) { res.writeHead(400); return res.end('Requête invalide'); }
  const safePath = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  // Liste blanche sur le chemin normalisé (un « /pages/../server.js » ne doit pas passer).
  const publicUrl = '/' + safePath.split(path.sep).join('/').replace(/^\/+/, '');
  const PUBLIC_PREFIXES = ['/pages/', '/src/', '/assets/'];
  const PUBLIC_FILES = ['/', '/index.html', '/manifest.json', '/sw.js'];
  if (!PUBLIC_FILES.includes(publicUrl) && !PUBLIC_PREFIXES.some(p => publicUrl.startsWith(p))) {
    res.writeHead(404);
    return res.end('Fichier non trouvé');
  }
  if (isBlockedStatic(safePath.split(path.sep).join('/')) || isBlockedStatic(urlPath)) {
    res.writeHead(404);
    return res.end('Fichier non trouvé');
  }
  const filePath = path.join(APP_DIR, safePath === '/' ? 'index.html' : safePath);

  // Bloquer toute sortie hors du répertoire du projet
  if (!filePath.startsWith(APP_DIR + path.sep) && filePath !== APP_DIR) {
    res.writeHead(403);
    return res.end('Accès refusé');
  }

  const contentType = MIME_TYPES[path.extname(filePath)] || 'application/octet-stream';
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' || err.code === 'EISDIR' ? 404 : 500);
      res.end(err.code === 'ENOENT' || err.code === 'EISDIR' ? 'Fichier non trouvé' : 'Erreur serveur');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

const server = http.createServer((req, res) => {
  // Pas d'en-têtes CORS : la page et son API sont toujours servies depuis la même
  // origine (ce serveur). Un accès cross-origin permissif (Access-Control-Allow-Origin: *)
  // sans authentification permettrait à n'importe quel site ouvert dans le même
  // navigateur de lire/modifier/supprimer les données locales pendant que le
  // serveur tourne — aucun cas d'usage légitime ne le nécessite ici.
  setSecurityHeaders(res);

  // Un site tiers ouvert dans le même navigateur ne doit pas pouvoir lire ni modifier les données :
  // on n'accepte que les requêtes adressées à ce serveur (Host), venant de ce serveur (Origin),
  // et les écritures en JSON (une requête cross-site en JSON déclenche un préflight, que nous refusons).
  const localHosts = [`localhost:${PORT}`, `127.0.0.1:${PORT}`, `[::1]:${PORT}`];
  if (!localHosts.includes((req.headers.host || '').toLowerCase())) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Hôte non autorisé');
  }
  const origin = req.headers.origin;
  if (origin && !localHosts.some(h => origin === `http://${h}`)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Origine non autorisée');
  }
  if ((req.method === 'POST' || req.method === 'PUT') && !/^application\/json\b/i.test(req.headers['content-type'] || '')) {
    res.writeHead(415, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Type de contenu JSON requis');
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const urlPath = req.url.split('?')[0];
  if (urlPath.startsWith('/api/')) return handleApi(req, res, urlPath);
  serveStatic(req, res, urlPath);
});

function shutdownServer(reason) {
  console.log(`Arrêt du serveur${reason ? ` : ${reason}` : ''}`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1000);
}

process.on('SIGINT',  () => shutdownServer('SIGINT'));
process.on('SIGTERM', () => shutdownServer('SIGTERM'));
process.on('uncaughtException', err => {
  console.error('Erreur non capturée :', err);
  shutdownServer('uncaughtException');
});

// Écoute locale uniquement : les données (exercices, séances) ne sont pas exposées au réseau.
// Utilisation locale uniquement : les requêtes d'autres machines sont refusées (contrôle Host).
// Ne pas remplacer HAWEB_HOST par '0.0.0.0' sans ajouter une authentification.
const HOST = process.env.HAWEB_HOST || '127.0.0.1';
server.listen(PORT, HOST, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
  console.log(`Le dossier des données est : ${DATA_DIR}`);

  if (process.env.NO_OPEN_BROWSER) return;

  console.log('Ouverture du navigateur...');
  const url = `http://localhost:${PORT}`;
  const startCmd = process.platform === 'darwin' ? 'open'
                 : process.platform === 'win32'  ? 'start'
                 : 'xdg-open';
  exec(`${startCmd} ${url}`, (err) => {
    if (err) console.error("Impossible d'ouvrir le navigateur automatiquement.");
  });
});
