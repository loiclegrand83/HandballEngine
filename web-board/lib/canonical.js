'use strict';
const crypto = require('crypto');

// JSON aux clés triées récursivement ; les tableaux gardent leur ordre.
function canonicalJson(value) {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = sortKeys(v[k]);
    return out;
  }
  return v;
}

const EXERCISE_IGNORED_KEYS = ['updatedAt', 'exportedAt', 'snapshot'];

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// Deux contenus qui ne diffèrent que par les clés ignorées ont le même hash (CA5).
function contentHash(obj, ignoredKeys = EXERCISE_IGNORED_KEYS) {
  const copy = { ...obj };
  for (const k of ignoredKeys) delete copy[k];
  return sha256(canonicalJson(copy));
}

module.exports = { canonicalJson, contentHash, sha256, EXERCISE_IGNORED_KEYS };
