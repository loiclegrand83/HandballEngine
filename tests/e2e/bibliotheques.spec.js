// @ts-check
const { test, expect } = require('@playwright/test');

const noPageScroll = page => page.evaluate(() =>
  document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth);

test.describe('Bibliothèques — créer, ranger, filtrer, renommer, supprimer', () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test('parcours complet sur la page Bibliothèques (CA1–CA4, CA20)', async ({ page }) => {
    const libName = `Défense ${Date.now() % 100000}`;
    await page.goto('/pages/bibliotheque.html');
    await expect(page.locator('#exGrid .ex-card').first()).toBeVisible();

    // 1. Créer
    await page.locator('#newLibName').fill(libName);
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    const row = page.locator('#libList .lib-item', { hasText: libName });
    await expect(row).toHaveText(`${libName} (0)`);

    // 2. Ouvrir la bibliothèque et y ajouter un exercice existant
    await row.click();
    await expect(page.locator('#exGrid .ex-card')).toHaveCount(0);
    await page.getByRole('button', { name: '+ Ajouter un exercice' }).click();
    await page.locator('#addDialog').getByRole('button', { name: 'Repli défensif' }).click();
    await expect(page.locator('#addDialog')).toBeHidden();
    await expect(page.locator('#libList .lib-item', { hasText: libName })).toHaveText(`${libName} (1)`);
    await expect(page.locator('#exGrid .ex-card')).toHaveCount(1);

    // 3. Filtres combinés (CA4)
    await page.locator('#libList .lib-item', { hasText: 'Tous les exercices' }).click();
    await page.locator('#fThematique').selectOption('attaque');
    await page.locator('#fSearch').fill('esp');
    await expect(page.locator('#exGrid .ex-card')).toHaveCount(1);
    await expect(page.locator('#exGrid .ex-card')).toContainText('Espagnole');
    await page.locator('#libList .lib-item', { hasText: libName }).click();
    await expect(page.locator('#exGrid .ex-card')).toHaveCount(0);
    await expect(page.locator('#exGrid')).toContainText('Aucun exercice ne correspond à ces filtres.');

    // 4. Renommer au clavier
    const renamed = `${libName} étagée`;
    const rowLi = page.locator('#libList .lib-row', { hasText: libName });
    await rowLi.locator('[data-rename]').click();
    const input = page.locator('#libList .lib-rename-input');
    await input.fill(renamed);
    await input.press('Enter');
    await expect(page.locator('#libList .lib-item', { hasText: renamed })).toBeVisible();

    // 5. Supprimer la bibliothèque : l'exercice reste
    await page.locator('#libList .lib-row', { hasText: renamed }).locator('[data-delete]').click();
    await page.locator('dialog.haweb-dialog [data-confirm="ok"]').click();
    await expect(page.locator('#libList .lib-item', { hasText: renamed })).toHaveCount(0);
    await page.locator('#libList .lib-item', { hasText: 'Tous les exercices' }).click();
    await page.locator('#fThematique').selectOption('');
    await page.locator('#fSearch').fill('');
    await expect(page.locator('#exGrid .ex-card', { hasText: 'Repli défensif' })).toBeVisible();

    // 6. Pas de défilement de page
    expect(await noPageScroll(page)).toBe(true);
    await page.setViewportSize({ width: 1920, height: 1080 });
    expect(await noPageScroll(page)).toBe(true);
  });
});
