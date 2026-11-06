'use strict';
// Sauvegarde complète et restauration à l'identique (CA19).
const fs = require('fs');
const path = require('path');
const { db, tx, SCHEMA_VERSION, stamp } = require('./db');
const { PLANNING_DIR, BACKUP_DIR } = require('./config');
const { contentHash, sha256 } = require('./canonical');
const { writeFileAtomic } = require('./fs-atomic');
const { HttpError } = require('./http');
const { isValidId } = require('./validate');

// clé du fichier → [table, colonnes de tri (clé primaire)]
const TABLES = {
  exercises: ['exercises', 'id'],
  exerciseVersions: ['exercise_versions', 'version_id'],
  versionSnapshots: ['version_snapshots', 'version_id'],
  exerciseDrafts: ['exercise_drafts', 'exercise_id'],
  libraries: ['libraries', 'id'],
  libraryExercises: ['library_exercises', 'library_id, exercise_id'],
  trames: ['trames', 'id'],
  trameVersions: ['trame_versions', 'version_id'],
  trameExports: ['trame_exports', 'export_id'],
  importLog: ['import_log', 'source_path, sha256'],
};
// ordre de suppression (enfants d'abord) ; l'insertion se fait dans l'ordre inverse
const DELETE_ORDER = ['trameExports', 'libraryExercises', 'versionSnapshots', 'exerciseDrafts', 'importLog',
  'trames', 'trameVersions', 'libraries', 'exercises', 'exerciseVersions'];

const FORMAT = 'handball-engine-backup';

function columnsOf(table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
}

function readPlanning() {
  if (!fs.existsSync(PLANNING_DIR)) return [];
  const items = [];
  for (const f of fs.readdirSync(PLANNING_DIR).filter(n => n.endsWith('.json')).sort()) {
    try { items.push(JSON.parse(fs.readFileSync(path.join(PLANNING_DIR, f), 'utf8'))); } catch (e) { /* fichier illisible ignoré */ }
  }
  return items.sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function createBackup() {
  const out = { format: FORMAT, formatVersion: 1, createdAt: new Date().toISOString(), schemaVersion: SCHEMA_VERSION };
  for (const [key, [table, order]] of Object.entries(TABLES)) {
    out[key] = db.prepare(`SELECT * FROM ${table} ORDER BY ${order}`).all().map(r => ({ ...r }));
  }
  out.planning = readPlanning();
  return out;
}

function backupFileName(date = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `handball-engine-sauvegarde-${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

// Écrit une copie dans data/backups/ et garde les 20 plus récentes.
function storeBackupCopy(text, date = new Date()) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const p = n => String(n).padStart(2, '0');
  const name = `${backupFileName(date)}-${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}.json`;
  writeFileAtomic(path.join(BACKUP_DIR, name), text);
  const copies = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('handball-engine-sauvegarde-') && f.endsWith('.json')).sort();
  for (const old of copies.slice(0, Math.max(0, copies.length - 20))) fs.rmSync(path.join(BACKUP_DIR, old), { force: true });
}

function fail(detail) {
  throw new HttpError(400, `Sauvegarde incomplète ou abîmée : ${detail}. Rien n'a été modifié.`);
}

const MAX_ID = 2147483647; // limite des identifiants INTEGER acceptés à la restauration
function checkId(v, what) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > MAX_ID) throw new HttpError(400, `Sauvegarde refusée : identifiant de ${what} invalide.`);
}

function verify(b) {
  if (!b || typeof b !== 'object' || b.format !== FORMAT || b.formatVersion !== 1) {
    throw new HttpError(400, "Ce fichier n'est pas une sauvegarde Handball Engine.");
  }
  for (const key of [...Object.keys(TABLES), 'planning']) {
    if (!Array.isArray(b[key])) fail(`section « ${key} » absente`);
  }
  for (const v of b.exerciseVersions) checkId(v.version_id, 'version'); for (const l of b.libraries) checkId(l.id, 'bibliothèque'); for (const v of b.trameVersions) checkId(v.version_id, 'version de trame');
const exVersions = new Map(b.exerciseVersions.map(v => [Number(v.version_id), v]));
  const exIds = new Set(b.exercises.map(e => e.id));
  const libIds = new Set(b.libraries.map(l => Number(l.id)));
  const trIds = new Set(b.trames.map(t => t.id));
  const trVersions = new Map(b.trameVersions.map(v => [Number(v.version_id), v]));

  for (const v of b.exerciseVersions) {
    let data;
    try { data = JSON.parse(v.data); } catch (e) { fail(`version d'exercice ${v.version_id} illisible`); }
    if (contentHash(data) !== v.content_hash) fail(`empreinte différente pour la version d'exercice ${v.version_id}`);
  }
  for (const e of b.exercises) {
    if (e.current_version_id != null && !exVersions.has(Number(e.current_version_id))) fail(`version courante absente pour l'exercice ${e.id}`);
  }
  for (const s of b.versionSnapshots) if (!exVersions.has(Number(s.version_id))) fail(`schéma sans version (${s.version_id})`);
  for (const le of b.libraryExercises) {
    if (!libIds.has(Number(le.library_id)) || !exIds.has(le.exercise_id)) fail(`lien bibliothèque ${le.library_id} / ${le.exercise_id} orphelin`);
  }
  for (const v of b.trameVersions) {
    if (!trIds.has(v.trame_id)) fail(`version de trame ${v.version_id} sans trame`);
    let data;
    try { data = JSON.parse(v.data); } catch (e) { fail(`version de trame ${v.version_id} illisible`); }
    if (contentHash(data, ['updatedAt']) !== v.content_hash) fail(`empreinte différente pour la version de trame ${v.version_id}`);
    for (const bloc of Array.isArray(data.blocs) ? data.blocs : []) {
      for (const a of Array.isArray(bloc.ateliers) ? bloc.ateliers : []) {
        if (a && a.exerciceVersionId !== undefined && !exVersions.has(Number(a.exerciceVersionId))) {
          fail(`la trame ${v.trame_id} cite une version d'exercice absente (${a.exerciceVersionId})`);
        }
      }
    }
  }
  for (const t of b.trames) {
    if (t.current_version_id != null && !trVersions.has(Number(t.current_version_id))) fail(`version courante absente pour la trame ${t.id}`);
  }
  for (const x of b.trameExports) {
    const v = trVersions.get(Number(x.trame_version_id));
    if (!v || v.trame_id !== x.trame_id) fail(`export ${x.export_id} sans version de trame`);
    if (sha256(x.html) !== x.html_hash) fail(`export ${x.export_id} modifié`);
  }
  for (const ev of b.planning) {
    if (!ev || !isValidId(ev.id)) fail('événement de planning sans identifiant valide');
  }
}

// Seules les images JPEG/PNG sont acceptées dans une sauvegarde (même règle qu'à l'enregistrement).
const IMAGE_DATA_URL = /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/;

// Un schéma non conforme (ni JPEG ni PNG) bloque la restauration ; on nomme les exercices concernés.
function checkSnapshotImages(b) {
  const versionToExercise = new Map((b.exerciseVersions || []).map(v => [Number(v.version_id), v.exercise_id]));
  const bad = new Set();
  for (const row of b.versionSnapshots || []) {
    if (typeof row.image !== 'string' || !IMAGE_DATA_URL.test(row.image)) bad.add(versionToExercise.get(Number(row.version_id)) || `version ${row.version_id}`);
  }
  // Schémas aussi présents dans les données de version (champ snapshot)
  for (const v of b.exerciseVersions || []) {
    let data = null;
    try { data = JSON.parse(v.data); } catch (e) { continue; }
    if (data && data.snapshot != null && !(typeof data.snapshot === 'string' && IMAGE_DATA_URL.test(data.snapshot))) bad.add(v.exercise_id);
  }
  if (bad.size) {
    throw new HttpError(422, `Restauration refusée : schéma non JPEG/PNG pour ${[...bad].join(', ')}. Corrigez ces exercices (réenregistrez-les) puis refaites la sauvegarde. Rien n'a été modifié.`);
  }
}

function restoreBackup(b) {
  verify(b);
  checkSnapshotImages(b);

  // Copie de l'état actuel avant toute écriture
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  writeFileAtomic(path.join(BACKUP_DIR, `avant-restauration-${stamp()}.json`), JSON.stringify(createBackup()));

  tx(() => {
    db.exec('PRAGMA defer_foreign_keys = ON');
    for (const key of DELETE_ORDER) db.exec(`DELETE FROM ${TABLES[key][0]}`);
    for (const key of [...DELETE_ORDER].reverse()) {
      const table = TABLES[key][0];
      const cols = columnsOf(table);
      const stmt = db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`);
      for (const row of b[key]) stmt.run(...cols.map(c => (row[c] === undefined ? null : row[c])));
    }
    // Les identifiants de version ne doivent jamais être réutilisés : le compteur reste au-dessus du plus grand id présent.
    for (const t of ['exercise_versions', 'libraries', 'trame_versions', 'trame_exports']) {
      const maxRow = db.prepare(`SELECT COALESCE(MAX(rowid), 0) AS m FROM ${t}`).get().m;
      const cur = db.prepare('SELECT seq FROM sqlite_sequence WHERE name = ?').get(t)?.seq || 0;
      db.prepare('DELETE FROM sqlite_sequence WHERE name = ?').run(t);
      db.prepare('INSERT INTO sqlite_sequence (name, seq) VALUES (?, ?)').run(t, Math.max(cur, maxRow));
    }
  });

  // Planning : dossier temporaire puis échange de dossiers
  const tmp = PLANNING_DIR + '.restore-tmp';
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  for (const ev of b.planning) writeFileAtomic(path.join(tmp, `${ev.id}.json`), JSON.stringify(ev, null, 2));
  if (fs.existsSync(PLANNING_DIR)) fs.renameSync(PLANNING_DIR, `${PLANNING_DIR}.old-${stamp()}`);
  fs.renameSync(tmp, PLANNING_DIR);

  return {
    ok: true,
    counts: {
      exercises: b.exercises.length, versions: b.exerciseVersions.length, libraries: b.libraries.length,
      trames: b.trames.length, exports: b.trameExports.length, planning: b.planning.length,
    },
  };
}

module.exports = { createBackup, restoreBackup, storeBackupCopy, backupFileName };
