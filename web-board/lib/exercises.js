'use strict';
// Exercices : versions immuables et dédoublonnées, brouillons, vignettes de schéma.
const { db, tx } = require('./db');
const { contentHash } = require('./canonical');
const { HttpError } = require('./http');

const q = {
  getEx: db.prepare('SELECT id, created_at, current_version_id, deleted_at FROM exercises WHERE id = ?'),
  getVer: db.prepare('SELECT * FROM exercise_versions WHERE version_id = ?'),
  maxNo: db.prepare('SELECT COALESCE(MAX(version_no), 0) AS n FROM exercise_versions WHERE exercise_id = ?'),
  insVer: db.prepare(`INSERT INTO exercise_versions
    (exercise_id, saved_at, name, data, version_no, content_hash, source, restored_from, thematique, duree)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  insEx: db.prepare('INSERT INTO exercises (id, created_at, current_version_id) VALUES (?, ?, ?)'),
  updEx: db.prepare('UPDATE exercises SET current_version_id = ?, deleted_at = NULL WHERE id = ?'),
  undelete: db.prepare('UPDATE exercises SET deleted_at = NULL WHERE id = ?'),
  insSnap: db.prepare('INSERT OR REPLACE INTO version_snapshots (version_id, image, origin, generated_at) VALUES (?, ?, ?, ?)'),
  getSnap: db.prepare('SELECT version_id, image, origin FROM version_snapshots WHERE version_id = ?'),
  listCurrent: db.prepare(`SELECT e.id, v.data FROM exercises e
    JOIN exercise_versions v ON v.version_id = e.current_version_id
    WHERE e.deleted_at IS NULL ORDER BY e.id`),
  listVersions: db.prepare(`SELECT version_id, version_no, saved_at, name, source, restored_from
    FROM exercise_versions WHERE exercise_id = ? ORDER BY version_no DESC`),
  softDelete: db.prepare('UPDATE exercises SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL'),
  putDraft: db.prepare('INSERT OR REPLACE INTO exercise_drafts (exercise_id, saved_at, data) VALUES (?, ?, ?)'),
  getDraft: db.prepare('SELECT saved_at, data FROM exercise_drafts WHERE exercise_id = ?'),
  delDraft: db.prepare('DELETE FROM exercise_drafts WHERE exercise_id = ?'),
  catalog: db.prepare(`SELECT e.id, v.version_id, v.version_no, v.name, v.thematique, v.duree, v.data,
      (SELECT group_concat(le.library_id) FROM library_exercises le WHERE le.exercise_id = e.id) AS lib_ids,
      EXISTS(SELECT 1 FROM version_snapshots s WHERE s.version_id = v.version_id) AS has_snapshot
    FROM exercises e JOIN exercise_versions v ON v.version_id = e.current_version_id
    WHERE e.deleted_at IS NULL ORDER BY v.name COLLATE NOCASE, e.id`),
};

function intOrNull(v) {
  return Number.isInteger(v) ? v : null;
}

function versionInfo(row) {
  return { versionId: Number(row.version_id), versionNo: Number(row.version_no) };
}

// Enregistre une version si le contenu (hash) diffère de la version courante.
// rawText : texte exact à stocker (import) ; sinon JSON.stringify(data).
function saveExercise(data, opts = {}) {
  const { source = 'save', rawText = null, savedAt = null, restoredFrom = null, force = false } = opts;
  return tx(() => {
    const id = data.id;
    const now = new Date().toISOString();
    const hash = contentHash(data);
    const ex = q.getEx.get(id);
    const cur = ex && ex.current_version_id != null ? q.getVer.get(ex.current_version_id) : null;
    if (cur && cur.content_hash === hash && !force) {
      if (source === 'save') {
        if (ex.deleted_at) q.undelete.run(id);
        q.delDraft.run(id);
      }
      return { created: false, ...versionInfo(cur) };
    }
    const versionNo = Number(q.maxNo.get(id).n) + 1;
    const when = savedAt || now;
    const r = q.insVer.run(id, when, typeof data.name === 'string' ? data.name : '', rawText ?? JSON.stringify(data),
      versionNo, hash, source, restoredFrom, typeof data.thematique === 'string' ? data.thematique : null, intOrNull(data.duree));
    const versionId = Number(r.lastInsertRowid);
    if (ex) q.updEx.run(versionId, id);
    else q.insEx.run(id, when, versionId);
    if (typeof data.snapshot === 'string' && /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(data.snapshot)) {
      q.insSnap.run(versionId, data.snapshot, 'embedded', now);
    }
    if (source !== 'import') q.delDraft.run(id);
    return { created: true, versionId, versionNo, existed: !!ex };
  });
}

function withId(id, text) {
  const d = JSON.parse(text);
  if (d && typeof d === 'object' && d.id === undefined) d.id = id;
  return d;
}

function listCurrent() {
  return q.listCurrent.all().map(r => withId(r.id, r.data));
}

function getCurrent(id) {
  const ex = q.getEx.get(id);
  if (!ex || ex.deleted_at || ex.current_version_id == null) return null;
  return withId(id, q.getVer.get(ex.current_version_id).data);
}

function exists(id) {
  const ex = q.getEx.get(id);
  return !!(ex && !ex.deleted_at);
}

function getExerciseRow(id) {
  return q.getEx.get(id) || null;
}

function softDelete(id) {
  return tx(() => q.softDelete.run(new Date().toISOString(), id).changes > 0);
}

function listVersions(id) {
  return q.listVersions.all(id).map(r => ({
    versionId: Number(r.version_id),
    versionNo: Number(r.version_no),
    savedAt: r.saved_at,
    name: r.name,
    source: r.source,
    restoredFrom: r.restored_from == null ? null : Number(r.restored_from),
  }));
}

function getVersionRow(vid) {
  return q.getVer.get(vid) || null;
}

function getVersion(vid) {
  const r = q.getVer.get(vid);
  if (!r) return null;
  return {
    versionId: Number(r.version_id),
    versionNo: Number(r.version_no),
    exerciseId: r.exercise_id,
    savedAt: r.saved_at,
    name: r.name,
    data: withId(r.exercise_id, r.data),
  };
}

function putDraft(id, data) {
  const savedAt = new Date().toISOString();
  tx(() => q.putDraft.run(id, savedAt, JSON.stringify(data)));
  return { savedAt };
}

function getDraft(id) {
  const r = q.getDraft.get(id);
  return r ? { savedAt: r.saved_at, data: JSON.parse(r.data) } : null;
}

function deleteDraft(id) {
  tx(() => q.delDraft.run(id));
}

// Catalogue léger pour les listes (bibliothèques, trame).
function listCatalog() {
  return q.catalog.all().map(r => {
    let d = {};
    try { d = JSON.parse(r.data); } catch (_) { /* données importées illisibles */ }
    return {
      id: r.id,
      versionId: Number(r.version_id),
      versionNo: Number(r.version_no),
      name: r.name || '',
      thematique: r.thematique,
      duree: r.duree == null ? null : Number(r.duree),
      notes: String(d.notes || '').slice(0, 300),
      material: (d.explanation && typeof d.explanation.material === 'string') ? d.explanation.material : '',
      updatedAt: d.updatedAt || d.exportedAt || null,
      libraryIds: r.lib_ids ? String(r.lib_ids).split(',').map(Number) : [],
      hasSnapshot: !!r.has_snapshot,
    };
  });
}

// Restauration : nouvelle version (source='restore') copiée d'une ancienne ; rien n'est effacé (CA6).
function restore(exerciseId, versionId) {
  return tx(() => {
    const src = q.getVer.get(versionId);
    if (!src || src.exercise_id !== exerciseId) throw new HttpError(404, 'Version introuvable pour cet exercice.');
    const ex = q.getEx.get(exerciseId);
    const cur = ex && ex.current_version_id != null ? q.getVer.get(ex.current_version_id) : null;
    const data = JSON.parse(src.data);
    if (cur && cur.content_hash === contentHash(data)) {
      return { created: false, ...versionInfo(cur), message: 'Cette version est déjà la version actuelle.' };
    }
    data.updatedAt = new Date().toISOString();
    const res = saveExercise(data, { source: 'restore', restoredFrom: Number(src.version_id), force: true });
    const snap = q.getSnap.get(src.version_id);
    if (snap && !q.getSnap.get(res.versionId)) {
      q.insSnap.run(res.versionId, snap.image, snap.origin, new Date().toISOString());
    }
    return { created: true, versionId: res.versionId, versionNo: res.versionNo };
  });
}

const SNAPSHOT_RE = /^data:image\/(jpeg|png);base64,/;
const SNAPSHOT_MAX = 900 * 1024;

function putSnapshot(versionId, image) {
  if (typeof image !== 'string' || !SNAPSHOT_RE.test(image)) {
    throw new HttpError(400, 'Image de schéma invalide (JPEG ou PNG attendu).', 'image');
  }
  if (image.length > SNAPSHOT_MAX) throw new HttpError(400, 'Image de schéma trop volumineuse (900 Ko maximum).', 'image');
  return tx(() => {
    if (!q.getVer.get(versionId)) throw new HttpError(404, 'Version introuvable.');
    const existing = q.getSnap.get(versionId);
    if (existing && existing.origin === 'embedded') throw new HttpError(409, 'Cette version a déjà un schéma enregistré.');
    q.insSnap.run(versionId, image, 'rendered', new Date().toISOString());
    return { ok: true };
  });
}

// Renvoie {contentType, buffer} ou null.
function getSnapshot(versionId) {
  const s = q.getSnap.get(versionId);
  if (!s) return null;
  const m = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(s.image);
  if (!m) return null; // seul JPEG/PNG est servi, jamais de SVG
  const buffer = Buffer.from(m[2], 'base64');
  return { contentType: m[1], buffer };
}

const recentStmt = db.prepare(`SELECT e.id, v.version_id, v.version_no, v.name, v.thematique, v.duree, v.saved_at
  FROM exercises e JOIN exercise_versions v ON v.version_id = e.current_version_id
  WHERE e.deleted_at IS NULL ORDER BY v.saved_at DESC, v.version_id DESC LIMIT ?`);

function listRecent(limit) {
  return recentStmt.all(limit).map(r => ({
    id: r.id, versionId: Number(r.version_id), versionNo: Number(r.version_no), name: r.name || '',
    thematique: r.thematique, duree: r.duree == null ? null : Number(r.duree), savedAt: r.saved_at,
  }));
}

function hasSnapshot(versionId) {
  return !!q.getSnap.get(versionId);
}

module.exports = {
  saveExercise, listCurrent, getCurrent, exists, getExerciseRow, softDelete, listVersions,
  getVersion, getVersionRow, putDraft, getDraft, deleteDraft, listCatalog,
  restore, putSnapshot, getSnapshot, hasSnapshot, listRecent,
};
