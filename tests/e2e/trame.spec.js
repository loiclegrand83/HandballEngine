// @ts-check
const { test, expect } = require('@playwright/test');

const noPageScroll = page => page.evaluate(() =>
  document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth);

async function addFromPicker(page, search, name) {
  await page.locator('#pSearch').fill(search);
  await page.locator('#picker .pick-card', { hasText: name }).locator('.pick-add').click();
}

test.describe('Trame versionnée composée depuis les bibliothèques (CA8–CA10, CA20)', () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test('composer, ordonner, enregistrer et garder la version exacte', async ({ page, context }) => {
    await page.goto('/pages/seance.html');
    await expect(page.locator('#picker .pick-card').first()).toBeVisible();

    // 1. Échauffement + exercice gardien
    await page.getByRole('button', { name: '+ Échauffement' }).click();
    await expect(page.locator('.bloc').first()).toHaveClass(/is-target/);
    await addFromPicker(page, 'gardien', 'Echauffement gardien croisé');
    const firstRow = page.locator('.bloc').first().locator('.entry');
    await expect(firstRow).toHaveCount(1);
    await expect(firstRow.locator('.badge', { hasText: 'v1' })).toBeVisible();
    await expect(page.locator('#totalDuree')).toHaveText('15 min');

    // 2. Exercice sans durée → badge, puis durée saisie sur l'entrée
    await page.getByRole('button', { name: '+ Exercice' }).click();
    await addFromPicker(page, 'fixation', 'Fixation sans durée');
    const row2 = page.locator('.bloc').nth(1).locator('.entry').first();
    await expect(row2.locator('.badge--err')).toHaveText('Durée manquante');
    await expect(page.locator('#totalDuree')).toHaveText('15 min');
    await row2.locator('.entry-min').fill('12');
    await expect(page.locator('#totalDuree')).toHaveText('27 min');
    await expect(row2.locator('.badge--err')).toHaveCount(0);
    // CA9 : aucun champ de saisie pour le total
    expect(await page.locator('#totalDuree input, .total-box input').count()).toBe(0);
    expect(await page.locator('#totalDuree').evaluate(el => el.tagName)).toBe('OUTPUT');

    // 3. Réordonner les blocs (CA8)
    await page.locator('.bloc').nth(1).locator('[data-act="bup"]').click();
    await expect(page.locator('.bloc').first().locator('.bloc-num')).toHaveText('BLOC 01');
    await expect(page.locator('.bloc').first().locator('.bloc-name-input')).toHaveValue('Exercice');

    // 4. Enregistrer au clavier
    await page.locator('#fTitre').fill('Trame test');
    await page.keyboard.press('Control+s');
    await expect(page.locator('#hawebToast')).toContainText('version n°1');
    const url = page.url();
    expect(url).toContain('id=');

    // 5. Modifier l'exercice dans le Board : la trame garde la version 1 (CA10)
    const board = await context.newPage();
    await board.goto('/pages/board.html?exercise=fx_gardien');
    await expect(board.locator('#exerciseName')).toHaveValue('Echauffement gardien croisé');
    await board.locator('details[data-section="exercice"]').evaluate(d => { /** @type {HTMLDetailsElement} */ (d).open = true; });
    await board.locator('#exerciseName').fill('Gardien modifié');
    await board.locator('#saveLocal').click();
    await expect(board.locator('#status')).toContainText('Version n°2');
    await board.close();

    await page.reload();
    const gardienRow = page.locator('.entry', { hasText: 'Echauffement gardien croisé' });
    await expect(gardienRow).toBeVisible();
    await expect(gardienRow.locator('.badge', { hasText: 'v1' })).toBeVisible();
    await expect(gardienRow).toContainText('Nouvelle version disponible');
  });

  test('aucun défilement de page avec 5 blocs de 3 entrées (CA20)', async ({ page }) => {
    await page.goto('/pages/seance.html');
    await expect(page.locator('#picker .pick-card').first()).toBeVisible();
    for (let b = 0; b < 5; b++) {
      await page.getByRole('button', { name: '+ Exercice' }).click();
      for (let e = 0; e < 3; e++) await page.locator('#picker .pick-add').nth(e).click();
    }
    await expect(page.locator('.entry')).toHaveCount(15);
    expect(await noPageScroll(page)).toBe(true);
    await page.setViewportSize({ width: 1920, height: 1080 });
    expect(await noPageScroll(page)).toBe(true);
  });
});
