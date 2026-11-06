'use strict';
// Bibliothèques : des étiquettes sur les exercices (lien N–N), sans copie des exercices (CA1–CA3).
const { db, tx } = require('./db');
const { HttpError } = require('./http');
const { validateLibraryName } = require('./validate');
const exercises = require('./exercises');

const q = {
  list: db.prepare(`SELECT l.id, l.name, l.updated_at,
      (SELECT count(*) FROM library_exercises le JOIN exercises e ON e.id = le.exercise_id
        WHERE le.library_id = l.id AND e.deleted_at IS NULL) AS count
    FROM libraries l ORDER BY l.name COLLATE NOCASE`),
  get: db.prepare('SELECT id, name FROM libraries WHERE id = ?'),
  byName: db.prepare('SELECT id FROM libraries WHERE name = ? COLLATE NOCASE'),
  ins: db.prepare('INSERT INTO libraries (name, created_at, updated_at) VALUES (?, ?, ?)'),
  rename: db.prepare('UPDATE libraries SET name = ?, updated_at = ? WHERE id = ?'),
  touch: db.prepare('UPDATE libraries SET updated_at = ? WHERE id = ?'),
  del: db.prepare('DELETE FROM libraries WHERE id = ?'),
  addEx: db.prepare('INSERT OR IGNORE INTO library_exercises (library_id, exercise_id, added_at) VALUES (?, ?, ?)'),
  delEx: db.prepare('DELETE FROM library_exercises WHERE library_id = ? AND exercise_id = ?'),
};

function row(r) {
  return { id: Number(r.id), name: r.name, count: Number(r.count), updatedAt: r.updated_at };
}

function list() {
  return q.list.all().map(row);
}

function checkName(name, exceptId) {
  const err = validateLibraryName(name);
  if (err) throw new HttpError(400, err.message, err.field);
  const dup = q.byName.get(name.trim());
  if (dup && Number(dup.id) !== exceptId) throw new HttpError(409, 'Une bibliothèque porte déjà ce nom.', 'name');
  return name.trim();
}

function mustExist(id) {
  const lib = q.get.get(id);
  if (!lib) throw new HttpError(404, 'Bibliothèque introuvable.');
  return lib;
}

function create(name) {
  return tx(() => {
    const clean = checkName(name);
    const now = new Date().toISOString();
    const id = Number(q.ins.run(clean, now, now).lastInsertRowid);
    return { id, name: clean };
  });
}

function rename(id, name) {
  return tx(() => {
    mustExist(id);
    const clean = checkName(name, id);
    q.rename.run(clean, new Date().toISOString(), id);
    return { id, name: clean };
  });
}

// Supprime la bibliothèque et ses liens (cascade) ; aucun exercice n'est touché (CA2).
function remove(id) {
  return tx(() => {
    mustExist(id);
    q.del.run(id);
    return { success: true };
  });
}

function addExercise(id, exerciseId) {
  return tx(() => {
    mustExist(id);
    if (!exercises.exists(exerciseId)) throw new HttpError(404, 'Exercice introuvable.', 'exerciseId');
    const now = new Date().toISOString();
    q.addEx.run(id, exerciseId, now);
    q.touch.run(now, id);
    return { success: true };
  });
}

function removeExercise(id, exerciseId) {
  return tx(() => {
    mustExist(id);
    if (q.delEx.run(id, exerciseId).changes > 0) q.touch.run(new Date().toISOString(), id);
    return { success: true };
  });
}

module.exports = { list, create, rename, remove, addExercise, removeExercise };
