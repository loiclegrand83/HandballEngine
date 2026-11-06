'use strict';
// Chemins et port. HAWEB_DATA_DIR permet aux tests de travailler hors de data/.
const path = require('path');

const DATA_DIR = process.env.HAWEB_DATA_DIR
  ? path.resolve(process.env.HAWEB_DATA_DIR)
  : path.join(__dirname, '..', 'data');

module.exports = {
  APP_DIR: path.join(__dirname, '..'),
  DATA_DIR,
  PORT: Number(process.env.HAWEB_PORT) || 3000,
  BIBLI_DIR: path.join(DATA_DIR, 'bibli'),
  SEANCES_DIR: path.join(DATA_DIR, 'seances'),
  PLANNING_DIR: path.join(DATA_DIR, 'planning'),
  BACKUP_DIR: path.join(DATA_DIR, 'backups'),
  DB_PATH: path.join(DATA_DIR, 'haweb.db'),
};
