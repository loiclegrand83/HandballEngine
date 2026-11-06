// @ts-check
const { test, expect } = require('@playwright/test');

const pad = n => String(n).padStart(2, '0');
const todayFr = () => { const d = new Date(); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };

async function prepareTrame(request, id, blocSizes) {
  const catalog = await (await request.get('/api/catalog')).json();
  const ids = ['fx_gardien', 'fx_espagnole', 'fx_sans_duree', 'fx_defense'];
  const byId = Object.fromEntries(catalog.map(e => [e.id, e]));
  let k = 0;
  let total = 0;
  const blocs = blocSizes.map((n, i) => ({
    nom: ['Échauffement', 'Exercice', 'Retour au calme', 'Bloc libre'][i] || `Bloc ${i + 1}`,
    notesCoach: '',
    ateliers: Array.from({ length: n }, () => {
      const e = byId[ids[k++ % ids.length]];
      const dureeOverride = e.duree == null ? 12 : null;
      total += dureeOverride ?? e.duree;
      return { exerciceId: e.id, exerciceVersionId: e.versionId, dureeOverride };
    }),
  }));
  const res = await request.post('/api/seances', { data: { id, titre: `Trame PDF ${id}`, date: '2026-11-12', theme: 'Défense', coach: 'Coach', objectif: '', blocs } });
  expect(res.status()).toBe(200);
  return { total, blocs };
}

test.describe('Export PDF propre et archivé (CA11–CA16, UC8)', () => {
  test.use({ viewport: { width: 1366, height: 768 } });
  test.setTimeout(90000);

  test('exporter, vérifier le document, l\'impression et l\'archive', async ({ page, request }) => {
    const id = `trpdf_${Date.now()}`;
    const { total, blocs } = await prepareTrame(request, id, [2, 4, 1]);
    const catalog = await (await request.get('/api/catalog')).json();
    const defenseBefore = catalog.find(e => e.id === 'fx_defense');

    await page.addInitScript(() => { window.print = () => { /** @type {any} */ (window).__printed = true; }; });
    await page.goto(`/pages/seance.html?id=${id}`);
    await expect(page.locator('.entry')).toHaveCount(7);

    // 1. Export
    await page.getByRole('button', { name: 'Exporter en PDF' }).click();
    await expect.poll(() => page.evaluate(() => /** @type {any} */ (window).__printed === true), { timeout: 60000 }).toBe(true);

    // 2. Contenu (CA11, CA12, CA13)
    const ateliers = page.locator('#docPage .doc-atelier');
    await expect(ateliers).toHaveCount(7);
    for (let i = 0; i < 7; i++) {
      const a = ateliers.nth(i);
      expect(await a.locator('img.doc-schema').evaluate(el => /** @type {HTMLImageElement} */ (el).naturalWidth)).toBeGreaterThan(0);
      await expect(a).toContainText('min');
      await expect(a).toContainText('Description');
      await expect(a).toContainText('Matériel');
    }
    await expect(page.locator('#docPage .doc-header')).toContainText(`Durée totale : ${total} min`);
    const headerNames = await page.locator('#docPage .doc-bloc-header .doc-bloc-name').allInnerTexts();
    expect(headerNames).toEqual(blocs.map(b => b.nom));
    expect((await page.locator('#docPage .doc-notes').innerText()).trim()).toBe('Notes du coach');

    // 5. CA16 : archive enregistrée, ligne de version
    await expect(page.locator('#docPage .doc-version-line')).toContainText(`version n°1 · exportée le ${todayFr()}`);
    const exports = await (await request.get(`/api/seances/${id}/exports`)).json();
    expect(exports).toHaveLength(1);
    expect(exports[0].trameVersionNo).toBe(1);

    // 3. CA14 : aucun élément d'interface à l'impression
    await page.emulateMedia({ media: 'print' });
    for (const b of await page.locator('button').all()) await expect(b).toBeHidden();
    for (const sel of ['.app-nav', '.toolbar', '.toast']) {
      for (const el of await page.locator(sel).all()) await expect(el).toBeHidden();
    }

    // 4. CA15 : blocs non coupés, PDF produit
    for (const bloc of await page.locator('#docPage .doc-bloc').all()) {
      const { breakInside, height } = await bloc.evaluate(el => ({
        breakInside: getComputedStyle(el).breakInside, height: el.getBoundingClientRect().height,
      }));
      expect(breakInside).toBe('avoid');
      expect(height).toBeLessThanOrEqual(1031);
    }
    const pdf = await page.pdf({ format: 'A4', margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' } });
    expect(pdf.length).toBeGreaterThan(20 * 1024);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    await page.emulateMedia({ media: 'screen' });

    // 6. UC8 : l'archive et « Rouvrir cette version » gardent l'ancienne version
    const current = await (await request.get('/api/exercises/fx_defense')).json();
    const upd = await request.post('/api/exercises', { data: { ...current, name: 'Repli défensif modifié', notes: 'Nouvelles notes' } });
    expect(upd.status()).toBe(200);
    const archive = await request.get(`/api/exports/${exports[0].exportId}`);
    const html = await archive.text();
    expect(html).toContain(defenseBefore.name);
    expect(html).toContain(current.notes);
    expect(html).not.toContain('Repli défensif modifié');
    expect(html).toContain('data:image/');

    await page.getByRole('button', { name: 'Mes trames' }).click();
    const card = page.locator(`[data-trame="${id}"]`);
    await card.getByRole('button', { name: 'Exports' }).click();
    await card.getByRole('button', { name: 'Rouvrir cette version' }).click();
    const row = page.locator('.entry', { hasText: 'Repli défensif' }).first();
    await expect(row.locator('.badge', { hasText: `v${defenseBefore.versionNo}` })).toBeVisible();
    await expect(row).not.toContainText('modifié');
  });

  test('contrôle bloquant : un bloc de plus de 4 exercices n\'est pas exporté', async ({ page, request }) => {
    const id = `trpdf5_${Date.now()}`;
    await prepareTrame(request, id, [5]);
    await page.addInitScript(() => { window.print = () => { /** @type {any} */ (window).__printed = true; }; });
    await page.goto(`/pages/seance.html?id=${id}`);
    await expect(page.locator('.entry')).toHaveCount(5);
    await page.getByRole('button', { name: 'Exporter en PDF' }).click();
    await expect(page.locator('#hawebToast')).toContainText('plus de 4 exercices');
    const exports = await (await request.get(`/api/seances/${id}/exports`)).json();
    expect(exports).toHaveLength(0);
    expect(await page.evaluate(() => /** @type {any} */ (window).__printed === true)).toBe(false);
  });
});

test.describe('Blocs trop hauts pour une page (CA15)', () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test('findTallBloc détecte un bloc plus haut qu\'une page, et ignore un bloc normal', async ({ page }) => {
    await page.goto('/pages/seance.html');
    const result = await page.evaluate(() => {
      /** @type {any} */ (window).setView('document'); // comme l'export : la vue document doit être affichée pour mesurer
      const doc = /** @type {HTMLElement} */ (document.getElementById('docPage'));
      doc.innerHTML = '<section class="doc-bloc" style="height:400px"></section>';
      const normal = /** @type {any} */ (window).findTallBloc();
      doc.innerHTML = '<section class="doc-bloc" style="height:400px"></section><section class="doc-bloc" style="height:1400px"></section>';
      const tall = /** @type {any} */ (window).findTallBloc();
      return { normal, tall };
    });
    expect(result.normal).toBeNull();
    expect(result.tall).toBe(1);
  });
});
