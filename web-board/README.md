# Handball Engine

Plateforme d'entraînement et d'analyse tactique pour le handball, conçue pour fonctionner sur tablette ou Chromebook en condition terrain.

## Démarrage

```bash
node server.js
```

Le serveur démarre sur `http://localhost:3000` et ouvre automatiquement le navigateur.

## Pages

| Page | URL | Description |
|---|---|---|
| Accueil | `/` | Menu principal |
| Démarrage | `/pages/startup.html` | Nouvelle séance ou éditer un exercice existant |
| Board Tactique | `/pages/board.html` | Création et animation d'exercices |
| Séances | `/pages/seance.html` | Planification et impression de séances |
| Explication | `/pages/explanation.html` | Fiche pédagogique d'un exercice (vue éditeur + vue document imprimable) |
| Planning | `/pages/planning.html` | Calendrier et planification des séances |

## Board Tactique

### Flux de démarrage

`startup.html` est le point d'entrée : le coach choisit entre **Nouvelle séance** (board vierge, `?new=1`) ou **Éditer un exercice** (charge un exercice existant depuis la bibliothèque, `?exercise=<id>`).

### Fonctionnalités

- **Dock toolbar** (bas d'écran) : accès rapide aux outils via icônes
- **Joueurs** : sélection équipe (A/B) + poste (AG, ARG, DC, PIV, ARD, AD, Gardien) dans le panel Dock ; placement sur terrain par clic ; cap automatique (6 joueurs de champ + 1 gardien par équipe) ; numérotation automatique des postes répétés (PIV 1, PIV 2…)
- **Assets** : grille d'équipements (Ballon, Haie, Haltère, Cible, Swiss Ball, Coupelle, Cerceau, Mannequin, Mur, Plot) ; placement sur terrain par clic
- **Trajectoires** : 5 types (Course, Passe, Tir, Croisé, Fixation) dans le panel Dock ; toujours liées à un joueur placé (clic sur le joueur pour démarrer) ; boutons désactivés si aucun joueur présent ; tracé multi-waypoints, double-clic pour terminer
- **Visualisation** : trajectoires codées par couleur et style de ligne (pointillés/plein) ; flèches de direction ; badges numérotés d'étape
- **Animation** des trajectoires
- Vues : terrain complet, demi-terrain, perspective
- Sauvegarde dans la bibliothèque (API locale JSON via le serveur)
- Export / import JSON
- Fiche d'exercice avec vue document imprimable (A4)

## Séances

- Éditeur de séance : titre, date, thématique, coach, objectif ; durée totale calculée automatiquement
- Blocs nommés (texte libre) réordonnables, chacun contenant un ou plusieurs Ateliers réordonnables
- Ateliers choisis depuis la bibliothèque (filtre par Thématique + recherche), snapshottés à l'ajout
- Notes coach spécifiques par bloc
- Matériel consolidé automatiquement depuis tous les Ateliers de la séance
- **Vue document imprimable (A4)** : grille compacte multi-ateliers, saut de page automatique, zone d'annotation pour stylet tablette
- Export PDF via le navigateur (Imprimer → Enregistrer en PDF)
- Bibliothèque de séances avec historique trié par date

## Architecture

```
web-board/
├── index.html          # Page d'accueil (3 modules)
├── server.js           # Serveur HTTP local (port 3000)
├── pages/
│   ├── startup.html        # Écran de démarrage (nouvelle séance / éditer)
│   ├── board.html          # Board tactique
│   ├── seance.html         # Séances
│   ├── planning.html       # Planning
│   └── explanation.html    # Fiche exercice
├── src/
│   ├── css/
│   │   ├── design-tokens.css   # Variables CSS globales
│   │   ├── styles.css          # Board tactique (canvas + layout)
│   │   ├── dock.css            # Dock toolbar
│   │   ├── panel.css           # Panels slide-out
│   │   ├── assets-grid.css     # Grille assets
│   │   ├── sidebar.css         # Sidebar
│   │   ├── seance.css          # Séances
│   │   ├── planning.css        # Planning
│   │   └── explanation.css     # Fiche exercice
│   └── js/
│       ├── app.js              # Logique du board (canvas, state, placement)
│       ├── dock.js             # Dock toolbar + panels (Joueurs, Assets, Trajectoires…)
│       ├── canvas-reflow.js    # Redimensionnement canvas
│       ├── keyboard-nav.js     # Navigation clavier
│       ├── seance.js           # Logique des séances
│       └── planning.js         # Logique du planning
├── assets/             # SVG joueurs et icônes
└── data/
    ├── bibli/          # Exercices sauvegardés (JSON)
    └── seances/        # Séances sauvegardées (JSON)
```

## Design

**Data Sport × Terrain Brut** — noir charbon, jaune terrain (`#f5c400`), vert data (`#00e676`), violet planification (`#b97fff`).  
Typographies : **Bebas Neue** (titres), **Barlow Condensed** (boutons/labels), **DM Mono** (données/code).  
Zéro glassmorphism — surfaces opaques, bordures fines solides, rail coloré vertical comme signature visuelle.

## Sécurité

- Tout fonctionne localement, aucune donnée envoyée à l'extérieur.
- Content Security Policy configurée dans `server.js`.
- Accès réseau local uniquement (LAN).
