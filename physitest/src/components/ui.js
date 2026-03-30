/**
 * PhysiTest — UI Builder
 * - Slider + saisie manuelle (Enter = retour au slider)
 * - Valeurs illimitées, écriture scientifique si trop grand/petit
 * - Validation avec message d'erreur explicite
 * - Tooltips sur toutes les abréviations
 * - Bouton mode simple/scientifique (pendule)
 * - Sélecteur vitesse (ralenti)
 */

// ── Dictionnaire des tooltips ─────────────────────────────────
const TOOLTIPS = {
  'T':    'T — Période : durée d\'une oscillation complète (s)',
  'f':    'f — Fréquence : nombre d\'oscillations par seconde (Hz)',
  'vmax': 'v_max — Vitesse maximale : atteinte au point d\'équilibre (m/s)',
  'E':    'E — Énergie mécanique spécifique : énergie totale par unité de masse (J·kg⁻¹)',
  'Ec':   'Ec — Énergie cinétique : énergie due au mouvement = ½mv²',
  'Ep':   'Ep — Énergie potentielle : énergie de position due à la pesanteur = mgh',
  'Etot': 'E_tot — Énergie mécanique totale : constante si sans frottement = Ec + Ep',
  'amax': 'a_max — Accélération tangentielle maximale aux extrêmes (m/s²)',
  'L':    'L — Longueur du fil (m)',
  'g':    'g — Intensité de la pesanteur (m/s²)',
  'θ':    'θ (thêta) — Angle d\'écart par rapport à la verticale (°)',
  'ω':    'ω (oméga) — Vitesse angulaire : taux de variation de l\'angle (rad/s)',
  'k':    'k — Raideur du ressort : force exercée par unité d\'allongement (N/m)',
  'm':    'm — Masse de l\'objet (kg)',
  'A':    'A — Amplitude : écart maximal à la position d\'équilibre',
  'h':    'h — Hauteur initiale de l\'objet (m)',
  'v0':   'v₀ — Vitesse initiale (m/s)',
  'α':    'α (alpha) — Angle de tir (°)',
  'R':    'R — Portée : distance horizontale parcourue (m)',
  'H':    'H — Hauteur maximale atteinte (m)',
  'tf':   't_f — Durée totale du vol (s)',
  'vx':   'v_x — Composante horizontale de la vitesse, constante (m/s)',
  'vf':   "v_f — Vitesse au moment de l'impact avec le sol (m/s)",
  'hmax': "h_max — Hauteur maximale atteinte (si v₀ > 0, l'objet monte avant de redescendre)",
  'ec':   "E_c — Énergie cinétique spécifique à l'impact = ½v² (J par kg)",
};

const UI = (() => {

  // ── Tooltip engine ────────────────────────────────────────
  let tooltipTimer = null;
  const tooltip = () => document.getElementById('tooltip');

  function initTooltips() {
    document.addEventListener('mouseover', e => {
      const el = e.target.closest('[data-tip]');
      if (!el) return;
      clearTimeout(tooltipTimer);
      tooltipTimer = setTimeout(() => showTooltip(el, el.dataset.tip), 700);
    });
    document.addEventListener('mouseout', e => {
      if (!e.target.closest('[data-tip]')) return;
      clearTimeout(tooltipTimer);
      hideTooltip();
    });
    document.addEventListener('mousemove', e => {
      const t = tooltip();
      if (t && t.classList.contains('visible')) {
        t.style.left = (e.clientX + 14) + 'px';
        t.style.top  = (e.clientY - 8) + 'px';
      }
    });
  }

  function showTooltip(el, text) {
    const t = tooltip(); if (!t) return;
    t.textContent = text;
    t.style.left = '-999px'; t.style.top = '-999px';
    t.classList.add('visible');
    t.removeAttribute('aria-hidden');
  }

  function hideTooltip() {
    const t = tooltip(); if (!t) return;
    t.classList.remove('visible');
    t.setAttribute('aria-hidden', 'true');
  }

  // ── Number formatting ─────────────────────────────────────
  function fmtVal(v, decimals) {
    if (typeof v !== 'number' || !isFinite(v)) return '—';
    const abs = Math.abs(v);
    if (abs !== 0 && (abs < 0.001 || abs >= 100000)) {
      return v.toExponential(2);
    }
    return v.toFixed(decimals);
  }

  // ── Validation ────────────────────────────────────────────
  // Seules les valeurs physiquement impossibles sont rejetées.
  // Valeurs hors intervalle du slider : autorisées (ex: L=5m même si slider va jusqu'à 2m).
  function validateControl(ctrl, value) {
    if (isNaN(value))     return `"${value}" n'est pas un nombre valide.`;
    if (!isFinite(value)) return 'La valeur est infinie — impossible à calculer.';

    // Strictement positifs (0 ou négatif = physiquement impossible)
    if (['L', 'g', 'm', 'k'].includes(ctrl.id) && value <= 0)
      return `${ctrl.label} doit être strictement positif (reçu : ${value}).`;

    // Positifs ou nuls
    if (['h', 'v0', 'A'].includes(ctrl.id) && value < 0)
      return `${ctrl.label} ne peut pas être négatif.`;

    // Angle pendule : entre -90° et 90° exclus
    if (ctrl.id === 'A0' && Math.abs(value) >= 90)
      return "L'angle doit rester entre -89° et 89° (le pendule se retournerait).";

    // Angle tir parabolique
    if (ctrl.id === 'alpha' && (value <= 0 || value >= 90))
      return "L'angle de tir doit être compris entre 0° et 90° (exclus).";

    return null; // OK — même si hors intervalle du slider
  }

  // ── Sidebar + mobile nav ─────────────────────────────────
  function buildSidebar(data) {
    const sidebar   = document.getElementById('sidebar');
    const mobileNav = document.getElementById('mobile-nav');
    const { categories, simulations } = data;

    // ── Sidebar desktop ──
    const homeItem = el('button', { class: 'nav-item', 'data-route': 'home' }, '⌂  Accueil');
    homeItem.addEventListener('click', () => Router.navigate('home'));
    sidebar.appendChild(homeItem);

    const byCat = {};
    simulations.forEach(sim => { (byCat[sim.category] = byCat[sim.category] || []).push(sim); });

    categories.forEach(cat => {
      if (!byCat[cat.id]) return;
      const section = el('div', { class: 'sidebar-section' });
      const catHeader = el('div', { class: 'sidebar-category' });
      catHeader.appendChild(el('span', { class: 'cat-dot', style: `background:var(--cat-${cat.id})` }));
      catHeader.appendChild(document.createTextNode(cat.label));
      section.appendChild(catHeader);
      byCat[cat.id].forEach(sim => {
        const item = el('button', { class: 'nav-item', 'data-route': `sim/${sim.id}` }, sim.title);
        item.appendChild(el('span', { class: 'nav-badge' }, sim.levels[sim.levels.length - 1]));
        item.addEventListener('click', () => Router.navigate(`sim/${sim.id}`));
        section.appendChild(item);
      });
      sidebar.appendChild(section);
    });

    // ── Navigation mobile horizontale ──
    if (!mobileNav) return;

    const homeBtn = el('button', {
      class: 'mobile-nav-item',
      'data-route': 'home'
    }, '⌂ Accueil');
    homeBtn.addEventListener('click', () => Router.navigate('home'));
    mobileNav.appendChild(homeBtn);

    simulations.forEach(sim => {
      const btn = el('button', {
        class: 'mobile-nav-item',
        'data-route': `sim/${sim.id}`
      }, sim.title);
      btn.addEventListener('click', () => Router.navigate(`sim/${sim.id}`));
      mobileNav.appendChild(btn);
    });
  }

  // ── Home ──────────────────────────────────────────────────
  function buildHome(data) {
    const view = document.querySelector('.view[data-route="home"]');
    const { site, simulations, categories } = data;
    const catColors = {};
    categories.forEach(c => { catColors[c.id] = `var(--cat-${c.id})`; });
    view.innerHTML = '';

    const hero = el('div', { class: 'home-hero' });
    hero.appendChild(el('h1', {}, `${site.name} — ${site.tagline}`));
    hero.appendChild(el('p', {}, site.description));
    view.appendChild(hero);

    const grid = el('div', { class: 'sim-grid' });
    simulations.forEach(sim => {
      const card = el('div', {
        class: 'sim-card',
        style: `--card-accent:${catColors[sim.category] || 'var(--accent)'}`,
        title: `Ouvrir ${sim.title}`
      });
      card.appendChild(el('div', { class: 'sim-card-cat' }, sim.category));
      card.appendChild(el('h3', {}, sim.title));
      card.appendChild(el('p', {}, sim.subtitle));
      const levels = el('div', { class: 'sim-card-levels' });
      sim.levels.forEach(l => levels.appendChild(el('span', { class: 'level-badge' }, l)));
      card.appendChild(levels);
      card.appendChild(el('div', { class: 'sim-card-formula' }, sim.formula));
      card.addEventListener('click', () => Router.navigate(`sim/${sim.id}`));
      grid.appendChild(card);
    });
    view.appendChild(grid);
  }

  // ── Simulator view ─────────────────────────────────────────
  function buildSimulator(simData, container) {
    container.innerHTML = '';

    // Header
    const header = el('div', { class: 'sim-header' });
    header.appendChild(el('h2', { class: 'sim-title' }, simData.title));
    header.appendChild(el('p', { class: 'sim-subtitle' }, simData.subtitle));
    const levels = el('div', { class: 'sim-levels' });
    simData.levels.forEach(l => levels.appendChild(el('span', { class: 'level-badge' }, l)));
    header.appendChild(levels);
    container.appendChild(header);

    // Canvas
    const canvasH = ['pendule', 'chute'].includes(simData.id) ? 420 : 320;
    const wrapper = el('div', { class: 'canvas-wrapper' });
    const canvas  = el('canvas', { class: 'sim-canvas', id: `canvas-${simData.id}` });
    canvas.style.height = canvasH + 'px';
    wrapper.appendChild(canvas);
    container.appendChild(wrapper);

    // Simulateurs avec mode simple/sci : pendule et chute
    const hasAdvMode = ['pendule', 'chute'].includes(simData.id);
    if (hasAdvMode) {
      container.appendChild(buildSimToolbar(simData.id));
    }

    // Graph switcher (visible en mode sci uniquement)
    if (hasAdvMode) {
      const sw = buildGraphSwitcher(simData.id);
      sw.id = `graph-switcher-${simData.id}`;
      sw.style.display = 'none';
      container.appendChild(sw);
    }

    // Buttons (au-dessus des contrôles, juste sous le canvas)
    container.appendChild(el('div', { class: 'btn-row', id: `btns-${simData.id}` }));

    // Controls
    const ctrlGrid = el('div', { class: 'controls-grid', id: `controls-${simData.id}` });
    simData.controls.forEach(ctrl => ctrlGrid.appendChild(buildControl(ctrl, simData.id)));
    container.appendChild(ctrlGrid);

    // Metrics
    const metricsGrid = el('div', { class: 'metrics-grid', id: `metrics-${simData.id}` });
    simData.metrics.forEach(m => metricsGrid.appendChild(buildMetric(m, simData.id)));
    container.appendChild(metricsGrid);

    // Formula
    container.appendChild(el('div', { class: 'formula-bar' }, simData.formula));

    // Explanation
    if (simData.explanation) container.appendChild(buildExplanationPanel(simData));

    return container;
  }

  // ── Toolbar mode simple/scientifique + vitesse ─────────────
  function buildSimToolbar(simId) {
    const bar = el('div', { class: 'pendule-toolbar' });

    // Mode simple ↔ scientifique
    const modeBtn = el('button', { class: 'toolbar-mode-btn', id: `btn-sci-mode-${simId}`, title: 'Passer en mode scientifique' });
    modeBtn.innerHTML = '🔬 Mode scientifique';
    modeBtn.addEventListener('click', () => {
      SimRunner.trigger('toggleSciMode');
      const isSci = !SimRunner.isSciMode;
      SimRunner.isSciMode = isSci;
      modeBtn.innerHTML = isSci ? '📐 Mode simple' : '🔬 Mode scientifique';
      modeBtn.classList.toggle('active', isSci);
      const sw = document.getElementById(`graph-switcher-${simId}`);
      if (sw) sw.style.display = isSci ? '' : 'none';
    });
    bar.appendChild(modeBtn);

    // Vitesse
    const speedWrap = el('div', { class: 'toolbar-speed' });
    speedWrap.appendChild(el('span', { class: 'toolbar-speed-label' }, 'Vitesse :'));
    const speeds = [
      { label: '×¼', value: 0.25 },
      { label: '×½', value: 0.5 },
      { label: '×1', value: 1 },
      { label: '×2', value: 2 },
    ];
    speeds.forEach((s, i) => {
      const btn = el('button', { class: 'speed-btn' + (i === 2 ? ' active' : ''), 'data-speed': s.value }, s.label);
      btn.addEventListener('click', () => {
        speedWrap.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        SimRunner.trigger('setSpeed', s.value);
      });
      speedWrap.appendChild(btn);
    });
    bar.appendChild(speedWrap);

    return bar;
  }

  // ── Graph switcher (adapté selon la simulation) ─────────────
  function buildGraphSwitcher(simId) {
    const wrap = el('div', { class: 'graph-switcher' });

    const modesBySimId = {
      pendule: [
        { id: 'theta',  label: 'θ(t) Angle' },
        { id: 'energy', label: 'Énergie' },
        { id: 'phase',  label: 'Phase θ/ω' },
      ],
      chute: [
        { id: 'y',      label: 'y(t) Hauteur' },
        { id: 'v',      label: 'v(t) Vitesse' },
        { id: 'energy', label: 'Énergie' },
      ],
    };

    const modes = modesBySimId[simId] || modesBySimId.pendule;
    modes.forEach((m, i) => {
      const btn = el('button', { class: 'graph-mode-btn' + (i===0 ? ' active' : ''), 'data-mode': m.id }, m.label);
      btn.addEventListener('click', () => {
        wrap.querySelectorAll('.graph-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        SimRunner.trigger('setGraphMode', m.id);
      });
      wrap.appendChild(btn);
    });
    return wrap;
  }

  // ── Control card ───────────────────────────────────────────
  function buildControl(ctrl, simId) {
    const card = el('div', { class: 'control-card' });

    // Label + tip + mode toggle
    const labelRow = el('div', { class: 'control-label-row' });
    const tipKey   = ctrl.id;
    const tipText  = TOOLTIPS[tipKey] || ctrl.label;
    const label    = el('label', {
      class: 'control-label',
      for: `ctrl-${simId}-${ctrl.id}`,
      'data-tip': tipText
    }, ctrl.label);
    labelRow.appendChild(label);
    card.appendChild(labelRow);

    if (ctrl.preset) {
      const row = el('div', { class: 'control-row' });
      const sel = el('select', { id: `ctrl-${simId}-${ctrl.id}`, 'data-ctrl': ctrl.id });
      ctrl.presets.forEach(p => {
        const opt = el('option', { value: p.value }, `${p.label} (${p.value})`);
        if (p.value == ctrl.default) opt.selected = true;
        sel.appendChild(opt);
      });
      // Option "Autre" pour saisie manuelle
      sel.appendChild(el('option', { value: '__custom__' }, 'Autre…'));
      row.appendChild(sel);
      card.appendChild(row);

      // Champ numérique caché, révélé si "Autre" sélectionné
      const customRow = el('div', { class: 'control-row ctrl-manual-row', style: 'display:none; margin-top:6px;' });
      const customInput = el('input', {
        type: 'number',
        class: 'ctrl-number-input',
        id: `ctrl-custom-${simId}-${ctrl.id}`,
        step: ctrl.step,
        value: ctrl.default,
        placeholder: `Ex: ${ctrl.default}`
      });
      const customUnit = el('span', { class: 'ctrl-unit' }, ctrl.unit);
      customRow.appendChild(customInput);
      customRow.appendChild(customUnit);
      card.appendChild(customRow);

      // Quand on sélectionne "Autre" → afficher le champ
      sel.addEventListener('change', () => {
        if (sel.value === '__custom__') {
          customRow.style.display = '';
          customInput.focus(); customInput.select();
        } else {
          customRow.style.display = 'none';
          // Déclencher recalcul
          sel.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      // Valider la valeur custom et l'appliquer
      customInput.addEventListener('input', () => {
        const v = parseFloat(customInput.value);
        if (!isNaN(v) && v > 0) {
          // Injecter la valeur dans le select comme si c'était une option
          sel.dataset.customValue = String(v);
          sel.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });

      return card;
    }

    // Mode toggle button
    const modeBtn = el('button', { class: 'ctrl-mode-btn', title: 'Saisie manuelle' }, '✎');
    labelRow.appendChild(modeBtn);

    // Error display
    const errDiv = el('div', { class: 'ctrl-error', id: `err-${simId}-${ctrl.id}`, style: 'display:none' });
    card.appendChild(errDiv);

    // Source of truth: one shared value, always consistent
    let currentValue = ctrl.default;
    const dec = getDecimals(ctrl.step);

    // Flag pour distinguer les events slider utilisateur vs programmatiques
    let _suppressRangeEvent = false;

    function applyValue(v, triggerChange = true) {
      const err = validateControl(ctrl, v);
      if (err) { showError(simId, ctrl.id, err); return false; }
      hideError(simId, ctrl.id);
      currentValue = v;
      // Slider: position visuelle clampée, vraie valeur dans dataset
      const clamped = Math.min(ctrl.max, Math.max(ctrl.min, v));
      _suppressRangeEvent = true;
      range.value = clamped;
      _suppressRangeEvent = false;
      range.dataset.realValue = String(v); // source de vérité
      // Indicateur hors-plage
      const outOfRange = v < ctrl.min || v > ctrl.max;
      valSpan.textContent = `${fmtVal(v, dec)} ${ctrl.unit}`;
      valSpan.title = outOfRange ? `Valeur personnalisée (hors plage slider ${ctrl.min}–${ctrl.max})` : '';
      valSpan.classList.toggle('ctrl-value-custom', outOfRange);
      numInput.value = v;
      // Notifier SimRunner directement via l'event sur le range,
      // mais APRÈS avoir fixé realValue pour que getControl() retourne la bonne valeur
      if (triggerChange) {
        range.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return true;
    }

    // Slider row
    const sliderRow = el('div', { class: 'control-row ctrl-slider-row' });
    const range = el('input', {
      type: 'range',
      id: `ctrl-${simId}-${ctrl.id}`,
      'data-ctrl': ctrl.id,
      min: ctrl.min, max: ctrl.max, step: ctrl.step,
      value: Math.min(ctrl.max, Math.max(ctrl.min, ctrl.default))
    });
    range.dataset.realValue = String(ctrl.default);

    const valSpan = el('span', {
      class: 'control-value',
      id: `val-${simId}-${ctrl.id}`
    }, `${fmtVal(ctrl.default, dec)} ${ctrl.unit}`);

    range.addEventListener('input', () => {
      if (_suppressRangeEvent) return; // déclenché par applyValue, ignorer
      const v = parseFloat(range.value);
      currentValue = v;
      range.dataset.realValue = String(v); // le slider est dans sa plage → pas de surcharge
      valSpan.textContent = `${fmtVal(v, dec)} ${ctrl.unit}`;
      valSpan.classList.remove('ctrl-value-custom');
      valSpan.title = '';
      numInput.value = v;
      hideError(simId, ctrl.id);
    });

    sliderRow.appendChild(range);
    sliderRow.appendChild(valSpan);
    card.appendChild(sliderRow);

    // Manual row (hidden by default)
    const manualRow = el('div', { class: 'control-row ctrl-manual-row', style: 'display:none' });
    const numInput  = el('input', {
      type: 'number',
      class: 'ctrl-number-input',
      id: `ctrl-manual-${simId}-${ctrl.id}`,
      step: ctrl.step,
      value: ctrl.default
    });
    const unitSpan = el('span', { class: 'ctrl-unit' }, ctrl.unit);
    manualRow.appendChild(numInput);
    manualRow.appendChild(unitSpan);
    card.appendChild(manualRow);

    // Live preview while typing (no validation, just display)
    numInput.addEventListener('input', () => {
      const v = parseFloat(numInput.value);
      if (!isNaN(v) && isFinite(v)) {
        valSpan.textContent = `${fmtVal(v, dec)} ${ctrl.unit}`;
        hideError(simId, ctrl.id);
      }
    });

    // Enter: validate → apply → return to slider
    numInput.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const v = parseFloat(numInput.value);
      if (applyValue(v)) {
        // Return to slider mode
        manualRow.style.display = 'none';
        sliderRow.style.display = '';
        modeBtn.classList.remove('active');
        manualMode = false;
      }
    });

    // Toggle slider ↔ manual
    let manualMode = false;
    modeBtn.addEventListener('click', () => {
      manualMode = !manualMode;
      sliderRow.style.display = manualMode ? 'none' : '';
      manualRow.style.display = manualMode ? '' : 'none';
      modeBtn.classList.toggle('active', manualMode);
      modeBtn.title = manualMode ? 'Appuyer sur Entrée pour valider' : 'Saisie manuelle';
      if (manualMode) {
        numInput.value = currentValue;
        numInput.focus(); numInput.select();
      } else {
        // Returning to slider: make sure display is consistent
        valSpan.textContent = `${fmtVal(currentValue, dec)} ${ctrl.unit}`;
      }
    });

    return card;
  }

  function showError(simId, ctrlId, msg) {
    const d = document.getElementById(`err-${simId}-${ctrlId}`);
    if (!d) return;
    d.textContent = '⚠ ' + msg;
    d.style.display = '';
  }
  function hideError(simId, ctrlId) {
    const d = document.getElementById(`err-${simId}-${ctrlId}`);
    if (d) d.style.display = 'none';
  }

  // ── Metric card ────────────────────────────────────────────
  function buildMetric(metric) {
    const card  = el('div', { class: 'metric-card', id: `metric-${metric.id}` });
    const tipText = TOOLTIPS[metric.id] || metric.label;
    const lbl   = el('div', { class: 'metric-label', 'data-tip': tipText }, metric.label);
    card.appendChild(lbl);
    card.appendChild(el('div', { class: 'metric-value', id: `mval-${metric.id}` }, '—'));
    card.appendChild(el('div', { class: 'metric-unit' }, metric.unit));
    return card;
  }

  // ── Explanation panel ──────────────────────────────────────
  function buildExplanationPanel(simData) {
    const exp  = simData.explanation;
    const wrap = el('div', { class: 'explanation-wrap' });

    const btn     = el('button', { class: 'explanation-toggle' });
    const icon    = el('span', { class: 'exp-icon' }, '📖');
    const label   = el('span', { class: 'exp-toggle-label' }, ' Voir les explications');
    const chevron = el('span', { class: 'exp-chevron' }, '▾');
    btn.appendChild(icon); btn.appendChild(label); btn.appendChild(chevron);
    wrap.appendChild(btn);

    const panel = el('div', { class: 'explanation-panel' });
    const inner = el('div', { class: 'explanation-inner' });

    inner.appendChild(el('p', { class: 'exp-intro' }, exp.intro));

    const list = el('ul', { class: 'exp-list' });
    exp.points.forEach(pt => list.appendChild(el('li', {}, pt)));
    inner.appendChild(list);

    if (exp.warning) {
      const warn = el('div', { class: 'exp-warning' });
      warn.appendChild(el('span', { class: 'exp-warn-icon' }, '⚠'));
      warn.appendChild(document.createTextNode(' ' + exp.warning));
      inner.appendChild(warn);
    }

    panel.appendChild(inner);
    wrap.appendChild(panel);

    let open = false;
    btn.addEventListener('click', () => {
      open = !open;
      panel.classList.toggle('open', open);
      chevron.textContent = open ? '▴' : '▾';
      btn.classList.toggle('active', open);
      label.textContent = open ? ' Masquer les explications' : ' Voir les explications';
      // pas de scroll automatique
    });
    return wrap;
  }

  // ── Helpers ────────────────────────────────────────────────
  function el(tag, attrs = {}, text = null) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    if (text !== null) node.textContent = text;
    return node;
  }

  function getDecimals(step) {
    const s = String(step);
    return s.includes('.') ? s.split('.')[1].length : 0;
  }

  function setMetric(id, value, decimals = 2) {
    const node = document.getElementById(`mval-${id}`);
    if (!node) return;
    node.textContent = fmtVal(value, decimals);
  }

  function getControl(simId, ctrlId) {
    const el = document.getElementById(`ctrl-${simId}-${ctrlId}`);
    if (!el) return null;
    // Select avec valeur custom (option "Autre")
    if (el.tagName === 'SELECT' && el.value === '__custom__') {
      const v = parseFloat(el.dataset.customValue);
      if (!isNaN(v)) return v;
      return null;
    }
    // Range avec valeur hors plage
    if (el.dataset.realValue !== undefined) {
      const v = parseFloat(el.dataset.realValue);
      if (!isNaN(v)) return v;
    }
    return parseFloat(el.value);
  }

  function addButton(simId, label, isPrimary, onClick) {
    const row = document.getElementById(`btns-${simId}`);
    if (!row) return;
    const btn = el('button', { class: isPrimary ? 'btn btn-primary' : 'btn' }, label);
    btn.addEventListener('click', onClick);
    row.appendChild(btn);
    return btn;
  }

  return { buildSidebar, buildHome, buildSimulator, setMetric, getControl, addButton, el, initTooltips, fmtVal };
})();
