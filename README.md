# Handball Tactical Board

Application web locale pour créer, animer et documenter des exercices tactiques de handball.

---

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Installation](#installation)
- [Lancement](#lancement)
- [Utilisation](#utilisation)
- [Accès tablette](#accès-tablette)
- [Structure du projet](#structure-du-projet)
- [Versioning](#versioning)
- [Sécurité](#sécurité)

---

## Fonctionnalités

### Terrain
- Trois vues : **terrain complet**, **demi-terrain**, **perspective**
- Lignes réglementaires : 6m, 9m (pointillés), 7m, ligne médiane, zone de substitution

### Placement
- **Joueurs** avec numérotation automatique ou **poste handball** (AG, ARG, DC, PIV, ARD, AD)
- **Gardien** avec pose distincte
- **Équipements** : ballon, haie, cible, haltère, swiss ball, coupelle, cerceau, échelle de rythme, mannequin, mur, plot
- **Zone de fixation** : asset visuel dédié (cercle pointillé)

### Trajectoires
| Mode | Couleur | Style | Usage |
|------|---------|-------|-------|
| Course | Bleu clair | Tirets | Déplacement d'un joueur |
| Tir | Rouge | Plein + flèche | Tir au but |
| Passe | Jaune | Tirets fins + flèche | Transmission de balle |
| Croisé | Orange | Plein + ✕ + flèche | Croisement entre joueurs |
| Fixation | Violet | Tirets + point FIX | Fixation d'un défenseur |

- Numérotation des phases (étapes) avec badge
- Liaison entre trajectoires (case à cocher "Lié à la trajectoire précédente")
- Renumérotation automatique des phases après suppression

### Animation
- Lecture séquentielle des phases
- Les joueurs se déplacent le long de leurs trajectoires (course, croisé, fixation)
- Les passes et tirs animent le ballon
- Halo coloré selon le type de trajectoire

### Bibliothèque
- Sauvegarde **explicite** uniquement (bouton "Enregistrer") — aucun exercice non validé ne pollue la bibliothèque
- Chargement, filtrage par catégorie, suppression
- Export / Import JSON

### Page d'explication
- Générée automatiquement depuis le board (bouton "Explication")
- Snapshot de chaque phase
- Détection automatique : postes impliqués, actions (passe, tir, croisé, fixation, pénétration…)
- Champs éditables : description, points d'attention, matériel, système offensif/défensif, secteur de jeu
- Sauvegarde dans la bibliothèque, impression

---

## Installation

### Prérequis
- [Node.js](https://nodejs.org/) (v18 ou supérieur)

### Cloner le dépôt
```bash
git clone https://github.com/loiclegrand83/HandballEngine.git
cd HandballEngine
```

---

## Lancement

### Linux — raccourci bureau
Double-cliquer sur `web-board/Handball-Board.desktop`

### Ligne de commande
```bash
cd web-board
bash Lancer-Board.sh
```

Le serveur démarre sur `http://localhost:3000` et ouvre le navigateur automatiquement.

> **Arrêt** : `Ctrl+C` dans le terminal, ou fermeture de la fenêtre du bureau.

---

## Utilisation

1. **Placer des joueurs** : sélectionner une équipe (A ou B), éventuellement un poste dans la section "Postes", puis cliquer sur le terrain
2. **Dessiner une trajectoire** : choisir un mode (Course, Tir, Passe, Croisé, Fixation), cliquer les points successifs sur le terrain, puis "Terminer traj."
3. **Supprimer** : clic droit sur un joueur ou une trajectoire
4. **Animer** : bouton "▶ Animation"
5. **Enregistrer** : bouton "Enregistrer" — l'exercice apparaît dans la bibliothèque
6. **Page d'explication** : bouton "Explication & Points d'attention"

---

## Accès tablette

Le board est accessible depuis n'importe quel appareil sur le même réseau Wi-Fi.

1. Lancer le serveur sur le PC
2. L'URL réseau s'affiche dans le terminal (ex: `http://192.168.1.125:3000`)
3. Sur la tablette : ouvrir Chrome, naviguer vers cette URL
4. Menu Chrome (⋮) → **"Ajouter à l'écran d'accueil"** pour créer un raccourci PWA

---

## Structure du projet

```
haweb/
├── web-board/
│   ├── server.js          # Serveur Node.js local (port 3000)
│   ├── app.js             # Logique principale du board
│   ├── index.html         # Interface principale
│   ├── explanation.html   # Page de fiche d'exercice
│   ├── styles.css         # Styles du board
│   ├── explanation.css    # Styles de la fiche
│   ├── manifest.json      # PWA manifest
│   ├── assets/
│   │   └── player.png
│   ├── bibli/             # Exercices sauvegardés (JSON) — non versionné
│   ├── Lancer-Board.sh    # Script de lancement Linux
│   └── Handball-Board.desktop  # Raccourci bureau Linux
└── README.md
```

---

## Versioning

### v1.0.0 — 2026-06-06
**Version initiale complète**

#### Ajouts
- Terrain interactif (3 vues : complet, demi, perspective)
- Placement joueurs avec postes handball (AG, ARG, DC, PIV, ARD, AD)
- 5 types de trajectoires : course, tir, passe, croisé, fixation
- Asset "Zone de fixation"
- Animation par phases avec halo coloré selon le type de mouvement
- Bibliothèque d'exercices avec sauvegarde explicite uniquement
- Page d'explication auto-générée : snapshots, détection d'actions, champs éditables
- Renumérotation automatique des phases après suppression
- Serveur Node.js local avec headers de sécurité (CSP, X-Frame-Options, etc.)
- Protection path traversal sur les routes API
- Limite de 1 Mo sur les requêtes POST
- Route `/api/shutdown` restreinte à localhost
- Accès réseau local (tablette) + PWA manifest
- Script de lancement avec libération automatique du port

---

## Sécurité

L'application fonctionne **entièrement en local** — aucune donnée n'est transmise à un service externe.

Mesures en place :
- **Path traversal** bloqué sur le serveur statique et les routes bibli
- **CSP** : `default-src 'self'`, fonts Google autorisés explicitement
- **X-Content-Type-Options** : `nosniff`
- **X-Frame-Options** : `DENY`
- **Limite body** : 1 Mo max sur les POST
- **Shutdown** : route `/api/shutdown` accessible uniquement depuis `127.0.0.1`
