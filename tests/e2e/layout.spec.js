// @ts-check
const { test, expect } = require('@playwright/test');
const { VIEWPORTS, pageUrls } = require('../helpers/pages');

test('CA20 : aucune page ne défile, en 1366×768 et 1920×1080', async ({ page, request }) => {
  const failures = [];
  for (const p of await pageUrls(request)) {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.goto(p.url);
      await expect(page.locator(p.ready).first()).toBeVisible();
      const dims = await page.evaluate(() => ({
        sh: document.documentElement.scrollHeight, ih: innerHeight,
        sw: document.documentElement.scrollWidth, iw: innerWidth,
      }));
      if (dims.sh > dims.ih || dims.sw > dims.iw) failures.push(`${p.name} ${vp.width}×${vp.height} : ${JSON.stringify(dims)}`);
    }
  }
  expect(failures).toEqual([]);
});
