// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Séance — Blocs nommés, Ateliers, durée auto, sauvegarde', () => {
  test('build a Bloc with two Ateliers, watch the total auto-update, save, and reopen', async ({ page, request }) => {
    const titre = `test_e2e_seance_${Date.now()}`;
    await page.goto('/pages/seance.html');

    await page.locator('#fTitre').fill(titre);
    await page.getByRole('button', { name: '+ Échauffement' }).click();

    // Ajouter un premier atelier
    await page.locator('[data-action="pick"]').first().click();
    await expect(page.locator('#exGrid .ex-card')).not.toHaveCount(0);
    await page.locator('#exGrid .ex-card').first().click();

    await expect(page.locator('#fDureeTotal')).not.toHaveValue('0');
    const totalAfterOne = await page.locator('#fDureeTotal').inputValue();

    // Ajouter un deuxième atelier au même Bloc
    await page.locator('[data-action="pick"]').first().click();
    await page.locator('#exGrid .ex-card').nth(1).click();

    const totalAfterTwo = await page.locator('#fDureeTotal').inputValue();
    expect(Number(totalAfterTwo)).toBeGreaterThan(Number(totalAfterOne));

    // Sauvegarder
    await page.locator('#btnSave').click();
    await expect(page.locator('#toast')).toContainText(/sauvegardée/i);

    // Nettoyage : retrouver la séance sauvegardée par son titre unique et la supprimer.
    const saved = await (await request.get('/api/seances')).json();
    const match = saved.find(s => s.titre === titre);
    expect(match, 'saved séance should be findable via the API for cleanup').toBeTruthy();
    await request.delete(`/api/seances/${match.id}`);
  });

  test('Bloc name is free text and editable after a preset click', async ({ page }) => {
    await page.goto('/pages/seance.html');
    await page.getByRole('button', { name: '+ Opposition libre' }).click();

    const nameInput = page.locator('.bloc-name-input').first();
    await expect(nameInput).toHaveValue('Opposition libre');
    await nameInput.fill('Thème principal — jeu de transition');
    await nameInput.dispatchEvent('change');
    await expect(nameInput).toHaveValue('Thème principal — jeu de transition');
  });

  test('an "Opposition libre" Bloc with zero Ateliers shows the empty-state placeholder', async ({ page }) => {
    await page.goto('/pages/seance.html');
    await page.getByRole('button', { name: '+ Opposition libre' }).click();
    await expect(page.locator('.bloc-ateliers-list').first()).toContainText(/Aucun exercice/i);
  });
});

test.describe('Séance — free-text fields are HTML-escaped (regression: security review)', () => {
  test('notesCoach cannot break out of its <textarea> and execute script', async ({ page, request }) => {
    const id = `test_e2e_xss_${Date.now()}`;
    let pwned = false;
    page.on('console', () => {}); // pas de bruit
    await request.post('/api/seances', {
      data: {
        id, titre: 'XSS regression', date: '2026-09-10',
        blocs: [{ nom: 'Bloc', ateliers: [], notesCoach: '</textarea><img src=x onerror=window.__pwned=true>' }],
      },
    });

    try {
      await page.goto(`/pages/seance.html?id=${id}`);
      await page.waitForLoadState('networkidle');
      pwned = await page.evaluate(() => window.__pwned || false);
      expect(pwned).toBe(false);
      // le texte doit rester visible tel quel dans le champ, pas exécuté
      await expect(page.locator('textarea[data-field="notesCoach"]').first()).toHaveValue(/<img/);
    } finally {
      await request.delete(`/api/seances/${id}`);
    }
  });

  test('titre/theme/coach render as literal text, not executable markup, on the printable document', async ({ page, request }) => {
    const id = `test_e2e_xss_doc_${Date.now()}`;
    await request.post('/api/seances', {
      data: { id, titre: '<script>window.__pwned2=true</script>', theme: '<b>x</b>', coach: 'a"b', date: '2026-09-10', blocs: [] },
    });

    try {
      await page.goto(`/pages/seance.html?id=${id}`);
      await page.locator('#btnDocView').click();
      const pwned = await page.evaluate(() => window.__pwned2 || false);
      expect(pwned).toBe(false);
      await expect(page.locator('.doc-seance-title')).toContainText('<script>');
    } finally {
      await request.delete(`/api/seances/${id}`);
    }
  });
});
