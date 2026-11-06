'use strict';
// Import des anciens fichiers JSON (data/bibli, data/seances) dans SQLite.
// Les fichiers sources sont seulement lus : jamais écrits, renommés ni supprimés.
const fs = require('fs');
const path = require('path');
const { db, tx } = require('./db');
const { DATA_DIR, BIBLI_DIR, SEANCES_DIR } = require('./config');
const { sha256 } = require('./canonical');
const { isValidId } = require('./validate');
const exercises = require('./exercises');
const trames = require('./trames');

const DEFAULT_LIBRARY = 'Mes exercices';

const logged = db.prepare('SELECT 1 FROM import_log WHERE source_path = ? AND sha256 = ?');
const insLog = db.prepare(`INSERT OR REPLACE INTO import_log
  (source_path, sha256, imported_at, status, target_id, version_id, error) VALUES (?, ?, ?, ?, ?, ?, ?)`);

function listJson(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
}

function importDir(dir, saveFn) {
  const created = [];
  for (const file of listJson(dir)) {
    const full = path.join(dir, file);
    const rel = path.relative(DATA_DIR, full).split(path.sep).join('/');
    const buf = fs.readFileSync(full);
    const sha = sha256(buf);
    if (logged.get(rel, sha)) continue;
    const now = new Date().toISOString();
    let parsed;
    const text = buf.toString('utf8');
    try {
      parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Objet JSON attendu');
    } catch (e) {
      tx(() => insLog.run(rel, sha, now, 'error', null, null, e.message));
      continue;
    }
    const id = isValidId(parsed.id) ? parsed.id : file.replace(/\.json$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const savedAt = parsed.updatedAt || parsed.exportedAt || fs.statSync(full).mtime.toISOString();
    tx(() => {
      const r = saveFn({ ...parsed, id }, { source: 'import', rawText: text, savedAt });
      const status = !r.created ? 'unchanged' : (r.existed ? 'new_version' : 'created');
      if (status === 'created') created.push(id);
      insLog.run(rel, sha, now, status, id, r.versionId, null);
    });
  }
  return created;
}

function importLegacy() {
  const createdExercises = importDir(BIBLI_DIR, exercises.saveExercise);
  importDir(SEANCES_DIR, trames.save);
  // Q6 : bibliothèque « Mes exercices » créée à l'import s'il n'y en a aucune.
  if (createdExercises.length > 0) {
    tx(() => {
      const count = Number(db.prepare('SELECT count(*) AS n FROM libraries').get().n);
      if (count > 0) return;
      const now = new Date().toISOString();
      const libId = Number(db.prepare('INSERT INTO libraries (name, created_at, updated_at) VALUES (?, ?, ?)')
        .run(DEFAULT_LIBRARY, now, now).lastInsertRowid);
      const ins = db.prepare('INSERT OR IGNORE INTO library_exercises (library_id, exercise_id, added_at) VALUES (?, ?, ?)');
      for (const id of createdExercises) ins.run(libId, id, now);
    });
  }
  return { createdExercises };
}

module.exports = { importLegacy };
