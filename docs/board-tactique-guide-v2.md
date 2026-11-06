# Board Tactique — Guide utilisateur
**Mis à jour :** 2026-09-26  
**Version :** v2.1 (Exercise Builder — Epics 1–5)  
**Langue :** Français

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Démarrage](#démarrage)
3. [Le Dock](#le-dock)
4. [Joueurs](#joueurs)
5. [Assets](#assets)
6. [Trajectoires](#trajectoires)
7. [Animation](#animation)
8. [Bibliothèque](#bibliothèque)
9. [Raccourcis clavier](#raccourcis-clavier)
10. [Modèle de données](#modèle-de-données)
11. [Dépannage](#dépannage)

---

## Vue d'ensemble {#vue-densemble}

Le Board Tactique est un outil de création d'exercices de handball pour tablette et Chromebook. Il permet au coach de :

- Placer des joueurs (équipe A / B, postes, gardien)
- Ajouter des équipements (plots, cônes, haies…)
- Tracer des trajectoires liées à des joueurs (course, passe, tir, croisé, fixation)
- Animer et sauvegarder les exercices dans une bibliothèque locale

### Architecture de l'interface

```
┌─────────────────────────────────────────────────────────────┐
│  SIDEBAR (gauche)        │  CANVAS (centre)                 │
│  Métadonnées exercice    │  Terrain de handball             │
│  Contrôles latéraux      │  Zone de placement et tracé      │
├──────────────────────────┴──────────────────────────────────┤
│  DOCK (bas)                                                  │
│  [Joueurs][Assets][Trajectoires][Animation][Biblio][…]       │
└─────────────────────────────────────────────────────────────┘
```

---

## Démarrage {#démarrage}

L'entrée principale est `startup.html`. Le coach choisit :

| Choix | URL résultante | Comportement |
|-------|---------------|--------------|
| **Nouvelle séance** | `board.html?new=1` | Canvas vierge, aucun exercice chargé |
| **Éditer un exercice** | `board.html?exercise=<id>` | Charge l'exercice depuis la bibliothèque |

> Sans paramètre (`board.html` direct), le dernier exercice sauvegardé est chargé automatiquement.

---

## Le Dock {#le-dock}

Le Dock est la barre d'outils fixée en bas d'écran. Chaque icône ouvre un panel slide-out sur la droite (ou déclenche une action directe).

| Icône | Outil | Comportement |
|-------|-------|-------------|
| 🎮 | **Joueurs** | Ouvre le panel sélection équipe + poste |
| 🎯 | **Assets** | Affiche la grille d'équipements |
| 📍 | **Trajectoires** | Ouvre le panel types de trajectoires |
| ▶️ | **Animation** | Lance/arrête l'animation des trajectoires |
| 📚 | **Bibliothèque** | Ouvre la bibliothèque d'exercices |
| 📋 | **Séance** | Gestion de séance |
| 📅 | **Planning** | Calendrier |
| 🏢 | **Postes** | Accès rapide postes |
| 👁️ | **Vue** | Changer la vue terrain |
| ↶ | **Annuler** | Annuler la dernière action |

**Fermer un panel :** bouton ✕ dans l'en-tête du panel, ou touche Escape.

---

## Joueurs {#joueurs}

### Workflow complet

1. Cliquer l'icône **Joueurs** dans le Dock
2. Dans le panel, sélectionner l'**équipe** (A ou B)
3. Sélectionner le **poste** souhaité
4. Cliquer sur le terrain pour placer le joueur

### Postes disponibles

| Code | Poste | Cap par équipe |
|------|-------|---------------|
| AG | Ailier Gauche | 1 |
| ARG | Arrière Gauche | 1 |
| DC | Demi-Centre | 1 |
| PIV | Pivot | 1 |
| ARD | Arrière Droit | 1 |
| AD | Ailier Droit | 1 |
| G | Gardien | 1 |

**Cap total :** 6 joueurs de champ + 1 gardien par équipe (7 par équipe, 14 au total).

Quand le cap d'un poste est atteint, le bouton correspondant est **désactivé** dans le panel.

### Numérotation automatique

Si le même poste est utilisé par les deux équipes (ex. PIV A et PIV B), les labels sont numérotés : **PIV 1**, **PIV 2**… Le gardien (AG) reste toujours **AG**.

### Déplacer / supprimer un joueur

- **Déplacer** : glisser-déposer le joueur sur le terrain
- **Supprimer** : sélectionner (clic) puis touche `Delete` ou `Backspace`

> La touche Delete ne fonctionne pas si le focus est dans un champ texte (nom, notes…).

---

## Assets {#assets}

### Workflow complet

1. Cliquer l'icône **Assets** dans le Dock
2. La grille d'équipements apparaît au-dessus du Dock
3. Cliquer l'équipement souhaité
4. Cliquer sur le terrain pour le placer
5. Bouton **←** (Retour) pour revenir au Dock

### Équipements disponibles

| Asset | Forme | Couleur |
|-------|-------|---------|
| Ballon | Cercle | Orange |
| Haie | Haie | Bleu |
| Haltère | Haltère | Vert |
| Cible | Anneau | Rouge |
| Swiss Ball | Cercle large | Rose |
| Coupelle | Coupelle | Rose clair |
| Cerceau | Anneau | Cyan |
| Mannequin | Mannequin | Ambre |
| Mur | Rectangle | Violet |
| Plot | Cône | Orange foncé |

Chaque asset affiché sur le terrain montre son **nom complet** en label permanent (pas de troncature).

---

## Trajectoires {#trajectoires}

Les trajectoires sont toujours **liées à un joueur** — il est impossible de tracer une trajectoire libre sans joueur de départ.

### Workflow complet

1. **Placer au moins un joueur** sur le terrain (sinon les boutons sont désactivés)
2. Cliquer l'icône **Trajectoires** dans le Dock
3. Sélectionner le **type** de trajectoire dans le panel
4. **Cliquer sur un joueur placé** pour démarrer le tracé (le joueur devient le point de départ, son `id` est stocké comme `linkedItemId`)
5. Cliquer sur le terrain pour ajouter des waypoints
6. **Double-cliquer** pour terminer la trajectoire

> Si le premier clic ne tombe pas sur un joueur, aucun tracé ne commence — un message de statut invite à cliquer sur un joueur.

### Types de trajectoires

| Type | Style | Couleur | Flèche |
|------|-------|---------|--------|
| **Course** | Pointillés | Bleu clair `#90caf9` | ✅ |
| **Passe** | Pointillés fins | Jaune `#ffd740` | ✅ |
| **Tir** | Trait plein épais | Rouge `#ff5252` | ✅ |
| **Croisé** | Trait plein | Orange `#ff9800` | ✅ + badge ✕ |
| **Fixation** | Pointillés | Violet `#ce93d8` | Badge FIX à l'extrémité |

### Boutons désactivés

Quand **aucun joueur** n'est placé sur le terrain, tous les boutons du panel Trajectoires sont désactivés. Ils se réactivent automatiquement dès qu'un joueur est placé.

### Suppression

Sélectionner une trajectoire (clic dessus) puis `Delete` / `Backspace`.

---

## Animation {#animation}

Le bouton **▶️ Animation** joue les trajectoires tracées dans l'ordre de leurs étapes (badge numéroté au milieu de chaque trajectoire). Les joueurs se déplacent le long de leurs trajectoires liées.

- **Rejouer** : cliquer à nouveau ▶️ (les positions originales sont restaurées avant chaque lecture)
- **Arrêter** : cliquer ▶️ pendant la lecture

---

## Bibliothèque {#bibliothèque}

Le bouton **📚 Bibliothèque** ouvre la liste de tous les exercices sauvegardés.

### Sauvegarder

Bouton **Enregistrer** (en haut de la sidebar) → l'exercice est persisté via l'API locale (`/api/exercises`). Un ID est généré automatiquement à la première sauvegarde. Les sauvegardes suivantes (autosave après chaque action) écrasent le même enregistrement.

### Charger un exercice

Depuis la bibliothèque, cliquer sur un exercice pour le charger dans le board.

### Supprimer un exercice

Bouton de suppression dans la bibliothèque (corbeille).

---

## Raccourcis clavier {#raccourcis-clavier}

| Touche | Action | Contexte |
|--------|--------|---------|
| `Tab` | Naviguer entre les icônes du Dock | Dock visible |
| `Escape` | Fermer le panel ouvert / quitter la grille Assets | Panel ou grille ouverte |
| `Delete` / `Backspace` | Supprimer l'élément sélectionné | Hors champ texte |
| `→ ← ↑ ↓` | Naviguer dans la grille Assets | Grille Assets ouverte |

---

## Modèle de données {#modèle-de-données}

Un exercice sauvegardé a la structure suivante :

```json
{
  "id": "ex_<timestamp>",
  "name": "Nom de l'exercice",
  "category": "offensif",
  "thematique": "Attaque",
  "duree": 15,
  "nbJoueurs": 7,
  "niveau": "-15 ans",
  "notes": "Description...",
  "viewMode": "full",
  "items": [
    {
      "id": "player-<timestamp>",
      "team": "A",
      "post": "PIV",
      "isGoalkeeper": false,
      "displayLabel": "PIV 1",
      "shape": "circle",
      "color": "#...",
      "x": 25.0,
      "y": 10.0,
      "rotation": 0
    }
  ],
  "paths": [
    {
      "id": "path-<timestamp>",
      "kind": "course",
      "color": "#90caf9",
      "step": 0,
      "linkedItemId": "player-<timestamp>",
      "points": [
        { "x": 25.0, "y": 10.0 },
        { "x": 30.0, "y": 15.0 }
      ]
    }
  ],
  "updatedAt": "2026-09-26T..."
}
```

**Champs clés :**
- `items[]` : joueurs ET assets partagent le même tableau ; les joueurs ont `team` non-null
- `paths[].linkedItemId` : référence l'`id` du joueur de départ de la trajectoire
- `paths[].step` : ordre de lecture pour l'animation (badge numéroté)
- Coordonnées `x`/`y` en unités terrain (pas en pixels — indépendantes du viewport)

---

## Dépannage {#dépannage}

**Les boutons Trajectoires sont grisés**  
→ Aucun joueur n'est placé sur le terrain. Placer au moins un joueur via le panel Joueurs.

**Le clic sur le terrain ne démarre pas de trajectoire**  
→ Le premier clic doit tomber précisément sur un joueur (icône). Zoomer si nécessaire ou rapprocher le curseur du centre du joueur.

**Delete supprime un élément inattendu**  
→ Vérifier quel élément est sélectionné (surligné). La suppression au clavier agit sur `selectedItemIndex` — re-cliquer sur le bon élément avant de supprimer.

**Delete déclenché dans un champ texte**  
→ Ne devrait pas arriver — le guard filtre les INPUT/TEXTAREA/SELECT. Si ça arrive, signaler comme bug.

**Le terrain est rogné / ne tient pas dans l'écran**  
→ Le layout utilise `height: 100vh` avec `min-height: 0` sur les enfants de la grille. Si le problème persiste, vérifier que le viewport ne dépasse pas 100vh (ex. barre d'adresse navigateur visible sur mobile).

**La grille Assets apparaît derrière le Dock**  
→ La grille est `position: absolute; bottom: 100%` sur le Dock en mode `assets-mode`. Vérifier que `.dock.assets-mode { overflow: visible }` est bien présent dans `dock.css`.

---

## Changelog

### v2.1 — 2026-09-26 (Exercise Builder — Epics 1–5)

- **Écran de démarrage** (`startup.html`) : Nouvelle séance / Éditer un exercice
- **Layout fixe** : `height: 100vh`, grille CSS, Dock ancré en bas sans overflow
- **Panel Joueurs** : sélection équipe A/B + 7 postes avec caps et numérotation automatique
- **Panel Assets** : grille 10 équipements, labels complets (plus de troncature "S" pour Swiss ball)
- **Panel Trajectoires** : 5 types, désactivés sans joueur, `linkedItemId` sur chaque path créé
- **Guard pointerdown** : trajectoires ne démarrent que sur un joueur existant
- **Modèle de données** : `linkedItemId` ajouté aux paths sauvegardés

### v2.0 — Sprint 4 (Dock UI)

- Dock toolbar (10 icônes)
- Panels slide-out
- Mode Assets (grille toggle)
- Navigation clavier (Tab, Arrows, Escape)
- Canvas reflow responsive (600px–1920px)
