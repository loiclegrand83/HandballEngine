'use strict';

// Audit de lisibilité (CA21) : taille de texte et contraste WCAG des textes visibles.
// Seuils de l'épic : aucun texte visible sous 13 px ; contraste ≥ 4,5:1 (≥ 3:1 pour ≥ 24 px ou ≥ 18,66 px gras).
async function auditReadability(page) {
  return page.evaluate(() => {
    const parse = c => {
      const m = /rgba?\(([^)]+)\)/.exec(c || '');
      if (!m) return null;
      const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    };
    const over = (top, bottom) => ({
      r: top.r * top.a + bottom.r * (1 - top.a),
      g: top.g * top.a + bottom.g * (1 - top.a),
      b: top.b * top.a + bottom.b * (1 - top.a),
      a: 1,
    });
    const lum = c => {
      const ch = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
    };
    const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
    const media = [...document.querySelectorAll('canvas, img')].map(el => el.getBoundingClientRect());
    const overlapsMedia = r => media.some(m => r.left < m.right && r.right > m.left && r.top < m.bottom && r.bottom > m.top);
    const selectorOf = el => {
      let s = el.tagName.toLowerCase();
      if (el.id) s += '#' + el.id;
      else if (el.classList.length) s += '.' + [...el.classList].join('.');
      return s;
    };

    // Fond effectif : composition des fonds semi-transparents jusqu'au premier fond opaque.
    const backgroundOf = el => {
      const layers = [];
      let opaque = null;
      let node = el;
      while (node && node.nodeType === 1) {
        const bg = parse(getComputedStyle(node).backgroundColor);
        if (bg && bg.a > 0) {
          if (bg.a >= 0.99) { opaque = bg; break; }
          layers.push(bg);
        }
        node = node.parentElement;
      }
      const found = !!opaque && node !== document.body && node !== document.documentElement;
      let color = opaque || { r: 255, g: 255, b: 255, a: 1 };
      for (let i = layers.length - 1; i >= 0; i--) color = over(layers[i], color);
      return { color, found };
    };

    const violations = [];
    for (const el of document.querySelectorAll('body *')) {
      const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (!hasText) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility !== 'visible' || Number(cs.opacity) === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1) continue; // masqué ou réservé aux lecteurs d'écran
      if (r.bottom <= 0 || r.right <= 0 || r.top >= innerHeight || r.left >= innerWidth) continue;
      if (el.closest('[hidden], [aria-hidden="true"], :disabled, .no-print[hidden]')) continue;
      if (el.closest('[style*="display: none"]')) continue;
      const fontSize = parseFloat(cs.fontSize);
      const bg = backgroundOf(el);
      if (!bg.found && overlapsMedia(r)) continue; // texte posé sur un canvas ou une image
      let fg = parse(cs.color);
      if (!fg) continue;
      if (fg.a < 1) fg = over(fg, bg.color);
      const contrast = ratio(fg, bg.color);
      const bold = Number(cs.fontWeight) >= 700;
      const large = fontSize >= 24 || (bold && fontSize >= 18.66);
      const min = large ? 3 : 4.5;
      if (fontSize < 13 || contrast < min) {
        violations.push({
          selector: selectorOf(el),
          text: el.textContent.trim().slice(0, 40),
          fontSize: Math.round(fontSize * 10) / 10,
          ratio: Math.round(contrast * 100) / 100,
        });
      }
    }
    return violations;
  });
}

module.exports = { auditReadability };
