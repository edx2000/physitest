/**
 * PhysiTest — Main
 */

async function initApp() {
  const res  = await fetch('./data/simulations.json');
  const data = await res.json();

  UI.buildSidebar(data);
  UI.buildHome(data);
  UI.initTooltips();

  // État sci mode sur le runner (partagé avec ui.js)
  SimRunner.isSciMode = false;

  Router.register('home', () => {
    SimRunner.stop();
    SimRunner.isSciMode = false;
    setHeaderContext(null);
  });

  Router.register('sim', ([simId]) => {
    const simData = data.simulations.find(s => s.id === simId);
    if (!simData) return;
    const view = document.querySelector('.view[data-route="sim"]');
    if (!view) return;
    SimRunner.isSciMode = false;
    UI.buildSimulator(simData, view);
    setupSimButtons(simData);
    SimRunner.load(simData);
    setHeaderContext(simData);
  });

  // Toutes les routes sont enregistrées — résoudre le hash initial maintenant
  Router.resolve();
}

function setHeaderContext(simData) {
  const actions = document.getElementById('header-home-actions');
  if (!actions) return;
  if (!simData) {
    actions.innerHTML = '<span style="font-size:0.78rem;color:var(--text-muted)">4 simulations disponibles</span>';
    return;
  }
  actions.innerHTML = '';
  const back = document.createElement('button');
  back.className = 'btn';
  back.style.cssText = 'font-size:0.8rem;padding:5px 12px;';
  back.textContent = '← Accueil';
  back.addEventListener('click', () => Router.navigate('home'));
  actions.appendChild(back);
  const crumb = document.createElement('span');
  crumb.style.cssText = 'font-size:0.82rem;color:var(--text-secondary);margin-left:6px;';
  crumb.textContent = simData.title;
  actions.appendChild(crumb);
}

function setupSimButtons(simData) {
  const id = simData.id;
  const hasPause  = ['pendule', 'ressort'].includes(id);
  const hasLaunch = ['chute', 'projectile'].includes(id);

  if (hasPause) {
    const btnPause = UI.addButton(id, 'Pause', true, () => {
      if (SimRunner.isPaused()) { SimRunner.resume(); btnPause.textContent = 'Pause'; }
      else                      { SimRunner.pause();  btnPause.textContent = 'Reprendre'; }
    });
    UI.addButton(id, 'Réinitialiser', false, () => {
      SimRunner.trigger('reset');
      if (SimRunner.isPaused()) SimRunner.resume();
      if (btnPause) btnPause.textContent = 'Pause';
    });
  }

  if (hasLaunch) {
    const btnLaunch = UI.addButton(id, 'Lancer', true, () => {
      // Si déjà lancé ou terminé, relancer depuis le début
      SimRunner.trigger('launch');
      btnLaunch.textContent = 'Relancer';
    });
    UI.addButton(id, 'Réinitialiser', false, () => {
      SimRunner.trigger('reset');
      btnLaunch.textContent = 'Lancer';
    });
  }
}

initApp();
