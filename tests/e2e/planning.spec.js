// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Planning — vue semaine, liaison Séance, détection orpheline', () => {
  test('toggling to Semaine keeps the toolbar in a consistent pressed state', async ({ page }) => {
    await page.goto('/pages/planning.html');
    await expect(page.locator('#btnViewMonth')).toHaveAttribute('aria-pressed', 'true');

    await page.locator('#btnViewWeek').click();
    await expect(page.locator('#btnViewWeek')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#btnViewMonth')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('.calendar-grid')).toHaveClass(/calendar-grid--week/);
  });

  test('an event linked to a deleted Séance shows the orphan warning on the calendar grid', async ({ page, request }) => {
    const uniqueTitre = `test_e2e_orphan_${Date.now()}`;
    const seanceId = `test_planning_e2e_${Date.now()}`;
    const eventId = `test_planning_e2e_ev_${Date.now()}`;

    await request.post('/api/seances', {
      data: { id: seanceId, titre: 'E2E Orphan Séance', date: '2026-09-15', blocs: [] },
    });
    await request.post('/api/planning', {
      data: { id: eventId, type: 'entrainement', date: '2026-09-15', titre: uniqueTitre, seanceId, heure: '', notes: '' },
    });
    await request.delete(`/api/seances/${seanceId}`);

    try {
      await page.goto('/pages/planning.html');
      // Filtré sur le titre unique de cet événement : une autre puce orpheline déjà
      // présente sur le calendrier ne doit jamais faire échouer cette assertion en
      // mode strict (locator().filter() garde exactement une puce, pas ".orphan" nu).
      const chip = page.locator('.event-chip--orphan').filter({ hasText: uniqueTitre });
      await expect(chip).toContainText(/séance introuvable/i);
    } finally {
      await request.delete(`/api/planning/${eventId}`);
    }
  });

  test('the "Ouvrir la séance →" button appears only when a Séance is linked', async ({ page }) => {
    await page.goto('/pages/planning.html');
    await page.locator('#btnAddEntrainement').click();

    await expect(page.locator('#btnOpenSeance')).toBeHidden();
    // Sélectionner la première séance réelle si disponible, sinon le test s'arrête ici proprement
    const options = await page.locator('#fSeanceLink option').all();
    if (options.length > 1) {
      const firstRealValue = await options[1].getAttribute('value');
      await page.locator('#fSeanceLink').selectOption(firstRealValue || '');
      await expect(page.locator('#btnOpenSeance')).toBeVisible();
    }
  });
});
