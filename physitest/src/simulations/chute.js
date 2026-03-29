/**
 * Simulation : Chute libre
 */

SimRunner.register('chute', {

  init(params) {
    return { t: 0, running: false, done: false };
  },

  onParamChange(state, params) {
    return { ...state, t: 0, running: false, done: false };
  },

  computeMetrics(p) {
    const { h, v0, g } = p;
    const disc = v0 * v0 + 2 * g * h;
    const tf   = (v0 + Math.sqrt(disc)) / g;
    const vf   = Math.sqrt(disc);
    const ec   = 0.5 * vf * vf;
    return { tf, vf, ec };
  },

  tick(state, params, dt) {
    if (!state.running || state.done) return state;
    const { h, v0, g } = params;
    const t = state.t + dt;
    const y = h + v0 * t - 0.5 * g * t * t;
    if (y <= 0) return { ...state, t, done: true, running: false };
    return { ...state, t };
  },

  draw(ctx, W, H, state, p) {
    const { h, v0, g } = p;
    ctx.clearRect(0, 0, W, H);
    const mL = 40, mR = 20, mT = 20, mB = 32;
    const botY = H - mB, topY = mT;
    const scY  = (botY - topY) / h;

    // Ground
    ctx.strokeStyle = '#3d6080'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(mL, botY); ctx.lineTo(W - mR, botY); ctx.stroke();

    const t  = state.t;
    const y  = state.done ? 0 : h + v0 * t - 0.5 * g * t * t;
    const py = botY - y * scY;

    // Trace
    if (t > 0) {
      ctx.beginPath();
      const steps = Math.ceil(t * 60);
      for (let i = 0; i <= steps; i++) {
        const ti = i / 60;
        const yi = h + v0 * ti - 0.5 * g * ti * ti;
        if (yi < 0) break;
        const yp = botY - yi * scY;
        i === 0 ? ctx.moveTo(W / 2, yp) : ctx.lineTo(W / 2, yp);
      }
      ctx.strokeStyle = 'rgba(5,161,240,0.3)'; ctx.lineWidth = 2; ctx.stroke();
    }

    if (state.done) {
      // Impact flash
      ctx.fillStyle = '#e05c7a';
      ctx.fillRect(W / 2 - 14, botY - 6, 28, 10);
      ctx.fillStyle = '#f0a830'; ctx.font = '13px monospace';
      const disc = v0 * v0 + 2 * g * h;
      const tf = (v0 + Math.sqrt(disc)) / g;
      ctx.fillText('Impact ! t = ' + tf.toFixed(2) + ' s', W / 2 - 70, botY - 20);
    } else {
      // Object
      ctx.fillStyle = state.running ? '#05a1f0' : '#7aa8cc';
      ctx.fillRect(W / 2 - 14, py, 28, 28);

      if (!state.running && !state.done) {
        // Initial state label
        ctx.fillStyle = '#3d6080'; ctx.font = '11px monospace';
        ctx.fillText('h = ' + h + ' m', mL + 4, topY + 18);
        if (v0 > 0) {
          ctx.strokeStyle = '#3ec97a'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(W / 2, py); ctx.lineTo(W / 2, py - 24); ctx.stroke();
          ctx.fillStyle = '#3ec97a';
          ctx.fillText('v₀ = ' + v0 + ' m/s', W / 2 + 10, py - 8);
        }
      } else if (state.running) {
        const v = v0 + g * t;
        ctx.fillStyle = '#7aa8cc'; ctx.font = '11px monospace';
        ctx.fillText('v = ' + v.toFixed(1) + ' m/s', W / 2 + 20, py + 14);
        ctx.fillText('t = ' + t.toFixed(2) + ' s', W - 74, H - 10);
      }
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
