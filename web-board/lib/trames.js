'use strict';
// Trames (ex-séances) : versions immuables, résolution des versions d'exercices, exports archivés.
const { db, tx } = require('./db');
const { contentHash, sha256 } = require('./canonical');
const { HttpError } = require('./http');

const TRAME_IGNORED_KEYS = ['updatedAt'];

const q = {
  getTr: db.prepare('SELECT id, created_at, current_version_id, deleted_at FROM trames WHERE id = ?'),
  getVer: db.prepare('SELECT * FROM trame_versions WHERE version_id = ?'),
  maxNo: db.prepare('SELECT COALESCE(MAX(version_no), 0) AS n FROM trame_versions WHERE trame_id = ?'),
  insTr: db.prepare('INSERT INTO trames (id, created_at, current_version_id) VALUES (?, ?, NULL)'),
  insVer: db.prepare(`INSERT INTO trame_versions (trame_id, version_no, saved_at, titre, content_hash, data, source)
    VALUES (?, ?, ?, ?, ?, ?, ?)`),
  updTr: db.prepare('UPDATE trames SET current_version_id = ?, deleted_at = NULL WHERE id = ?'),
  undelete: db.prepare('UPDATE trames SET deleted_at = NULL WHERE id = ?'),
  listCurrent: db.prepare(`SELECT t.id, v.data, v.version_id, v.version_no, v.saved_at FROM trames t
    JOIN trame_versions v ON v.version_id = t.current_version_id
    WHERE t.deleted_at IS NULL ORDER BY v.saved_at DESC, t.id`),
  listVersions: db.prepare('SELECT version_id, version_no, saved_at, titre FROM trame_versions WHERE trame_id = ? ORDER BY version_no DESC'),
  softDelete: db.prepare('UPDATE trames SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL'),
  exVer: db.prepare(`SELECT v.version_id, v.exercise_id, v.version_no, v.name, v.data, v.duree, v.thematique,
      e.current_version_id,
      EXISTS(SELECT 1 FROM version_snapshots s WHERE s.version_id = v.version_id) AS has_snapshot
    FROM exercise_versions v LEFT JOIN exercises e ON e.id = v.exercise_id WHERE v.version_id = ?`),
  insExport: db.prepare(`INSERT INTO trame_exports (trame_id, trame_version_id, trame_version_no, exported_at, html, html_hash)
    VALUES (?, ?, ?, ?, ?, ?)`),
  listExports: db.prepare(`SELECT export_id, exported_at, trame_version_id, trame_version_no FROM trame_exports
    WHERE trame_id = ? ORDER BY export_id DESC`),
  getExport: db.prepare('SELECT * FROM trame_exports WHERE export_id = ?'),
};

function save(t, opts = {}) {
  const { source = 'save', rawText = null, savedAt = null } = opts;
  return tx(() => {
    const id = t.id;
    const hash = contentHash(t, TRAME_IGNORED_KEYS);
    const tr = q.getTr.get(id);
    const cur = tr && tr.current_version_id != null ? q.getVer.get(tr.current_version_id) : null;
    if (cur && cur.content_hash === hash) {
      if (source === 'save' && tr.deleted_at) q.undelete.run(id);
      return { created: false, versionId: Number(cur.version_id), versionNo: Number(cur.version_no) };
    }
    const when = savedAt || new Date().toISOString();
    if (!tr) q.insTr.run(id, when);
    const versionNo = Number(q.maxNo.get(id).n) + 1;
    const titre = typeof t.titre === 'string' && t.titre.trim() ? t.titre : id;
    const r = q.insVer.run(id, versionNo, when, titre, hash, rawText ?? JSON.stringify(t), source);
    const versionId = Number(r.lastInsertRowid);
    q.updTr.run(versionId, id);
    return { created: true, versionId, versionNo, existed: !!tr };
  });
}

function listCurrent() {
  return q.listCurrent.all().map(r => JSON.parse(r.data));
}

// Lignes légères pour l'accueil et « Mes trames ».
function listCurrentRows() {
  return q.listCurrent.all().map(r => ({
    data: JSON.parse(r.data),
    versionId: Number(r.version_id),
    versionNo: Number(r.version_no),
    savedAt: r.saved_at,
  }));
}

function exists(id) {
  const tr = q.getTr.get(id);
  return !!(tr && !tr.deleted_at);
}

function describe(data) {
  if (typeof data.notes === 'string' && data.notes.trim()) return data.notes;
  const steps = data.explanation && Array.isArray(data.explanation.steps) ? data.explanation.steps : [];
  const parts = steps.map(s => (s && typeof s.description === 'string' ? s.description.trim() : '')).filter(Boolean);
  return parts.join('\n');
}

function resolveExerciseVersion(vid) {
  const r = q.exVer.get(vid);
  if (!r) return null;
  let d = {};
  try { d = JSON.parse(r.data); } catch (_) { /* conservé tel quel */ }
  return {
    exerciseId: r.exercise_id,
    versionNo: Number(r.version_no),
    name: typeof d.name === 'string' ? d.name : (r.name || ''),
    notes: typeof d.notes === 'string' ? d.notes : '',
    description: describe(d),
    material: (d.explanation && typeof d.explanation.material === 'string') ? d.explanation.material : '',
    duree: Number.isInteger(d.duree) ? d.duree : null,
    thematique: r.thematique,
    hasSnapshot: !!r.has_snapshot,
    isLatest: r.current_version_id != null && Number(r.current_version_id) === Number(r.version_id),
  };
}

function resolveVersionRow(row) {
  const trame = JSON.parse(row.data);
  const exerciseVersions = {};
  for (const bloc of Array.isArray(trame.blocs) ? trame.blocs : []) {
    for (const a of Array.isArray(bloc.ateliers) ? bloc.ateliers : []) {
      if (a && Number.isInteger(a.exerciceVersionId) && !exerciseVersions[a.exerciceVersionId]) {
        const ev = resolveExerciseVersion(a.exerciceVersionId);
        if (ev) exerciseVersions[a.exerciceVersionId] = ev;
      }
    }
  }
  return { trame, versionId: Number(row.version_id), versionNo: Number(row.version_no), savedAt: row.saved_at, exerciseVersions };
}

function getResolved(id) {
  const tr = q.getTr.get(id);
  if (!tr || tr.deleted_at || tr.current_version_id == null) return null;
  return resolveVersionRow(q.getVer.get(tr.current_version_id));
}

function getResolvedVersion(versionId) {
  const row = q.getVer.get(versionId);
  if (!row) return null;
  return { trameId: row.trame_id, ...resolveVersionRow(row) };
}

// Durée effective d'une entrée : dureeOverride ?? durée de la version ?? durée de l'ancien format.
function effectiveDuree(atelier, exerciseVersions) {
  if (!atelier) return null;
  if (Number.isInteger(atelier.dureeOverride)) return atelier.dureeOverride;
  const ev = atelier.exerciceVersionId != null ? exerciseVersions[atelier.exerciceVersionId] : null;
  if (ev && Number.isInteger(ev.duree)) return ev.duree;
  const d = Number(atelier.duree);
  return Number.isFinite(d) && d > 0 ? d : null;
}

function totalDuree(trame, exerciseVersions) {
  let total = 0;
  for (const bloc of Array.isArray(trame.blocs) ? trame.blocs : []) {
    for (const a of Array.isArray(bloc.ateliers) ? bloc.ateliers : []) total += effectiveDuree(a, exerciseVersions) || 0;
  }
  return total;
}

function listVersions(id) {
  return q.listVersions.all(id).map(r => ({
    versionId: Number(r.version_id), versionNo: Number(r.version_no), savedAt: r.saved_at, titre: r.titre,
  }));
}

function softDelete(id) {
  return tx(() => q.softDelete.run(new Date().toISOString(), id).changes > 0);
}

const EXPORT_MAX = 20 * 1024 * 1024;

function createExport(trameId, trameVersionId, html) {
  if (typeof html !== 'string' || !html.startsWith('<!DOCTYPE html>')) {
    throw new HttpError(400, "Le document exporté est invalide.", 'html');
  }
  if (html.length > EXPORT_MAX) throw new HttpError(400, 'Le document exporté est trop volumineux.', 'html');
  return tx(() => {
    const v = Number.isInteger(trameVersionId) ? q.getVer.get(trameVersionId) : null;
    if (!v || v.trame_id !== trameId) {
      throw new HttpError(400, "Cette version n'appartient pas à la trame.", 'trameVersionId');
    }
    const exportedAt = new Date().toISOString();
    const r = q.insExport.run(trameId, trameVersionId, Number(v.version_no), exportedAt, html, sha256(html));
    return { exportId: Number(r.lastInsertRowid), exportedAt, trameVersionNo: Number(v.version_no) };
  });
}

function listExports(trameId) {
  return q.listExports.all(trameId).map(r => ({
    exportId: Number(r.export_id), exportedAt: r.exported_at,
    trameVersionId: Number(r.trame_version_id), trameVersionNo: Number(r.trame_version_no),
  }));
}

function getExport(exportId) {
  return q.getExport.get(exportId) || null;
}

module.exports = {
  save, listCurrent, listCurrentRows, exists, getResolved, getResolvedVersion, listVersions, softDelete,
  effectiveDuree, totalDuree, createExport, listExports, getExport, resolveExerciseVersion,
};
