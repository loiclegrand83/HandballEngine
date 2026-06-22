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
| Board Tactique | `/pages/board.html` | Création et animation d'exercices |
| Temps Mort | `/pages/timeout.html` | Instructions tactiques rapides pendant le match |
| Explication | `/pages/explanation.html` | Fiche pédagogique d'un exercice (vue éditeur + vue document imprimable) |

## Board Tactique

- Palette d'assets : joueurs, gardien, équipements (cônes, plots, mannequins, haies, haltères, cerceaux, échelles…)
- Vues : terrain complet, demi-terrain, perspective
- Modes de tracé : course, tir, passe, croisé, fixation
- Animation des trajectoires
- Liaison de trajectoires (option "Lié à la trajectoire précédente")
- Sauvegarde locale (bibliothèque JSON via le serveur)
- Export / import JSON
- Fiche d'exercice avec vue document imprimable (A4)

## Temps Mort

- Terrain plein écran
- Formations attaque et défense configurables (3-3, 5-1, 6-0…)
- Positionnement automatique des joueurs
- Mode stylo pour annoter en direct
- Effacement des flèches en un clic

## Architecture

```
web-board/
├── index.html          # Page d'accueil
├── server.js           # Serveur HTTP local (port 3000)
├── pages/
│   ├── board.html
│   ├── timeout.html
│   └── explanation.html
├── src/
│   ├── css/
│   │   ├── styles.css       # Board tactique
│   │   ├── timeout.css      # Temps mort
│   │   └── explanation.css  # Fiche exercice
│   └── js/
│       ├── app.js           # Logique du board
│       └── timeout.js       # Logique du temps mort
├── assets/             # SVG joueurs et icônes
└── data/bibli/         # Exercices sauvegardés (JSON)
```

## Design

**Data Sport × Terrain Brut** — noir charbon, jaune terrain (`#f5c400`), vert data (`#00e676`).  
Typographies : **Bebas Neue** (titres), **Barlow Condensed** (boutons/labels), **DM Mono** (données/code).  
Zéro glassmorphism — surfaces opaques, bordures fines solides, rail coloré vertical comme signature visuelle.

## Sécurité

- Tout fonctionne localement, aucune donnée envoyée à l'extérieur.
- Content Security Policy configurée dans `server.js`.
- Accès réseau local uniquement (LAN).
