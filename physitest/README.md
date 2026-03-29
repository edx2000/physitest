# PhysiQuest

Simulateurs de physique interactifs pour le lycée (2nde → Terminale).
Déployable sur Netlify sans build, sans dépendances.

---

## Structure

```
physiquest/
├── index.html                  ← Shell HTML minimal (ne pas toucher)
├── netlify.toml                ← Redirects SPA
├── data/
│   └── simulations.json        ← ⭐ SOURCE DE VÉRITÉ : tout le contenu ici
└── src/
    ├── styles/
    │   ├── tokens.css           ← Variables design (couleurs, typo, espacements)
    │   ├── base.css             ← Reset + éléments globaux
    │   ├── layout.css           ← Header, sidebar, main
    │   └── components.css       ← Cards, boutons, métriques, canvas...
    ├── components/
    │   ├── router.js            ← Router hash-based (#home, #sim/pendule...)
    │   ├── ui.js                ← Génère tout le DOM depuis JSON
    │   └── simrunner.js         ← Cycle de vie des simulations
    └── simulations/
        ├── pendule.js           ← Module pendule
        ├── chute.js             ← Module chute libre
        ├── ressort.js           ← Module ressort MHS
        └── projectile.js        ← Module tir parabolique
```

---

## Ajouter une simulation

**Étape 1 — Déclarer dans `data/simulations.json`**

```json
{
  "id": "refraction",
  "category": "optique",
  "title": "Réfraction",
  "subtitle": "Loi de Snell-Descartes",
  "levels": ["2nde", "1ère"],
  "file": "refraction.js",
  "formula": "n₁·sin(θ₁) = n₂·sin(θ₂)",
  "controls": [
    { "id": "n1", "label": "Indice n₁", "unit": "", "min": 1, "max": 2.5, "step": 0.05, "default": 1 },
    { "id": "n2", "label": "Indice n₂", "unit": "", "min": 1, "max": 2.5, "step": 0.05, "default": 1.5 },
    { "id": "theta1", "label": "Angle incident", "unit": "°", "min": 0, "max": 89, "step": 1, "default": 45 }
  ],
  "metrics": [
    { "id": "theta2", "label": "Angle réfracté", "unit": "°", "decimals": 1 }
  ]
}
```

**Étape 2 — Créer `src/simulations/refraction.js`**

```js
SimRunner.register('refraction', {
  init(params) { return {}; },
  computeMetrics(p) {
    const theta2 = Math.asin(p.n1 / p.n2 * Math.sin(p.theta1 * Math.PI / 180)) * 180 / Math.PI;
    return { theta2 };
  },
  tick(state, params, dt) { return state; },
  draw(ctx, W, H, state, p) { /* ... */ },
  actions: {}
});
```

**Étape 3 — Référencer dans `index.html`**

```html
<script src="src/simulations/refraction.js"></script>
```

C'est tout. La sidebar, la home, les contrôles et les métriques sont générés automatiquement.

---

## Ajouter une catégorie

Dans `data/simulations.json`, section `categories` :

```json
{ "id": "ondes", "label": "Ondes", "icon": "〰" }
```

Puis ajouter la variable CSS dans `tokens.css` :

```css
--cat-ondes: #b06cf0;
```

---

## Modifier le design

Tout est dans `src/styles/tokens.css` : couleurs, typo, espacements, tailles.
Modifier une variable = répercussion sur tout le site.

---

## Déployer sur Netlify

1. Glisser le dossier sur [netlify.com/drop](https://app.netlify.com/drop)
2. Ou connecter le repo GitHub et pointer sur la racine `/`
3. Pas de build command, pas de publish directory à configurer

---

## Ajouter une page (ex: formulaire, quiz)

1. Ajouter `<div class="view" data-route="quiz"></div>` dans `index.html`
2. Enregistrer la route dans `app.js` : `Router.register('quiz', () => { ... })`
3. Ajouter le lien dans `ui.js` → `buildSidebar()`
