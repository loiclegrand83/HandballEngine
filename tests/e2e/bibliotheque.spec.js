// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Bibliothèque — filtre Thématique et recherche', () => {
  test('filtering by Gardien shows only the gardien-classified exercise', async ({ page }) => {
    await page.goto('/pages/board.html');
    await page.locator('#openLibrary').click();
    await expect(page.locator('#libraryModal')).toBeVisible();

    await page.locator('#libraryFilter').selectOption('gardien');
    const cards = page.locator('.library-card');
    await expect(cards).toHaveCount(1);
    await expect(cards.first().locator('.library-card-title')).toContainText('Echauffement gardien croisé');
  });

  test('searching by name filters the library', async ({ page }) => {
    await page.goto('/pages/board.html');
    await page.locator('#openLibrary').click();
    await page.locator('#librarySearch').fill('espagnole');

    // La recherche est debouncée côté client (200ms) ; toHaveCount() réessaie
    // automatiquement jusqu'à son propre timeout plutôt qu'une attente figée.
    const cards = page.locator('.library-card');
    await expect(cards).toHaveCount(1);
    await expect(cards.first().locator('.library-card-title')).toContainText('Espagnole');
  });

  test('a search with no matches shows the empty state, not a blank grid', async ({ page }) => {
    await page.goto('/pages/board.html');
    await page.locator('#openLibrary').click();
    await page.locator('#librarySearch').fill('zzz_no_such_exercise_zzz');

    await expect(page.locator('.library-card')).toHaveCount(0);
    await expect(page.locator('#libraryGrid')).toContainText(/Aucun exercice/i);
  });
});
