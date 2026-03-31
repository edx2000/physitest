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
    setHomeVisible(true);
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
    setHomeVisible(false);
  });

  Router.register('about', () => {
    SimRunner.stop();
    setHeaderContext(null);
    setHomeVisible(false);
    buildAboutPage();
  });

  Router.register('support', () => {
    SimRunner.stop();
    setHeaderContext(null);
    setHomeVisible(false);
    buildSupportPage();
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

function buildAboutPage() {
  const view = document.querySelector('.view[data-route="about"]');
  if (!view) return;
  view.innerHTML = `
    <div style="max-width:720px; padding: var(--sp-6) 0;">
      <h2 style="font-family:var(--font-display);font-size:1.8rem;margin-bottom:var(--sp-3)">À propos de PhysiTest</h2>
      <p style="color:var(--text-secondary);font-size:0.95rem;line-height:1.75;margin-bottom:var(--sp-5)">
        PhysiTest est un outil pédagogique gratuit de simulation physique, conçu pour les élèves de lycée (2nde, 1ère, Terminale) et leurs enseignants. L'objectif : rendre la physique concrète et intuitive grâce à des animations interactives en temps réel.
      </p>
      <h3 style="font-family:var(--font-display);font-size:1.1rem;margin-bottom:var(--sp-3)">Pourquoi PhysiTest ?</h3>
      <p style="color:var(--text-secondary);font-size:0.9rem;line-height:1.7;margin-bottom:var(--sp-4)">
        Comprendre la physique passe par l'expérimentation. PhysiTest permet de modifier les paramètres en direct — longueur d'un pendule, hauteur de chute, raideur d'un ressort — et d'observer immédiatement l'effet sur le mouvement, les graphiques et les grandeurs calculées.
      </p>
      <h3 style="font-family:var(--font-display);font-size:1.1rem;margin-bottom:var(--sp-3)">Simulations disponibles</h3>
      <ul style="color:var(--text-secondary);font-size:0.9rem;line-height:1.8;padding-left:var(--sp-5);margin-bottom:var(--sp-4)">
        <li><strong style="color:var(--text-primary)">Pendule simple</strong> — période, isochronisme, énergie mécanique, espace des phases</li>
        <li><strong style="color:var(--text-primary)">Chute libre</strong> — MRUV, conservation de l'énergie, effet de la pesanteur sur différentes planètes</li>
        <li><strong style="color:var(--text-primary)">Oscillateur masse-ressort</strong> — mouvement harmonique simple, loi de Hooke</li>
        <li><strong style="color:var(--text-primary)">Tir parabolique</strong> — décomposition du mouvement, portée maximale</li>
      </ul>
      <h3 style="font-family:var(--font-display);font-size:1.1rem;margin-bottom:var(--sp-3)">Technologie</h3>
      <p style="color:var(--text-secondary);font-size:0.9rem;line-height:1.7;margin-bottom:var(--sp-4)">
        Site statique 100% JavaScript — aucun serveur, aucune donnée personnelle collectée. Les simulations tournent directement dans votre navigateur via l'API Canvas HTML5. Compatible avec tous les navigateurs modernes, optimisé pour ordinateur.
      </p>
      <h3 style="font-family:var(--font-display);font-size:1.1rem;margin-bottom:var(--sp-3)">Programme scolaire couvert</h3>
      <p style="color:var(--text-secondary);font-size:0.9rem;line-height:1.7;margin-bottom:var(--sp-5)">
        PhysiTest couvre les chapitres de mécanique du programme de physique-chimie lycée : mouvements rectilignes uniformes et uniformément accélérés, oscillateurs, lois de Newton, énergie cinétique et potentielle, conservation de l'énergie mécanique.
      </p>
      <div style="background:var(--bg-surface);border:1px solid var(--border-dim);border-radius:var(--radius-lg);padding:var(--sp-5);">
        <p style="font-size:0.82rem;color:var(--text-muted);line-height:1.6">
          PhysiTest est un projet indépendant, gratuit et sans publicité intrusive. Si vous l'utilisez régulièrement en classe ou pour vos révisions, vous pouvez <button onclick="Router.navigate('support')" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:inherit;text-decoration:underline;">soutenir son développement</button>.
        </p>
      </div>
    </div>
  `;
}

function buildSupportPage() {
  const view = document.querySelector('.view[data-route="support"]');
  if (!view) return;
  view.innerHTML = `
    <div style="max-width:560px; padding: var(--sp-6) 0;">
      <h2 style="font-family:var(--font-display);font-size:1.8rem;margin-bottom:var(--sp-2)">Soutenir PhysiTest</h2>
      <p style="color:var(--text-secondary);font-size:0.9rem;line-height:1.7;margin-bottom:var(--sp-6)">
        PhysiTest est gratuit et sans publicité. Si cet outil vous est utile, un petit coup de pouce aide à financer l'hébergement et le développement de nouvelles simulations.
      </p>
      <div style="display:flex;flex-direction:column;gap:var(--sp-3);margin-bottom:var(--sp-6)">
        ${[
          { label: '☕ Offrir un café', amount: '3', desc: 'Un merci symbolique' },
          { label: '🍕 Offrir une pizza', amount: '10', desc: 'Soutien apprécié' },
          { label: '🚀 Grand soutien', amount: '25', desc: 'Contribue vraiment au projet' },
        ].map(tier => `
          <div class="support-tier" onclick="selectTier(this, '${tier.amount}')">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div>
                <div style="font-weight:500;font-size:0.95rem">${tier.label}</div>
                <div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px">${tier.desc}</div>
              </div>
              <div style="font-family:var(--font-mono);font-size:1.3rem;font-weight:600;color:var(--accent)">${tier.amount} €</div>
            </div>
          </div>
        `).join('')}
        <div class="support-tier" style="display:flex;align-items:center;gap:var(--sp-3)">
          <span style="font-size:0.9rem;color:var(--text-secondary);white-space:nowrap">Autre montant :</span>
          <input type="number" id="custom-amount" min="1" step="1" placeholder="€"
            style="width:80px;padding:8px 10px;background:var(--bg-raised);border:1px solid var(--border-med);border-radius:var(--radius-sm);color:var(--text-primary);font-family:var(--font-mono);font-size:1rem;outline:none;"
            oninput="document.querySelectorAll('.support-tier').forEach(t=>t.classList.remove('selected'))">
        </div>
      </div>
      <button onclick="handleDonation()" style="width:100%;padding:14px;background:var(--accent);border:none;border-radius:var(--radius-md);color:#fff;font-size:1rem;font-weight:600;cursor:pointer;font-family:var(--font-body);transition:opacity 0.12s" onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
        Soutenir →
      </button>
      <p style="font-size:0.75rem;color:var(--text-muted);margin-top:var(--sp-3);text-align:center">
        Paiement sécurisé — Intégration Stripe à venir
      </p>
      <div id="support-confirm" style="display:none;margin-top:var(--sp-5);padding:var(--sp-4);background:var(--green-dim);border:1px solid rgba(45,212,160,0.25);border-radius:var(--radius-md);text-align:center">
        <div style="font-size:1.5rem;margin-bottom:6px">🎉</div>
        <div style="font-weight:500;color:var(--green);margin-bottom:4px">Merci pour votre soutien !</div>
        <div style="font-size:0.82rem;color:var(--text-secondary)">Le paiement réel sera disponible prochainement via Stripe.</div>
      </div>
    </div>
  `;
}

function selectTier(el, amount) {
  document.querySelectorAll('.support-tier').forEach(t => t.classList.remove('selected'));
  el.classList.add('selected');
  const inp = document.getElementById('custom-amount');
  if (inp) inp.value = '';
}

function handleDonation() {
  const selected = document.querySelector('.support-tier.selected');
  const customInp = document.getElementById('custom-amount');
  const amount = selected
    ? selected.querySelector('[style*="font-mono"]')?.textContent?.replace('€','').trim()
    : customInp?.value;
  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) < 1) {
    alert('Veuillez choisir ou saisir un montant.');
    return;
  }
  const confirm = document.getElementById('support-confirm');
  if (confirm) confirm.style.display = '';
}

function setHomeVisible(visible) {
  // Masque le contenu de la home (hero + grille de cards)
  // La vue elle-même est gérée par le router (display:none/block)
  const hero = document.querySelector('.home-hero');
  const grid = document.querySelector('.sim-grid');
  const display = visible ? '' : 'none';
  if (hero) hero.style.display = display;
  if (grid) grid.style.display = display;
}

initApp();
