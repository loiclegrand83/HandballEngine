const canvas = document.getElementById('boardCanvas');
const ctx = canvas.getContext('2d');

// Polyfill ctx.roundRect for Chrome < 99 / older Android
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    const rad = Math.min(typeof r === 'number' ? r : (Array.isArray(r) ? r[0] : 0), Math.abs(w) / 2, Math.abs(h) / 2);
    this.beginPath();
    this.moveTo(x + rad, y);
    this.lineTo(x + w - rad, y);
    this.quadraticCurveTo(x + w, y, x + w, y + rad);
    this.lineTo(x + w, y + h - rad);
    this.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    this.lineTo(x + rad, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - rad);
    this.lineTo(x, y + rad);
    this.quadraticCurveTo(x, y, x + rad, y);
    this.closePath();
  };
}
const assetPalette = document.getElementById('assetPalette');
const exerciseName = document.getElementById('exerciseName');
const exerciseNotes = document.getElementById('exerciseNotes');
const status = document.getElementById('status');
const importJson = document.getElementById('importJson');
const viewModeButtons = document.getElementById('viewModeButtons');
const drawModeButtons = document.getElementById('drawModeButtons');
const teamButtons = document.getElementById('teamButtons');
const playAnimationButton = document.getElementById('playAnimation');
const exerciseCategory = document.getElementById('exerciseCategory');
const exerciseThematique = document.getElementById('exerciseThematique');
const openLibraryBtn = document.getElementById('openLibrary');
const libraryModal = document.getElementById('libraryModal');
const closeLibraryBtn = document.getElementById('closeLibrary');
const libraryGrid = document.getElementById('libraryGrid');
const libraryFilter = document.getElementById('libraryFilter');

const playerImage = new Image();
playerImage.src = '../../assets/player.png';
playerImage.onload = () => {
  if (typeof render === 'function') render();
};

const board = {
  width: canvas.width,
  height: canvas.height,
  margin: 60,
  fieldWidth: 40,
  fieldHeight: 20,
  goalWidth: 3,
  goalAreaDistance: 6,
  freeThrowDistance: 9,
  penaltyDistance: 7,
  viewMode: 'full',
};

const assets = [
  { id: 'player', label: 'Joueur', color: '#4682b4', radius: 18, shape: 'circle', hidden: true },
  { id: 'ball', label: 'Ballon', color: '#ffffff', radius: 13, shape: 'ball' },
  { id: 'H', label: 'Haie', color: '#fdd835', radius: 22, shape: 'hurdle' },
  { id: 'G', label: 'Gardien', color: '#fdd835', radius: 18, shape: 'circle' },
  { id: 'C', label: 'Cible', color: '#66bb6a', radius: 12, shape: 'ring' },
  { id: 'dumbbell', label: 'Haltère', color: '#ffca28', radius: 24, shape: 'dumbbell' },
  { id: 'swiss', label: 'Swiss ball', color: '#26c6da', radius: 18, shape: 'circle' },
  { id: 'cup', label: 'Coupelle', color: '#f48fb1', radius: 16, shape: 'cup' },
  { id: 'hoop', label: 'Cerceau', color: '#ab47bc', radius: 20, shape: 'ring' },
  { id: 'ladder', label: 'Échelle de rythme', color: '#8d6e63', radius: 20, shape: 'ladder' },
  { id: 'mannequin', label: 'Mannequin', color: '#ef5350', radius: 18, shape: 'rect' },
  { id: 'wall', label: 'Mur', color: '#546e7a', radius: 26, shape: 'wall' },
  { id: 'cone', label: 'Plot', color: '#ff8f00', radius: 12, shape: 'cone' },
  { id: 'zone-fix', label: 'Zone fix.', color: '#ce93d8', radius: 32, shape: 'zone-fix' },
];

const PERSP_TOP_SCALE = 0.60; // top width = 60% of full width in perspective mode

const state = {
  selectedAssetIndex: 1,
  selectedTeam: 'A',
  items: [],
  dragIndex: null,
  pointerOffset: { x: 0, y: 0 },
  drawMode: 'asset',
  paths: [],
  currentPath: null,
  animation: { active: false, currentStep: 0, progress: 0, speed: 0.007 },
  selectedPathIndex: null,
  dragPathPointIndex: null,
  currentExerciseId: null,
  userSaved: false,
  selectedPost: null, // poste handball sélectionné (AG, ARG, DC, PIV, ARD, AD)
  explanation: { material: '', steps: [] },
};

// ─── Conversion coordonnées ───────────────────────────────────────────────────

function getScale() {
  const margin = board.margin;
  const availW = board.width  - margin * 2;
  const availH = board.height - margin * 2;
  const fw = board.viewMode === 'half' ? board.fieldWidth / 2 : board.fieldWidth;
  const fh = board.fieldHeight;
  const scale = Math.min(availW / fw, availH / fh);
  const drawW = fw * scale;
  const drawH = fh * scale;
  return {
    left: margin + (availW - drawW) / 2,
    top:  margin + (availH - drawH) / 2,
    s: scale, drawW, drawH, fw, fh,
  };
}

function fieldToCanvas(point) {
  if (board.viewMode === 'perspective') return fieldToCanvasPerspective(point);
  const sc = getScale();
  return { x: sc.left + point.x * sc.s, y: sc.top + point.y * sc.s };
}

function canvasToField(point) {
  if (board.viewMode === 'perspective') return canvasToFieldPerspective(point);
  const sc = getScale();
  return {
    x: Math.max(0, Math.min(sc.fw,      (point.x - sc.left) / sc.s)),
    y: Math.max(0, Math.min(sc.fh, (point.y - sc.top)  / sc.s)),
  };
}

// ─── Vue Perspective ──────────────────────────────────────────────────────────
// field.x (0..40) → vertical axis on screen (0=top/far goal, 40=bottom/near goal)
// field.y (0..20) → horizontal axis on screen

function fieldToCanvasPerspective(point) {
  const sc = getScale();
  const tx = point.x / board.fieldWidth;   // 0=top, 1=bottom
  const ty = point.y / board.fieldHeight;  // 0=left, 1=right
  const wf = PERSP_TOP_SCALE + (1 - PERSP_TOP_SCALE) * tx;
  const width = sc.drawW * wf;
  const leftEdge = sc.left + (sc.drawW - width) / 2;
  return {
    x: leftEdge + ty * width,
    y: sc.top + tx * sc.drawH,
  };
}

function canvasToFieldPerspective(point) {
  const sc = getScale();
  const tx = (point.y - sc.top) / sc.drawH;
  const wf = PERSP_TOP_SCALE + (1 - PERSP_TOP_SCALE) * tx;
  const width = sc.drawW * wf;
  const leftEdge = sc.left + (sc.drawW - width) / 2;
  const ty = (point.x - leftEdge) / width;
  return {
    x: Math.max(0, Math.min(board.fieldWidth,  tx * board.fieldWidth)),
    y: Math.max(0, Math.min(board.fieldHeight, ty * board.fieldHeight)),
  };
}

/** Sample an arc in field coordinates and return canvas-projected points */
function sampleArcPerspective(cx_f, cy_f, R, startAngle, endAngle, samples = 40) {
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const a = startAngle + (endAngle - startAngle) * (i / samples);
    pts.push(fieldToCanvas({ x: cx_f + R * Math.cos(a), y: cy_f + R * Math.sin(a) }));
  }
  return pts;
}

function updateModeButtons(container, selectedMode) {
  container.querySelectorAll('button').forEach(button => {
    const value = button.dataset.mode ?? button.dataset.team;
    button.classList.toggle('selected', value === selectedMode);
  });
}

function selectViewMode(mode) {
  if (mode !== 'full' && mode !== 'half' && mode !== 'perspective') mode = 'full';
  board.viewMode = mode;
  updateModeButtons(viewModeButtons, mode);
  setStatus(`Vue : ${board.viewMode}`);
  render();
}

function selectDrawMode(mode) {
  state.drawMode = mode;
  state.currentPath = null;
  lastPointerDown = null; // évite qu'un clic dans l'ancien mode soit lu comme un double-clic dans le nouveau
  updateModeButtons(drawModeButtons, mode);
  setStatus(`Mode : ${state.drawMode}`);
}

// ─── Dessin terrain ───────────────────────────────────────────────────────────

function setStatus(text) { status.textContent = text; }

function drawCourt() {
  if (board.viewMode === 'perspective') { drawCourtPerspective(); return; }

  ctx.clearRect(0, 0, board.width, board.height);
  ctx.fillStyle = '#07111f';
  ctx.fillRect(0, 0, board.width, board.height);

  const sc = getScale();
  const halfOnly = board.viewMode === 'half';

  // Pelouse
  ctx.fillStyle = '#0e2f60';
  ctx.fillRect(sc.left, sc.top, sc.drawW, sc.drawH);

  // Zones de but (remplissage)
  drawGoalZone(0,                                   sc, true,  false);
  if (!halfOnly) drawGoalZone(board.fieldWidth, sc, true,  false);

  // Contour terrain
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.setLineDash([]);
  if (halfOnly) {
    ctx.beginPath();
    ctx.moveTo(sc.left, sc.top);
    ctx.lineTo(sc.left + sc.drawW, sc.top);
    ctx.lineTo(sc.left + sc.drawW, sc.top + sc.drawH);
    ctx.lineTo(sc.left, sc.top + sc.drawH); // touche basse
    ctx.lineTo(sc.left, sc.top);
    ctx.stroke();
  } else {
    ctx.strokeRect(sc.left, sc.top, sc.drawW, sc.drawH);
  }

  // Lignes zones de but (contour blanc)
  drawGoalZone(0,                                   sc, false, false);
  if (!halfOnly) drawGoalZone(board.fieldWidth, sc, false, false);

  // Lignes de jet franc (9m, pointillées)
  drawGoalZone(0,                                   sc, false, true);
  if (!halfOnly) drawGoalZone(board.fieldWidth, sc, false, true);

  // Ligne médiane + cercle central
  if (!halfOnly) {
    const midX = sc.left + sc.drawW / 2;
    const midY = sc.top  + sc.drawH / 2;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(midX, sc.top); ctx.lineTo(midX, sc.top + sc.drawH); ctx.stroke();
    ctx.beginPath(); ctx.arc(midX, midY, 3 * sc.s, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(midX, midY, 4, 0, Math.PI * 2); ctx.fill();
  }

  // Tirets pénalty
  drawPenaltyMark(0,               sc);
  if (!halfOnly) drawPenaltyMark(board.fieldWidth, sc);

  // Buts
  drawGoalRect(0,               sc);
  if (!halfOnly) drawGoalRect(board.fieldWidth, sc);

  // Zone de remplacement
  drawSubZone(sc, halfOnly);
}

/**
 * Trace (ou remplit) la zone délimitée par :
 *  – deux quarts de cercle de rayon R centrés sur chaque poteau intérieur
 *  – une ligne droite de goalWidth devant le but
 *  – deux retours le long de la ligne de fond
 *
 * fillMode=true  → remplissage #0e4a1f
 * fillMode=false, freeThrow=false → contour blanc plein (6m)
 * fillMode=false, freeThrow=true  → contour blanc pointillé (9m)
 */
function drawGoalZone(goalX, sc, fillMode, freeThrow) {
  const R   = (freeThrow ? board.freeThrowDistance : board.goalAreaDistance) * sc.s;
  const cy  = board.fieldHeight / 2;
  const ht  = cy - board.goalWidth / 2;
  const hb  = cy + board.goalWidth / 2;
  const isLeft = goalX === 0;
  const dir = isLeft ? 1 : -1;

  // Centres des arcs en px canvas
  const cTop = fieldToCanvas({ x: goalX, y: ht });
  const cBot = fieldToCanvas({ x: goalX, y: hb });

  if (freeThrow) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(sc.left, sc.top, sc.drawW, sc.drawH);
    ctx.clip();
  }

  ctx.beginPath();

  if (isLeft) {
    // Départ : extrémité haute de l'arc haut (point le plus haut)
    ctx.moveTo(cTop.x, cTop.y - R);
    // Arc haut : centre=cTop, de -π/2 → 0 (sens horaire)
    ctx.arc(cTop.x, cTop.y, R, -Math.PI / 2, 0, false);
    // Ligne droite devant le but (de (cTop.x+R, cTop.y) → (cTop.x+R, cBot.y))
    // ctx.arc se termine à (cTop.x+R, cTop.y) — on descend vers (cTop.x+R, cBot.y)
    ctx.lineTo(cTop.x + R, cBot.y);
    // Arc bas : centre=cBot, de 0 → π/2 (sens horaire)
    ctx.arc(cBot.x, cBot.y, R, 0, Math.PI / 2, false);
    // Retour le long du fond jusqu'en haut
    ctx.lineTo(cTop.x, cTop.y - R);
  } else {
    // Côté droit — miroir exact
    ctx.moveTo(cTop.x, cTop.y - R);
    // Arc haut : de -π/2 → π (sens anti-horaire)
    ctx.arc(cTop.x, cTop.y, R, -Math.PI / 2, Math.PI, true);
    ctx.lineTo(cTop.x - R, cBot.y);
    // Arc bas : de π → π/2 (sens anti-horaire)
    ctx.arc(cBot.x, cBot.y, R, Math.PI, Math.PI / 2, true);
    ctx.lineTo(cTop.x, cTop.y - R);
  }

  ctx.closePath();

  if (fillMode) {
    ctx.fillStyle = '#0a2550';
    ctx.fill();
  } else {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = freeThrow ? 1.5 : 2;
    ctx.setLineDash(freeThrow ? [10, 7] : []);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (freeThrow) {
    ctx.restore();
  }
}

function drawPenaltyMark(goalX, sc) {
  const dir = goalX === 0 ? 1 : -1;
  const px  = goalX + dir * board.penaltyDistance;
  const cy  = board.fieldHeight / 2;
  const p1  = fieldToCanvas({ x: px, y: cy - 0.15 });
  const p2  = fieldToCanvas({ x: px, y: cy + 0.15 });
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth   = 3;
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
}

function drawGoalRect(goalX, sc) {
  const cy   = board.fieldHeight / 2;
  const ht   = cy - board.goalWidth / 2;
  const hb   = cy + board.goalWidth / 2;
  const dir  = goalX === 0 ? 1 : -1;
  const back = goalX - dir * 1; // 1m de profondeur hors terrain

  const tl = fieldToCanvas({ x: back,  y: ht });
  const tr = fieldToCanvas({ x: goalX, y: ht });
  const br = fieldToCanvas({ x: goalX, y: hb });
  const bl = fieldToCanvas({ x: back,  y: hb });

  // Fond sombre du but
  ctx.fillStyle = '#05101e';
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y);
  ctx.lineTo(br.x, br.y); ctx.lineTo(bl.x, bl.y);
  ctx.closePath(); ctx.fill();

  // Filet (clip + hachures)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y);
  ctx.lineTo(br.x, br.y); ctx.lineTo(bl.x, bl.y);
  ctx.closePath(); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 0.8;
  const rows = 4;
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const y = tl.y + (bl.y - tl.y) * t;
    ctx.beginPath(); ctx.moveTo(tl.x, y); ctx.lineTo(tr.x, y); ctx.stroke();
  }
  const cols = 3;
  for (let i = 0; i <= cols; i++) {
    const t = i / cols;
    const x = tl.x + (tr.x - tl.x) * t;
    ctx.beginPath(); ctx.moveTo(x, tl.y); ctx.lineTo(x, bl.y); ctx.stroke();
  }
  ctx.restore();

  // Cadre blanc
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth   = 3;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y);
  ctx.lineTo(br.x, br.y); ctx.lineTo(bl.x, bl.y);
  ctx.closePath(); ctx.stroke();
}

function drawSubZone(sc, halfOnly) {
  const tick = 10;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([]);

  if (halfOnly) {
    const halfWidth = 4.5;
    const centerX = sc.left + sc.drawW / 2;
    const p1 = { x: centerX - halfWidth * sc.s, y: sc.top + sc.drawH };
    const p2 = { x: centerX + halfWidth * sc.s, y: sc.top + sc.drawH };
    [p1, p2].forEach(p => {
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + tick); ctx.stroke();
    });
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y + tick - 1); ctx.lineTo(p2.x, p2.y + tick - 1); ctx.stroke();
    return;
  }

  const cx   = board.fieldWidth / 2;
  const p1   = fieldToCanvas({ x: cx - 4.5, y: board.fieldHeight });
  const p2   = fieldToCanvas({ x: cx + 4.5, y: board.fieldHeight });
  [p1, p2].forEach(p => {
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + tick); ctx.stroke();
  });
  ctx.beginPath(); ctx.moveTo(p1.x, p1.y + tick - 1); ctx.lineTo(p2.x, p2.y + tick - 1); ctx.stroke();
}

// ─── Vue Perspective — dessin terrain ────────────────────────────────────────

function drawCourtPerspective() {
  ctx.clearRect(0, 0, board.width, board.height);
  ctx.fillStyle = '#07111f';
  ctx.fillRect(0, 0, board.width, board.height);

  // Trapézoid corners (field bounding box projected)
  const c00 = fieldToCanvas({ x: 0,                   y: 0 });
  const c01 = fieldToCanvas({ x: 0,                   y: board.fieldHeight });
  const c10 = fieldToCanvas({ x: board.fieldWidth,     y: board.fieldHeight });
  const c11 = fieldToCanvas({ x: board.fieldWidth,     y: 0 });

  // Field fill
  ctx.fillStyle = '#0e2f60';
  ctx.beginPath();
  ctx.moveTo(c00.x, c00.y); ctx.lineTo(c01.x, c01.y);
  ctx.lineTo(c10.x, c10.y); ctx.lineTo(c11.x, c11.y);
  ctx.closePath(); ctx.fill();

  // Goal zone fills
  drawGoalZonePerspective(0,                 true,  false);
  drawGoalZonePerspective(board.fieldWidth,  true,  false);

  // Field outline
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(c00.x, c00.y); ctx.lineTo(c01.x, c01.y);
  ctx.lineTo(c10.x, c10.y); ctx.lineTo(c11.x, c11.y);
  ctx.closePath(); ctx.stroke();

  // Goal zone contours + free throw lines
  drawGoalZonePerspective(0,                false, false);
  drawGoalZonePerspective(board.fieldWidth, false, false);
  drawGoalZonePerspective(0,                false, true);
  drawGoalZonePerspective(board.fieldWidth, false, true);

  // Center line
  const midA = fieldToCanvas({ x: board.fieldWidth / 2, y: 0 });
  const midB = fieldToCanvas({ x: board.fieldWidth / 2, y: board.fieldHeight });
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(midA.x, midA.y); ctx.lineTo(midB.x, midB.y); ctx.stroke();

  // Center circle (sampled)
  const ccx = board.fieldWidth / 2, ccy = board.fieldHeight / 2, ccR = 3;
  const circPts = sampleArcPerspective(ccx, ccy, ccR, 0, Math.PI * 2, 60);
  ctx.beginPath(); ctx.moveTo(circPts[0].x, circPts[0].y);
  circPts.forEach(p => ctx.lineTo(p.x, p.y)); ctx.closePath(); ctx.stroke();
  // Center dot
  const cDot = fieldToCanvas({ x: ccx, y: ccy });
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cDot.x, cDot.y, 4, 0, Math.PI*2); ctx.fill();

  // Penalty marks
  drawPenaltyMarkPerspective(0);
  drawPenaltyMarkPerspective(board.fieldWidth);

  // Goals
  drawGoalRectPerspective(0);
  drawGoalRectPerspective(board.fieldWidth);

  // Substitution zone ticks
  const subCx = board.fieldWidth / 2;
  const sub1  = fieldToCanvas({ x: subCx - 4.5, y: board.fieldHeight });
  const sub2  = fieldToCanvas({ x: subCx + 4.5, y: board.fieldHeight });
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.setLineDash([]);
  [sub1, sub2].forEach(p => {
    // tick goes slightly outside the field (to the right in perspective)
    const outside = fieldToCanvas({ x: p.x > sub1.x ? subCx - 4.5 : subCx + 4.5, y: board.fieldHeight + 0.8 });
    // simpler: just draw 10px tick perpendicular to right edge
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 10, p.y); ctx.stroke();
  });
  ctx.beginPath(); ctx.moveTo(sub1.x + 10, sub1.y); ctx.lineTo(sub2.x + 10, sub2.y); ctx.stroke();
}

function drawGoalZonePerspective(goalX, fillMode, freeThrow) {
  const R      = freeThrow ? board.freeThrowDistance : board.goalAreaDistance;
  const cy_f   = board.fieldHeight / 2;
  const ht     = cy_f - board.goalWidth / 2;  // 8.5
  const hb     = cy_f + board.goalWidth / 2;  // 11.5
  const isLeft = goalX === 0;

  const N = 45;
  const topY = Math.max(0, ht - R);
  const botY = Math.min(board.fieldHeight, hb + R);
  const pts = [];
  // Starting point: top of D on the goal line (clamped to field boundary)
  pts.push(fieldToCanvas({ x: goalX, y: topY }));
  // Top arc
  if (isLeft) {
    pts.push(...sampleArcPerspective(goalX, ht, R, -Math.PI / 2, 0, N));
    pts.push(...sampleArcPerspective(goalX, hb, R, 0, Math.PI / 2, N));
  } else {
    pts.push(...sampleArcPerspective(goalX, ht, R, -Math.PI / 2, -Math.PI, N));
    pts.push(...sampleArcPerspective(goalX, hb, R, Math.PI, Math.PI / 2, N));
  }
  // Back to goal line (clamped to field boundary)
  pts.push(fieldToCanvas({ x: goalX, y: botY }));
  pts.push(fieldToCanvas({ x: goalX, y: topY }));

  // Clip to court trapezoid so arcs never exceed field boundaries
  const c00 = fieldToCanvas({ x: 0,               y: 0 });
  const c01 = fieldToCanvas({ x: 0,               y: board.fieldHeight });
  const c10 = fieldToCanvas({ x: board.fieldWidth, y: board.fieldHeight });
  const c11 = fieldToCanvas({ x: board.fieldWidth, y: 0 });
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(c00.x, c00.y); ctx.lineTo(c01.x, c01.y);
  ctx.lineTo(c10.x, c10.y); ctx.lineTo(c11.x, c11.y);
  ctx.closePath(); ctx.clip();

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
  ctx.closePath();

  if (fillMode) {
    ctx.fillStyle = '#0a2550'; ctx.fill();
  } else {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = freeThrow ? 1.5 : 2;
    ctx.setLineDash(freeThrow ? [10, 7] : []);
    ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawPenaltyMarkPerspective(goalX) {
  const dir = goalX === 0 ? 1 : -1;
  const px  = goalX + dir * board.penaltyDistance;
  const cy  = board.fieldHeight / 2;
  const p1  = fieldToCanvas({ x: px, y: cy - 0.15 });
  const p2  = fieldToCanvas({ x: px, y: cy + 0.15 });
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
}

function drawGoalRectPerspective(goalX) {
  const cy  = board.fieldHeight / 2;
  const ht  = cy - board.goalWidth / 2;
  const hb  = cy + board.goalWidth / 2;
  const dir = goalX === 0 ? 1 : -1;
  const back = goalX - dir * 1;

  const tl = fieldToCanvas({ x: back,  y: ht });
  const tr = fieldToCanvas({ x: goalX, y: ht });
  const br = fieldToCanvas({ x: goalX, y: hb });
  const bl = fieldToCanvas({ x: back,  y: hb });

  ctx.fillStyle = '#05101e';
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y);
  ctx.lineTo(br.x, br.y); ctx.lineTo(bl.x, bl.y);
  ctx.closePath(); ctx.fill();

  // Net hatch lines
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y);
  ctx.lineTo(br.x, br.y); ctx.lineTo(bl.x, bl.y);
  ctx.closePath(); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 0.8;
  const rows = 4;
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const ax = tl.x + (bl.x - tl.x) * t, ay = tl.y + (bl.y - tl.y) * t;
    const bx = tr.x + (br.x - tr.x) * t, by = tr.y + (br.y - tr.y) * t;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  }
  const cols = 3;
  for (let i = 0; i <= cols; i++) {
    const t = i / cols;
    const ax = tl.x + (tr.x - tl.x) * t, ay = tl.y + (tr.y - tl.y) * t;
    const bx = bl.x + (br.x - bl.x) * t, by = bl.y + (br.y - bl.y) * t;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y);
  ctx.lineTo(br.x, br.y); ctx.lineTo(bl.x, bl.y);
  ctx.closePath(); ctx.stroke();
}

// ─── Items / assets ───────────────────────────────────────────────────────────

function drawItems() {
  drawPaths();
  state.items.forEach((item, index) => {
    const pos = fieldToCanvas(item);
    drawShape(item, pos);
    
    const label = item.displayLabel || item.label || '';
    const isHuman = item.id.startsWith('player') || item.id.startsWith('G');
    const R = isHuman ? item.radius * 0.55 : item.radius;

    if (item.team && label) {
      // Numéro ou poste centré sur le torse
      const labelY = isHuman ? pos.y - R * 2.2 : pos.y;
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${isHuman ? Math.max(8, Math.round(R * 0.55)) : 12}px Inter, system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 2;
      ctx.fillText(label, pos.x, labelY);
      ctx.shadowBlur = 0;
      // Poste affiché sous les pieds si le label est un numéro (pas déjà un poste)
      if (isHuman && item.post && !HANDBALL_POSTS.includes(label)) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = `bold 8px Inter, system-ui`;
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 3;
        ctx.fillText(item.post, pos.x, pos.y + R * 0.9);
        ctx.shadowBlur = 0;
      }
    } else if (label) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '9px Inter, system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(label, pos.x, pos.y + item.radius + 6);
    }
    
    if (index === state.dragIndex) {
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      if (isHuman) {
        // Ovale englobant toute la silhouette
        ctx.ellipse(pos.x, pos.y - R * 1.8, R * 1.3, R * 2.5, 0, 0, Math.PI * 2);
      } else {
        ctx.arc(pos.x, pos.y, item.radius + 8, 0, Math.PI * 2);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });
  if (state.animation.active) drawAnimationFrame();
}

function drawPaths() {
  state.paths.forEach((path, index) => {
    ctx.strokeStyle = path.color;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = path.kind === 'shot' ? 4 : path.kind === 'pass' ? 2 : 3;
    ctx.setLineDash(
      path.kind === 'course'   ? [10, 8] :
      path.kind === 'pass'     ? [5, 4]  :
      path.kind === 'fixation' ? [6, 3]  :
      []
    );

    ctx.beginPath();
    if (path.points.length === 0) return;
    if (path.points.length === 1) {
      const pos = fieldToCanvas(path.points[0]);
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      return;
    }

    const canvasPoints = path.points.map(fieldToCanvas);
    ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y);

    for (let i = 0; i < canvasPoints.length - 1; i++) {
      const p0 = i === 0 ? canvasPoints[0] : canvasPoints[i - 1];
      const p1 = canvasPoints[i];
      const p2 = canvasPoints[i + 1];
      const p3 = i + 2 < canvasPoints.length ? canvasPoints[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    if ((path.kind === 'shot' || path.kind === 'course' || path.kind === 'pass' || path.kind === 'croise') && canvasPoints.length > 1) {
      drawArrowAtEnd(path, canvasPoints);
    }

    // Marqueur de point de fixation à l'extrémité
    if (path.kind === 'fixation' && canvasPoints.length > 1) {
      const end = canvasPoints[canvasPoints.length - 1];
      ctx.fillStyle = path.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(end.x, end.y, 8, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px Inter, system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('FIX', end.x, end.y);
    }

    // Badge au milieu : ✕ pour croisé, numéro d'étape pour les autres
    if (canvasPoints.length >= 2) {
      const midPt = canvasPoints[Math.floor((canvasPoints.length - 1) / 2)];
      ctx.setLineDash([]);
      if (path.kind === 'croise') {
        // Symbole ✕ pour indiquer le croisement
        const s = 7;
        ctx.strokeStyle = path.color;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(midPt.x - s, midPt.y - s); ctx.lineTo(midPt.x + s, midPt.y + s);
        ctx.moveTo(midPt.x + s, midPt.y - s); ctx.lineTo(midPt.x - s, midPt.y + s);
        ctx.stroke();
      } else {
        const stepNum = (path.step || 0) + 1;
        ctx.fillStyle = 'rgba(5, 15, 35, 0.82)';
        ctx.strokeStyle = path.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(midPt.x, midPt.y, 11, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Inter, system-ui';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(stepNum), midPt.x, midPt.y);
      }
    }

    if (index === state.selectedPathIndex) {
      canvasPoints.forEach(p => {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }
  });
}

function drawArrowAtEnd(path, canvasPoints) {
  const last  = canvasPoints[canvasPoints.length - 1];
  const prev  = canvasPoints[canvasPoints.length - 2];
  const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
  const size  = 12;
  ctx.fillStyle = path.color;
  ctx.beginPath();
  ctx.moveTo(last.x, last.y);
  ctx.lineTo(last.x - size * Math.cos(angle - 0.3), last.y - size * Math.sin(angle - 0.3));
  ctx.lineTo(last.x - size * Math.cos(angle + 0.3), last.y - size * Math.sin(angle + 0.3));
  ctx.closePath();
  ctx.fill();
}

function getItemScale(item) {
  const sc = getScale();
  if (board.viewMode === 'perspective') {
    const tx = item.y / board.fieldHeight;
    const wf = PERSP_TOP_SCALE + (1 - PERSP_TOP_SCALE) * tx;
    return (sc.drawW * wf) / board.fieldWidth;
  }
  return sc.s;
}

function drawShape(item, pos) {
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate((item.rotation || 0) * Math.PI / 180);
  ctx.fillStyle = item.color;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.2;
  
  const shapeType = (item.id.startsWith('player') || item.id.startsWith('G')) ? 'human' : item.shape;

  switch (shapeType) {
    case 'human': {
      // R = unité de base. On divise item.radius pour garder le joueur petit (~40px haut)
      const R = item.radius * 0.55;
      
      const isGoalie = item.id.startsWith('G');
      const jerseyColor = isGoalie ? '#ffd740' : item.color;
      const shortColor  = '#1a1a2e';
      const skinColor   = '#f5c5a0';
      const shoeColor   = '#222222';
      const hairColor   = '#2c1810';
      const outlineColor = 'rgba(0,0,0,0.55)';

      // ── All coordinates relative to (0,0) = player "feet level" center ──
      // Layout (top to bottom):
      //   head center:    y = -3.8R
      //   shoulders:      y = -2.9R
      //   waist:          y = -1.8R
      //   crotch:         y = -1.1R
      //   knees:          y = -0.4R
      //   feet:           y =  0.4R

      // Ground shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 0.5 * R, 0.9 * R, 0.22 * R, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineJoin = 'round';
      ctx.lineCap  = 'round';

      // ── LEGS ──
      // Left leg  (two segments: thigh + shin)
      ctx.strokeStyle = outlineColor;
      ctx.fillStyle   = shortColor;
      ctx.lineWidth   = R * 0.28;
      ctx.beginPath();
      ctx.moveTo(-0.28 * R, -1.1 * R);
      ctx.lineTo(-0.32 * R, -0.4 * R);
      ctx.lineTo(-0.28 * R,  0.3 * R);
      ctx.stroke();
      // Right leg
      ctx.beginPath();
      ctx.moveTo( 0.28 * R, -1.1 * R);
      ctx.lineTo( 0.30 * R, -0.4 * R);
      ctx.lineTo( 0.26 * R,  0.3 * R);
      ctx.stroke();

      // Shorts (simple filled rect over upper thighs)
      ctx.fillStyle = shortColor;
      ctx.beginPath();
      ctx.roundRect(-0.52 * R, -1.15 * R, 1.04 * R, 0.7 * R, R * 0.12);
      ctx.fill();

      // Shoes
      ctx.fillStyle = shoeColor;
      ctx.beginPath();
      ctx.ellipse(-0.30 * R, 0.40 * R, 0.28 * R, 0.13 * R, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse( 0.28 * R, 0.40 * R, 0.28 * R, 0.13 * R,  0.15, 0, Math.PI * 2);
      ctx.fill();

      // ── ARMS ──
      ctx.lineWidth   = R * 0.25;
      ctx.strokeStyle = skinColor;
      if (isGoalie) {
        // Arms wide open (goalkeeper pose)
        ctx.beginPath();
        ctx.moveTo(-0.4 * R, -2.7 * R);
        ctx.lineTo(-1.0 * R, -2.0 * R);
        ctx.lineTo(-1.1 * R, -1.5 * R);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo( 0.4 * R, -2.7 * R);
        ctx.lineTo( 1.0 * R, -2.0 * R);
        ctx.lineTo( 1.1 * R, -1.5 * R);
        ctx.stroke();
      } else {
        // Arms slightly away from body, typical running pose
        ctx.beginPath();
        ctx.moveTo(-0.38 * R, -2.75 * R);
        ctx.lineTo(-0.70 * R, -2.10 * R);
        ctx.lineTo(-0.60 * R, -1.55 * R);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo( 0.38 * R, -2.75 * R);
        ctx.lineTo( 0.70 * R, -2.10 * R);
        ctx.lineTo( 0.60 * R, -1.55 * R);
        ctx.stroke();
      }

      // ── JERSEY / TORSO ──
      ctx.fillStyle   = jerseyColor;
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth   = R * 0.07;
      ctx.beginPath();
      ctx.roundRect(-0.50 * R, -2.95 * R, 1.0 * R, 1.85 * R, R * 0.18);
      ctx.fill();
      ctx.stroke();

      // Jersey collar
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth   = R * 0.07;
      ctx.beginPath();
      ctx.arc(0, -2.85 * R, R * 0.18, 0.2, Math.PI - 0.2);
      ctx.stroke();

      // ── HEAD ──
      ctx.fillStyle   = skinColor;
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth   = R * 0.07;
      ctx.beginPath();
      ctx.arc(0, -3.8 * R, 0.46 * R, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Hair
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.arc(0, -3.9 * R, 0.46 * R, Math.PI * 0.85, Math.PI * 2.15);
      ctx.fill();

      // Eyes (simple dots)
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(-0.14 * R, -3.82 * R, 0.06 * R, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc( 0.14 * R, -3.82 * R, 0.06 * R, 0, Math.PI * 2); ctx.fill();

      break;
    }
    case 'circle':
      ctx.beginPath(); ctx.arc(0, 0, item.radius, 0, Math.PI * 2); ctx.fill(); 
      ctx.stroke();
      break;
    case 'ring':
      ctx.beginPath(); ctx.arc(0, 0, item.radius, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, item.radius - 5, 0, Math.PI * 2); ctx.stroke(); 
      break;
    case 'rect': {
      const size = item.radius * 1.15;
      ctx.beginPath(); ctx.roundRect(-size / 2, -size, size, size * 1.4, 5); ctx.fill(); ctx.stroke(); 
      break;
    }
    case 'wall': {
      const w = item.radius * 1.9, h = item.radius * 0.65;
      ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 3); ctx.fill(); ctx.stroke(); 
      break;
    }
    case 'ball': {
      const r = item.radius;
      // Ombre
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(2, r * 0.75, r * 0.82, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
      // Corps — couleur de l'asset (modifiable via la palette)
      ctx.fillStyle = item.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // Coutures ballon de handball : 3 lignes courbes noires
      // (pas d'ellipse aplatie — ce serait un ballon de basket)
      ctx.strokeStyle = 'rgba(0,0,0,0.40)';
      ctx.lineWidth = 1.1;
      // Courbe gauche (verticale, légèrement bombée)
      ctx.beginPath();
      ctx.moveTo(-r * 0.15, -r * 0.92);
      ctx.bezierCurveTo(-r * 0.55, -r * 0.45, -r * 0.55, r * 0.45, -r * 0.15, r * 0.92);
      ctx.stroke();
      // Courbe droite (symétrique)
      ctx.beginPath();
      ctx.moveTo( r * 0.15, -r * 0.92);
      ctx.bezierCurveTo( r * 0.55, -r * 0.45,  r * 0.55, r * 0.45,  r * 0.15, r * 0.92);
      ctx.stroke();
      // Bande horizontale centrale (légèrement courbée)
      ctx.beginPath();
      ctx.moveTo(-r * 0.92, r * 0.10);
      ctx.bezierCurveTo(-r * 0.40, -r * 0.18, r * 0.40, -r * 0.18, r * 0.92, r * 0.10);
      ctx.stroke();
      // Reflet
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.beginPath(); ctx.arc(-r * 0.28, -r * 0.30, r * 0.20, 0, Math.PI * 2); ctx.fill();
      break;
    }

    case 'hurdle': {
      // Haie d'athlétisme : arceau jaune courbé sur deux pieds noirs
      const r = item.radius;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // Pieds noirs
      ctx.fillStyle = '#111';
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(-r * 0.62, r * 0.28, r * 0.22, r * 0.50, 3); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.roundRect( r * 0.40, r * 0.28, r * 0.22, r * 0.50, 3); ctx.fill(); ctx.stroke();
      // Arceau jaune vif — large tube courbé
      ctx.strokeStyle = '#fdd835';
      ctx.lineWidth = r * 0.26;
      ctx.beginPath();
      ctx.moveTo(-r * 0.51, r * 0.38);
      ctx.lineTo(-r * 0.51, -r * 0.05);
      ctx.bezierCurveTo(-r * 0.51, -r * 0.88, r * 0.51, -r * 0.88, r * 0.51, -r * 0.05);
      ctx.lineTo( r * 0.51,  r * 0.38);
      ctx.stroke();
      // Embouts noirs aux jonctions pied/arceau
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(-r * 0.51, r * 0.38, r * 0.13, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc( r * 0.51, r * 0.38, r * 0.13, 0, Math.PI * 2); ctx.fill();
      break;
    }

    case 'dumbbell': {
      // Haltère : deux grands disques noirs + barre argentée
      const r = item.radius;
      const drawDisk = (cx) => {
        // Disque principal noir
        ctx.fillStyle = '#212121'; ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, 0, r * 0.40, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // Anneaux de relief
        ctx.strokeStyle = '#383838'; ctx.lineWidth = r * 0.055;
        ctx.beginPath(); ctx.arc(cx, 0, r * 0.30, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#2e2e2e'; ctx.lineWidth = r * 0.045;
        ctx.beginPath(); ctx.arc(cx, 0, r * 0.19, 0, Math.PI * 2); ctx.stroke();
        // Centre bordeaux
        ctx.fillStyle = '#7b1a1a';
        ctx.beginPath(); ctx.arc(cx, 0, r * 0.09, 0, Math.PI * 2); ctx.fill();
        // Reflet
        ctx.fillStyle = 'rgba(255,255,255,0.13)';
        ctx.beginPath(); ctx.arc(cx - r * 0.13, -r * 0.15, r * 0.09, 0, Math.PI * 2); ctx.fill();
      };
      drawDisk(-r * 0.56);
      drawDisk( r * 0.56);
      // Barre argentée dégradée
      const grad = ctx.createLinearGradient(0, -r * 0.10, 0, r * 0.10);
      grad.addColorStop(0,   '#eeeeee');
      grad.addColorStop(0.4, '#ffffff');
      grad.addColorStop(1,   '#9e9e9e');
      ctx.fillStyle = grad; ctx.strokeStyle = '#757575'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(-r * 0.56, -r * 0.09, r * 1.12, r * 0.18, 2); ctx.fill(); ctx.stroke();
      break;
    }

    case 'bar': {
      // Fallback — barre simple (ne devrait plus être utilisée)
      const r = item.radius;
      ctx.beginPath(); ctx.roundRect(-r * 0.75, -r * 0.15, r * 1.5, r * 0.3, 3); ctx.fill(); ctx.stroke();
      break;
    }

    case 'cup': {
      // Coupelle vue du dessus : disque aplati coloré avec anneau intérieur creux
      const r = item.radius;
      // Ombre portée
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath(); ctx.ellipse(2, 2, r * 0.82, r * 0.82, 0, 0, Math.PI * 2); ctx.fill();
      // Corps extérieur (bord de la coupelle)
      ctx.fillStyle = item.color;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // Cavité intérieure (vue du dessus = creux foncé au centre)
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.46, 0, Math.PI * 2); ctx.fill();
      // Anneau intermédiaire (épaisseur de la paroi)
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = r * 0.08;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.64, 0, Math.PI * 2); ctx.stroke();
      // Reflet sur le bord haut-gauche
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = r * 0.1;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.82, Math.PI * 1.05, Math.PI * 1.45); ctx.stroke();
      break;
    }

    case 'ring': {
      const r = item.radius;
      if (item.id === 'hoop') {
        // Cerceau : anneau épais avec reflet
        ctx.strokeStyle = item.color;
        ctx.lineWidth = r * 0.26;
        ctx.beginPath(); ctx.arc(0, 0, r * 0.74, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.28)';
        ctx.lineWidth = r * 0.07;
        ctx.beginPath(); ctx.arc(0, 0, r * 0.74, Math.PI * 1.1, Math.PI * 1.55); ctx.stroke();
      } else {
        // Cible : 3 anneaux concentriques rouge/blanc
        const cols = ['#f44336', '#ffffff', '#f44336'];
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = cols[i];
          ctx.beginPath(); ctx.arc(0, 0, r * (1 - i * 0.3), 0, Math.PI * 2); ctx.fill();
        }
        ctx.strokeStyle = '#f44336'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-r * 0.12, 0); ctx.lineTo(r * 0.12, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -r * 0.12); ctx.lineTo(0, r * 0.12); ctx.stroke();
      }
      break;
    }

    case 'ladder': {
      const r = item.radius;
      const rw = r * 0.52, rh = r * 0.92;
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 2;
      ctx.lineCap = 'square';
      // Deux rails
      ctx.beginPath(); ctx.moveTo(-rw, -rh); ctx.lineTo(-rw, rh); ctx.stroke();
      ctx.beginPath(); ctx.moveTo( rw, -rh); ctx.lineTo( rw, rh); ctx.stroke();
      // 6 barreaux
      for (let i = 0; i <= 5; i++) {
        const y = -rh + (2 * rh / 5) * i;
        ctx.beginPath(); ctx.moveTo(-rw, y); ctx.lineTo(rw, y); ctx.stroke();
      }
      break;
    }

    case 'rect': {
      // Mannequin : tête + corps
      const r = item.radius;
      ctx.fillStyle = item.color; ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(-r * 0.33, -r * 0.28, r * 0.66, r * 0.95, r * 0.1); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffcc80'; ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.arc(0, -r * 0.52, r * 0.27, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      break;
    }

    case 'wall': {
      // Mur : rectangle large avec motif de briques
      const r = item.radius;
      ctx.fillStyle = item.color; ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(-r, -r * 0.36, r * 2, r * 0.72, r * 0.06); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1;
      // Ligne médiane horizontale
      ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
      const bw = r * 0.62;
      // Rangée haute
      for (let x = -r + bw * 0.25; x < r; x += bw) {
        ctx.beginPath(); ctx.moveTo(x, -r * 0.36); ctx.lineTo(x, 0); ctx.stroke();
      }
      // Rangée basse (décalée)
      for (let x = -r + bw * 0.55; x < r; x += bw) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, r * 0.36); ctx.stroke();
      }
      break;
    }

    case 'cone': {
      const r = item.radius;
      // Ombre
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.ellipse(0, r * 0.42, r * 0.8, r * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      // Corps
      ctx.fillStyle = item.color; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.72);
      ctx.lineTo(-r * 0.72, r * 0.38);
      ctx.lineTo( r * 0.72, r * 0.38);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // Bande blanche
      ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = r * 0.16;
      ctx.beginPath(); ctx.moveTo(-r * 0.32, r * 0.06); ctx.lineTo(r * 0.32, r * 0.06); ctx.stroke();
      break;
    }

    case 'arrow': {
      const w = item.radius * 1.5, h = item.radius * 0.7;
      ctx.beginPath();
      ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 4, -h / 2);
      ctx.lineTo(w / 2, 0); ctx.lineTo(w / 4, h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    }

    case 'zone-fix': {
      const r = item.radius;
      ctx.fillStyle = 'rgba(206, 147, 216, 0.15)';
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = item.color; ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      const cs = r * 0.28;
      ctx.strokeStyle = item.color; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-cs, 0); ctx.lineTo(cs, 0); ctx.moveTo(0, -cs); ctx.lineTo(0, cs); ctx.stroke();
      break;
    }

    default:
      ctx.beginPath(); ctx.arc(0, 0, item.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

function drawAnimationFrame() {
  const anim = state.animation;
  if (!anim.activePaths) return;
  
  anim.activePaths.forEach((item, idx) => {
    const path = item.path;
    if (path.points.length < 2) return;
    
    const pos = fieldToCanvas(getInterpolatedPosition(path, anim.progress));

    if (MOVING_KINDS.includes(path.kind) && anim.actors[idx] !== null) {
      // Halo coloré autour du joueur selon le type de trajectoire
      const actorItem = state.items[anim.actors[idx]];
      if (actorItem) {
        const ipos = fieldToCanvas(actorItem);
        ctx.strokeStyle = path.kind === 'croise'   ? 'rgba(255, 152, 0, 0.85)' :
                          path.kind === 'fixation' ? 'rgba(206, 147, 216, 0.85)' :
                                                     'rgba(255, 225, 60, 0.8)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.arc(ipos.x, ipos.y, actorItem.radius + 9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else {
      // Ballon animé pour passe (jaune) et tir (blanc)
      const r = 10;
      const ballColor = path.kind === 'pass' ? '#ffd740' : '#f0f0f0';
      ctx.fillStyle = ballColor;
      ctx.beginPath(); ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath(); ctx.arc(pos.x - r * 0.26, pos.y - r * 0.26, r * 0.28, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2); ctx.stroke();
    }
  });
}

function render() { drawCourt(); drawItems(); }

// Renumérotation des étapes après suppression d'une trajectoire :
// compacte les valeurs step sans laisser de trous (0,1,2,3... sans saut)
function renumberSteps() {
  const sorted = [...new Set(state.paths.map(p => p.step || 0))].sort((a, b) => a - b);
  const remap = new Map(sorted.map((old, i) => [old, i]));
  state.paths.forEach(p => { p.step = remap.get(p.step || 0) ?? 0; });
  if (state.explanation?.steps) {
    state.explanation.steps = sorted.map(old => state.explanation.steps[old] || null).filter(Boolean);
  }
}

// ─── Palette ──────────────────────────────────────────────────────────────────

function createAssetButtons() {
  assets.forEach((asset, index) => {
    if (asset.hidden) return;
    const button = document.createElement('button');
    button.className = 'asset-button';
    button.dataset.assetIndex = index;
    button.dataset.shape = asset.shape;
    button.style.setProperty('--asset-color', asset.color);
    button.innerHTML = `
      <span class="asset-icon ${asset.shape}" aria-hidden="true"></span>
      <span class="asset-label">${asset.label}</span>
    `;
    button.addEventListener('click', () => selectAsset(index));
    assetPalette.appendChild(button);
  });
  selectAsset(assets.findIndex(asset => !asset.hidden));
}

function clearAssetSelection() {
  Array.from(assetPalette.children).forEach(b => b.classList.remove('selected'));
}

function selectAsset(index) {
  state.selectedAssetIndex = index;
  Array.from(assetPalette.children).forEach(b => {
    b.classList.toggle('selected', Number(b.dataset.assetIndex) === index);
  });
  setStatus(`Asset sélectionné: ${assets[index].label}`);
}

const teamColors = {
  A: '#1e88e5',
  B: '#ef5350',
};

// ─── Sanitisation des données importées ───────────────────────────────────────

const VALID_SHAPES = ['circle', 'ring', 'rect', 'wall', 'bar', 'hurdle', 'dumbbell', 'ladder', 'cup', 'cone', 'arrow', 'ball', 'zone-fix'];
const VALID_TEAMS  = ['A', 'B', null];
const VALID_PATH_KINDS = ['course', 'shot', 'pass', 'croise', 'fixation'];
const HANDBALL_POSTS = ['AG', 'ARG', 'DC', 'PIV', 'ARD', 'AD'];
const MOVING_KINDS   = ['course', 'croise', 'fixation'];

function sanitizeItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    id:           String(raw.id ?? '').slice(0, 64),
    label:        String(raw.label ?? '').slice(0, 30),
    displayLabel: String(raw.displayLabel ?? '').slice(0, 10),
    color:        /^#[0-9a-fA-F]{3,8}$/.test(raw.color) ? raw.color : '#888888',
    radius:       Math.max(5, Math.min(50, Number(raw.radius) || 18)),
    shape:        VALID_SHAPES.includes(raw.shape) ? raw.shape : 'circle',
    rotation:     Number(raw.rotation) || 0,
    x:            Number(raw.x) || 0,
    y:            Number(raw.y) || 0,
    team:         VALID_TEAMS.includes(raw.team) ? raw.team : null,
    post:         HANDBALL_POSTS.includes(raw.post) ? raw.post : null,
    hidden:       Boolean(raw.hidden),
  };
}

function sanitizePath(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    id:     String(raw.id ?? '').slice(0, 64),
    kind:   VALID_PATH_KINDS.includes(raw.kind) ? raw.kind : 'course',
    color:  /^#[0-9a-fA-F]{3,8}$/.test(raw.color) ? raw.color : '#90caf9',
    step:   Number(raw.step) || 0,
    points: Array.isArray(raw.points)
      ? raw.points.map(p => ({ x: Number(p.x) || 0, y: Number(p.y) || 0 }))
      : [],
  };
}

function getNextPlayerNumber(team) {
  const numbers = state.items
    .filter(item => item.team === team)
    .map(item => Number(item.displayLabel))
    .filter(num => Number.isInteger(num) && num > 0)
    .sort((a, b) => a - b);
  let next = 1;
  for (const num of numbers) {
    if (num === next) next += 1;
    else if (num > next) break;
  }
  return next;
}

function addItem(x, y) {
  const selected = assets[state.selectedAssetIndex];
  const field = canvasToField({ x, y });
  const isPlayer = selected.id === 'player';
  const color = isPlayer ? teamColors[state.selectedTeam] : selected.color;
  const post = isPlayer && state.selectedPost ? state.selectedPost : null;
  const displayLabel = isPlayer
    ? (post || String(getNextPlayerNumber(state.selectedTeam)))
    : (selected.shape === 'circle' ? selected.label.charAt(0) : '');
  state.items.push({
    ...selected,
    x: field.x,
    y: field.y,
    id: `${selected.id}-${Date.now()}`,
    team: isPlayer ? state.selectedTeam : null,
    color,
    displayLabel,
    post,
    rotation: 0,
  });
  saveLocal(); render();
}

function getItemIndexAt(cx, cy) {
  return state.items.findIndex(item => {
    const pos = fieldToCanvas(item);
    const isHuman = item.id.startsWith('player') || item.id.startsWith('G');
    if (isHuman) {
      // La silhouette s'étend vers le haut sur ~4.3*R, R = radius*0.55
      const R = item.radius * 0.55;
      const halfW = R * 1.3;
      const topY  = pos.y - R * 4.3;
      const botY  = pos.y + R * 0.6;
      return cx >= pos.x - halfW && cx <= pos.x + halfW && cy >= topY && cy <= botY;
    }
    const dx = cx - pos.x, dy = cy - pos.y;
    return Math.sqrt(dx * dx + dy * dy) <= item.radius + 8;
  });
}

function getPathHit(cx, cy) {
  const threshold = 12;
  let hit = null;
  state.paths.forEach((path, pi) => {
    for (let i = 0; i < path.points.length; i++) {
      const p = fieldToCanvas(path.points[i]);
      const dist = Math.hypot(cx - p.x, cy - p.y);
      if (dist <= threshold) {
        if (!hit || dist < hit.dist) hit = { pathIndex: pi, pointIndex: i, dist: dist };
      }
    }
    
    for (let i = 1; i < path.points.length; i++) {
      const p1 = fieldToCanvas(path.points[i - 1]);
      const p2 = fieldToCanvas(path.points[i]);
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len2 = dx * dx + dy * dy;
      let px, py;
      if (!len2) { px = p1.x; py = p1.y; }
      else {
        const t = Math.max(0, Math.min(1, ((cx - p1.x) * dx + (cy - p1.y) * dy) / len2));
        px = p1.x + dx * t;
        py = p1.y + dy * t;
      }
      const dist = Math.hypot(cx - px, cy - py);
      if (dist <= threshold) {
        if (!hit || dist < hit.dist) hit = { pathIndex: pi, segmentIndex: i - 1, insertIndex: i, dist: dist };
      }
    }
  });
  return hit;
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

// ─── Événements canvas ────────────────────────────────────────────────────────

// Détection double-clic/double-tap unifiée (souris + tactile) via pointerdown,
// pour terminer une trajectoire en cours sans passer par un bouton dédié.
const DOUBLE_TAP_MS = 350;
const DOUBLE_TAP_DIST = 20;
let lastPointerDown = null;

canvas.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  const point = canvasPoint(event);

  const previous = lastPointerDown;
  lastPointerDown = { time: event.timeStamp, x: point.x, y: point.y };
  const isDoubleTap = previous
    && (event.timeStamp - previous.time) < DOUBLE_TAP_MS
    && Math.hypot(point.x - previous.x, point.y - previous.y) < DOUBLE_TAP_DIST;

  const mode  = state.drawMode;
  const ai    = getItemIndexAt(point.x, point.y);

  if (mode === 'select' || mode === 'asset') {
    const hit = getPathHit(point.x, point.y);
    
    if (hit && state.selectedPathIndex === hit.pathIndex) {
      if (hit.pointIndex !== undefined) {
        state.dragPathPointIndex = hit.pointIndex;
        canvas.setPointerCapture(event.pointerId);
        setStatus(`Déplacement du point`);
        return;
      } else if (hit.insertIndex !== undefined) {
        const fieldPoint = canvasToField(point);
        state.paths[hit.pathIndex].points.splice(hit.insertIndex, 0, fieldPoint);
        state.dragPathPointIndex = hit.insertIndex;
        canvas.setPointerCapture(event.pointerId);
        setStatus(`Nouveau point ajouté`);
        render();
        return;
      }
    }

    if (ai >= 0) {
      state.selectedPathIndex = null;
      state.dragIndex = ai;
      const pos = fieldToCanvas(state.items[ai]);
      state.pointerOffset.x = point.x - pos.x;
      state.pointerOffset.y = point.y - pos.y;
      canvas.setPointerCapture(event.pointerId);
      setStatus(`Déplacement de ${state.items[ai].label}`);
      return;
    }
    
    if (hit) {
      state.selectedPathIndex = hit.pathIndex;
      setStatus('Trajectoire sélectionnée');
      render();
      return;
    }
    
    state.selectedPathIndex = null;
    if (mode === 'asset') { addItem(point.x, point.y); return; }
    render();
    return;
  }

  if (mode === 'course' || mode === 'shot' || mode === 'pass' || mode === 'croise' || mode === 'fixation') {
    const newPoint = canvasToField(point);
    if (!state.currentPath || state.currentPath.kind !== mode) {
      const pathColors = { shot: '#ff5252', course: '#90caf9', pass: '#ffd740', croise: '#ff9800', fixation: '#ce93d8' };
      let step = 0;
      const syncCheckbox = document.getElementById('syncCheckbox');
      if (state.paths.length > 0) {
        const lastStep = Math.max(...state.paths.map(p => p.step || 0));
        step = (syncCheckbox && syncCheckbox.checked) ? lastStep : lastStep + 1;
      }
      state.currentPath = { id: `path-${Date.now()}`, kind: mode, color: pathColors[mode], step: step, points: [newPoint] };
      state.paths.push(state.currentPath);
      setStatus(`Début trajectoire ${mode}`);
    } else {
      state.currentPath.points.push(newPoint);
      setStatus(`Point ajouté`);
    }

    // Le double-clic/double-tap termine le tracé au dernier point simple-cliqué :
    // la seconde frappe vient d'ajouter un point en doublon (quasi même position),
    // on l'annule avant de clore la trajectoire — comme le ferait dblclick natif,
    // mais unifié souris/tactile puisqu'il repose sur pointerdown.
    if (isDoubleTap && state.currentPath) {
      // La frappe qui déclenche le double-clic/tap vient de pousser un point en doublon
      // (branche `else` ci-dessus) : le tracé a donc toujours >= 2 points ici.
      state.currentPath.points.pop();
      state.currentPath = null;
      lastPointerDown = null;
      saveLocal();
      setStatus('Trajectoire terminée');
    }

    render();
  }
});

canvas.addEventListener('pointermove', event => {
  if (state.dragPathPointIndex !== null && state.selectedPathIndex !== null) {
    const point = canvasPoint(event);
    const field = canvasToField(point);
    state.paths[state.selectedPathIndex].points[state.dragPathPointIndex] = field;
    render();
    return;
  }
  
  if (state.dragIndex !== null) {
    const point = canvasPoint(event);
    const field = canvasToField({ x: point.x - state.pointerOffset.x, y: point.y - state.pointerOffset.y });
    state.items[state.dragIndex].x = field.x;
    state.items[state.dragIndex].y = field.y;
    render();
    return;
  }
});

canvas.addEventListener('pointerup', event => {
  if (state.dragPathPointIndex !== null) {
    state.dragPathPointIndex = null;
    saveLocal();
    setStatus('Point enregistré');
    render();
    if (event.pointerId) canvas.releasePointerCapture(event.pointerId);
    return;
  }

  if (state.dragIndex !== null) {
    state.dragIndex = null;
    saveLocal();
    setStatus('Position enregistrée');
    render();
    if (event.pointerId) canvas.releasePointerCapture(event.pointerId);
  }
});

canvas.addEventListener('pointerleave', () => {
  if (state.dragIndex !== null) { state.dragIndex = null; saveLocal(); render(); }
  if (state.dragPathPointIndex !== null) { state.dragPathPointIndex = null; saveLocal(); render(); }
});

canvas.addEventListener('contextmenu', event => {
  event.preventDefault();
  const point = canvasPoint(event);
  const ai = getItemIndexAt(point.x, point.y);
  if (ai >= 0) {
    state.items.splice(ai, 1);
    saveLocal();
    render();
    setStatus('Asset supprimé');
    return;
  }

  const hit = getPathHit(point.x, point.y);
  if (hit) {
    if (state.selectedPathIndex === hit.pathIndex && hit.pointIndex !== undefined) {
      state.paths[hit.pathIndex].points.splice(hit.pointIndex, 1);
      if (state.paths[hit.pathIndex].points.length < 2) {
         state.paths.splice(hit.pathIndex, 1);
         state.selectedPathIndex = null;
         renumberSteps();
      }
      saveLocal();
      render();
      setStatus('Point supprimé');
      return;
    }

    state.paths.splice(hit.pathIndex, 1);
    if (state.selectedPathIndex === hit.pathIndex) state.selectedPathIndex = null;
    renumberSteps();
    saveLocal();
    render();
    setStatus('Trajectoire supprimée');
  }
});

canvas.addEventListener('dblclick', event => {
  const point = canvasPoint(event);
  const ai = getItemIndexAt(point.x, point.y);
  if (ai >= 0) {
    state.items[ai].rotation = (state.items[ai].rotation + 90) % 360;
    saveLocal();
    render();
    setStatus('Asset tourné de 90°');
  }
});

// ─── Bibliothèque & Persistance (Backend) ───────────────────────────────────────

async function saveLocal() {
  // N'autosauvegarde que si l'utilisateur a déjà fait un "Enregistrer" explicite
  if (!state.userSaved) return;
  await _persistExercise();
}

async function saveToBibli() {
  // Sauvegarde explicite : génère un ID si besoin, active l'autosave pour la suite
  if (!state.currentExerciseId) {
    state.currentExerciseId = 'ex_' + Date.now();
  }
  state.userSaved = true;
  await _persistExercise();
  setStatus('Exercice enregistré dans la bibliothèque');
}

async function _persistExercise() {
  const exerciseData = {
    id: state.currentExerciseId,
    name: exerciseName.value || 'Sans nom',
    category: exerciseCategory.value,
    thematique: exerciseThematique.value,
    notes: exerciseNotes.value,
    items: state.items,
    paths: state.paths,
    viewMode: board.viewMode,
    explanation: state.explanation,
    updatedAt: new Date().toISOString(),
  };
  try {
    await fetch('/api/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exerciseData)
    });
  } catch (e) {
    console.error("Erreur lors de la sauvegarde backend", e);
  }
}

async function loadLocal() {
  // Migration de l'ancien format local si existant (uniquement la première fois)
  const oldLibrary = localStorage.getItem('handball-library');
  if (oldLibrary) {
    try {
      const lib = JSON.parse(oldLibrary);
      for (const ex of lib) {
        await fetch('/api/exercises', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ex)
        });
      }
      localStorage.removeItem('handball-library');
      console.log("Ancienne bibliothèque locale migrée vers le backend.");
    } catch(e) { console.error(e); }
  }

  // Charger le dernier de la bibliothèque backend
  try {
    const res = await fetch('/api/exercises');
    const lib = await res.json();
    if (lib && lib.length > 0) {
      lib.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      loadExerciseFromData(lib[0]);
    }
  } catch(e) {
    console.error("Erreur au chargement initial", e);
  }
}

function loadExerciseFromData(d) {
  state.currentExerciseId = d.id || ('ex_' + Date.now());
  state.userSaved = true; // Déjà dans la bibliothèque, l'autosave peut fonctionner
  exerciseName.value = String(d.name || '').slice(0, 100);
  exerciseCategory.value = d.category || 'none';
  exerciseThematique.value = ['attaque', 'defense', 'gardien', 'enclenchement'].includes(d.thematique) ? d.thematique : 'attaque';
  exerciseNotes.value = String(d.notes || '').slice(0, 2000);
  state.items = Array.isArray(d.items) ? d.items.map(sanitizeItem).filter(Boolean) : [];
  state.paths = Array.isArray(d.paths) ? d.paths.map(sanitizePath).filter(Boolean) : [];
  board.viewMode = d.viewMode || board.viewMode;
  state.explanation = (d.explanation && typeof d.explanation === 'object')
    ? d.explanation
    : { material: '', steps: [] };
  selectViewMode(board.viewMode);
  render();
  setStatus('Exercice chargé');
}

function exportJson() {
  const blob = new Blob([JSON.stringify({ 
    name: exerciseName.value, 
    category: exerciseCategory.value,
    notes: exerciseNotes.value, 
    items: state.items, 
    paths: state.paths, 
    viewMode: board.viewMode, 
    explanation: state.explanation,
    exportedAt: new Date().toISOString() 
  }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = (exerciseName.value || 'exercice').replace(/[^\w\s-]/g, '').trim() || 'exercice';
  link.href = url; link.download = `${safeName}-handball.json`; link.click();
  URL.revokeObjectURL(url); setStatus('JSON exporté');
}

function importJsonFile(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const d = JSON.parse(reader.result);
      d.id = 'ex_' + Date.now();
      loadExerciseFromData(d);
      // Pas de sauvegarde automatique — utiliser le bouton Sauvegarder
      setStatus('Importé (non sauvegardé — cliquez Sauvegarder pour conserver)');
    } catch (e) { setStatus('Erreur import JSON'); }
  };
  reader.readAsText(file);
}

// ─── UI de la Bibliothèque ────────────────────────────────────────────────────

async function renderLibrary() {
  libraryGrid.innerHTML = '<p style="color:var(--text-muted); padding:20px;">Chargement...</p>';
  
  try {
    const res = await fetch('/api/exercises');
    const lib = await res.json();
    const filterVal = libraryFilter.value;
    
    lib.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    libraryGrid.innerHTML = '';
    
    if (lib.length === 0) {
      libraryGrid.innerHTML = '<p style="color:var(--text-muted); padding:20px;">La bibliothèque est vide.</p>';
      return;
    }
    
    const thematiqueLabels = {
      'attaque': 'Attaque',
      'defense': 'Défense',
      'gardien': 'Gardien',
      'enclenchement': 'Enclenchement'
    };

    lib.forEach(ex => {
      if (filterVal !== 'all' && ex.thematique !== filterVal) return;

      const them = thematiqueLabels[ex.thematique] ? ex.thematique : null;
      let dateStr = 'Inconnue';
      const validDate = new Date(ex.updatedAt || ex.exportedAt);
      if (!isNaN(validDate.getTime())) {
        dateStr = validDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' });
      }
      
      const card = document.createElement('div');
      card.className = 'library-card';
      if (ex.id === state.currentExerciseId) card.style.borderColor = 'var(--accent)';
      
      const badge = document.createElement('span');
      badge.className = 'library-card-badge';
      badge.dataset.thematique = them || 'inconnue';
      badge.textContent = them ? thematiqueLabels[them] : 'Inconnue';

      const title = document.createElement('h3');
      title.className = 'library-card-title';
      title.textContent = ex.name || 'Sans nom';

      const dateEl = document.createElement('span');
      dateEl.className = 'library-card-date';
      dateEl.textContent = dateStr;

      const actions = document.createElement('div');
      actions.className = 'library-card-actions';

      const loadBtn = document.createElement('button');
      loadBtn.className = 'library-card-btn load-btn';
      loadBtn.dataset.id = ex.id;
      loadBtn.textContent = 'Charger';

      const delBtn = document.createElement('button');
      delBtn.className = 'library-card-btn danger del-btn';
      delBtn.dataset.id = ex.id;
      delBtn.textContent = 'Supprimer';

      actions.appendChild(loadBtn);
      actions.appendChild(delBtn);
      card.appendChild(badge);
      card.appendChild(title);
      card.appendChild(dateEl);
      card.appendChild(actions);

      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('del-btn')) return;
        loadExerciseFromData(ex);
        libraryModal.style.display = 'none';
      });

      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Supprimer cet exercice de la bibliothèque ?')) {
          await fetch('/api/exercises/' + encodeURIComponent(ex.id), { method: 'DELETE' });
          renderLibrary();
          if (ex.id === state.currentExerciseId) {
            state.currentExerciseId = null;
            setStatus("Exercice actuel supprimé");
          }
        }
      });
      
      libraryGrid.appendChild(card);
    });
  } catch (err) {
    console.error("Erreur récupération biblio", err);
    libraryGrid.innerHTML = '<p style="color:var(--danger); padding:20px;">Erreur de connexion au serveur.</p>';
  }
}

// ─── Événements UI ────────────────────────────────────────────────────────────

document.getElementById('newExercise').addEventListener('click', () => {
  if (state.items.length > 0 || state.paths.length > 0) {
    const confirmNew = confirm("Êtes-vous sûr de vouloir créer un nouvel exercice ? Le travail en cours sera perdu si vous ne l'avez pas enregistré dans la bibliothèque.");
    if (!confirmNew) return;
  }
  state.currentExerciseId = null;
  state.userSaved = false; // Pas de sauvegarde tant que l'utilisateur n'a pas cliqué "Enregistrer"
  exerciseName.value = 'Nouveau exercice';
  exerciseCategory.value = 'none';
  exerciseThematique.value = 'attaque';
  exerciseNotes.value = '';
  state.items = []; state.paths = [];
  render(); setStatus('Nouvel exercice (non sauvegardé)');
});

document.getElementById('saveLocal').addEventListener('click', async () => {
  await saveToBibli();
});

openLibraryBtn.addEventListener('click', () => {
  renderLibrary();
  libraryModal.style.display = 'flex';
});

closeLibraryBtn.addEventListener('click', () => {
  libraryModal.style.display = 'none';
});

libraryFilter.addEventListener('change', () => {
  renderLibrary();
});

// Fallback for browsers without :has() support (Chrome < 105)
document.querySelectorAll('.toggle-btn input[type="checkbox"]').forEach(cb => {
  const label = cb.closest('.toggle-btn');
  if (!label) return;
  const sync = () => label.classList.toggle('checked', cb.checked);
  cb.addEventListener('change', sync);
  sync();
});

document.getElementById('exportJson').addEventListener('click', exportJson);
importJson.addEventListener('change', e => { if (e.target.files[0]) importJsonFile(e.target.files[0]); e.target.value = ''; });
viewModeButtons.addEventListener('click', e => {
  const button = e.target.closest('button[data-mode]');
  if (!button) return;
  selectViewMode(button.dataset.mode);
});
drawModeButtons.addEventListener('click', e => {
  const button = e.target.closest('button[data-mode]');
  if (!button) return;
  selectDrawMode(button.dataset.mode);
});
teamButtons.addEventListener('click', e => {
  const button = e.target.closest('button[data-team]');
  if (!button) return;
  state.selectedTeam = button.dataset.team;
  state.selectedAssetIndex = assets.findIndex(asset => asset.id === 'player');
  clearAssetSelection();
  selectDrawMode('asset');
  updateModeButtons(teamButtons, state.selectedTeam);
  setStatus(`Équipe : ${state.selectedTeam} (prêt à poser un joueur)`);
});

const postButtonsEl = document.getElementById('postButtons');
postButtonsEl.addEventListener('click', e => {
  const button = e.target.closest('button[data-post]');
  if (!button) return;
  const post = button.dataset.post;
  if (state.selectedPost === post) {
    // Désélectionner si on reclique sur le même
    state.selectedPost = null;
    updateModeButtons(postButtonsEl, null);
    setStatus('Poste désélectionné — numérotation automatique');
  } else {
    state.selectedPost = post;
    state.selectedAssetIndex = assets.findIndex(asset => asset.id === 'player');
    clearAssetSelection();
    selectDrawMode('asset');
    updateModeButtons(postButtonsEl, post);
    setStatus(`Poste : ${post} — cliquer sur le terrain pour placer`);
  }
});
playAnimationButton.addEventListener('click', () => {
  if (!state.paths.length) { setStatus('Aucune trajectoire'); return; }
  if (state.animation.active) {
    state.animation.active = false;
    if (state.animation.originalPositions) {
      state.items.forEach((item, i) => {
        if (state.animation.originalPositions[i]) {
          item.x = state.animation.originalPositions[i].x;
          item.y = state.animation.originalPositions[i].y;
        }
      });
      state.animation.originalPositions = null;
    }
    playAnimationButton.textContent = 'Jouer animation';
    setStatus('Animation arrêtée');
    render();
    return;
  }
  state.animation.active = true;
  state.animation.originalPositions = state.items.map(item => ({ x: item.x, y: item.y }));
  state.animation.currentStep = 0;
  state.animation.progress = 0;
  playAnimationButton.textContent = '⏹ Arrêter';
  prepareAnimationStep();
  const maxStep = Math.max(...state.paths.map(p => p.step || 0));
  setStatus(`Animation étape 1 / ${maxStep + 1}`);
  requestAnimationFrame(updateAnimation);
});

// ─── Helpers animation ────────────────────────────────────────────────────────

function getInterpolatedPosition(path, t) {
  const total = path.points.length - 1;
  if (total < 1) return path.points[0] || { x: 0, y: 0 };
  
  const segment = Math.min(Math.floor(t * total), total - 1);
  const subT = (t * total) - segment;
  
  const p0 = segment === 0 ? path.points[0] : path.points[segment - 1];
  const p1 = path.points[segment];
  const p2 = path.points[segment + 1];
  const p3 = segment + 2 < path.points.length ? path.points[segment + 2] : p2;
  
  const cp1x = p1.x + (p2.x - p0.x) / 6;
  const cp1y = p1.y + (p2.y - p0.y) / 6;
  const cp2x = p2.x - (p3.x - p1.x) / 6;
  const cp2y = p2.y - (p3.y - p1.y) / 6;
  
  const u = 1 - subT;
  const tt = subT * subT;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * subT;
  
  const x = uuu * p1.x + 3 * uu * subT * cp1x + 3 * u * tt * cp2x + ttt * p2.x;
  const y = uuu * p1.y + 3 * uu * subT * cp1y + 3 * u * tt * cp2y + ttt * p2.y;
  
  return { x, y };
}

function prepareAnimationStep() {
  const anim = state.animation;
  anim.activePaths = state.paths.map((p, index) => ({ path: p, index })).filter(item => (item.path.step || 0) === anim.currentStep);
  
  if (anim.activePaths.length === 0) return;

  anim.actors = [];
  anim.activePaths.forEach(item => {
    const path = item.path;
    let actorIndex = null;
    if (MOVING_KINDS.includes(path.kind) && path.points.length > 0) {
      const start = path.points[0];
      let minDist = Infinity;
      state.items.forEach((it, i) => {
        if (!it.team) return;
        const dx = it.x - start.x, dy = it.y - start.y;
        const d = dx * dx + dy * dy;
        if (d < minDist) { minDist = d; actorIndex = i; }
      });
    }
    anim.actors.push(actorIndex);
  });
}

function advanceToNextStep() {
  const anim = state.animation;
  anim.currentStep++;
  anim.progress = 0;
  
  const maxStep = state.paths.length > 0 ? Math.max(...state.paths.map(p => p.step || 0)) : -1;
  
  if (anim.currentStep > maxStep) {
    anim.active = false;
    if (anim.originalPositions) {
      state.items.forEach((item, i) => {
        if (anim.originalPositions[i]) {
          item.x = anim.originalPositions[i].x;
          item.y = anim.originalPositions[i].y;
        }
      });
      anim.originalPositions = null;
    }
    playAnimationButton.textContent = 'Jouer animation';
    saveLocal();
    render();
    setStatus('Animation terminée ✓');
    return;
  }
  prepareAnimationStep();
  setStatus(`Animation étape ${anim.currentStep + 1} / ${maxStep + 1}`);
  requestAnimationFrame(updateAnimation);
}

function updateAnimation() {
  if (!state.animation.active) return;
  const anim = state.animation;

  if (!anim.activePaths || anim.activePaths.length === 0) {
    advanceToNextStep();
    return;
  }

  anim.progress += anim.speed;

  anim.activePaths.forEach((item, idx) => {
    const path = item.path;
    const actorIndex = anim.actors[idx];
    if (MOVING_KINDS.includes(path.kind) && actorIndex !== null) {
      const fp = getInterpolatedPosition(path, Math.min(anim.progress, 1));
      state.items[actorIndex].x = fp.x;
      state.items[actorIndex].y = fp.y;
    }
  });

  if (anim.progress >= 1) {
    render();
    setTimeout(advanceToNextStep, 150);
    return;
  }

  render();
  requestAnimationFrame(updateAnimation);
}

// ─── Page Explication ─────────────────────────────────────────────────────────

function generateStepSnapshot(stepIndex) {
  // Temporarily dim non-active paths, then capture
  const savedColors = state.paths.map(p => p.color);
  state.paths.forEach(p => {
    if ((p.step || 0) !== stepIndex) p.color = 'rgba(100,120,150,0.25)';
  });
  render();
  const off = document.createElement('canvas');
  off.width  = Math.round(canvas.width  * 0.55);
  off.height = Math.round(canvas.height * 0.55);
  off.getContext('2d').drawImage(canvas, 0, 0, off.width, off.height);
  const dataUrl = off.toDataURL('image/jpeg', 0.68);
  // Restore colors
  state.paths.forEach((p, i) => { p.color = savedColors[i]; });
  render();
  return dataUrl;
}

const POST_LABELS = {
  AG:  'Ailier G',
  AD:  'Ailier D',
  ARG: 'Arrière G',
  ARD: 'Arrière D',
  DC:  'Demi-centre',
  PIV: 'Pivot',
};

function detectPoste(item) {
  if (!item) return 'Joueur';
  // Priorité au poste explicitement assigné par l'utilisateur
  if (item.post && POST_LABELS[item.post]) return POST_LABELS[item.post];
  if (item.id && (item.id.startsWith('G') || item.id.startsWith('GK')) || item.label === 'Gardien') {
    return 'Gardien';
  }
  if (item.x === undefined || item.y === undefined) return 'Joueur';

  const team = item.team || 'A';
  const x_norm = (team === 'A') ? item.x : 40 - item.x;
  const y = item.y;

  if (x_norm <= 6 && y >= 6 && y <= 14) {
    return 'Gardien';
  }
  if (x_norm <= 11 && y >= 6 && y <= 14) {
    return 'Pivot';
  }
  if (x_norm >= 18 && y <= 6) {
    return 'Ailier G';
  }
  if (x_norm >= 18 && y >= 14) {
    return 'Ailier D';
  }
  if (x_norm >= 12 && x_norm <= 24 && y >= 7 && y <= 13) {
    return 'Demi-centre';
  }
  if (x_norm >= 14 && y < 10) {
    return 'Arrière G';
  }
  if (x_norm >= 14 && y > 10) {
    return 'Arrière D';
  }
  if (y < 10) return 'Arrière G';
  if (y > 10) return 'Arrière D';
  return 'Demi-centre';
}

function getActionLabel(actionVal) {
  const actMap = {
    croise: 'Croisé',
    fixation: 'Fixation',
    penetration: 'Pénétration',
    montee_pivot: 'Montée pivot',
    tir: 'Tir',
    passe: 'Passe',
    passe_croisee: 'Passe croisée',
    sortie_gk: 'Sortie gardien'
  };
  return actMap[actionVal] || actionVal;
}

function getPlayerKey(player) {
  if (!player) return '';
  return `${player.team || 'A'}-${player.displayLabel || player.id || ''}`;
}

function getPlayerInfo(player) {
  if (!player) return null;
  const team = player.team || 'A';
  const num = player.displayLabel ? player.displayLabel : player.id || '';
  // Si le joueur a un poste explicite, on l'utilise comme identifiant (ex: "AG" au lieu de "A3")
  const label = player.post ? `${team}${player.post}` : `${team}${num}`.trim();
  return {
    label: label || 'Joueur',
    poste: detectPoste(player),
    team,
  };
}

function getClosestPlayer(point) {
  let closest = null;
  let minDist = Infinity;
  state.items.forEach(item => {
    const isPlayer = item.team === 'A' || item.team === 'B' || item.id?.startsWith('G') || item.label === 'Gardien';
    if (!isPlayer) return;
    const dx = item.x - point.x;
    const dy = item.y - point.y;
    const dist = dx * dx + dy * dy;
    if (dist < minDist) {
      minDist = dist;
      closest = item;
    }
  });
  return closest;
}

function generateStepDescription(stepIndex) {
  const stepPaths = state.paths.filter(p => (p.step || 0) === stepIndex);
  const descriptions = [];
  const attentions = [];
  const postesDetected = new Set();
  const actionsDetected = new Set();
  const players = new Map();
  const pathActorKey = new Map();
  const crossedActors = new Set();

  function addPlayer(player) {
    if (!player || !player.id) return;
    const key = getPlayerKey(player);
    if (!players.has(key)) {
      players.set(key, getPlayerInfo(player));
    }
  }

  function describePlayer(player) {
    if (!player) return 'Joueur';
    const info = getPlayerInfo(player);
    return `${info.poste} ${info.label}`.trim();
  }

  const courses = stepPaths.filter(p => p.kind === 'course' && p.points && p.points.length >= 2);
  const crossed = new Set();

  stepPaths.forEach(path => {
    if (!path.points || path.points.length === 0) return;
    const actor = getClosestPlayer(path.points[0]);
    pathActorKey.set(path, getPlayerKey(actor));
    addPlayer(actor);
  });

  for (let i = 0; i < courses.length; i++) {
    for (let j = i + 1; j < courses.length; j++) {
      if (!pathIntersects(courses[i], courses[j])) continue;
      const startA = courses[i].points[0];
      const endA = courses[i].points[courses[i].points.length - 1];
      const startB = courses[j].points[0];
      const endB = courses[j].points[courses[j].points.length - 1];
      const dyA = endA.y - startA.y;
      const dyB = endB.y - startB.y;

      if (Math.sign(dyA) !== Math.sign(dyB) && Math.abs(dyA) >= 1 && Math.abs(dyB) >= 1) {
        crossed.add(courses[i]);
        crossed.add(courses[j]);
        const keyA = pathActorKey.get(courses[i]);
        const keyB = pathActorKey.get(courses[j]);
        if (keyA) crossedActors.add(keyA);
        if (keyB) crossedActors.add(keyB);
        actionsDetected.add('croise');
      }
    }
  }

  stepPaths.forEach(path => {
    if (!path.points || path.points.length === 0) return;
    const startPoint = path.points[0];
    const endPoint = path.points[path.points.length - 1];
    const actor = getClosestPlayer(startPoint);
    addPlayer(actor);
    const actorLabel = describePlayer(actor);
    if (actor) postesDetected.add(detectPoste(actor));

    const team = actor?.team || 'A';
    const xStartNorm = (team === 'A') ? startPoint.x : 40 - startPoint.x;
    const xEndNorm = (team === 'A') ? endPoint.x : 40 - endPoint.x;
    const actorRole = detectPoste(actor);
    const actorKey = getPlayerKey(actor);

    if (path.kind === 'course') {
      let text = '';
      const dx = xEndNorm - xStartNorm;
      const dy = endPoint.y - startPoint.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      const isWingFixation = actorRole.startsWith('Ailier') && absDy >= absDx && xEndNorm >= 16;
      const isPivotRun = xStartNorm < xEndNorm && xEndNorm <= 18 && endPoint.y >= 6 && endPoint.y <= 14;
      const isPenetration = dx > 3 && endPoint.y >= 6 && endPoint.y <= 14;

      if (crossed.has(path)) {
        text = `${actorLabel} se croise avec un autre joueur.`;
      } else if (actor?.id?.startsWith('G') && xEndNorm > 6) {
        text = `Le Gardien sort de sa zone.`;
        actionsDetected.add('sortie_gk');
      } else if (isWingFixation) {
        text = `${actorLabel} fixe son intervalle.`;
        actionsDetected.add('fixation');
      } else if (isPivotRun) {
        text = `${actorLabel} monte dans l'axe pour fixer la défense.`;
        actionsDetected.add('montee_pivot');
      } else if (isPenetration) {
        text = `${actorLabel} pénètre vers le but.`;
        actionsDetected.add('penetration');
      } else {
        text = `${actorLabel} se déplace vers la zone ${getZoneLabel(endPoint)}.`;
      }
      descriptions.push(text);
      attentions.push(`Vérifier le timing et le placement de ${actorLabel}.`);
    } else if (path.kind === 'pass') {
      const receiver = getClosestPlayer(endPoint);
      addPlayer(receiver);
      const receiverLabel = describePlayer(receiver);
      const receiverKey = getPlayerKey(receiver);
      const receiverIsCrossed = receiverKey && crossedActors.has(receiverKey);

      if (receiver && receiverLabel !== actorLabel) {
        postesDetected.add(detectPoste(receiver));
        if (receiverIsCrossed) {
          actionsDetected.add('passe_croisee');
          descriptions.push(`Passe croisée de ${actorLabel} vers ${receiverLabel}.`);
          attentions.push(`Passe dans la course croisée de ${receiverLabel}.`);
        } else {
          actionsDetected.add('passe');
          descriptions.push(`Passe de ${actorLabel} vers ${receiverLabel}.`);
          attentions.push(`Précision et synchronisation entre ${actorLabel} et ${receiverLabel}.`);
        }
      } else {
        actionsDetected.add('passe');
        descriptions.push(`Passe de ${actorLabel}.`);
        attentions.push(`Précision de la passe pour ${actorLabel}.`);
      }
    } else if (path.kind === 'shot') {
      actionsDetected.add('tir');
      descriptions.push(`Tir de ${actorLabel}.`);
      attentions.push(`Qualité et précision du tir de ${actorLabel}.`);
    } else if (path.kind === 'croise') {
      actionsDetected.add('croise');
      descriptions.push(`${actorLabel} effectue un croisé.`);
      attentions.push(`Timing du croisé et communication entre les joueurs concernés.`);
    } else if (path.kind === 'fixation') {
      actionsDetected.add('fixation');
      descriptions.push(`${actorLabel} réalise une fixation.`);
      attentions.push(`${actorLabel} doit fixer le défenseur avant de remettre.`);
    }
  });

  const autoDescription = descriptions.length > 0
    ? descriptions.map(line => `- ${line}`).join('\n')
    : '- Aucune action détectée.';

  return {
    autoDescription,
    detectedPostes: Array.from(postesDetected),
    detectedActions: Array.from(actionsDetected).map(getActionLabel),
    playerInfo: Array.from(players.values()),
    attentionLines: attentions,
  };
}

function getZoneLabel(point) {
  if (!point) return 'centrale';
  if (point.x < 10) return 'aile';
  if (point.x > 30) return 'axe';
  return 'central';
}

function lineSegmentsIntersect(p1, q1, p2, q2) {
  function orientation(p, q, r) {
    const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    if (Math.abs(val) < 1e-5) return 0;
    return (val > 0) ? 1 : 2;
  }
  function onSegment(p, q, r) {
    return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
           q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
  }
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);

  if (o1 !== o2 && o3 !== o4) return true;

  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;

  return false;
}

function pathIntersects(pathA, pathB) {
  if (!pathA.points || pathA.points.length < 2 || !pathB.points || pathB.points.length < 2) return false;
  for (let i = 0; i < pathA.points.length - 1; i++) {
    for (let j = 0; j < pathB.points.length - 1; j++) {
      if (lineSegmentsIntersect(
        pathA.points[i], pathA.points[i+1],
        pathB.points[j], pathB.points[j+1]
      )) {
        return true;
      }
    }
  }
  return false;
}

function prePopulateExplanations() {
  // 1. Liste du matériel
  const assetCounts = {};
  const assetLabelMap = (typeof assets !== 'undefined' && Array.isArray(assets))
    ? Object.fromEntries(assets.map(a => [String(a.id || ''), String(a.label || 'Asset')]))
    : {};
  state.items.forEach(item => {
    if (!item || !item.id || item.id.startsWith('player') || item.id.startsWith('G')) return;

    const assetId = String(item.id).split('-')[0];
    const label = String(item.label || assetLabelMap[assetId] || assetLabelMap[item.id] || 'Asset').trim();
    assetCounts[label] = (assetCounts[label] || 0) + 1;
  });

  const materialParts = [];
  for (const [label, count] of Object.entries(assetCounts)) {
    const suffix = (count > 1 && !/s$|x$|z$/i.test(label)) ? 's' : '';
    materialParts.push(`${count} ${label}${suffix}`);
  }

  if (materialParts.length > 0) {
    const detectedMaterial = materialParts.join(', ');
    if (!state.explanation.material || state.explanation.material.trim() === '') {
      state.explanation.material = detectedMaterial;
    }
  }

  const maxStep = state.paths.length > 0
    ? Math.max(...state.paths.map(p => p.step || 0))
    : -1;

  state.explanation.steps = state.explanation.steps.slice(0, maxStep + 1);

  for (let s = 0; s <= maxStep; s++) {
    if (!state.explanation.steps[s]) {
      state.explanation.steps[s] = { step: s, description: '', attention: '', postes: [], actions: [] };
    }
  }

  function getPlayerNameWithArticle(player, capitalize = false) {
    if (!player) return capitalize ? 'Un joueur' : 'un joueur';
    if (player.id.startsWith('G') || player.label === 'Gardien') {
      return capitalize ? 'Le Gardien' : 'le Gardien';
    }
    const poste = detectPoste(player);
    const num = player.displayLabel ? player.displayLabel : '';
    const team = player.team ? player.team : '';
    const label = `${poste} ${team}${num}`.trim();
    
    const startsWithVowel = /^[aeiouéèàâ]/i.test(label);
    const article = startsWithVowel ? "l'" : "le ";
    const result = article + label;
    return capitalize ? result.charAt(0).toUpperCase() + result.slice(1) : result;
  }

  function getPlayerName(player) {
    if (!player) return 'Joueur';
    if (player.id.startsWith('G') || player.label === 'Gardien') {
      return 'Gardien';
    }
    const poste = detectPoste(player);
    const num = player.displayLabel ? player.displayLabel : '';
    const team = player.team ? player.team : '';
    return `${poste} ${team}${num}`.trim();
  }

  function getActionLabel(actionVal) {
    const actMap = {
      croise: '⚡ Croisé',
      fixation: '🔒 Fixation',
      penetration: '🏃 Pénétration',
      montee_pivot: '↑ Montée pivot',
      tir: '🎯 Tir',
      passe: '↔ Passe',
      sortie_gk: '🧤 Sortie gardien'
    };
    return actMap[actionVal] || actionVal;
  }

  for (let s = 0; s <= maxStep; s++) {
    const stepObj = state.explanation.steps[s];
    const result = generateStepDescription(s);

    stepObj.autoDescription = result.autoDescription;
    stepObj.detectedPostes = result.detectedPostes;
    stepObj.detectedActions = result.detectedActions;
    stepObj.playerInfo = result.playerInfo;

    if (!stepObj.description || stepObj.description.trim() === '') {
      stepObj.description = stepObj.autoDescription;
    }
    if (!stepObj.attention || stepObj.attention.trim() === '') {
      const uniqueAttentions = [...new Set(result.attentionLines)];
      stepObj.attention = uniqueAttentions.length > 0
        ? uniqueAttentions.map(line => `- ${line}`).join('\n')
        : "- Aucun point d'attention particulier.";
    }
  }
}

function openExplanationPage() {
  const maxStep = state.paths.length > 0
    ? Math.max(...state.paths.map(p => p.step || 0))
    : 0;

  // Pré-remplir les explications et le matériel
  try {
    prePopulateExplanations();
  } catch(e) {
    console.error('prePopulateExplanations a échoué :', e);
  }

  state.explanation.steps = state.explanation.steps.slice(0, maxStep + 1);
  for (let s = 0; s <= maxStep; s++) {
    if (!state.explanation.steps[s]) {
      state.explanation.steps[s] = { step: s, description: '', attention: '' };
    }
  }

  // Snapshots par phase
  const snapshots = [];
  for (let s = 0; s <= maxStep; s++) {
    try {
      snapshots.push(generateStepSnapshot(s));
    } catch(e) {
      console.error(`Snapshot étape ${s} échoué :`, e);
      snapshots.push(null);
    }
  }

  const payload = {
    exerciseId:  state.currentExerciseId,
    name:        exerciseName.value || 'Sans nom',
    category:    exerciseCategory.value,
    notes:       exerciseNotes.value,
    explanation: state.explanation,
    snapshots,
    autoDesc:    state.explanation.steps.map(s => s.autoDescription || ''),
    playerInfo:  state.explanation.steps.map(s => s.playerInfo || []),
  };

  try {
    localStorage.setItem('handball-explanation-data', JSON.stringify(payload));
  } catch (e) {
    setStatus('⚠ Données trop volumineuses pour localStorage');
    console.error(e);
    return;
  }
  window.open('../pages/explanation.html', '_blank');
}

// ─── Init ─────────────────────────────────────────────────────────────────────

window.addEventListener('load', () => {
  createAssetButtons(); loadLocal();
  selectViewMode(board.viewMode);
  selectDrawMode(state.drawMode);
  updateModeButtons(teamButtons, state.selectedTeam);
  render();

  document.getElementById('openExplanation')?.addEventListener('click', openExplanationPage);
});

// ─── Fermeture : le serveur s'arrête via Ctrl+C (SIGINT) ou le raccourci du bureau ──────────
// On ne tue plus le serveur automatiquement depuis le navigateur :
// window.open('explanation.html') déclenchait beforeunload/pagehide et coupait le serveur
// alors que l'onglet explanation venait juste de s'ouvrir et en avait encore besoin.
// Le serveur Node gère SIGINT/SIGTERM proprement (voir server.js).