const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const PORT = 3000;
const BIBLI_DIR = path.join(__dirname, 'bibli');
const MAX_BODY_BYTES = 1 * 1024 * 1024; // 1 Mo

if (!fs.existsSync(BIBLI_DIR)) {
  fs.mkdirSync(BIBLI_DIR);
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.js':   'text/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options':        'DENY',
  'Referrer-Policy':        'no-referrer',
  'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; script-src 'self' 'unsafe-inline'",
};

function setSecurityHeaders(res) {
  Object.entries(SECURITY_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
}

function isLocalRequest(req) {
  const addr = req.socket.remoteAddress || '';
  return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
}

function isValidId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]+$/.test(id);
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  setSecurityHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // --- Route shutdown (localhost uniquement) ---
  if (req.url === '/api/shutdown') {
    if (!isLocalRequest(req)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Accès refusé' }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    console.log('Arrêt du serveur demandé par le navigateur.');
    setTimeout(() => process.exit(0), 200);
    return;
  }

  // --- API exercices ---
  if (req.url.startsWith('/api/exercises')) {

    if (req.method === 'GET') {
      fs.readdir(BIBLI_DIR, (err, files) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Erreur lecture dossier' }));
        }
        const exercises = [];
        for (const file of files.filter(f => f.endsWith('.json'))) {
          try {
            const content = fs.readFileSync(path.join(BIBLI_DIR, file), 'utf-8');
            exercises.push(JSON.parse(content));
          } catch(e) {
            console.error(`Erreur lecture ${file}`, e);
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(exercises));
      });
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      let bodySize = 0;
      req.on('data', chunk => {
        bodySize += chunk.length;
        if (bodySize > MAX_BODY_BYTES) {
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Payload trop volumineux' }));
          req.destroy();
          return;
        }
        body += chunk.toString();
      });
      req.on('end', () => {
        if (res.writableEnded) return;
        try {
          const data = JSON.parse(body);
          if (!isValidId(data.id)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'ID invalide ou manquant' }));
          }
          const filePath = path.join(BIBLI_DIR, `${data.id}.json`);
          if (!filePath.startsWith(BIBLI_DIR + path.sep)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Chemin interdit' }));
          }
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch(e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Erreur serveur' }));
        }
      });
      return;
    }

    if (req.method === 'DELETE') {
      const id = req.url.split('/').pop();
      if (!isValidId(id)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'ID invalide ou manquant' }));
      }
      const filePath = path.join(BIBLI_DIR, `${id}.json`);
      if (!filePath.startsWith(BIBLI_DIR + path.sep)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Chemin interdit' }));
      }
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }
  }

  // --- Serveur statique ---
  const safePath = path.normalize(decodeURIComponent(req.url)).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(__dirname, safePath === '/' ? 'index.html' : safePath);

  // Bloquer toute sortie hors du répertoire du projet
  if (!filePath.startsWith(__dirname + path.sep) && filePath !== __dirname) {
    res.writeHead(403);
    return res.end('Accès refusé');
  }

  const extname = path.extname(filePath);
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Fichier non trouvé');
      } else {
        res.writeHead(500);
        res.end('Erreur serveur');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
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

server.listen(PORT, '0.0.0.0', () => {
  const localIp = Object.values(os.networkInterfaces()).flat()
    .find(i => i.family === 'IPv4' && !i.internal)?.address || 'localhost';
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
  console.log(`Accessible sur le réseau : http://${localIp}:${PORT}`);
  console.log(`Le dossier de sauvegarde est : ${BIBLI_DIR}`);
  console.log('Ouverture du navigateur...');

  const url = `http://localhost:${PORT}`;
  const startCmd = process.platform === 'darwin' ? 'open'
                 : process.platform === 'win32'  ? 'start'
                 : 'xdg-open';
  exec(`${startCmd} ${url}`, (err) => {
    if (err) console.error("Impossible d'ouvrir le navigateur automatiquement.");
  });
});
