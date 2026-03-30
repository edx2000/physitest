/**
 * Simulation : Tir parabolique
 */

const G_PROJ = 9.81;

SimRunner.register('projectile', {

  init(params) {
    return { t: 0, running: false, done: false };
  },

  onParamChange(state, params) {
    return { ...state, t: 0, running: false, done: false };
  },

  computeMetrics(p) {
    const v0    = p.v0;
    const alpha = p.alpha * Math.PI / 180;
    const h0    = p.h0;
    const vx    = v0 * Math.cos(alpha);
    const vy    = v0 * Math.sin(alpha);
    const disc  = vy * vy + 2 * G_PROJ * h0;
    const tf    = (vy + Math.sqrt(disc)) / G_PROJ;
    const R     = vx * tf;
    const H     = h0 + vy * vy / (2 * G_PROJ);
    return { R, H, tf, vx };
  },

  tick(state, params, dt) {
    if (!state.running || state.done) return state;
    const { v0, alpha: alphaDeg, h0 } = params;
    const alpha = alphaDeg * Math.PI / 180;
    const vy    = v0 * Math.sin(alpha);
    const t     = state.t + dt;
    const y     = h0 + vy * t - 0.5 * G_PROJ * t * t;
    if (y <= 0) return { ...state, t, done: true, running: false };
    return { ...state, t };
  },

  draw(ctx, W, H, state, p) {
    const v0    = p.v0;
    const alpha = p.alpha * Math.PI / 180;
    const h0    = p.h0;
    const vx    = v0 * Math.cos(alpha);
    const vy    = v0 * Math.sin(alpha);
    const disc  = vy * vy + 2 * G_PROJ * h0;
    const tf    = (vy + Math.sqrt(disc)) / G_PROJ;
    const R     = vx * tf;
    const Hmax  = h0 + vy * vy / (2 * G_PROJ);

    ctx.clearRect(0, 0, W, H);

    const mL = 50, mR = 20, mT = 20, mB = 32;
    const sX  = (W - mL - mR) / Math.max(R, 0.01);
    const sY  = (H - mT - mB) / Math.max(Hmax * 1.12, 1);
    const tX  = x => mL + x * sX;
    const tY  = y => H - mB - y * sY;

    // Axes
    ctx.strokeStyle = '#3d6080'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(mL, H - mB); ctx.lineTo(W - mR, H - mB); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mL, H - mB); ctx.lineTo(mL, mT); ctx.stroke();

    // Full ghost trajectory
    ctx.strokeStyle = 'rgba(5,161,240,0.14)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const t2 = (i / 120) * tf;
      const x  = vx * t2, y = h0 + vy * t2 - 0.5 * G_PROJ * t2 * t2;
      i === 0 ? ctx.moveTo(tX(x), tY(y)) : ctx.lineTo(tX(x), tY(y));
    }
    ctx.stroke();

    const t = state.t;

    if (state.done) {
      // Draw full trace on impact
      ctx.strokeStyle = '#05a1f0'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const t2 = (i / 120) * tf;
        const x  = vx * t2, y = h0 + vy * t2 - 0.5 * G_PROJ * t2 * t2;
        if (y < 0) break;
        i === 0 ? ctx.moveTo(tX(x), tY(y)) : ctx.lineTo(tX(x), tY(y));
      }
      ctx.stroke();
      ctx.fillStyle = '#e05c7a'; ctx.beginPath(); ctx.arc(tX(R), tY(0), 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f0a830'; ctx.font = '12px monospace';
      ctx.fillText('Portée = ' + R.toFixed(1) + ' m', tX(R) - 60, tY(0) - 16);
    } else if (state.running) {
      const bx = vx * t;
      const by = h0 + vy * t - 0.5 * G_PROJ * t * t;

      // Trace so far
      ctx.strokeStyle = '#05a1f0'; ctx.lineWidth = 2;
      ctx.beginPath();
      const steps = Math.ceil(t * 60);
      for (let i = 0; i <= steps; i++) {
        const ti = i / 60;
        const xi = vx * ti, yi = h0 + vy * ti - 0.5 * G_PROJ * ti * ti;
        if (yi < 0) break;
        i === 0 ? ctx.moveTo(tX(xi), tY(yi)) : ctx.lineTo(tX(xi), tY(yi));
      }
      ctx.stroke();

      // Ball
      ctx.fillStyle = '#e05c7a'; ctx.beginPath(); ctx.arc(tX(bx), tY(by), 9, 0, Math.PI * 2); ctx.fill();

      // Velocity vectors
      const vyCur = vy - G_PROJ * t;
      const sc    = 3.5;
      ctx.strokeStyle = '#3ec97a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(tX(bx), tY(by)); ctx.lineTo(tX(bx) + vx * sc, tY(by)); ctx.stroke();
      ctx.strokeStyle = '#f0a830'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(tX(bx), tY(by)); ctx.lineTo(tX(bx), tY(by) - vyCur * sc); ctx.stroke();

      ctx.fillStyle = '#3d6080'; ctx.font = '10px monospace';
      ctx.fillText('vₓ', tX(bx) + vx * sc + 4, tY(by) + 4);
      ctx.fillText('vy', tX(bx) + 4, tY(by) - vyCur * sc - 4);
      ctx.fillText('t = ' + t.toFixed(2) + ' s', W - 76, H - 10);

    } else {
      // Static initial state
      ctx.fillStyle = '#7aa8cc'; ctx.beginPath(); ctx.arc(tX(0), tY(h0), 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7aa8cc'; ctx.font = '11px monospace';
      ctx.fillText('α = ' + p.alpha + '°', tX(0) + 14, tY(h0) - 4);
    }
  },

  actions: {
    launch(state) {
      if (state.done || state.running) return { ...state, t: 0, running: false, done: false };
      return { ...state, running: true };
    },
    reset(state) { return { ...state, t: 0, running: false, done: false }; }
  }
});
