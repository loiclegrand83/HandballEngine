'use strict';
// Petits utilitaires HTTP partagés par les routes.

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function sendError(res, status, message, field) {
  const body = { error: message };
  if (field) body.field = field;
  sendJson(res, status, body);
}

class HttpError extends Error {
  constructor(status, message, field) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

// Lit et parse le corps JSON. Au-delà de limitBytes : HttpError 413 (le reste du corps est vidé).
function readJsonBody(req, limitBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooBig = false;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limitBytes) { tooBig = true; return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooBig) return reject(new HttpError(413, 'Payload trop volumineux'));
      const text = Buffer.concat(chunks).toString('utf8');
      try {
        resolve(JSON.parse(text));
      } catch (e) {
        reject(new HttpError(400, 'Corps de requête JSON invalide.'));
      }
    });
    req.on('error', reject);
  });
}

function isLocalRequest(req) {
  const addr = (req.socket && req.socket.remoteAddress) || '';
  return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
}

module.exports = { sendJson, sendError, readJsonBody, isLocalRequest, HttpError };
