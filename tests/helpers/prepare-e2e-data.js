'use strict';
// Recrée tests/.tmp/e2e-data à partir des fixtures, avant chaque lancement Playwright.
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', '.tmp', 'e2e-data');
const fixtures = path.join(__dirname, '..', 'fixtures', 'data');

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.cpSync(fixtures, target, { recursive: true });
console.log(`Données e2e préparées dans ${target}`);
