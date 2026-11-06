// @ts-check
const { test, expect } = require('@playwright/test');

const FORBIDDEN = ['JSON', 'SQLite', 'API', 'serveur', 'base de données', 'localhost', 'HTTP', 'cache', 'navigateur'];

test('CA29 : guide d\'une page, sans jargon, imprimable sur une page A4', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/pages/guide.html');
  for (const title of ['Bibliothèques', 'Trame', 'Export PDF', 'Sauvegarde']) {
    await expect(page.locator('.guide-card h2', { hasText: title })).toHaveCount(1);
  }
  const text = await page.locator('main').innerText();
  for (const word of FORBIDDEN) {
    const re = new RegExp(`(^|[^\\p{L}])${word}([^\\p{L}]|$)`, 'iu');
    expect(re.test(text), `mot interdit : ${word}`).toBe(false);
  }
  expect(await page.evaluate(() =>
    document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.emulateMedia({ media: 'print' });
  const pdf = (await page.pdf({ format: 'A4' })).toString('latin1');
  const pages = pdf.match(/\/Type\s*\/Page(?!s)/g) || [];
  expect(pages.length).toBe(1);
});
