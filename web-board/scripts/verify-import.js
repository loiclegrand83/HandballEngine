'use strict';
// Vérifie (en lecture seule) que chaque fichier de data/bibli est importé à l'identique dans SQLite.
// Usage : node scripts/verify-import.js   (HAWEB_DATA_DIR pour un autre dossier)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const util = require('util');
const { DatabaseSync } = require('node:sqlite');
const { DATA_DIR, BIBLI_DIR, DB_PATH } = require('../lib/config');

if (!fs.existsSync(DB_PATH)) {
  console.error(`Base introuvable : ${DB_PATH}. Démarrez le serveur une fois pour importer.`);
  process.exit(1);
}
const db = new DatabaseSync(DB_PATH, { readOnly: true });
const logStmt = db.prepare("SELECT * FROM import_log WHERE source_path = ? AND sha256 = ? AND status <> 'error'");
const verStmt = db.prepare('SELECT exercise_id, version_no, data FROM exercise_versions WHERE version_id = ?');
const currentIds = new Set(db.prepare(`SELECT e.id FROM exercises e
  JOIN exercise_versions v ON v.version_id = e.current_version_id WHERE e.deleted_at IS NULL`).all().map(r => r.id));

const files = fs.existsSync(BIBLI_DIR) ? fs.readdirSync(BIBLI_DIR).filter(f => f.endsWith('.json')).sort() : [];
const rows = [];
let failed = 0;
for (const f of files) {
  const full = path.join(BIBLI_DIR, f);
  const buf = fs.readFileSync(full);
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  const rel = path.relative(DATA_DIR, full).split(path.sep).join('/');
  const text = buf.toString('utf8');
  const problems = [];
  const log = logStmt.get(rel, sha);
  let id = '?';
  let version = '?';
  if (!log) problems.push('(a) pas d\'entrée import_log pour cette empreinte');
  else {
    id = log.target_id;
    const v = verStmt.get(log.version_id);
    if (!v) problems.push('(b) version introuvable');
    else {
      version = v.version_no;
      if (log.status !== 'unchanged' && v.data !== text) problems.push('(b) texte différent du fichier');
      let same = false;
      try { same = util.isDeepStrictEqual(JSON.parse(v.data), JSON.parse(text)); } catch (e) { /* illisible */ }
      if (!same) problems.push('(c) contenu JSON différent');
    }
    if (!currentIds.has(id)) problems.push('(d) absent de la liste des exercices courants');
  }
  if (problems.length) failed++;
  rows.push({ fichier: f, id, version, resultat: problems.length ? 'ÉCHEC ' + problems.join(' ; ') : 'OK' });
}

console.table(rows);
const errors = db.prepare("SELECT source_path, error FROM import_log WHERE status = 'error'").all();
if (errors.length) {
  console.log('Entrées import_log en erreur :');
  for (const e of errors) console.log(`  ${e.source_path} : ${e.error}`);
}
db.close();
console.log(failed ? `${failed} fichier(s) en échec.` : `${files.length} fichier(s) vérifié(s) : tout est OK.`);
process.exit(failed ? 1 : 0);
