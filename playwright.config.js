// @ts-check
const path = require('path');
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // les specs partagent le même serveur/port et les mêmes fichiers de données
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // Données de test isolées : jamais web-board/data
    command: 'node ../tests/helpers/prepare-e2e-data.js && node server.js',
    cwd: './web-board',
    url: 'http://127.0.0.1:3100/api/health',
    reuseExistingServer: false,
    env: { NO_OPEN_BROWSER: '1', HAWEB_PORT: '3100', HAWEB_DATA_DIR: path.join(__dirname, 'tests/.tmp/e2e-data') },
  },
});
