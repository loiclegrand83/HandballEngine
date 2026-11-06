'use strict';
// Validation des données reçues (CA18). Chaque fonction renvoie null ou {field, message}.

const ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;
const THEMATIQUES = ['attaque', 'defense', 'gardien', 'enclenchement'];

function isValidId(id) {
  return typeof id === 'string' && ID_RE.test(id);
}

function isDuree(v) {
  return Number.isInteger(v) && v >= 1 && v <= 180;
}

function validateExercise(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return { field: 'id', message: "Identifiant d'exercice invalide." };
  if (!isValidId(d.id)) return { field: 'id', message: "Identifiant d'exercice invalide." };
  if (typeof d.name !== 'string' || d.name.trim().length < 1 || d.name.trim().length > 100) {
    return { field: 'name', message: "Le nom de l'exercice est obligatoire (100 caractères maximum)." };
  }
  if (!THEMATIQUES.includes(d.thematique)) {
    return { field: 'thematique', message: `Thématique invalide ou manquante (attendu: ${THEMATIQUES.join(', ')})` };
  }
  if (d.duree !== undefined && d.duree !== null && !isDuree(d.duree)) {
    return { field: 'duree', message: 'La durée doit être un nombre entier de minutes entre 1 et 180.' };
  }
  if (d.notes !== undefined && d.notes !== null && (typeof d.notes !== 'string' || d.notes.length > 2000)) {
    return { field: 'notes', message: 'Les notes ne doivent pas dépasser 2000 caractères.' };
  }
  for (const key of ['items', 'paths']) {
    if (d[key] !== undefined && (!Array.isArray(d[key]) || d[key].length > 300)) {
      return { field: key, message: `Le champ ${key} doit être une liste de 300 éléments au maximum.` };
    }
  }
  if (d.snapshot !== undefined && d.snapshot !== null && (typeof d.snapshot !== 'string' || !/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(d.snapshot))) {
    return { field: 'snapshot', message: 'Le schéma doit être une image JPEG ou PNG.' };
  }
  return null;
}

function validateLibraryName(name) {
  if (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 60) {
    return { field: 'name', message: 'Le nom de la bibliothèque est obligatoire (60 caractères maximum).' };
  }
  return null;
}

function isValidDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === s;
}

// getExerciseVersion(vid) → {exercise_id} | null : vérifie l'appartenance d'une version.
function validateTrame(t, getExerciseVersion) {
  if (!t || typeof t !== 'object' || Array.isArray(t)) return { field: 'id', message: 'Identifiant de trame invalide.' };
  if (!isValidId(t.id)) return { field: 'id', message: 'Identifiant de trame invalide.' };
  if ('dureeTotal' in t) return { field: 'dureeTotal', message: 'La durée totale est calculée automatiquement.' };
  if (typeof t.titre !== 'string' || t.titre.trim().length < 1 || t.titre.trim().length > 120) {
    return { field: 'titre', message: 'Le titre de la trame est obligatoire.' };
  }
  if (!isValidDate(t.date)) return { field: 'date', message: 'Date invalide.' };
  if (!Array.isArray(t.blocs) || t.blocs.length > 20) return { field: 'blocs', message: 'Une trame contient au plus 20 blocs.' };
  for (let i = 0; i < t.blocs.length; i++) {
    const b = t.blocs[i];
    const n = i + 1;
    if (!b || typeof b.nom !== 'string' || b.nom.trim().length < 1 || b.nom.trim().length > 60) {
      return { field: 'blocs', message: `Chaque bloc doit avoir un nom (bloc n°${n}).` };
    }
    if (!Array.isArray(b.ateliers) || b.ateliers.length > 12) {
      return { field: 'blocs', message: `Le bloc n°${n} contient au plus 12 exercices.` };
    }
    for (let j = 0; j < b.ateliers.length; j++) {
      const a = b.ateliers[j];
      const notFound = { field: 'blocs', message: `L'exercice du bloc n°${n}, position ${j + 1}, est introuvable.` };
      if (!a || typeof a !== 'object') return notFound;
      if (a.exerciceVersionId !== undefined) {
        const v = Number.isInteger(a.exerciceVersionId) ? getExerciseVersion(a.exerciceVersionId) : null;
        if (!v || v.exercise_id !== a.exerciceId) return notFound;
        if (a.dureeOverride !== undefined && a.dureeOverride !== null && !isDuree(a.dureeOverride)) {
          return { field: 'blocs', message: 'La durée doit être un nombre entier de minutes entre 1 et 180.' };
        }
      } else if (typeof a.nom !== 'string') {
        return notFound;
      }
    }
  }
  return null;
}

module.exports = { isValidId, isDuree, validateExercise, validateLibraryName, validateTrame, THEMATIQUES };
