// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Board — double-click/tap to end a trajectory', () => {
  test('drawing a trajectory and double-clicking ends it without adding the second click as a point', async ({ page }) => {
    await page.goto('/pages/board.html');

    // Board auto-loads the most recently saved real exercise on open, and drawing on
    // it would autosave onto that real file. "Nouveau" resets to a fresh, unsaved
    // exercise (autosave only fires once explicitly saved) — but since the loaded
    // exercise has content, the click triggers a native confirm() dialog that
    // Playwright auto-dismisses by default, silently aborting the reset unless
    // accepted here.
    await page.waitForLoadState('networkidle');
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#newExercise').click();
    await expect(page.locator('#exerciseName')).toHaveValue('Nouveau exercice');

    await page.locator('[data-mode="shot"]').click();

    const canvas = page.locator('#boardCanvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas not found');

    // Deux points distincts d'abord (comportement normal, pas de double-clic) : si le
    // double-clic final réutilisait la position du dernier clic simple, le 1er des deux
    // clics du double-clic se retrouverait à distance 0 du clic précédent et clôturerait
    // le tracé un clic trop tôt — d'où un 3e point à une position bien distincte.
    await page.mouse.click(box.x + 200, box.y + 150);
    await page.mouse.click(box.x + 300, box.y + 200);
    await expect(page.locator('#status')).toHaveText(/Point ajouté/);

    // Double-clic pour ajouter le 3e point ET terminer le tracé en un geste.
    const endX = box.x + 500;
    const endY = box.y + 350;
    await page.mouse.click(endX, endY);
    await page.mouse.click(endX, endY);
    await expect(page.locator('#status')).toHaveText(/Trajectoire terminée/);
  });

  test('the removed "Terminer traj." button is gone from the page', async ({ page }) => {
    await page.goto('/pages/board.html');
    await expect(page.locator('#finishPath')).toHaveCount(0);
  });
});

test.describe('Board — Temps mort module removed', () => {
  test('home page has no Temps mort card or link', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a[href*="timeout.html"]')).toHaveCount(0);
    await expect(page.getByText('Temps Mort', { exact: false })).toHaveCount(0);
  });

  test('the deleted timeout page returns 404', async ({ page }) => {
    const res = await page.goto('/pages/timeout.html');
    expect(res?.status()).toBe(404);
  });
});
