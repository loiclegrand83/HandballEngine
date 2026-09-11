#!/usr/bin/env node
/**
 * One-off migration script: adds a `thematique` field to every exercise
 * file in web-board/data/bibli/*.json, without touching `category`.
 *
 * - category: offensif  -> thematique: attaque   (no prompt)
 * - category: defensif  -> thematique: defense    (no prompt)
 * - any other category (echauffement, physique, montee_balle, unmapped, or
 *   missing) -> prompts interactively on stdin with a proposed default of
 *   `attaque`, asking the user to confirm or override.
 *
 * Idempotent: files that already have a valid `thematique` are skipped.
 *
 * Usage: node web-board/scripts/migrate-thematique.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const BIBLI_DIR = path.join(__dirname, '..', 'data', 'bibli');
const THEMATIQUE_VALUES = ['attaque', 'defense', 'gardien', 'enclenchement'];

const DIRECT_MAP = {
  offensif: 'attaque',
  defensif: 'defense',
};

const DEFAULT_PROPOSAL = 'attaque';

function backupBibliDir() {
  if (!fs.existsSync(BIBLI_DIR)) {
    console.error(`Dossier introuvable : ${BIBLI_DIR}`);
    process.exit(1);
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(path.dirname(BIBLI_DIR), `bibli.bak-${timestamp}`);
  fs.mkdirSync(backupDir, { recursive: true });
  const files = fs.readdirSync(BIBLI_DIR).filter(f => f.endsWith('.json'));
  for (const file of files) {
    fs.copyFileSync(path.join(BIBLI_DIR, file), path.join(backupDir, file));
  }
  console.log(`Sauvegarde de ${files.length} fichier(s) vers : ${backupDir}`);
  return backupDir;
}

function askQuestion(rl, question) {
  return new Promise(resolve => rl.question(question, answer => resolve(answer.trim())));
}

async function resolveThematiqueInteractively(rl, exerciseName, category) {
  console.log(`\nExercice : "${exerciseName}" (category: ${category || '(absente)'})`);
  console.log(`Proposition par défaut : ${DEFAULT_PROPOSAL}`);
  const answer = await askQuestion(
    rl,
    `Valider "${DEFAULT_PROPOSAL}" ? [Entrée pour accepter, ou taper une valeur parmi ${THEMATIQUE_VALUES.join('|')}] : `
  );
  if (answer === '') return DEFAULT_PROPOSAL;
  if (THEMATIQUE_VALUES.includes(answer)) return answer;
  console.log(`Valeur invalide "${answer}", nouvelle tentative...`);
  return resolveThematiqueInteractively(rl, exerciseName, category);
}

async function migrate() {
  backupBibliDir();

  const files = fs.readdirSync(BIBLI_DIR).filter(f => f.endsWith('.json'));
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const report = [];

  try {
    for (const file of files) {
      const filePath = path.join(BIBLI_DIR, file);
      let data;
      try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (e) {
        console.error(`Erreur de lecture/parsing de ${file}, fichier ignoré.`, e.message);
        continue;
      }

      if (THEMATIQUE_VALUES.includes(data.thematique)) {
        report.push({ file, name: data.name, category: data.category, thematique: data.thematique, action: 'skip (déjà migré)' });
        continue;
      }

      const category = data.category;
      let thematique;
      if (DIRECT_MAP[category]) {
        thematique = DIRECT_MAP[category];
      } else {
        thematique = await resolveThematiqueInteractively(rl, data.name || file, category);
      }

      data.thematique = thematique;
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      report.push({ file, name: data.name, category, thematique, action: 'migré' });
    }
  } finally {
    rl.close();
  }

  console.log('\n--- Rapport de migration ---');
  for (const r of report) {
    console.log(`${r.file} | name="${r.name}" | category=${r.category || '(absente)'} -> thematique=${r.thematique} [${r.action}]`);
  }
  console.log(`\nTerminé : ${report.length} fichier(s) traité(s).`);
}

migrate().catch(err => {
  console.error('Erreur durant la migration :', err);
  process.exit(1);
});
