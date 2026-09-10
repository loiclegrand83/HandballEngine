# Handball Engine — Documentation & Guide utilisateur

**Version 1.1.0** — Application locale de tableau tactique handball

---

## Sommaire

1. [Vue d'ensemble](#1-vue-densemble)
2. [Lancement](#2-lancement)
3. [Menu d'accueil](#3-menu-daccueil)
4. [Board Tactique](#4-board-tactique)
5. [Séances](#5-séances)
6. [Planning](#6-planning)
7. [Page d'explication & Fiche document](#7-page-dexplication--fiche-document)
8. [Bibliothèque d'exercices](#8-bibliothèque-dexercices)
9. [Accès tablette (Android)](#9-accès-tablette-android)
10. [Architecture technique](#10-architecture-technique)

---

## 1. Vue d'ensemble

Handball Engine est un outil local (aucune connexion internet requise) conçu pour les entraîneurs de handball. Il regroupe quatre modules :

| Module | Usage |
|---|---|
| **Board Tactique** | Créer et animer des exercices d'entraînement |
| **Séances** | Construire une feuille de route d'entraînement (blocs d'exercices) |
| **Planning** | Calendrier des entraînements et des matchs, avec résultats |
| **Page d'explication** | Générer une fiche pédagogique imprimable par exercice |

---

## 2. Lancement

### Linux — raccourci bureau
Double-cliquer sur `Handball-Board.desktop` dans le dossier `web-board/`.

### Ligne de commande
```bash
cd web-board
bash Lancer-Board.sh
```

Le serveur démarre sur `http://localhost:3000` et ouvre le navigateur automatiquement.

> **Arrêt :** `Ctrl+C` dans le terminal ou fermeture de la fenêtre du bureau.

---

## 3. Menu d'accueil

Au démarrage, `http://localhost:3000` affiche les cartes des modules disponibles :

- **Board Tactique** → ouvre `pages/board.html`
- **Séances** → ouvre `pages/seance.html`
- **Planning** → ouvre `pages/planning.html`

---

## 4. Board Tactique

### 4.1 Vues du terrain

Trois vues disponibles (barre latérale gauche, section **Vue**) :

| Vue | Description |
|---|---|
| Terrain complet | Vue du dessus, terrain entier 40m × 20m |
| Demi-terrain | Vue du dessus, zone offensive uniquement |
| Perspective | Vue inclinée 3D de la zone de but |

### 4.2 Placer des joueurs

1. Choisir l'**Équipe A** ou **Équipe B** (panneau bas)
2. Optionnel : sélectionner un **poste** dans la section "Postes" (AG, ARG, DC, PIV, ARD, AD) — le joueur sera marqué avec ce poste
3. Cliquer sur le terrain — le joueur apparaît avec un numéro automatique ou son poste

> **Déplacer :** cliquer-glisser un joueur  
> **Supprimer :** clic droit sur un joueur

### 4.3 Postes disponibles

| Abréviation | Poste |
|---|---|
| AG | Ailier Gauche |
| ARG | Arrière Gauche |
| DC | Demi-Centre |
| PIV | Pivot |
| ARD | Arrière Droit |
| AD | Ailier Droit |

### 4.4 Assets disponibles

Sélectionner un asset dans la palette **Haies & Assets** puis cliquer sur le terrain.

| Asset | Description |
|---|---|
| Ballon | Ballon de handball (orange, avec coutures) |
| Haie | Structure verticale — poteaux + barre colorée |
| Haltère | Deux disques dorés + barre centrale noire |
| Cible | Anneaux concentriques rouge/blanc |
| Swiss ball | Cercle coloré |
| Coupelle | Disque vue du dessus avec cavité centrale |
| Cerceau | Anneau épais coloré |
| Échelle de rythme | Grille de barreaux vue du dessus |
| Mannequin | Silhouette tête + corps |
| Mur | Rectangle large avec motif briques |
| Plot | Triangle orange avec bande blanche |
| Zone de fixation | Cercle pointillé violet semi-transparent |

> **Double-clic** sur un asset posé : rotation 90°  
> **Clic droit** : suppression

### 4.5 Trajectoires

Choisir un mode dans la section **Mode**, cliquer successivement les points sur le terrain, puis **double-cliquer** (ou **double-tap** sur tablette) pour terminer le tracé.

| Mode | Couleur | Usage |
|---|---|---|
| Course | Bleu clair (tirets) | Déplacement d'un joueur |
| Tir | Rouge (plein + flèche) | Tir au but |
| Passe | Jaune (tirets + flèche) | Transmission de balle |
| Croisé | Orange (plein + ✕) | Croisement entre deux joueurs |
| Fixation | Violet (tirets + FIX) | Action de fixation défensive |

**Option "Lié à la trajectoire précédente" :** si coché, la trajectoire s'anime en simultané avec la précédente (même phase). Si décoché, elle crée une nouvelle phase séquentielle.

> **Clic droit** sur une trajectoire : suppression  
> La numérotation des phases se recalcule automatiquement après chaque suppression.

### 4.6 Animation

Cliquer sur **▶ Animation** pour lancer la lecture séquentielle des phases.

- Les joueurs se déplacent le long des trajectoires **Course**, **Croisé** et **Fixation**
- Le ballon se déplace le long des trajectoires **Passe** et **Tir**
- Un halo coloré indique le type de mouvement en cours
- **⏹ Arrêter** remet tous les éléments à leur position initiale

### 4.7 Sauvegarder un exercice

1. Renseigner le **Nom** et la **Catégorie** de l'exercice (section "Exercice")
2. Cliquer sur **Enregistrer** — l'exercice est enregistré dans la bibliothèque locale

> Les exercices ne sont jamais sauvegardés automatiquement — seul le bouton "Enregistrer" déclenche la sauvegarde.

### 4.8 Importer / Exporter

- **Export JSON** : télécharge l'exercice courant sous forme de fichier `.json`
- **Choisir un fichier** (import) : charge un fichier `.json` exporté précédemment

---

## 5. Séances

Cliquer sur **Séances** depuis le menu d'accueil, ou **Bibliothèque** puis **Nouvelle séance** depuis le module lui-même.

### 5.1 Informations générales

En haut de l'éditeur : titre, thématique, date, durée totale, coach, objectif de séance. Le champ **Matériel** se remplit automatiquement à partir du matériel utilisé dans les exercices ajoutés.

### 5.2 Construire le déroulé

Utiliser les boutons **+ Échauffement**, **+ Exercice**, **+ Opposition libre**, **+ Retour au calme** pour ajouter des blocs, dans l'ordre voulu.

Chaque bloc **Exercice** permet de choisir un exercice existant dans la bibliothèque du Board Tactique (recherche + filtre par catégorie) ; un aperçu du schéma s'affiche automatiquement. Chaque bloc affiche sa durée, qui contribue à la durée totale de la séance.

### 5.3 Enregistrer et consulter

- **💾 Enregistrer** : sauvegarde la séance dans la bibliothèque des séances
- **Bibliothèque** : liste des séances sauvegardées, chargement ou suppression
- **📄 Vue document** : bascule vers une feuille de route imprimable au format A4, avec **🖨 Imprimer / PDF**

> Les séances sont stockées sous forme de fichiers JSON dans `web-board/data/seances/` (non versionné).

---

## 6. Planning

Cliquer sur **Planning** depuis le menu d'accueil. Le module affiche un calendrier mensuel regroupant les entraînements et les matchs de la saison.

### 6.1 Navigation

Les flèches **‹** / **›** changent de mois, **Aujourd'hui** revient au mois courant. Cliquer sur une case du calendrier ouvre directement le formulaire de création d'un événement à cette date.

### 6.2 Ajouter un entraînement

Bouton **+ Entraînement** : titre, heure, notes libres, et un lien optionnel vers une **séance** créée dans le module Séances — pratique pour retrouver rapidement la feuille de route du jour depuis le planning.

### 6.3 Ajouter un match

Bouton **+ Match** : adversaire, heure, domicile ou extérieur, score (une fois joué) et notes. Le calendrier affiche directement le score sur la case du jour, avec un liseré vert (victoire), rouge (défaite) ou neutre (match à venir / nul).

### 6.4 Modifier ou supprimer

Cliquer sur un événement existant (dans une case du calendrier) rouvre le formulaire pré-rempli, avec un bouton **Supprimer**.

> Les événements sont stockés sous forme de fichiers JSON dans `web-board/data/planning/` (non versionné).

---

## 7. Page d'explication & Fiche document

### 7.1 Ouvrir

Depuis le Board Tactique, cliquer sur **📋 Explication & Points d'attention**.  
La page s'ouvre dans un nouvel onglet avec les snapshots de chaque phase et les descriptions générées automatiquement.

### 7.2 Vue Éditeur

Chaque phase dispose de :
- Un snapshot du terrain à cet instant
- Une description auto-générée (postes détectés, actions identifiées)
- Un champ **Points d'attention** éditable librement

La section **Informations pour la fiche document** (repliable) permet de renseigner :

| Champ | Description |
|---|---|
| Objectif | But pédagogique de l'exercice |
| Mise en place | Organisation du terrain, nombre de groupes |
| Consignes réglementaires | Règles spécifiques à respecter |
| Conseils coach | Points d'attention pour l'entraîneur |
| Durée | En minutes |
| Nombre de joueurs | Total |
| Nombre de gardiens | Optionnel |
| Niveau | Tag de niveau (Débutant / Intermédiaire / Avancé / Elite) |

### 7.3 Vue Document (fiche imprimable)

Cliquer sur **Vue Document** pour basculer vers la fiche au format A4, structurée comme une fiche HandXPrience :

- Bandeau coloré par catégorie avec titre et badge niveau
- Rangée de snapshots par phase
- Colonne gauche : objectif, mise en place, consignes (auto-générées)
- Colonne droite : réglementations, conseils
- Pied de page sombre : durée, joueurs, gardiens

**Imprimer / Exporter PDF :** `Ctrl+P` ou bouton **🖨 Imprimer** → "Enregistrer en PDF" dans la boîte de dialogue du navigateur.

> **Sauvegarder** depuis la page d'explication : enregistre les annotations dans la bibliothèque associées à l'exercice.

---

## 8. Bibliothèque d'exercices

Cliquer sur **Bibliothèque** dans le Board Tactique.

- **Filtrer** par catégorie via le menu déroulant
- **Charger** : recharge l'exercice complet sur le terrain
- **Supprimer** : efface définitivement l'exercice
- Les exercices sont stockés sous forme de fichiers JSON dans `web-board/bibli/`

---

## 9. Accès tablette (Android)

1. Le PC et la tablette doivent être sur le même réseau Wi-Fi
2. Lancer le serveur sur le PC — l'URL réseau s'affiche dans le terminal (ex: `http://192.168.1.125:3000`)
3. Sur la tablette : ouvrir Chrome et naviguer vers cette URL
4. Menu Chrome (⋮) → **"Ajouter à l'écran d'accueil"** pour installer comme application PWA

---

## 10. Architecture technique

| Composant | Technologie | Rôle |
|---|---|---|
| Interface | HTML5 + CSS3 + JS Vanilla | Rendu, interactions |
| Dessin | Canvas API (2D) | Terrain, joueurs, trajectoires, animation |
| Interactions tactiles | Pointer Events API | Souris + tactile unifiés |
| Serveur local | Node.js (sans framework) | Fichiers statiques + API REST (exercices, séances, planning) |
| Stockage | Fichiers JSON dans `data/bibli/`, `data/seances/`, `data/planning/` | Persistance des exercices, séances et événements du planning |
| PWA | `manifest.json` | Installation sur tablette, mode paysage forcé |
| Sécurité | CSP, X-Frame-Options, path traversal, body limit | Protection du serveur local |

### Fichiers principaux

| Fichier | Rôle |
|---|---|
| `index.html` | Menu d'accueil |
| `pages/board.html` | Interface du board tactique |
| `src/js/app.js` | Logique complète du board (dessin, animation, save) |
| `src/css/styles.css` | Styles du board |
| `pages/seance.html` | Éditeur de séances (blocs, bibliothèque, vue document) |
| `src/js/seance.js` | Logique des séances (blocs, matériel consolidé, fiche imprimable) |
| `src/css/seance.css` | Styles des séances |
| `pages/planning.html` | Calendrier des entraînements et matchs |
| `src/js/planning.js` | Logique du planning (calendrier, événements, liaison séance) |
| `src/css/planning.css` | Styles du planning |
| `pages/explanation.html` | Page d'explication et fiche document |
| `src/css/explanation.css` | Styles de la fiche (A4 + print) |
| `server.js` | Serveur Node.js local sécurisé |
| `manifest.json` | PWA (installation tablette, orientation paysage) |
| `Lancer-Board.sh` | Script de lancement Linux |
| `Handball-Board.desktop` | Raccourci bureau Linux |
| `data/bibli/` | Dossier des exercices sauvegardés (non versionné) |
| `data/seances/` | Dossier des séances sauvegardées (non versionné) |
| `data/planning/` | Dossier des événements du planning (non versionné) |
