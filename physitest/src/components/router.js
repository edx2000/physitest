/**
 * PhysiTest — Router
 * Hash-based router: #home, #sim/pendule, etc.
 * Gère aussi la visibilité de la home vs simulateur.
 */

const Router = (() => {
  const routes = {};
  let currentRoute = null;

  function register(path, handler) {
    routes[path] = handler;
  }

  function navigate(path) {
    window.location.hash = path;
  }

  function resolve() {
    const hash = window.location.hash.slice(1) || 'home';
    const [base, ...params] = hash.split('/');
    const key = Object.keys(routes).find(r => r === base);

    // Désactiver la vue courante
    if (currentRoute) {
      const el = document.querySelector(`.view[data-route="${currentRoute}"]`);
      if (el) el.classList.remove('active');
    }

    if (key && routes[key]) {
      currentRoute = base;
      routes[key](params);

      // Activer la vue correspondante
      const el = document.querySelector(`.view[data-route="${base}"]`);
      if (el) el.classList.add('active');

      // Mettre à jour la sidebar et la nav mobile
      document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.route === hash);
      });

      // Scroll la nav mobile pour rendre l'élément actif visible
      const activeMobile = document.querySelector(`.mobile-nav-item[data-route="${hash}"]`);
      if (activeMobile) {
        activeMobile.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }

      // Gérer la visibilité home/sim dans le header
      const isHome = base === 'home';
      const headerHome = document.getElementById('header-home-actions');
      if (headerHome) headerHome.style.display = isHome ? '' : 'none';

      // Scroll main en haut
      const main = document.getElementById('main');
      if (main) main.scrollTop = 0;
    }
  }

  window.addEventListener('hashchange', resolve);
  // NE PAS résoudre au DOMContentLoaded ici :
  // initApp() est async, les routes ne sont pas encore enregistrées.
  // On expose resolve() pour qu'app.js l'appelle après init.

  return { register, navigate, resolve };
})();
