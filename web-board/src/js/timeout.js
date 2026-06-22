const COURT_RATIO = 40 / 20;
const BAR_HEIGHT  = 72;

const state = {
  players : [],
  arrows  : [],
  drag    : null,
  penMode : false,
  drawing : null,
  penTeam : 'A',
};

const canvas = document.getElementById('courtCanvas');
const ctx    = canvas.getContext('2d');

let CW = 0, CH = 0;
let OX = 0, OY = 0;
let TW = 0, TH = 0;

function resize() {
  CW = window.innerWidth;
  CH = window.innerHeight - BAR_HEIGHT;
  canvas.width        = CW;
  canvas.height       = CH;
  canvas.style.width  = CW + 'px';
  canvas.style.height = CH + 'px';

  if (CW / CH > COURT_RATIO) {
    TH = CH * 0.92;
    TW = TH * COURT_RATIO;
  } else {
    TW = CW * 0.92;
    TH = TW / COURT_RATIO;
  }

  OX = (CW - TW) / 2;
  OY = (CH - TH) / 2;
  draw();
}

window.addEventListener('resize', resize);

// Coordonnées normalisées [0,1] ↔ pixels canvas
function toCanvas(nx, ny) {
  return { x: OX + nx * TW, y: OY + ny * TH };
}

function toNorm(cx, cy) {
  return { x: (cx - OX) / TW, y: (cy - OY) / TH };
}

// ── Terrain ───────────────────────────────────────────────────────────────
function drawCourt() {
  ctx.fillStyle = '#1a472a';
  ctx.fillRect(OX, OY, TW, TH);

  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth   = Math.max(1, TW / 350);

  ctx.strokeRect(OX, OY, TW, TH);

  // Ligne médiane
  ctx.beginPath();
  ctx.moveTo(OX + TW / 2, OY);
  ctx.lineTo(OX + TW / 2, OY + TH);
  ctx.stroke();

  // Cercle central
  ctx.beginPath();
  ctx.arc(OX + TW / 2, OY + TH / 2, TH * 0.15, 0, Math.PI * 2);
  ctx.stroke();

  _drawGoalZone('left');
  _drawGoalZone('right');
}

function _drawGoalZone(side) {
  // Terrain 40m × 20m
  // Rayon 6m = 6/40 de TW = 15% TW
  // Rayon 9m = 9/40 de TW = 22.5% TW
  // Ligne 7m = 7/40 de TW depuis le but = 17.5% TW
  // But : 3m large = 3/20 de TH = 15% TH

  const cy  = OY + TH / 2;
  const lw  = ctx.lineWidth;
  const r6  = TW * 0.15;
  const r9  = TW * 0.225;
  const arcX = side === 'left' ? OX : OX + TW;

  // Clipper pour que les arcs restent dans le terrain
  ctx.save();
  ctx.beginPath();
  ctx.rect(OX, OY, TW, TH);
  ctx.clip();

  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth   = lw;

  // Arc 6m — sens horaire pour gauche, anti-horaire pour droite
  ctx.beginPath();
  ctx.arc(arcX, cy, r6, -Math.PI / 2, Math.PI / 2, side === 'right');
  ctx.stroke();

  // Arc 9m — pointillés
  ctx.setLineDash([TW * 0.012, TW * 0.008]);
  ctx.beginPath();
  ctx.arc(arcX, cy, r9, -Math.PI / 2, Math.PI / 2, side === 'right');
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();

  // Ligne des 7m
  const x7  = side === 'left' ? OX + TW * 0.175 : OX + TW * 0.825;
  const hw7 = TH * 0.035;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth   = lw;
  ctx.beginPath();
  ctx.moveTo(x7, cy - hw7);
  ctx.lineTo(x7, cy + hw7);
  ctx.stroke();

  // But
  const gw = TH * 0.15;
  const gd = TW * 0.018;
  ctx.fillStyle   = 'rgba(255,255,255,0.1)';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth   = lw * 2;
  if (side === 'left') {
    ctx.strokeRect(OX - gd, cy - gw / 2, gd, gw);
    ctx.fillRect  (OX - gd, cy - gw / 2, gd, gw);
  } else {
    ctx.strokeRect(OX + TW, cy - gw / 2, gd, gw);
    ctx.fillRect  (OX + TW, cy - gw / 2, gd, gw);
  }
  ctx.lineWidth   = lw;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
}

// ── Formations ────────────────────────────────────────────────────────────
// x=0 = but gauche (équipe A attaque vers la droite)
// x=1 = but droit  (équipe B défend à droite)
// Repères terrain (terrain 40m × 20m, x normalisé sur largeur 40m) :
//   Ligne de but gauche  : x = 0.00
//   Zone 6m gauche       : x ≈ 0.15  (6/40)
//   Zone 9m gauche       : x ≈ 0.225 (9/40)
//   Ligne 7m gauche      : x ≈ 0.175 (7/40)
//   Ligne médiane        : x = 0.50
//   Zone 9m droite       : x ≈ 0.775
//   Zone 6m droite       : x ≈ 0.85
//   Ligne de but droite  : x = 1.00
//
// Équipe A (rouge) attaque vers la droite : joueurs dans x ∈ [0.18 ; 0.48]
// Équipe B (bleu)  défend à droite        : joueurs dans x ∈ [0.52 ; 0.82]
// Repères terrain normalisés (40m × 20m) :
//   But gauche        x=0.00  |  Zone 6m gauche  x=0.15  |  Zone 9m gauche  x=0.225
//   Ligne 7m gauche   x=0.175 |  Ligne médiane   x=0.50
//   Zone 9m droite    x=0.775 |  Zone 6m droite  x=0.85  |  But droit       x=1.00
//
//   Équipe A (attaque, rouge) : G à x=0.02, arrières sur 9m gauche (x=0.225),
//                               ailiers/pivot entre 6m et 9m (x=0.35–0.43)
//   Équipe B (défense, bleu)  : défenseurs sur 9m droite (x=0.775),
//                               avancés entre 6m et 9m (x=0.66), G à x=0.98
const FORMATIONS = {
  A: {
    '3-3': [
      { label:'ARG', x:0.225, y:0.22 },
      { label:'DC',  x:0.225, y:0.50 },
      { label:'ARD', x:0.225, y:0.78 },
      { label:'AG',  x:0.380, y:0.08 },
      { label:'PIV', x:0.420, y:0.50 },
      { label:'AD',  x:0.380, y:0.92 },
      { label:'G',   x:0.020, y:0.50, goalkeeper:true },
    ],
    '2-4': [
      { label:'ARG', x:0.225, y:0.30 },
      { label:'ARD', x:0.225, y:0.70 },
      { label:'AG',  x:0.380, y:0.08 },
      { label:'DC1', x:0.380, y:0.36 },
      { label:'DC2', x:0.380, y:0.64 },
      { label:'AD',  x:0.380, y:0.92 },
      { label:'G',   x:0.020, y:0.50, goalkeeper:true },
    ],
    '2-5': [
      { label:'ARG', x:0.225, y:0.28 },
      { label:'ARD', x:0.225, y:0.72 },
      { label:'AG',  x:0.370, y:0.08 },
      { label:'DC1', x:0.370, y:0.33 },
      { label:'PIV', x:0.430, y:0.50 },
      { label:'DC2', x:0.370, y:0.67 },
      { label:'AD',  x:0.370, y:0.92 },
    ],
    '1-6': [
      { label:'DC',  x:0.225, y:0.50 },
      { label:'AG',  x:0.360, y:0.08 },
      { label:'ARG', x:0.360, y:0.28 },
      { label:'DC1', x:0.420, y:0.40 },
      { label:'PIV', x:0.430, y:0.58 },
      { label:'ARD', x:0.360, y:0.72 },
      { label:'AD',  x:0.360, y:0.92 },
    ],
  },
  B: {
    '6-0': [
      { label:'1', x:0.775, y:0.08 },
      { label:'2', x:0.775, y:0.24 },
      { label:'3', x:0.775, y:0.40 },
      { label:'4', x:0.775, y:0.60 },
      { label:'5', x:0.775, y:0.76 },
      { label:'6', x:0.775, y:0.92 },
      { label:'G', x:0.980, y:0.50, goalkeeper:true },
    ],
    '5-1': [
      { label:'1', x:0.775, y:0.10 },
      { label:'2', x:0.775, y:0.28 },
      { label:'3', x:0.775, y:0.50 },
      { label:'4', x:0.775, y:0.72 },
      { label:'5', x:0.775, y:0.90 },
      { label:'6', x:0.660, y:0.50 },
      { label:'G', x:0.980, y:0.50, goalkeeper:true },
    ],
    '4-2': [
      { label:'1', x:0.775, y:0.16 },
      { label:'2', x:0.775, y:0.40 },
      { label:'3', x:0.775, y:0.60 },
      { label:'4', x:0.775, y:0.84 },
      { label:'5', x:0.665, y:0.33 },
      { label:'6', x:0.665, y:0.67 },
      { label:'G', x:0.980, y:0.50, goalkeeper:true },
    ],
    '3-3': [
      { label:'1', x:0.775, y:0.20 },
      { label:'2', x:0.775, y:0.50 },
      { label:'3', x:0.775, y:0.80 },
      { label:'4', x:0.665, y:0.30 },
      { label:'5', x:0.665, y:0.50 },
      { label:'6', x:0.665, y:0.70 },
      { label:'G', x:0.980, y:0.50, goalkeeper:true },
    ],
  },
};

function applyFormation(team, key) {
  const template = FORMATIONS[team][key];
  if (!template) return;
  state.players = state.players.filter(p => p.team !== team);
  template.forEach((tpl, i) => {
    state.players.push({
      id         : `${team}${i}`,
      team,
      label      : tpl.label,
      x          : tpl.x,
      y          : tpl.y,
      goalkeeper : tpl.goalkeeper || false,
    });
  });
}

function applyBothFormations() {
  applyFormation('A', document.getElementById('formationA').value);
  applyFormation('B', document.getElementById('formationB').value);
  draw();
}

// ── Dessin des joueurs ────────────────────────────────────────────────────
const PLAYER_R   = 22;
const TEAM_COLOR = { A: '#e53935', B: '#1e88e5' };

function drawPlayers() {
  const scale = TW / 800;
  const r     = Math.max(16, PLAYER_R * scale);

  for (const p of state.players) {
    const { x: cx, y: cy } = toCanvas(p.x, p.y);
    const color = TEAM_COLOR[p.team];
    ctx.save();

    if (p.goalkeeper) {
      const s = r * 1.1;
      ctx.fillStyle   = color;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth   = Math.max(1.5, 2 * scale);
      _roundRect(cx - s, cy - s, s * 2, s * 2, s * 0.35);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle   = color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth   = Math.max(1.5, 2 * scale);
      ctx.stroke();
    }

    ctx.fillStyle    = '#ffffff';
    ctx.font         = `700 ${Math.max(9, r * 0.7)}px system-ui, sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.label, cx, cy);
    ctx.restore();
  }
}

function _roundRect(x, y, w, h, rad) {
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

// ── Dessin des flèches ────────────────────────────────────────────────────
const ARROW_COLORS = { A: '#ef9a9a', B: '#90caf9', default: '#ffffff' };

function drawArrows() {
  for (const arrow of state.arrows) {
    if (arrow.points.length < 2) continue;
    _strokeArrow(arrow.points, ARROW_COLORS[arrow.team] || ARROW_COLORS.default, false);
  }
  if (state.drawing && state.drawing.points.length > 1) {
    _strokeArrow(state.drawing.points, ARROW_COLORS[state.penTeam] || ARROW_COLORS.default, true);
  }
}

function _strokeArrow(points, color, dashed) {
  const scale = TW / 800;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth   = Math.max(2, 3 * scale);
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  if (dashed) ctx.setLineDash([6, 4]);

  ctx.beginPath();
  const first = toCanvas(points[0].x, points[0].y);
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < points.length; i++) {
    const p = toCanvas(points[i].x, points[i].y);
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();

  // Tête de flèche
  const last  = toCanvas(points[points.length - 1].x, points[points.length - 1].y);
  const prev  = toCanvas(points[points.length - 2].x, points[points.length - 2].y);
  const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
  const aLen  = Math.max(10, 14 * scale);
  const aAng  = Math.PI / 7;

  ctx.setLineDash([]);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(last.x, last.y);
  ctx.lineTo(last.x - aLen * Math.cos(angle - aAng), last.y - aLen * Math.sin(angle - aAng));
  ctx.lineTo(last.x - aLen * Math.cos(angle + aAng), last.y - aLen * Math.sin(angle + aAng));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ── Boucle de rendu ───────────────────────────────────────────────────────
function draw() {
  ctx.clearRect(0, 0, CW, CH);
  drawCourt();
  drawArrows();
  drawPlayers();
}

// ── Interactions ──────────────────────────────────────────────────────────
function getPlayerAt(cx, cy) {
  const scale = TW / 800;
  const r     = Math.max(16, PLAYER_R * scale) + 10;
  for (let i = state.players.length - 1; i >= 0; i--) {
    const p  = state.players[i];
    const cp = toCanvas(p.x, p.y);
    if (Math.hypot(cx - cp.x, cy - cp.y) < r) return p;
  }
  return null;
}

function getArrowAt(cx, cy) {
  const threshold = Math.max(10, TW / 80);
  for (let i = state.arrows.length - 1; i >= 0; i--) {
    const arrow = state.arrows[i];
    for (let j = 1; j < arrow.points.length; j++) {
      const a = toCanvas(arrow.points[j-1].x, arrow.points[j-1].y);
      const b = toCanvas(arrow.points[j].x,   arrow.points[j].y);
      if (_distToSegment(cx, cy, a, b) < threshold) return i;
    }
  }
  return -1;
}

function _distToSegment(px, py, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lenSq = dx*dx + dy*dy;
  if (lenSq === 0) return Math.hypot(px - a.x, py - a.y);
  const t = Math.max(0, Math.min(1, ((px - a.x)*dx + (py - a.y)*dy) / lenSq));
  return Math.hypot(px - (a.x + t*dx), py - (a.y + t*dy));
}

canvas.addEventListener('pointerdown', e => {
  const cx = e.offsetX, cy = e.offsetY;

  if (state.penMode) {
    state.drawing = { points: [toNorm(cx, cy)], team: state.penTeam };
    // 🔒 F01 : try/catch — DOMException sur certains navigateurs mobiles
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    return;
  }

  const player = getPlayerAt(cx, cy);
  if (player) {
    const cp = toCanvas(player.x, player.y);
    state.drag = { player, offX: cx - cp.x, offY: cy - cp.y };
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    return;
  }

  // 🔒 F03 : guard idx >= 0 impératif — splice(-1) supprimerait le dernier élément
  const idx = getArrowAt(cx, cy);
  if (idx >= 0) {
    state.arrows.splice(idx, 1);
    draw();
  }
});

canvas.addEventListener('pointermove', e => {
  if (state.drag) {
    const norm = toNorm(e.offsetX - state.drag.offX, e.offsetY - state.drag.offY);
    state.drag.player.x = Math.max(0, Math.min(1, norm.x));
    state.drag.player.y = Math.max(0, Math.min(1, norm.y));
    draw();
    return;
  }
  if (state.drawing) {
    const norm = toNorm(e.offsetX, e.offsetY);
    const last = state.drawing.points[state.drawing.points.length - 1];
    if (Math.hypot(norm.x - last.x, norm.y - last.y) > 0.01) {
      state.drawing.points.push(norm);
      draw();
    }
  }
});

canvas.addEventListener('pointerup', () => {
  if (state.drag) { state.drag = null; return; }
  if (state.drawing) {
    if (state.drawing.points.length > 2) {
      state.arrows.push({
        points : simplifyArrow(state.drawing.points),
        team   : state.drawing.team,
      });
    }
    state.drawing = null;
    draw();
  }
});

function simplifyArrow(points) {
  if (points.length <= 4) return points;
  const result = [points[0]];
  const step   = Math.max(1, Math.floor(points.length / 20));
  for (let i = step; i < points.length - 1; i += step) result.push(points[i]);
  result.push(points[points.length - 1]);
  return result;
}

// ── Contrôles de la barre ─────────────────────────────────────────────────
document.getElementById('btnAuto').addEventListener('click', applyBothFormations);

document.getElementById('btnPen').addEventListener('click', () => {
  state.penMode = !state.penMode;
  document.getElementById('btnPen').classList.toggle('active', state.penMode);
});

document.getElementById('btnClear').addEventListener('click', () => {
  state.arrows  = [];
  state.drawing = null;
  draw();
});

document.getElementById('btnReset').addEventListener('click', () => {
  state.arrows  = [];
  state.drawing = null;
  applyBothFormations();
});

document.getElementById('btnHome').addEventListener('click', () => {
  window.location.href = '../index.html';
});

document.getElementById('formationA').addEventListener('change', e => {
  applyFormation('A', e.target.value);
  draw();
});

document.getElementById('formationB').addEventListener('change', e => {
  applyFormation('B', e.target.value);
  draw();
});

// ── Initialisation ────────────────────────────────────────────────────────
resize();
applyBothFormations();
