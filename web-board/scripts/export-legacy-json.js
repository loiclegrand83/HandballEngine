'use strict';
// Retour arrière : écrit la version courante de chaque exercice dans data/bibli-export-<horodatage>/<id>.json
// (format historique, snapshot conservé). Ne modifie ni la base ni data/bibli.
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { DATA_DIR, DB_PATH } = require('../lib/config');
const { writeFileAtomic } = require('../lib/fs-atomic');

const db = new DatabaseSync(DB_PATH, { readOnly: true });
const rows = db.prepare(`SELECT e.id, v.data FROM exercises e
  JOIN exercise_versions v ON v.version_id = e.current_version_id WHERE e.deleted_at IS NULL ORDER BY e.id`).all();
db.close();

const dir = path.join(DATA_DIR, `bibli-export-${new Date().toISOString().replace(/[:.]/g, '-')}`);
fs.mkdirSync(dir, { recursive: true });
for (const r of rows) {
  const d = JSON.parse(r.data);
  if (d.id === undefined) d.id = r.id;
  writeFileAtomic(path.join(dir, `${r.id}.json`), JSON.stringify(d, null, 2));
}
console.log(`${rows.length} exercice(s) exporté(s) dans ${dir}`);
