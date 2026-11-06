'use strict';

// Lance le serveur sur un dossier de données TEMPORAIRE (jamais web-board/data).
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');

const SERVER_DIR = path.join(__dirname, '..', '..', 'web-board');
const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures', 'data');
const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function waitForServer(child, timeoutMs = 10000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    let done = false;
    child.once('exit', code => { if (!done) { done = true; reject(new Error(`Server exited early (code ${code})`)); } });
    const tryOnce = () => {
      if (done) return;
      const req = http.get(`${BASE_URL}/api/health`, res => {
        res.resume();
        if (res.statusCode === 200) { done = true; return resolve(); }
        setTimeout(tryOnce, 100);
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) { done = true; return reject(new Error('Server did not start in time')); }
        setTimeout(tryOnce, 100);
      });
    };
    tryOnce();
  });
}

// Nouveau dossier temporaire garni des fixtures.
function makeDataDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'haweb-test-'));
  fs.cpSync(FIXTURES_DIR, dir, { recursive: true });
  return dir;
}

// startServer() : nouveau dossier temporaire avec fixtures.
// startServer({dataDir}) : réutilise ce dossier tel quel (redémarrage, dossier vide).
async function startServer({ dataDir } = {}) {
  const dir = dataDir || makeDataDir();
  const child = spawn(process.execPath, ['server.js'], {
    cwd: SERVER_DIR,
    env: { ...process.env, NO_OPEN_BROWSER: '1', HAWEB_DATA_DIR: dir, HAWEB_PORT: String(PORT) },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  child.dataDir = dir;
  await waitForServer(child);
  return child;
}

function waitExit(child) {
  return new Promise(resolve => {
    if (!child || child.exitCode !== null || child.signalCode !== null) return resolve();
    child.once('exit', () => resolve());
  });
}

async function stopServer(child) {
  try {
    await fetch(`${BASE_URL}/api/shutdown`, { method: 'POST' });
  } catch (e) {
    // le serveur peut déjà avoir coupé la connexion en s'arrêtant, c'est attendu
  }
  const exited = waitExit(child);
  const timer = setTimeout(() => { if (child && child.exitCode === null) child.kill('SIGKILL'); }, 3000);
  await exited;
  clearTimeout(timer);
}

module.exports = { startServer, stopServer, waitExit, makeDataDir, BASE_URL, PORT, SERVER_DIR, FIXTURES_DIR };
