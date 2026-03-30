/**
 * PhysiTest — SimRunner
 * Gère le cycle de vie des simulations.
 */

const SimRunner = (() => {
  let currentSim = null;
  let animRAF    = null;
  let speed      = 1;      // multiplicateur de vitesse
  const registry = {};
  const DT_BASE  = 1 / 60; // dt à 60fps

  function register(id, mod) { registry[id] = mod; }

  function setSpeed(s) { speed = s; }

  function getCanvas(simId) {
    const c = document.getElementById(`canvas-${simId}`);
    if (!c) return null;
    c.width  = c.clientWidth  || 600;
    c.height = c.clientHeight || 320;
    return c;
  }

  function load(simData) {
    stop();
    const mod = registry[simData.id];
    if (!mod) { console.warn(`[SimRunner] "${simData.id}" non trouvé`); return; }

    const params = readParams(simData);
    currentSim = { id: simData.id, data: simData, state: mod.init(params), module: mod };
    updateMetrics(simData, params);

    simData.controls.forEach(ctrl => {
      const input = document.getElementById(`ctrl-${simData.id}-${ctrl.id}`);
      if (input) {
        input.addEventListener('input',  () => onControlChange(simData));
        input.addEventListener('change', () => onControlChange(simData));
      }
    });

    if (mod.draw) animate();
  }

  function onControlChange(simData) {
    const params = readParams(simData);
    updateMetrics(simData, params);
    if (currentSim?.module.onParamChange) {
      currentSim.state = currentSim.module.onParamChange(currentSim.state, params);
    }
  }

  function animate() {
    if (!currentSim?.module.draw) return;
    const canvas = getCanvas(currentSim.id);
    if (!canvas) return;
    const ctx    = canvas.getContext('2d');
    const params = readParams(currentSim.data);
    const dt     = DT_BASE * speed;
    currentSim.state = currentSim.module.tick(currentSim.state, params, dt);
    currentSim.module.draw(ctx, canvas.width, canvas.height, currentSim.state, params);
    animRAF = requestAnimationFrame(animate);
  }

  function stop() {
    cancelAnimationFrame(animRAF);
    animRAF = null;
    if (currentSim?.module.destroy) currentSim.module.destroy(currentSim.state);
    currentSim = null;
  }

  function pause()     { cancelAnimationFrame(animRAF); animRAF = null; }
  function resume()    { if (currentSim) animate(); }
  function isPaused()  { return animRAF === null; }

  function trigger(action, extra) {
    if (!currentSim) return;
    const mod = currentSim.module;
    if (mod.actions?.[action]) {
      const params = readParams(currentSim.data);
      currentSim.state = mod.actions[action](currentSim.state, params, extra);
      if (!animRAF && mod.draw) animate();
    }
  }

  function readParams(simData) {
    const params = {};
    simData.controls.forEach(ctrl => {
      params[ctrl.id] = UI.getControl(simData.id, ctrl.id) ?? ctrl.default;
    });
    return params;
  }

  function updateMetrics(simData, params) {
    const mod = registry[simData.id];
    if (!mod?.computeMetrics) return;
    const metrics = mod.computeMetrics(params);
    simData.metrics.forEach(m => {
      if (metrics[m.id] !== undefined) UI.setMetric(m.id, metrics[m.id], m.decimals);
    });
  }

  return { register, load, stop, pause, resume, isPaused, trigger, animate, setSpeed };
})();
