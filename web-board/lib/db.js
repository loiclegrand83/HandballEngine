'use strict';
// Base SQLite : ouverture, PRAGMA, migration de schéma 1→2 et transactions.
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { DB_PATH, DATA_DIR, BIBLI_DIR } = require('./config');
const { contentHash } = require('./canonical');

const SCHEMA_VERSION = 2;

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

fs.mkdirSync(DATA_DIR, { recursive: true });
const existedBefore = fs.existsSync(DB_PATH);
const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = FULL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;
`);

let depth = 0;
// BEGIN IMMEDIATE … COMMIT, ROLLBACK si fn lève. Réentrant : un tx imbriqué rejoint l'englobant.
function tx(fn) {
  if (depth > 0) return fn();
  db.exec('BEGIN IMMEDIATE');
  depth++;
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch (_) { /* déjà annulée */ }
    throw e;
  } finally {
    depth--;
  }
}

function currentSchemaVersion() {
  const t = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_meta'").get();
  if (!t) return 0;
  const row = db.prepare("SELECT value FROM schema_meta WHERE key='schema_version'").get();
  return row ? Number(row.value) : 0;
}

function backupBeforeMigration() {
  const ts = stamp();
  if (existedBefore) {
    const target = path.join(DATA_DIR, `haweb.db.bak-schema1-${ts}`);
    db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
  }
  if (fs.existsSync(BIBLI_DIR)) {
    const already = fs.readdirSync(DATA_DIR).some(n => n.startsWith('bibli.bak-import-'));
    if (!already) {
      fs.cpSync(BIBLI_DIR, path.join(DATA_DIR, `bibli.bak-import-${ts}`), { recursive: true });
    }
  }
}

const EXV_COLUMNS = {
  version_no: 'INTEGER',
  content_hash: 'TEXT',
  source: 'TEXT',
  restored_from: 'INTEGER',
  thematique: 'TEXT',
  duree: 'INTEGER',
};

function migrate() {
  if (currentSchemaVersion() >= SCHEMA_VERSION) return;
  backupBeforeMigration();
  tx(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS exercise_versions (
        version_id  INTEGER PRIMARY KEY AUTOINCREMENT,
        exercise_id TEXT NOT NULL,
        saved_at    TEXT NOT NULL,
        name        TEXT,
        data        TEXT NOT NULL
      );
    `);
    const cols = new Set(db.prepare('PRAGMA table_info(exercise_versions)').all().map(c => c.name));
    for (const [name, type] of Object.entries(EXV_COLUMNS)) {
      if (!cols.has(name)) db.exec(`ALTER TABLE exercise_versions ADD COLUMN ${name} ${type}`);
    }
    db.exec(`
      CREATE TABLE IF NOT EXISTS exercises (
        id                 TEXT PRIMARY KEY,
        created_at         TEXT NOT NULL,
        current_version_id INTEGER REFERENCES exercise_versions(version_id),
        deleted_at         TEXT
      );
      CREATE TABLE IF NOT EXISTS version_snapshots (
        version_id   INTEGER PRIMARY KEY REFERENCES exercise_versions(version_id),
        image        TEXT NOT NULL,
        origin       TEXT NOT NULL,
        generated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS exercise_drafts (
        exercise_id TEXT PRIMARY KEY,
        saved_at    TEXT NOT NULL,
        data        TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS libraries (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT NOT NULL COLLATE NOCASE UNIQUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS library_exercises (
        library_id  INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
        exercise_id TEXT    NOT NULL REFERENCES exercises(id),
        added_at    TEXT    NOT NULL,
        PRIMARY KEY (library_id, exercise_id)
      );
      CREATE TABLE IF NOT EXISTS trames (
        id                 TEXT PRIMARY KEY,
        created_at         TEXT NOT NULL,
        current_version_id INTEGER REFERENCES trame_versions(version_id),
        deleted_at         TEXT
      );
      CREATE TABLE IF NOT EXISTS trame_versions (
        version_id   INTEGER PRIMARY KEY AUTOINCREMENT,
        trame_id     TEXT NOT NULL REFERENCES trames(id),
        version_no   INTEGER NOT NULL,
        saved_at     TEXT NOT NULL,
        titre        TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        data         TEXT NOT NULL,
        source       TEXT NOT NULL,
        UNIQUE (trame_id, version_no)
      );
      CREATE TABLE IF NOT EXISTS trame_exports (
        export_id        INTEGER PRIMARY KEY AUTOINCREMENT,
        trame_id         TEXT    NOT NULL REFERENCES trames(id),
        trame_version_id INTEGER NOT NULL REFERENCES trame_versions(version_id),
        trame_version_no INTEGER NOT NULL,
        exported_at      TEXT    NOT NULL,
        html             TEXT    NOT NULL,
        html_hash        TEXT    NOT NULL
      );
      CREATE TABLE IF NOT EXISTS import_log (
        source_path TEXT NOT NULL,
        sha256      TEXT NOT NULL,
        imported_at TEXT NOT NULL,
        status      TEXT NOT NULL,
        target_id   TEXT,
        version_id  INTEGER,
        error       TEXT,
        PRIMARY KEY (source_path, sha256)
      );
    `);

    // Versions d'installations plus anciennes : numérotation, hash, colonnes dénormalisées.
    const old = db.prepare('SELECT version_id, exercise_id, saved_at, data FROM exercise_versions WHERE version_no IS NULL ORDER BY exercise_id, version_id').all();
    const counters = new Map();
    const upd = db.prepare('UPDATE exercise_versions SET version_no=?, content_hash=?, source=?, thematique=?, duree=? WHERE version_id=?');
    for (const row of old) {
      const n = (counters.get(row.exercise_id) || 0) + 1;
      counters.set(row.exercise_id, n);
      let parsed = {};
      try { parsed = JSON.parse(row.data); } catch (_) { /* données conservées telles quelles */ }
      upd.run(n, contentHash(parsed), 'save', parsed.thematique ?? null,
        Number.isInteger(parsed.duree) ? parsed.duree : null, row.version_id);
    }
    db.exec(`
      INSERT OR IGNORE INTO exercises (id, created_at, current_version_id)
        SELECT exercise_id, MIN(saved_at), MAX(version_id) FROM exercise_versions GROUP BY exercise_id;
      CREATE UNIQUE INDEX IF NOT EXISTS ux_exv_no ON exercise_versions(exercise_id, version_no);
      CREATE INDEX IF NOT EXISTS idx_exercise_versions_exercise ON exercise_versions(exercise_id, version_id);
      INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('schema_version', '${SCHEMA_VERSION}');
    `);
  });
}

migrate();

module.exports = { db, tx, SCHEMA_VERSION, stamp };
