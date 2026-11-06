// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Hors ligne : consultation et préparation sans serveur (besoin §4)', () => {
  test.use({ viewport: { width: 1366, height: 768 } });
  test.setTimeout(60000);

  test('consulter, préparer une trame hors ligne, puis l\'enregistrer au retour', async ({ page, context }) => {
    // 1. Peupler le cache
    await page.goto('/pages/bibliotheque.html');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect(page.locator('#exGrid .ex-card').first()).toBeVisible();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await page.goto('/pages/seance.html');
    await expect(page.locator('#picker .pick-card').first()).toBeVisible();

    // 2. Hors ligne : la bibliothèque reste consultable
    await context.setOffline(true);
    await page.goto('/pages/bibliotheque.html');
    await expect(page.locator('#exGrid .ex-card').first()).toBeVisible();
    await expect(page.locator('#offlineBanner')).toBeVisible();

    // 3. Préparer une trame hors ligne
    await page.goto('/pages/seance.html');
    await expect(page.locator('#picker .pick-card').first()).toBeVisible();
    await page.getByRole('button', { name: '+ Échauffement' }).click();
    await page.locator('#picker .pick-add').first().click();
    await expect(page.locator('.entry')).toHaveCount(1);
    await page.locator('#fTitre').fill('Trame hors ligne');
    await page.keyboard.press('Control+s');
    await expect(page.locator('#hawebToast')).toContainText('Le serveur local est arrêté');
    const draftCount = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('haweb-trame-draft-')).length);
    expect(draftCount).toBeGreaterThan(0);

    // 4. Retour du serveur : le brouillon est proposé puis enregistré
    await context.setOffline(false);
    await page.reload();
    await expect(page.locator('#draftBanner')).toBeVisible();
    await expect(page.locator('#draftBanner')).toContainText('Modifications non enregistrées retrouvées');
    await page.getByRole('button', { name: 'Reprendre' }).click();
    await expect(page.locator('#fTitre')).toHaveValue('Trame hors ligne');
    await page.keyboard.press('Control+s');
    await expect(page.locator('#hawebToast')).toContainText('version n°1');
  });
});
