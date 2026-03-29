/**
 * PhysiTest — Chute libre
 *
 * Même architecture que le pendule :
 *  - Mode simple (animation seule + barres énergie)
 *  - Mode scientifique (animation + graphique y(t) / v(t) / énergie)
 *  - Vecteur vitesse animé
 *  - Sélecteur planète
 *  - Vitesse de simulation réglable
 *  - Affichage du sommet si v₀ > 0
 */

SimRunner.register('chute', {

  init(params) {
    return {
      t: 0,
      running: false,
      done: false,
      history: [],
      maxHistory: 800,
      graphMode: 'y',    // 'y' | 'v' | 'energy'
      sciMode: false,
      speedFactor: 1,
    };
  },

  onParamChange(state, params) {
    return { ...state, t: 0, running: false, done: false, history: [] };
  },

  computeMetrics(p) {
    const { h, v0, g } = p;
    // Hauteur max (si v0 > 0, l'objet monte d'abord)
    const hmax = v0 > 0 ? h + (v0 * v0) / (2 * g) : h;
    // Durée totale jusqu'au sol
    const disc = v0 * v0 + 2 * g * h;
    const tf   = (v0 + Math.sqrt(Math.max(0, disc))) / g;
    const vf   = Math.sqrt(Math.max(0, disc));
    const ec   = 0.5 * vf * vf;
    const amax = g; // accélération constante = g
    return { tf, vf, hmax, ec, amax };
  },

  tick(state, params, dt) {
    if (!state.running || state.done || state.paused) return state;
    const { h, v0, g } = params;
    const eff = dt * (state.speedFactor || 1);
    const t   = state.t + eff;
    const y   = h + v0 * t - 0.5 * g * t * t;
    const v   = v0 - g * t; // positif = montée, négatif = descente

    const Ep   = g * y;
    const Ec   = 0.5 * v * v;
    const disc = v0 * v0 + 2 * g * h;
    const Etot = 0.5 * disc; // = g*h + 0.5*v0² (constante)

    const point = { t, y, v, Ep, Ec, Etot };
    const history = [...state.history, point];
    if (history.length > state.maxHistory) history.shift();

    if (y <= 0) {
      return { ...state, t, done: true, running: false, history, current: point };
    }
    return { ...state, t, history, current: point };
  },

  draw(ctx, W, H, state, p) {
    ctx.clearRect(0, 0, W, H);
    const sciMode = state.sciMode || false;

    if (!sciMode) {
      drawSimple(ctx, W, H, state, p);
    } else {
      const splitX = Math.floor(W * 0.50);
      drawAnim(ctx, 0, 0, splitX, H, state, p, true);
      // Séparateur
      ctx.strokeStyle = 'rgba(5,161,240,0.08)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(splitX, 16); ctx.lineTo(splitX, H - 16); ctx.stroke();
      drawGraph(ctx, splitX + 10, 0, W - splitX - 12, H, state, p, state.graphMode || 'y');
    }
  },

  actions: {
    launch(state) {
      if (state.done || state.running) return { ...state, t: 0, running: false, done: false, history: [] };
      return { ...state, running: true };
    },
    reset(state)  { return { ...state, t: 0, running: false, done: false, history: [] }; },
    setGraphMode(state, _p, mode) { return { ...state, graphMode: mode }; },
    toggleSciMode(state)  { return { ...state, sciMode: !state.sciMode, history: [], t: 0, running: false, done: false }; },
    setSpeed(state, _p, factor) { return { ...state, speedFactor: factor }; },
  }
});

// ─────────────────────────────────────────────────────────────
// MODE SIMPLE
// ─────────────────────────────────────────────────────────────
function drawSimple(ctx, W, H, state, p) {
  drawAnim(ctx, 0, 0, W, H, state, p, false);
}

// ─────────────────────────────────────────────────────────────
// ANIMATION CHUTE
// ─────────────────────────────────────────────────────────────
function drawAnim(ctx, ox, oy, W, H, state, p, showVectors) {
  const { h, v0, g } = p;

  // Hauteur max pour l'échelle (si v0 > 0, l'objet monte au-dessus de h)
  const hmax_display = v0 > 0 ? h + (v0 * v0) / (2 * g) : h;
  const margin = { t: 28, b: 70, l: 50, r: 20 };
  const gx = ox + margin.l, gy = oy + margin.t;
  const gw = W - margin.l - margin.r;
  const gh = H - margin.t - margin.b;

  const toY = yVal => gy + gh - (yVal / Math.max(hmax_display * 1.05, 1)) * gh;
  const cx  = ox + W / 2; // centre horizontal

  // Sol
  ctx.strokeStyle = '#3d6080'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(ox + margin.l - 10, toY(0)); ctx.lineTo(ox + W - margin.r + 10, toY(0)); ctx.stroke();
  // Hachures sol
  for (let i = 0; i < 8; i++) {
    const x = ox + margin.l - 10 + i * ((gw + 30) / 8);
    ctx.beginPath(); ctx.moveTo(x, toY(0)); ctx.lineTo(x - 8, toY(0) + 8);
    ctx.strokeStyle = 'rgba(61,96,128,0.4)'; ctx.lineWidth = 0.8; ctx.stroke();
  }

  // Axe Y (hauteur)
  ctx.strokeStyle = 'rgba(5,161,240,0.12)'; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(gx - 4, gy); ctx.lineTo(gx - 4, toY(0)); ctx.stroke();
  // Ticks hauteur
  const nTicks = 5;
  ctx.fillStyle = '#3d6080'; ctx.font = '9px monospace'; ctx.textAlign = 'right';
  for (let i = 0; i <= nTicks; i++) {
    const val = (i / nTicks) * hmax_display;
    const py2  = toY(val);
    ctx.beginPath(); ctx.moveTo(gx - 4, py2); ctx.lineTo(gx - 8, py2);
    ctx.strokeStyle = 'rgba(5,161,240,0.12)'; ctx.lineWidth = 0.6; ctx.stroke();
    ctx.fillText(val.toFixed(0) + 'm', gx - 10, py2 + 3);
  }
  ctx.textAlign = 'left';

  // Ligne de hauteur initiale (pointillée)
  ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(5,161,240,0.18)'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(gx - 4, toY(h)); ctx.lineTo(ox + W - margin.r, toY(h)); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#3d6080'; ctx.font = '9px monospace';
  ctx.fillText('h₀=' + h + 'm', gx, toY(h) - 4);

  // Hauteur max si v0 > 0
  if (v0 > 0) {
    const hmax = h + v0 * v0 / (2 * g);
    ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(45,212,160,0.25)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(gx - 4, toY(hmax)); ctx.lineTo(ox + W - margin.r, toY(hmax)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#2dd4a0'; ctx.font = '9px monospace';
    ctx.fillText('h_max=' + hmax.toFixed(1) + 'm', gx, toY(hmax) - 4);
  }

  // Trace de trajectoire (chemin parcouru)
  const { history, current, running, done, t } = state;
  if (history && history.length > 1) {
    ctx.beginPath();
    history.forEach((pt, i) => {
      const px2 = cx;
      const py2 = toY(Math.max(0, pt.y));
      i === 0 ? ctx.moveTo(px2, py2) : ctx.lineTo(px2, py2);
    });
    ctx.strokeStyle = 'rgba(5,161,240,0.3)'; ctx.lineWidth = 2; ctx.stroke();
  }

  // Objet courant
  const y_cur   = current ? Math.max(0, current.y) : h;
  const v_cur   = current ? current.v : v0;
  const py_cur  = toY(y_cur);
  const r_obj   = 16;

  if (done) {
    // Impact
    ctx.fillStyle = '#e05c7a';
    ctx.beginPath(); ctx.arc(cx, toY(0) - r_obj / 2, r_obj, 0, Math.PI * 2); ctx.fill();
    // Onde de choc
    for (let ring = 1; ring <= 3; ring++) {
      ctx.beginPath(); ctx.arc(cx, toY(0), r_obj * ring * 0.8, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(224,92,122,${0.3 / ring})`; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.fillStyle = '#f0a830'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
    const disc = v0 * v0 + 2 * g * h;
    const tf_  = (v0 + Math.sqrt(disc)) / g;
    const vf_  = Math.sqrt(disc);
    ctx.fillText('Impact ! v = ' + vf_.toFixed(1) + ' m/s', cx, toY(0) - r_obj * 2 - 6);
    ctx.fillText('t = ' + tf_.toFixed(2) + ' s', cx, toY(0) - r_obj * 2 - 24);
    ctx.textAlign = 'left';
  } else {
    // Objet
    const col = running ? '#05a1f0' : '#7aa8cc';
    ctx.beginPath(); ctx.arc(cx, py_cur, r_obj, 0, Math.PI * 2);
    ctx.fillStyle = col; ctx.fill();
    ctx.strokeStyle = running ? 'rgba(5,161,240,0.5)' : 'rgba(122,168,204,0.3)';
    ctx.lineWidth = 1.5; ctx.stroke();

    if (!running && !done) {
      // État initial : flèche v0 si > 0
      if (v0 > 0) {
        const arrowLen = Math.min(60, v0 * 4);
        ctx.strokeStyle = '#2dd4a0'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx, py_cur - r_obj); ctx.lineTo(cx, py_cur - r_obj - arrowLen); ctx.stroke();
        drawArrow(ctx, cx, py_cur - r_obj, cx, py_cur - r_obj - arrowLen, '#2dd4a0', 8);
        ctx.fillStyle = '#2dd4a0'; ctx.font = '10px monospace'; ctx.textAlign = 'left';
        ctx.fillText('v₀ = ' + v0 + ' m/s', cx + 6, py_cur - r_obj - arrowLen / 2);
        ctx.textAlign = 'left';
      }
      // Flèche g (pesanteur)
      ctx.strokeStyle = 'rgba(240,168,48,0.7)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx - 30, py_cur); ctx.lineTo(cx - 30, py_cur + 36); ctx.stroke();
      drawArrow(ctx, cx - 30, py_cur, cx - 30, py_cur + 36, '#f0a830', 7);
      ctx.fillStyle = '#f0a830'; ctx.font = '10px monospace';
      ctx.fillText('g', cx - 42, py_cur + 20);
    }

    if (running && showVectors && current) {
      // Vecteur vitesse
      const vmax_est = v0 + g * state.t;
      const vabs = Math.abs(v_cur);
      if (vabs > 0.1) {
        const arrowLen = Math.min(50, (vabs / Math.max(vmax_est, 10)) * 50);
        const dir = v_cur > 0 ? -1 : 1; // négatif = vers le bas
        const vy_end = py_cur + dir * (-arrowLen); // vers le bas si descente
        const col_v = v_cur > 0 ? '#2dd4a0' : '#05a1f0';
        ctx.strokeStyle = col_v; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx + r_obj + 6, py_cur); ctx.lineTo(cx + r_obj + 6, py_cur - dir * arrowLen); ctx.stroke();
        drawArrow(ctx, cx + r_obj + 6, py_cur, cx + r_obj + 6, py_cur - dir * arrowLen, col_v, 7);
        ctx.fillStyle = col_v; ctx.font = '10px monospace';
        ctx.fillText('v=' + Math.abs(v_cur).toFixed(1), cx + r_obj + 10, py_cur - dir * arrowLen / 2);
      }
    }

    // Temps et hauteur courante
    if (running) {
      ctx.fillStyle = '#3d6080'; ctx.font = '10px monospace'; ctx.textAlign = 'right';
      ctx.fillText('t = ' + (t || 0).toFixed(2) + ' s', ox + W - margin.r, oy + H - 8);
      ctx.textAlign = 'left';
    }
  }

  // Barres d'énergie
  if (current || !running) {
    const disc = v0 * v0 + 2 * g * h;
    const Etot = 0.5 * disc + g * 0; // énergie totale = g*h + ½v0²
    const Etot2 = g * h + 0.5 * v0 * v0;
    const Ep_cur = current ? g * Math.max(0, current.y) : g * h;
    const Ec_cur = current ? 0.5 * current.v * current.v : 0.5 * v0 * v0;
    drawEnergyBars(ctx, ox + 10, oy + H - 58, W - 20, Ep_cur, Ec_cur, Etot2);
  }
}

// ─────────────────────────────────────────────────────────────
// GRAPHIQUE
// ─────────────────────────────────────────────────────────────
function drawGraph(ctx, gx, gy, gw, gh, state, p, mode) {
  const { h, v0, g } = p;
  const disc = v0 * v0 + 2 * g * h;
  const tf   = (v0 + Math.sqrt(Math.max(0, disc))) / g;
  const hist = state.history;

  const mt = 32, mb = 36, ml = 46, mr = 12;
  const px = gx + ml, py = gy + mt;
  const pw = gw - ml - mr, ph = gh - mt - mb;

  if (pw < 20 || ph < 20) return;

  ctx.fillStyle = 'rgba(6,8,15,0.6)';
  ctx.fillRect(gx, gy + mt - 4, gw, gh - mt + 4);

  // Titre
  const titles = { y: 'y(t) — Hauteur (m)', v: 'v(t) — Vitesse (m/s)', energy: 'Énergie (J·kg⁻¹)' };
  ctx.fillStyle = '#7aa8cc'; ctx.font = '500 11px monospace'; ctx.textAlign = 'center';
  ctx.fillText(titles[mode] || '', gx + gw / 2, gy + mt - 10);
  ctx.textAlign = 'left';

  if (!hist || hist.length < 2) {
    ctx.fillStyle = '#3d6080'; ctx.font = '11px monospace'; ctx.textAlign = 'center';
    ctx.fillText('Lance la simulation →', gx + gw / 2, gy + gh / 2);
    ctx.textAlign = 'left';
    // Dessiner la trajectoire théorique en fantôme
    drawTheoretical(ctx, px, py, pw, ph, p, mode, tf);
    return;
  }

  ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();

  const tMax = Math.max(...hist.map(pt => pt.t), tf * 0.5);
  const toX  = t2 => px + (t2 / tMax) * pw;

  if (mode === 'y') {
    const hmax_d = v0 > 0 ? h + v0 * v0 / (2 * g) : h;
    const toYg   = val => py + ph - (val / (hmax_d * 1.1)) * ph;

    // Axe zéro (sol)
    ctx.strokeStyle = 'rgba(5,161,240,0.12)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(px, toYg(0)); ctx.lineTo(px + pw, toYg(0)); ctx.stroke();
    // Ligne h₀
    ctx.setLineDash([3,4]); ctx.strokeStyle = 'rgba(5,161,240,0.15)';
    ctx.beginPath(); ctx.moveTo(px, toYg(h)); ctx.lineTo(px + pw, toYg(h)); ctx.stroke();
    ctx.setLineDash([]);

    // Courbe y(t)
    ctx.beginPath();
    hist.forEach((pt, i) => {
      i === 0 ? ctx.moveTo(toX(pt.t), toYg(Math.max(0, pt.y)))
              : ctx.lineTo(toX(pt.t), toYg(Math.max(0, pt.y)));
    });
    ctx.strokeStyle = '#05a1f0'; ctx.lineWidth = 2; ctx.stroke();

    // Point courant
    const last = hist[hist.length - 1];
    ctx.beginPath(); ctx.arc(toX(last.t), toYg(Math.max(0, last.y)), 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#05a1f0'; ctx.fill();

  } else if (mode === 'v') {
    const vmax_abs = Math.max(v0, Math.sqrt(disc));
    const vmin     = v0 > 0 ? -vmax_abs : -vmax_abs * 0.2;
    const toVg = val => py + ph / 2 - (val / vmax_abs) * (ph / 2 - 4);

    // Axe zéro
    ctx.strokeStyle = 'rgba(5,161,240,0.12)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(px, toVg(0)); ctx.lineTo(px + pw, toVg(0)); ctx.stroke();

    // Zone positive (montée) / négative (descente)
    ctx.beginPath();
    hist.forEach((pt, i) => {
      i === 0 ? ctx.moveTo(toX(pt.t), toVg(pt.v))
              : ctx.lineTo(toX(pt.t), toVg(pt.v));
    });
    // Gradient couleur selon signe
    ctx.strokeStyle = '#2dd4a0'; ctx.lineWidth = 2; ctx.stroke();

    // Re-tracer en bleu la partie négative (descente)
    ctx.beginPath();
    let inDescent = false;
    hist.forEach((pt, i) => {
      if (pt.v <= 0) {
        if (!inDescent) { ctx.moveTo(toX(pt.t), toVg(pt.v)); inDescent = true; }
        else ctx.lineTo(toX(pt.t), toVg(pt.v));
      }
    });
    ctx.strokeStyle = '#05a1f0'; ctx.lineWidth = 2; ctx.stroke();

  } else if (mode === 'energy') {
    const Etot2 = g * h + 0.5 * v0 * v0;
    const toEg  = val => py + ph - (val / (Etot2 || 1)) * (ph - 4);

    // Ep
    ctx.beginPath();
    hist.forEach((pt, i) => {
      i === 0 ? ctx.moveTo(toX(pt.t), toEg(pt.Ep))
              : ctx.lineTo(toX(pt.t), toEg(pt.Ep));
    });
    ctx.strokeStyle = '#e05c7a'; ctx.lineWidth = 1.8; ctx.stroke();

    // Ec
    ctx.beginPath();
    hist.forEach((pt, i) => {
      i === 0 ? ctx.moveTo(toX(pt.t), toEg(pt.Ec))
              : ctx.lineTo(toX(pt.t), toEg(pt.Ec));
    });
    ctx.strokeStyle = '#2dd4a0'; ctx.lineWidth = 1.8; ctx.stroke();

    // Etot (ligne pointillée)
    ctx.setLineDash([3,3]); ctx.strokeStyle = 'rgba(122,168,204,0.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px, toEg(Etot2)); ctx.lineTo(px + pw, toEg(Etot2)); ctx.stroke();
    ctx.setLineDash([]);

    // Légende
    ctx.font = '10px monospace';
    ctx.fillStyle = '#e05c7a'; ctx.fillText('● Ep', px + 4, py + 14);
    ctx.fillStyle = '#2dd4a0'; ctx.fillText('● Ec', px + 4, py + 26);
    ctx.fillStyle = '#7aa8cc'; ctx.fillText('— E_tot', px + 4, py + 38);
  }

  ctx.restore();

  // Bordure
  ctx.strokeStyle = 'rgba(5,161,240,0.1)'; ctx.lineWidth = 0.5;
  ctx.strokeRect(px, py, pw, ph);

  // Labels axe Y
  ctx.fillStyle = '#3d6080'; ctx.font = '9px monospace'; ctx.textAlign = 'right';
  if (mode === 'y') {
    const hm = v0 > 0 ? h + v0*v0/(2*g) : h;
    ctx.fillText(hm.toFixed(0)+'m', px - 3, py + 8);
    ctx.fillText('0', px - 3, py + ph);
    ctx.save(); ctx.translate(gx + 10, gy + mt + ph/2); ctx.rotate(-Math.PI/2);
    ctx.textAlign = 'center'; ctx.fillText('Hauteur (m)', 0, 0); ctx.restore();
  } else if (mode === 'v') {
    const vm = Math.sqrt(disc);
    ctx.fillText('+'+v0.toFixed(0), px-3, py+8);
    ctx.fillText('0', px-3, py+ph/2+4);
    ctx.fillText('-'+vm.toFixed(0), px-3, py+ph);
    ctx.save(); ctx.translate(gx+10, gy+mt+ph/2); ctx.rotate(-Math.PI/2);
    ctx.textAlign='center'; ctx.fillStyle='#3d6080'; ctx.fillText('Vitesse (m/s)',0,0); ctx.restore();
  } else if (mode === 'energy') {
    const Et = g*h+0.5*v0*v0;
    ctx.fillText(Et.toFixed(1), px-3, py+8);
    ctx.fillText('0', px-3, py+ph);
    ctx.save(); ctx.translate(gx+10, gy+mt+ph/2); ctx.rotate(-Math.PI/2);
    ctx.textAlign='center'; ctx.fillText('Énergie (J·kg⁻¹)',0,0); ctx.restore();
  }
  ctx.textAlign = 'left';

  // Labels axe X
  ctx.fillStyle = '#3d6080'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
  const tMax2 = hist.length ? Math.max(...hist.map(p=>p.t)) : tf;
  ctx.fillText('0', px, py+ph+14);
  ctx.fillText(tMax2.toFixed(1)+'s', px+pw, py+ph+14);
  ctx.fillText('t (s)', px+pw/2, py+ph+26);
  ctx.textAlign = 'left';
}

// Trajectoire théorique fantôme (avant lancement)
function drawTheoretical(ctx, px, py, pw, ph, p, mode, tf) {
  const { h, v0, g } = p;
  const disc = v0*v0+2*g*h;
  const hmax = v0>0 ? h+v0*v0/(2*g) : h;
  const toX = t2 => px + (t2/tf)*pw;

  ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();

  if (mode === 'y') {
    const toYg = val => py+ph-(val/(hmax*1.1))*ph;
    ctx.beginPath();
    for (let i=0;i<=60;i++){
      const t2=(i/60)*tf;
      const y2=h+v0*t2-0.5*g*t2*t2;
      i===0?ctx.moveTo(toX(t2),toYg(Math.max(0,y2))):ctx.lineTo(toX(t2),toYg(Math.max(0,y2)));
    }
    ctx.strokeStyle='rgba(5,161,240,0.1)'; ctx.lineWidth=1.5; ctx.setLineDash([4,4]); ctx.stroke(); ctx.setLineDash([]);
  } else if (mode === 'v') {
    const vm=Math.sqrt(disc);
    const toVg = val => py+ph/2-(val/Math.max(v0,vm))*(ph/2-4);
    ctx.beginPath();
    for(let i=0;i<=60;i++){const t2=(i/60)*tf; ctx.lineTo(toX(t2),toVg(v0-g*t2));}
    ctx.strokeStyle='rgba(5,161,240,0.1)'; ctx.lineWidth=1.5; ctx.setLineDash([4,4]); ctx.stroke(); ctx.setLineDash([]);
  }

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// Barres d'énergie
// ─────────────────────────────────────────────────────────────
function drawEnergyBars(ctx, x, y, w, Ep, Ec, Etot) {
  if (Etot <= 0) return;
  const bh = 9, gap = 16, lw = 30, bw = w - lw - 38;
  ctx.fillStyle = '#7aa8cc'; ctx.font = '10px monospace';
  ctx.fillText('Ep', x, y + bh);
  ctx.fillStyle = '#131a2e'; ctx.fillRect(x + lw, y, bw, bh);
  ctx.fillStyle = '#e05c7a';
  ctx.fillRect(x + lw, y, Math.max(0, Math.min(1, Ep / Etot)) * bw, bh);

  ctx.fillStyle = '#7aa8cc';
  ctx.fillText('Ec', x, y + gap + bh);
  ctx.fillStyle = '#131a2e'; ctx.fillRect(x + lw, y + gap, bw, bh);
  ctx.fillStyle = '#2dd4a0';
  ctx.fillRect(x + lw, y + gap, Math.max(0, Math.min(1, Ec / Etot)) * bw, bh);

  // Marker Etot
  ctx.strokeStyle = 'rgba(122,168,204,0.4)'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
  ctx.beginPath(); ctx.moveTo(x + lw + bw, y - 2); ctx.lineTo(x + lw + bw, y + gap + bh + 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#3d6080'; ctx.font = '9px monospace';
  ctx.fillText('E', x + lw + bw + 5, y + gap / 2 + 5);
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function drawArrow(ctx, fx, fy, tx, ty, color, size) {
  const a = Math.atan2(ty - fy, tx - fx);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - size * Math.cos(a - 0.4), ty - size * Math.sin(a - 0.4));
  ctx.lineTo(tx - size * Math.cos(a + 0.4), ty - size * Math.sin(a + 0.4));
  ctx.closePath(); ctx.fill();
}
