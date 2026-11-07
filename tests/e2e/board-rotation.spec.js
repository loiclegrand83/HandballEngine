// @ts-check
const { test, expect } = require('@playwright/test');

// Revue du guide : le double-clic tourne un objet, il ne le supprime plus (app.js, handler pointerdown/dblclick).
test('double-clic sur un joueur le tourne d\'un quart de tour sans le supprimer', async ({ page }) => {
  await page.goto('/pages/board.html');
  await page.evaluate(() => {
    /** @type {any} */ (state).items.push({ id: 'rot-1', x: 20, y: 10, team: 'A', post: 'AG', label: '7', radius: 18, shape: 'circle', displayLabel: '7', rotation: 0 });
    /** @type {any} */ (window).render();
  });
  const [x, y] = await page.evaluate(() => {
    const c = fieldToCanvas({ x: 20, y: 10 });
    const r = document.getElementById('boardCanvas').getBoundingClientRect();
    return [r.left + c.x * (r.width / board.width), r.top + c.y * (r.height / board.height)];
  });
  await page.mouse.dblclick(x, y);
  await page.waitForTimeout(150);
  const item = await page.evaluate(() => /** @type {any} */ (state).items.find(i => i.id === 'rot-1'));
  expect(item, 'le joueur doit encore exister').toBeTruthy();
  expect(item.rotation).toBe(90);
});
