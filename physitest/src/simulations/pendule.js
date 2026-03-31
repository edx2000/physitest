/**
 * PhysiTest — Pendule simple
 * Mode simple / scientifique, graphiques corrigés, angle correct,
 * vitesse ralentie, vecteurs, espace des phases.
 */

SimRunner.register('pendule', {

  init(params) {
    return {
      t: 0,
      paused: false,
      history: [],
      maxHistory: 600,
      graphMode: 'theta',
      sciMode: false,      // false = simple, true = scientifique
      speedFactor: 1,      // 1=normal, 0.25=ralenti
    };
  },

  onParamChange(state, params) {
    return { ...state, history: [], t: 0 };
  },

  computeMetrics(p) {
    const L   = p.L;
    const A0r = p.A0 * Math.PI / 180;
    const g   = p.g;
    const T    = 2 * Math.PI * Math.sqrt(L / g);
    const f    = 1 / T;
    const vmax = Math.sqrt(2 * g * L * (1 - Math.cos(A0r)));
    const E    = g * L * (1 - Math.cos(A0r));
    const amax = g * Math.sin(A0r);
    return { T, f, vmax, E, amax };
  },

  tick(state, params, dt) {
    if (state.paused) return state;
    const { L, A0, g } = params;
    const A0r  = A0 * Math.PI / 180;
    const T    = 2 * Math.PI * Math.sqrt(L / g);
    const eff  = dt * (state.speedFactor || 1);
    const t    = state.t + eff;
    const theta = A0r * Math.cos(2 * Math.PI * t / T);
    const omega = -A0r * (2 * Math.PI / T) * Math.sin(2 * Math.PI * t / T);
    const Emax  = g * L * (1 - Math.cos(A0r));
    const Ep    = g * L * (1 - Math.cos(theta));
    const Ec    = Math.max(0, Emax - Ep);
    const point = { t, theta, omega, Ep, Ec, E: Emax };

    const history = [...state.history, point];
    if (history.length > state.maxHistory) history.shift();

    return { ...state, t, history, current: point };
  },

  draw(ctx, W, H, state, p) {
    ctx.clearRect(0, 0, W, H);
    const sciMode = state.sciMode || false;

    if (!sciMode) {
      // ── MODE SIMPLE : juste le pendule + barres énergie
      drawSimpleMode(ctx, W, H, state, p);
    } else {
      // ── MODE SCIENTIFIQUE : pendule + graphique
      const splitX = Math.floor(W * 0.52);
      drawPendulumAnim(ctx, 0, 0, splitX, H, state, p, true);
      // séparateur
      ctx.strokeStyle = 'rgba(148,148,176,0.1)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(splitX, 16); ctx.lineTo(splitX, H - 16); ctx.stroke();
      // graphique
      const gMode = state.graphMode || 'theta';
      drawGraph(ctx, splitX + 10, 0, W - splitX - 12, H, state, p, gMode);
    }
  },

  actions: {
    reset(state)            { return { ...state, t: 0, history: [], paused: false }; },
    togglePause(state)      { return { ...state, paused: !state.paused }; },
    setGraphMode(state, _p, mode) { return { ...state, graphMode: mode }; },
    toggleSciMode(state)    { return { ...state, sciMode: !state.sciMode, history: [], t: 0 }; },
    setSpeed(state, _p, factor) { return { ...state, speedFactor: factor }; },
  }
});

// ─────────────────────────────────────────────────────────────
// MODE SIMPLE
// ─────────────────────────────────────────────────────────────
function drawSimpleMode(ctx, W, H, state, p) {
  drawPendulumAnim(ctx, 0, 0, W, H, state, p, false);
}

// ─────────────────────────────────────────────────────────────
// ANIMATION PENDULE
// ─────────────────────────────────────────────────────────────
function drawPendulumAnim(ctx, ox, oy, W, H, state, p, showVectors) {
  const { L, A0, g } = p;
  const A0r  = A0 * Math.PI / 180;
  const T    = 2 * Math.PI * Math.sqrt(L / g);
  const Emax = g * L * (1 - Math.cos(A0r));

  // Pivot centré, laisse de la place en bas pour les barres
  // Échelle proportionnelle à L : 1m = référence pour remplir ~80% de la zone
  const L_ref   = 2.0; // longueur de référence = slider max
  const maxScale = Math.min(W * 0.40, (H - 110) * 0.80);
  const scale    = Math.max(30, maxScale * (L / L_ref));
  const cx = ox + W / 2;
  // Pivot décalé vers le haut si L est court, gardé en haut si L est long
  const cy = oy + Math.max(24, H * 0.08);

  const theta = state.current ? state.current.theta : A0r;
  const omega = state.current ? state.current.omega : 0;

  // Coordonnées bob
  // FIXE : angle mesuré depuis la verticale, vers la droite = positif
  const bx = cx + scale * Math.sin(theta);
  const by = cy + scale * Math.cos(theta);

  // Arc de trajectoire fantôme
  ctx.beginPath();
  for (let i = 0; i <= 120; i++) {
    const th = A0r * Math.cos((i / 120) * 2 * Math.PI);
    const x  = cx + scale * Math.sin(th);
    const y  = cy + scale * Math.cos(th);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.strokeStyle = 'rgba(5,161,240,0.10)'; ctx.lineWidth = 1.5; ctx.stroke();

  // Ligne verticale pointillée de référence
  ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(122,168,204,0.18)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + scale * 1.05); ctx.stroke();
  ctx.setLineDash([]);

  // Arc indicateur angle
  // Dans canvas: 0=droite, PI/2=bas, PI=gauche
  // Verticale vers bas = PI/2
  // Fil vers bob = PI/2 - theta  (theta>0 → bob à droite → angle canvas plus petit)
  const arcR      = scale * 0.20;
  const vertAngle = Math.PI / 2;
  const filAngle  = Math.PI / 2 - theta;
  ctx.beginPath();
  // theta>0: arc de vertAngle vers filAngle en anticlockwise (sens horaire visuel)
  // theta<0: arc de filAngle vers vertAngle en anticlockwise
  if (theta >= 0) {
    ctx.arc(cx, cy, arcR, filAngle, vertAngle, false);
  } else {
    ctx.arc(cx, cy, arcR, vertAngle, filAngle, false);
  }
  ctx.strokeStyle = 'rgba(240,168,48,0.65)'; ctx.lineWidth = 1.8; ctx.stroke();

  // Label angle — au milieu de l'arc, toujours du bon côté
  const midFilAngle = (vertAngle + filAngle) / 2;
  const labelR = arcR + 16;
  const currentTheta = theta * 180 / Math.PI;
  ctx.fillStyle = '#f0a830'; ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    currentTheta.toFixed(1) + '°',
    cx + labelR * Math.cos(midFilAngle),
    cy + labelR * Math.sin(midFilAngle)
  );
  ctx.textAlign = 'left';

  // Tige
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(bx, by);
  ctx.strokeStyle = '#7aa8cc'; ctx.lineWidth = 2; ctx.stroke();

  // Pivot
  ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#7aa8cc'; ctx.fill();

  // Bob
  const r = Math.max(11, Math.min(20, scale * 0.055));
  ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2);
  ctx.fillStyle = '#05a1f0'; ctx.fill();
  ctx.strokeStyle = 'rgba(91,138,245,0.45)'; ctx.lineWidth = 1.5; ctx.stroke();

  // Vecteur vitesse (mode scientifique ou simple si Emax > 0)
  if (showVectors && Emax > 0) {
    const v = omega * L;
    const vmax = Math.sqrt(2 * g * L * (1 - Math.cos(A0r)));
    if (Math.abs(v) > 0.001 && vmax > 0) {
      // Direction tangentielle : perpendiculaire au fil, orientée par le signe de omega
      const tanX = Math.cos(theta) * (omega < 0 ? -1 : 1);
      const tanY = -Math.sin(theta) * (omega < 0 ? -1 : 1);
      const vLen = (Math.abs(v) / vmax) * scale * 0.30;
      const vex  = bx + tanX * vLen;
      const vey  = by + tanY * vLen;
      ctx.strokeStyle = '#3ec97a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(vex, vey); ctx.stroke();
      drawArrowHead(ctx, bx, by, vex, vey, '#3ec97a', 7);
      ctx.fillStyle = '#3ec97a'; ctx.font = '10px monospace';
      ctx.fillText('v', vex + 3, vey - 3);
    }
  }

  // Barres d'énergie en bas
  const Ep = state.current ? state.current.Ep : Emax;
  const Ec = state.current ? state.current.Ec : 0;
  const barY = oy + H - 66;
  drawEnergyPanel(ctx, ox + 10, barY, W - 20, Ep, Ec, Emax);

  // Temps + avertissement
  ctx.fillStyle = '#3d6080'; ctx.font = '10px monospace';
  ctx.fillText('t = ' + (state.t || 0).toFixed(2) + ' s', ox + W - 80, oy + H - 6);

  if (A0 > 15) {
    ctx.fillStyle = 'rgba(240,168,48,0.85)'; ctx.font = '10px monospace';
    ctx.fillText('⚠ θ > 15° : approx. petits angles invalide', ox + 8, oy + 14);
  }
}

// ─────────────────────────────────────────────────────────────
// GRAPHIQUE — axes propres, titres, labels
// ─────────────────────────────────────────────────────────────
function drawGraph(ctx, gx, gy, gw, gh, state, p, mode) {
  const { L, A0, g } = p;
  const A0r  = A0 * Math.PI / 180;
  const T    = 2 * Math.PI * Math.sqrt(L / g);
  const hist = state.history;

  // Marges internes du graphique
  const mt = 32, mb = 36, ml = 46, mr = 14;
  const px = gx + ml, py = gy + mt;
  const pw = gw - ml - mr, ph = gh - mt - mb;

  if (pw < 20 || ph < 20) return;

  // Fond
  ctx.fillStyle = 'rgba(6,8,15,0.7)';
  ctx.fillRect(gx, gy + mt - 4, gw, gh - mt + 4);

  // ── Titre
  ctx.fillStyle = '#7aa8cc'; ctx.font = '500 11px monospace';
  ctx.textAlign = 'center';
  const titles = { theta: 'θ(t) — Angle (°)', energy: 'Énergie (J·kg⁻¹)', phase: 'Espace des phases' };
  ctx.fillText(titles[mode] || '', gx + gw / 2, gy + mt - 8);
  ctx.textAlign = 'left';

  if (!hist || hist.length < 3) {
    ctx.fillStyle = '#3d6080'; ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('En cours…', gx + gw / 2, gy + gh / 2);
    ctx.textAlign = 'left';
    return;
  }

  // Clip zone
  ctx.save();
  ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();

  if (mode === 'theta') {
    // Y : degrés, centré sur 0
    const yMax = A0r * 180 / Math.PI;
    const toX  = pt => px + ((pt.t - hist[0].t) / Math.max(hist[hist.length-1].t - hist[0].t, 0.01)) * pw;
    const toY  = th => py + ph/2 - (th * 180/Math.PI / yMax) * (ph/2 - 4);

    // Axe zéro
    ctx.strokeStyle = 'rgba(122,168,204,0.15)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(px, py + ph/2); ctx.lineTo(px + pw, py + ph/2); ctx.stroke();

    // Courbe θ(t)
    ctx.beginPath();
    hist.forEach((pt, i) => { i===0 ? ctx.moveTo(toX(pt), toY(pt.theta)) : ctx.lineTo(toX(pt), toY(pt.theta)); });
    ctx.strokeStyle = '#05a1f0'; ctx.lineWidth = 1.8; ctx.stroke();

    // Point courant
    const last = hist[hist.length-1];
    ctx.beginPath(); ctx.arc(toX(last), toY(last.theta), 3.5, 0, Math.PI*2);
    ctx.fillStyle = '#05a1f0'; ctx.fill();

  } else if (mode === 'energy') {
    const Emax = hist[0].E || 1;
    const toX  = pt => px + ((pt.t - hist[0].t) / Math.max(hist[hist.length-1].t - hist[0].t, 0.01)) * pw;
    const toY  = v  => py + ph - (v / Emax) * (ph - 4);

    // Ligne Etot
    ctx.strokeStyle = 'rgba(122,168,204,0.15)'; ctx.lineWidth = 0.8; ctx.setLineDash([3,3]);
    ctx.beginPath(); ctx.moveTo(px, py + 4); ctx.lineTo(px + pw, py + 4); ctx.stroke(); ctx.setLineDash([]);

    // Ec (vert)
    ctx.beginPath();
    hist.forEach((pt, i) => { i===0 ? ctx.moveTo(toX(pt), toY(pt.Ec)) : ctx.lineTo(toX(pt), toY(pt.Ec)); });
    ctx.strokeStyle = '#3ec97a'; ctx.lineWidth = 1.8; ctx.stroke();

    // Ep (rose)
    ctx.beginPath();
    hist.forEach((pt, i) => { i===0 ? ctx.moveTo(toX(pt), toY(pt.Ep)) : ctx.lineTo(toX(pt), toY(pt.Ep)); });
    ctx.strokeStyle = '#e05c7a'; ctx.lineWidth = 1.8; ctx.stroke();

  } else if (mode === 'phase') {
    const omMax = A0r * (2 * Math.PI / T);
    const toX   = th => px + pw/2 + (th / A0r) * (pw/2 - 6);
    const toY   = om => py + ph/2 - (om / omMax) * (ph/2 - 6);

    // Axes croisés
    ctx.strokeStyle = 'rgba(122,168,204,0.15)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(px, py+ph/2); ctx.lineTo(px+pw, py+ph/2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px+pw/2, py); ctx.lineTo(px+pw/2, py+ph); ctx.stroke();

    // Ellipse de phase
    ctx.beginPath();
    hist.forEach((pt, i) => { i===0 ? ctx.moveTo(toX(pt.theta), toY(pt.omega)) : ctx.lineTo(toX(pt.theta), toY(pt.omega)); });
    ctx.strokeStyle = '#f0a830'; ctx.lineWidth = 1.8; ctx.stroke();

    // Point courant
    const last = hist[hist.length-1];
    ctx.beginPath(); ctx.arc(toX(last.theta), toY(last.omega), 4, 0, Math.PI*2);
    ctx.fillStyle = '#f0a830'; ctx.fill();
  }

  ctx.restore();

  // ── Bordure graphique
  ctx.strokeStyle = 'rgba(122,168,204,0.12)'; ctx.lineWidth = 0.5;
  ctx.strokeRect(px, py, pw, ph);

  // ── Labels axes Y (gauche)
  ctx.fillStyle = '#3d6080'; ctx.font = '9px monospace'; ctx.textAlign = 'right';
  if (mode === 'theta') {
    const yMax = (A0r * 180/Math.PI).toFixed(0);
    ctx.fillText('+' + yMax + '°', px - 3, py + 8);
    ctx.fillText('0',              px - 3, py + ph/2 + 4);
    ctx.fillText('-' + yMax + '°', px - 3, py + ph);
    // Label axe Y
    ctx.save(); ctx.translate(gx + 10, gy + mt + ph/2); ctx.rotate(-Math.PI/2);
    ctx.textAlign = 'center'; ctx.fillText('θ (°)', 0, 0); ctx.restore();
  } else if (mode === 'energy') {
    const Emax = hist.length ? hist[0].E : 1;
    ctx.fillText(fmtNum(Emax), px - 3, py + 8);
    ctx.fillText('0',         px - 3, py + ph);
    ctx.save(); ctx.translate(gx + 10, gy + mt + ph/2); ctx.rotate(-Math.PI/2);
    ctx.textAlign = 'center'; ctx.fillText('E (J·kg⁻¹)', 0, 0); ctx.restore();
  } else if (mode === 'phase') {
    const omMax = A0r * (2*Math.PI/T);
    ctx.fillText('+' + omMax.toFixed(2), px + pw/2 - 2, py + 8);
    ctx.fillText('0',                    px + pw/2 - 2, py + ph/2 + 4);
    ctx.fillText('-' + omMax.toFixed(2), px + pw/2 - 2, py + ph);
    ctx.save(); ctx.translate(gx + 10, gy + mt + ph/2); ctx.rotate(-Math.PI/2);
    ctx.textAlign = 'center'; ctx.fillText('ω (rad/s)', 0, 0); ctx.restore();
  }
  ctx.textAlign = 'left';

  // ── Labels axe X (bas)
  ctx.fillStyle = '#3d6080'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
  if (mode !== 'phase') {
    const tMin = hist[0].t, tMax = hist[hist.length-1].t;
    ctx.fillText(tMin.toFixed(1) + 's',  px,      py + ph + 14);
    ctx.fillText(tMax.toFixed(1) + 's',  px + pw, py + ph + 14);
    ctx.fillText('t (s)', px + pw/2, py + ph + 26);
  } else {
    const yMax = (A0r * 180/Math.PI).toFixed(0);
    ctx.fillText('-' + yMax + '°', px + 6, py + ph + 14);
    ctx.fillText('0',              px + pw/2, py + ph + 14);
    ctx.fillText('+' + yMax + '°', px + pw - 6, py + ph + 14);
    ctx.fillText('θ (°)', px + pw/2, py + ph + 26);
  }
  ctx.textAlign = 'left';

  // ── Légende énergie
  if (mode === 'energy') {
    ctx.fillStyle = '#3ec97a'; ctx.font = '10px monospace';
    ctx.fillText('● Ec', px + 4, py + 14);
    ctx.fillStyle = '#e05c7a';
    ctx.fillText('● Ep', px + 4, py + 26);
    ctx.fillStyle = '#7aa8cc'; ctx.setLineDash([3,3]);
    ctx.beginPath(); ctx.moveTo(px + 60, py + 8); ctx.lineTo(px + 80, py + 8); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#7aa8cc'; ctx.fillText('Etot', px + 82, py + 11);
  }
}

// ─────────────────────────────────────────────────────────────
// Barres d'énergie
// ─────────────────────────────────────────────────────────────
function drawEnergyPanel(ctx, x, y, w, Ep, Ec, Emax) {
  if (Emax <= 0) return;
  const bh = 9, gap = 16, labelW = 28;
  const barX = x + labelW, barW = w - labelW - 36;

  ctx.fillStyle = '#7aa8cc'; ctx.font = '10px monospace';
  ctx.fillText('Ep', x, y + bh);
  ctx.fillStyle = '#131a2e'; ctx.fillRect(barX, y, barW, bh);
  ctx.fillStyle = '#e05c7a';
  ctx.fillRect(barX, y, Math.max(0, Math.min(1, Ep/Emax)) * barW, bh);

  ctx.fillStyle = '#7aa8cc';
  ctx.fillText('Ec', x, y + gap + bh);
  ctx.fillStyle = '#131a2e'; ctx.fillRect(barX, y + gap, barW, bh);
  ctx.fillStyle = '#3ec97a';
  ctx.fillRect(barX, y + gap, Math.max(0, Math.min(1, Ec/Emax)) * barW, bh);

  // Etot marker
  ctx.strokeStyle = 'rgba(148,148,176,0.5)'; ctx.lineWidth = 1; ctx.setLineDash([2,2]);
  ctx.beginPath(); ctx.moveTo(barX + barW, y - 2); ctx.lineTo(barX + barW, y + gap + bh + 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#3d6080'; ctx.font = '9px monospace';
  ctx.fillText('E', barX + barW + 5, y + gap/2 + 5);
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function drawArrowHead(ctx, fx, fy, tx, ty, color, size) {
  const a = Math.atan2(ty - fy, tx - fx);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - size*Math.cos(a-0.4), ty - size*Math.sin(a-0.4));
  ctx.lineTo(tx - size*Math.cos(a+0.4), ty - size*Math.sin(a+0.4));
  ctx.closePath(); ctx.fill();
}

function fmtNum(v) {
  if (Math.abs(v) < 0.001 || Math.abs(v) >= 10000) return v.toExponential(2);
  return v.toFixed(3);
}
