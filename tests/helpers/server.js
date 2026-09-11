'use strict';

const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const SERVER_DIR = path.join(__dirname, '..', '..', 'web-board');
const PORT = 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function waitForServer(timeoutMs = 8000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(`${BASE_URL}/pages/board.html`, res => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) return reject(new Error('Server did not start in time'));
        setTimeout(tryOnce, 150);
      });
    };
    tryOnce();
  });
}

async function startServer() {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: SERVER_DIR,
    env: { ...process.env, NO_OPEN_BROWSER: '1' },
    stdio: 'ignore',
  });
  await waitForServer();
  return child;
}

async function stopServer(child) {
  try {
    await fetch(`${BASE_URL}/api/shutdown`, { method: 'POST' });
  } catch (e) {
    // le serveur peut déjà avoir coupé la connexion en s'arrêtant, c'est attendu
  }
  if (child && !child.killed) child.kill();
}

module.exports = { startServer, stopServer, BASE_URL };
