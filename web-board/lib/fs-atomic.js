'use strict';
// Écriture atomique : fichier temporaire + fsync + rename + fsync du dossier (CA17).
const fs = require('fs');
const path = require('path');

function writeFileAtomic(file, data) {
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  const fd = fs.openSync(tmp, 'w');
  try {
    fs.writeSync(fd, typeof data === 'string' ? data : Buffer.from(data));
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, file);
  try {
    const dfd = fs.openSync(path.dirname(file), 'r');
    try { fs.fsyncSync(dfd); } finally { fs.closeSync(dfd); }
  } catch (e) {
    // fsync d'un dossier non supporté (Windows) : le rename reste atomique
  }
}

// Supprime les fichiers temporaires laissés par une écriture interrompue.
function cleanTmpFiles(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    if (/\.tmp-\d+-\d+$/.test(f)) fs.rmSync(path.join(dir, f), { force: true });
  }
}

module.exports = { writeFileAtomic, cleanTmpFiles };
