// @ts-check
const { test, expect } = require('@playwright/test');
const { VIEWPORTS, pageUrls } = require('../helpers/pages');
const { auditReadability } = require('../helpers/readability');

test('CA21 : textes lisibles (≥ 13 px, contraste WCAG) sur toutes les pages', async ({ page, request }) => {
  test.setTimeout(60000);
  const report = {};
  for (const p of await pageUrls(request)) {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.goto(p.url);
      await expect(page.locator(p.ready).first()).toBeVisible();
      await page.waitForTimeout(300); // fin des transitions d'apparition
      const v = await auditReadability(page);
      if (v.length) report[`${p.name} ${vp.width}×${vp.height}`] = v;
    }
  }
  expect(report).toEqual({});
});
