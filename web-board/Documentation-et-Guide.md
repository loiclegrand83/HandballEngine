# Handball Engine — Documentation & Guide utilisateur

**Version 1.1.0** — Application locale de tableau tactique handball

---

## Sommaire

1. [Vue d'ensemble](#1-vue-densemble)
2. [Lancement](#2-lancement)
3. [Menu d'accueil](#3-menu-daccueil)
4. [Board Tactique](#4-board-tactique)
5. [Tableau Temps mort](#5-tableau-temps-mort)
6. [Page d'explication & Fiche document](#6-page-dexplication--fiche-document)
7. [Bibliothèque d'exercices](#7-bibliothèque-dexercices)
8. [Accès tablette (Android)](#8-accès-tablette-android)
9. [Architecture technique](#9-architecture-technique)

---

## 1. Vue d'ensemble

Handball Engine est un outil local (aucune connexion internet requise) conçu pour les entraîneurs de handball. Il regroupe trois modules :

| Module | Usage |
|---|---|
| **Board Tactique** | Créer et animer des exercices d'entraînement |
| **Temps mort** | Donner des instructions tactiques rapides pendant un match |
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

Au démarrage, `http://localhost:3000` affiche deux cartes :

- **Board Tactique** → ouvre `board.html`
- **Temps mort** → ouvre `timeout.html`

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

Choisir un mode dans la section **Mode**, cliquer successivement les points sur le terrain, puis cliquer **Terminer traj.**.

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

## 5. Tableau Temps mort

Conçu pour une utilisation rapide pendant les 60 secondes d'un temps mort.

### 5.1 Interface

Le terrain occupe **tout l'écran** (vue du dessus, proportions 40m × 20m).  
Une barre de contrôle flottante est fixée en bas de l'écran.

Sur un appareil tactile avec navigateur (ex. Chromebook), le bouton **⛶ Plein écran** masque l'interface du navigateur (barre d'adresse, onglets) pour un usage terrain sans distraction. Cliquer à nouveau (ou `Échap`) pour revenir en mode fenêtré.

### 5.2 Formations automatiques

Sélectionner une formation dans les deux menus déroulants puis cliquer **⟳ Formation auto**.

**Équipe A (attaque, rouge) :**

| Formation | Description |
|---|---|
| 3-3 | 3 arrières + 2 ailiers + 1 pivot + gardien |
| 2-4 | 2 arrières + 4 avants + gardien |
| 2-5 | 2 arrières + 5 avants (sans gardien) |
| 1-6 | 1 meneur + 6 avants (sans gardien) |

**Équipe B (défense, bleu) :**

| Formation | Description |
|---|---|
| 6-0 | 6 défenseurs alignés sur la ligne des 9m |
| 5-1 | 5 défenseurs + 1 avancé |
| 4-2 | 4 défenseurs + 2 avancés |
| 3-3 | 3 défenseurs profonds + 3 avancés |

> Les joueurs sont positionnés aux emplacements réglementaires de chaque système.  
> Changer le menu déroulant repositionne immédiatement l'équipe concernée sans toucher à l'autre.

### 5.3 Déplacer les joueurs

**Appuyer-glisser** directement sur un joueur — aucun mode à activer.  
Les joueurs sont larges pour un confort tactile sur tablette.

### 5.4 Dessiner des flèches

1. Cliquer **✏️ Stylo** pour activer le mode dessin (le bouton s'illumine)
2. Tracer librement sur le terrain — une flèche colorée se forme
   - Rouge pour l'équipe A, Bleu pour l'équipe B
3. Cliquer à nouveau sur **✏️ Stylo** pour revenir au mode déplacement

> **Tap sur une flèche** (hors mode stylo) : supprime cette flèche  
> **✕ Effacer flèches** : supprime toutes les flèches  
> **↺ Réinitialiser** : remet joueurs et flèches à zéro  
> **← Accueil** : retour au menu principal

### 5.5 Utilisation au stylet (tablette/Chromebook tactile)

Le mode Stylo fonctionne aussi bien au doigt qu'au stylet — le stylet apporte simplement plus de précision pour le tracé.

- Pendant un tracé en mode Stylo, tout contact tactile secondaire (ex. paume posée sur l'écran) est **ignoré automatiquement** : seul le pointeur qui a commencé le tracé est pris en compte jusqu'à son relâchement.
- Si le tracé est interrompu par le système (perte de contact, ex. sortie de la zone tactile), la flèche en cours est proprement finalisée plutôt que perdue ou fantôme.
- Le déplacement des joueurs (glisser sans mode Stylo actif) reste utilisable au doigt à tout moment, y compris pendant que l'autre main tient le stylet.

---

## 6. Page d'explication & Fiche document

### 6.1 Ouvrir

Depuis le Board Tactique, cliquer sur **📋 Explication & Points d'attention**.  
La page s'ouvre dans un nouvel onglet avec les snapshots de chaque phase et les descriptions générées automatiquement.

### 6.2 Vue Éditeur

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

### 6.3 Vue Document (fiche imprimable)

Cliquer sur **Vue Document** pour basculer vers la fiche au format A4, structurée comme une fiche HandXPrience :

- Bandeau coloré par catégorie avec titre et badge niveau
- Rangée de snapshots par phase
- Colonne gauche : objectif, mise en place, consignes (auto-générées)
- Colonne droite : réglementations, conseils
- Pied de page sombre : durée, joueurs, gardiens

**Imprimer / Exporter PDF :** `Ctrl+P` ou bouton **🖨 Imprimer** → "Enregistrer en PDF" dans la boîte de dialogue du navigateur.

> **Sauvegarder** depuis la page d'explication : enregistre les annotations dans la bibliothèque associées à l'exercice.

---

## 7. Bibliothèque d'exercices

Cliquer sur **Bibliothèque** dans le Board Tactique.

- **Filtrer** par catégorie via le menu déroulant
- **Charger** : recharge l'exercice complet sur le terrain
- **Supprimer** : efface définitivement l'exercice
- Les exercices sont stockés sous forme de fichiers JSON dans `web-board/bibli/`

---

## 8. Accès tablette (Android)

1. Le PC et la tablette doivent être sur le même réseau Wi-Fi
2. Lancer le serveur sur le PC — l'URL réseau s'affiche dans le terminal (ex: `http://192.168.1.125:3000`)
3. Sur la tablette : ouvrir Chrome et naviguer vers cette URL
4. Menu Chrome (⋮) → **"Ajouter à l'écran d'accueil"** pour installer comme application PWA

> Le module **Temps mort** est particulièrement adapté à la tablette : plein écran, grandes zones tactiles, aucune navigation nécessaire pendant le match.

---

## 9. Architecture technique

| Composant | Technologie | Rôle |
|---|---|---|
| Interface | HTML5 + CSS3 + JS Vanilla | Rendu, interactions |
| Dessin | Canvas API (2D) | Terrain, joueurs, trajectoires, animation |
| Interactions tactiles | Pointer Events API | Souris + tactile unifiés |
| Serveur local | Node.js (sans framework) | Fichiers statiques + API REST exercices |
| Stockage | Fichiers JSON dans `bibli/` | Persistance des exercices |
| PWA | `manifest.json` | Installation sur tablette, mode paysage forcé |
| Sécurité | CSP, X-Frame-Options, path traversal, body limit | Protection du serveur local |

### Fichiers principaux

| Fichier | Rôle |
|---|---|
| `index.html` | Menu d'accueil |
| `board.html` | Interface du board tactique |
| `app.js` | Logique complète du board (dessin, animation, save) |
| `styles.css` | Styles du board |
| `timeout.html` | Tableau tactique temps mort |
| `timeout.js` | Logique du temps mort (terrain, formations, drag, flèches) |
| `timeout.css` | Styles du temps mort |
| `explanation.html` | Page d'explication et fiche document |
| `explanation.css` | Styles de la fiche (A4 + print) |
| `server.js` | Serveur Node.js local sécurisé |
| `manifest.json` | PWA (installation tablette, orientation paysage) |
| `Lancer-Board.sh` | Script de lancement Linux |
| `Handball-Board.desktop` | Raccourci bureau Linux |
| `bibli/` | Dossier des exercices sauvegardés (non versionné) |
