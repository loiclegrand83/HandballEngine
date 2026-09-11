// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // les specs partagent le même serveur/port et les mêmes fichiers de données
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'node server.js',
    cwd: './web-board',
    url: 'http://127.0.0.1:3000/pages/board.html',
    reuseExistingServer: false,
    env: { NO_OPEN_BROWSER: '1' },
  },
});
