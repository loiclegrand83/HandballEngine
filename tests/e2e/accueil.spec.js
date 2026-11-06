// @ts-check
const { test, expect } = require('@playwright/test');

const noPageScroll = page => page.evaluate(() =>
  document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth);

test.describe('Accueil orienté reprise (CA25, CA28)', () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test('bibliothèques d\'abord ; ajouter un exercice existant en 3 clics ; reprendre une trame en 1 clic', async ({ page, request }) => {
    // Préparation par l'API
    let res = await request.post('/api/libraries', { data: { name: 'Défense' } });
    let libId;
    if (res.status() === 409) {
      libId = (await (await request.get('/api/libraries')).json()).find(l => l.name === 'Défense').id;
    } else {
      libId = (await res.json()).id;
    }

    // 1. Ordre des sections (CA28)
    await page.goto('/');
    await expect(page.locator('#libCards .lib-card').first()).toBeVisible();
    const order = await page.evaluate(() => [...document.querySelectorAll('main section')].map(s => s.id));
    expect(order.indexOf('homeLibraries')).toBeLessThan(order.indexOf('homeTrames'));
    expect(order.indexOf('homeTrames')).toBeLessThan(order.indexOf('homeExercises'));

    // 2. CA25 : exactement 3 clics depuis l'accueil
    let clicks = 0;
    await page.locator(`#libCards [data-library="${libId}"]`).click(); clicks++;
    await expect(page).toHaveURL(new RegExp(`bibliotheque\\.html\\?library=${libId}`));
    await page.getByRole('button', { name: '+ Ajouter un exercice' }).click(); clicks++;
    await page.locator('#addDialog').getByRole('button', { name: 'Espagnole', exact: true }).click(); clicks++;
    await expect(page.locator('#addDialog')).toBeHidden();
    expect(clicks).toBe(3);
    const catalog = await (await request.get('/api/catalog')).json();
    expect(catalog.find(e => e.id === 'fx_espagnole').libraryIds).toContain(libId);

    // 3. Reprendre une trame en un clic (CA28)
    const id = `acc_${Date.now()}`;
    res = await request.post('/api/seances', { data: { id, titre: 'Trame accueil', date: '2026-11-12', blocs: [] } });
    expect(res.status()).toBe(200);
    await page.goto('/');
    await page.locator('#trameRows .row-link', { hasText: 'Trame accueil' }).click();
    await expect(page).toHaveURL(/seance\.html\?id=/);
    await expect(page.locator('#fTitre')).toHaveValue('Trame accueil');

    // 4. Pas de défilement
    await page.goto('/');
    await expect(page.locator('#libCards .lib-card').first()).toBeVisible();
    expect(await noPageScroll(page)).toBe(true);
    await page.setViewportSize({ width: 1920, height: 1080 });
    expect(await noPageScroll(page)).toBe(true);
  });
});
