/**
 * Simulation : Oscillateur masse-ressort (MHS)
 */

SimRunner.register('ressort', {

  init(params) {
    return { t: 0, paused: false };
  },

  onParamChange(state, params) {
    return state;
  },

  computeMetrics(p) {
    const k = p.k, m = p.m, A = p.A / 100;
    const w  = Math.sqrt(k / m);
    const T  = 2 * Math.PI / w;
    const F  = k * A;
    const Ep = 0.5 * k * A * A;
    return { T, w, F, Ep };
  },

  tick(state, params, dt) {
    if (state.paused) return state;
    return { ...state, t: state.t + dt };
  },

  draw(ctx, W, H, state, p) {
    const k = p.k, m = p.m, A = p.A / 100;
    const w = Math.sqrt(k / m);
    const x = A * Math.cos(w * state.t);

    ctx.clearRect(0, 0, W, H);

    const wallX = 50, cy = H * 0.45;
    const eqX   = W * 0.56;
    const ampPx  = W * 0.26;
    const bx    = eqX + (x / A) * ampPx;

    // Wall
    ctx.fillStyle = '#131a2e'; ctx.fillRect(wallX - 22, H * 0.18, 16, H * 0.64);
    ctx.fillStyle = '#7aa8cc'; ctx.fillRect(wallX - 6, H * 0.18, 4, H * 0.64);

    // Spring
    const coils = 12, sLen = bx - wallX;
    ctx.beginPath(); ctx.moveTo(wallX, cy);
    for (let i = 0; i <= coils * 2; i++) {
      const px = wallX + (sLen * i) / (coils * 2);
      const py = cy + (i % 2 === 0 ? -1 : 1) * 13;
      ctx.lineTo(px, py);
    }
    ctx.lineTo(bx, cy);
    ctx.strokeStyle = '#7aa8cc'; ctx.lineWidth = 1.5; ctx.stroke();

    // Block
    ctx.fillStyle = '#05a1f0';
    ctx.fillRect(bx, cy - 20, 38, 40);

    // Equilibrium dashed line
    ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(148,148,176,0.3)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(eqX, H * 0.08); ctx.lineTo(eqX, H * 0.92); ctx.stroke();
    ctx.setLineDash([]);

    // Force arrow
    const F = -k * x;
    const Fmax = k * A;
    const arrowLen = Math.min(55, Math.abs(F / Fmax) * 55);
    if (arrowLen > 3) {
      const dir = F > 0 ? -1 : 1;
      ctx.strokeStyle = F > 0 ? '#e05c7a' : '#3ec97a'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(bx + 19, cy);
      ctx.lineTo(bx + 19 + dir * arrowLen, cy);
      ctx.stroke();
    }

    // F label
    ctx.fillStyle = '#3d6080'; ctx.font = '11px monospace';
    ctx.fillText('F = ' + F.toFixed(1) + ' N', wallX, H * 0.14);

    // Mini graph x(t)
    const T = 2 * Math.PI / w;
    const gx = 18, gy = H - 62, gw = W - 36, gh = 44;
    ctx.fillStyle = '#0d1220'; ctx.fillRect(gx, gy, gw, gh);
    ctx.strokeStyle = '#131a2e'; ctx.lineWidth = 0.5;
    ctx.strokeRect(gx, gy, gw, gh);

    ctx.beginPath();
    const duration = 2 * T;
    for (let i = 0; i <= 200; i++) {
      const ti = state.t - duration + (i / 200) * duration;
      const xi = A * Math.cos(w * ti);
      const px2 = gx + (i / 200) * gw;
      const py2 = gy + gh / 2 - (xi / A) * (gh / 2 - 3);
      i === 0 ? ctx.moveTo(px2, py2) : ctx.lineTo(px2, py2);
    }
    ctx.strokeStyle = '#05a1f0'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#3d6080'; ctx.font = '10px monospace';
    ctx.fillText('x(t)', gx + 4, gy + 12);
  },

  actions: {
    reset(state) { return { ...state, t: 0 }; },
    togglePause(state) { return { ...state, paused: !state.paused }; }
  }
});
