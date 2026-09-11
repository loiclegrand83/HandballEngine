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
| Séances | `/pages/seance.html` | Planification et impression de séances |
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
│   ├── board.html
│   ├── seance.html
│   └── explanation.html
├── src/
│   ├── css/
│   │   ├── styles.css       # Board tactique
│   │   ├── seance.css       # Séances
│   │   └── explanation.css  # Fiche exercice
│   └── js/
│       ├── app.js           # Logique du board
│       └── seance.js        # Logique des séances
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
