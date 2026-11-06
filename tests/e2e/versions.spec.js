// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Historique des versions et schémas garantis (CA6, CA15)', () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test('enregistrer, restaurer une version, générer un schéma manquant', async ({ page, request }) => {
    // 1. Board : nouvelle version, puis enregistrement identique
    await page.goto('/pages/board.html?exercise=fx_espagnole');
    await expect(page.locator('#exerciseName')).toHaveValue('Espagnole');
    // le champ Nom est dans la section « Exercice » de la sidebar, repliée par défaut
    await page.locator('details[data-section="exercice"]').evaluate(d => { /** @type {HTMLDetailsElement} */ (d).open = true; });
    await page.locator('#exerciseName').fill('Espagnole v2');
    await page.locator('#saveLocal').click();
    await expect(page.locator('#status')).toContainText('Version n°2');
    await page.locator('#saveLocal').click();
    await expect(page.locator('#status')).toContainText('Aucun changement');

    // 2. Bibliothèques : historique et restauration
    await page.goto('/pages/bibliotheque.html');
    await page.locator('#exGrid .ex-card', { hasText: 'Espagnole v2' }).click();
    const history = page.locator('#historyList li');
    await expect(history).toHaveCount(2);
    await page.locator('#historyList button', { hasText: /^v1 ·/ }).click();
    await expect(page.locator('.version-banner')).toContainText('Version n°1');
    await page.getByRole('button', { name: 'Restaurer cette version' }).click();
    await expect(page.locator('#hawebToast')).toContainText('nouvelle version n°3');
    await expect(history).toHaveCount(3);
    await expect(page.locator('#detail .detail-title')).toHaveText('Espagnole');

    // 3. Exercice importé sans schéma : schéma généré dans les 10 s
    await page.locator('#exGrid .ex-card', { hasText: 'Fixation sans durée' }).click();
    const img = page.locator('#detail img.schema');
    await expect(img).toBeVisible({ timeout: 10000 });
    await expect.poll(() => img.evaluate(el => /** @type {HTMLImageElement} */ (el).naturalWidth), { timeout: 10000 }).toBeGreaterThan(0);
    const catalog = await (await request.get('/api/catalog')).json();
    const fx = catalog.find(e => e.id === 'fx_sans_duree');
    const snap = await request.get(`/api/versions/${fx.versionId}/snapshot`);
    expect(snap.status()).toBe(200);
  });
});
