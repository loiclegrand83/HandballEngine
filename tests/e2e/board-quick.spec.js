// @ts-check
const { test, expect } = require('@playwright/test');

const countPlayers = page => page.evaluate(() =>
  // `state` est la constante globale de app.js
  // eslint-disable-next-line no-undef
  state.items.filter(i => i.id.startsWith('player')).length);

test.describe('Board : barre rapide clavier et tactile (CA24, CA26, CA27)', () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test('créer un exercice complet au clavier, avec retour visuel immédiat', async ({ page }) => {
    const started = Date.now();
    await page.goto('/pages/board.html?new=1');
    const box = await page.locator('#boardCanvas').boundingBox();
    if (!box) throw new Error('canvas not found');

    // 1. Deux joueurs
    await page.keyboard.press('j');
    await expect(page.locator('[data-quick="player"]')).toHaveAttribute('aria-pressed', 'true');
    await page.mouse.click(box.x + 200, box.y + 200);
    await page.mouse.click(box.x + 400, box.y + 250);
    expect(await countPlayers(page)).toBe(2);

    // 2. Une passe du premier au second joueur (double-clic sur le second pour terminer)
    await page.keyboard.press('p');
    await expect(page.locator('[data-quick="pass"]')).toHaveAttribute('aria-pressed', 'true');
    await page.mouse.click(box.x + 200, box.y + 200);
    await page.mouse.dblclick(box.x + 400, box.y + 250);
    // eslint-disable-next-line no-undef
    expect(await page.evaluate(() => state.paths.some(p => p.kind === 'pass' && p.points.length >= 2))).toBe(true);

    // 3. Nom et durée dans la barre, puis Ctrl+S → toast en moins de 500 ms
    await page.locator('#quickName').fill('Test rapide');
    await page.locator('#quickDuree').fill('10');
    await expect(page.locator('#exerciseName')).toHaveValue('Test rapide');
    await expect(page.locator('#exerciseDuree')).toHaveValue('10');
    const t0 = Date.now();
    await page.keyboard.press('Control+s');
    await expect(page.locator('#hawebToast')).toContainText('Version n°1', { timeout: 500 });
    expect(Date.now() - t0).toBeLessThan(500);
    expect(Date.now() - started).toBeLessThan(15000);
  });

  test('avec un champ de saisie actif, les touches ne changent pas d\'outil', async ({ page }) => {
    await page.goto('/pages/board.html?new=1');
    await page.keyboard.press('c');
    await expect(page.locator('[data-quick="course"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#quickName').focus();
    await page.keyboard.press('p');
    await expect(page.locator('[data-quick="pass"]')).toHaveAttribute('aria-pressed', 'false');
    // eslint-disable-next-line no-undef
    expect(await page.evaluate(() => state.drawMode)).toBe('course');
    await expect(page.locator('#quickName')).toHaveValue(/p$/); // la lettre est saisie dans le champ
  });

  test('l\'absence de défilement de page sur le board', async ({ page }) => {
    for (const vp of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(vp);
      await page.goto('/pages/board.html?exercise=fx_gardien');
      await expect(page.locator('#exerciseName')).toHaveValue('Echauffement gardien croisé');
      expect(await page.evaluate(() =>
        document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });
});

test.describe('Board : barre rapide au tactile (CA27)', () => {
  test.use({ viewport: { width: 1366, height: 768 }, hasTouch: true });

  test('toucher « Passe » active le mode passe', async ({ page }) => {
    await page.goto('/pages/board.html?new=1');
    await page.tap('[data-quick="pass"]');
    await expect(page.locator('[data-quick="pass"]')).toHaveAttribute('aria-pressed', 'true');
  });
});
