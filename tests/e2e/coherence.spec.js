// @ts-check
const { test, expect } = require('@playwright/test');
const { pageUrls } = require('../helpers/pages');

const NAV = ['Accueil', 'Bibliothèques', 'Trames', 'Board', 'Planning', 'Guide'];

test('CA22, CA23, CA26 : même navigation, mêmes couleurs, mêmes libellés, aucun menu imbriqué, animations courtes', async ({ page, request }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1366, height: 768 });
  const pages = await pageUrls(request);
  pages.push({ name: 'explication', url: '/pages/explanation.html', ready: '#appNav a' });
  const primaryColors = new Set();
  const problems = [];

  for (const p of pages) {
    await page.goto(p.url);
    await expect(page.locator(p.ready).first()).toBeVisible();

    const nav = (await page.locator('#appNav a').allTextContents()).map(t => t.trim());
    if (JSON.stringify(nav) !== JSON.stringify(NAV)) problems.push(`${p.name} : navigation ${JSON.stringify(nav)}`);

    const primary = page.locator('.btn--primary').first();
    if (await primary.count()) primaryColors.add(await primary.evaluate(el => getComputedStyle(el).backgroundColor));

    const text = await page.evaluate(() => document.body.innerText);
    const seance = text.match(/\bSéances?\b/);
    if (seance) problems.push(`${p.name} : libellé « ${seance[0]} » visible`);

    const nested = await page.locator('details details, [role=menu] [role=menu], dialog dialog').count();
    if (nested) problems.push(`${p.name} : ${nested} menu(s) imbriqué(s)`);

    const slow = await page.evaluate(() => {
      const toMs = v => v.split(',').map(s => (s.trim().endsWith('ms') ? parseFloat(s) : parseFloat(s) * 1000));
      const out = [];
      for (const el of document.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        const t = Math.max(...toMs(cs.transitionDuration));
        const a = cs.animationName !== 'none' ? Math.max(...toMs(cs.animationDuration)) : 0;
        if (t > 250 || a > 250) out.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${[...el.classList].join('.')} (${Math.max(t, a)} ms)`);
      }
      return out.slice(0, 10);
    });
    if (slow.length) problems.push(`${p.name} : animations > 250 ms : ${slow.join(', ')}`);
  }

  expect(problems).toEqual([]);
  expect(primaryColors.size).toBe(1);
});

test('CA23 : aucun panneau du Dock n\'ouvre un autre panneau', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/pages/board.html');
  for (const tool of ['players', 'trajectories', 'animation', 'postes', 'vue']) {
    const icon = page.locator(`.dock-icon[data-tool="${tool}"]`);
    if (!(await icon.count())) continue;
    await icon.click();
    expect(await page.locator('.panel:not(.hidden) .panel:not(.hidden), #panel #panel').count()).toBe(0);
    await page.keyboard.press('Escape');
  }
});
