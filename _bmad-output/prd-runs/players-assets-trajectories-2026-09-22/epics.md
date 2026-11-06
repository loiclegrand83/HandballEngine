---
stepsCompleted: [1, 2, 3]
inputDocuments: ['_bmad-output/prd-runs/players-assets-trajectories-2026-09-22/prd.md', '_bmad-output/prd-runs/players-assets-trajectories-2026-09-22/ARCHITECTURE-SPINE.md']
---

# Players, Assets & Trajectories - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for the Players, Assets & Trajectories Exercise Builder feature, decomposing requirements from the PRD and Architecture Spine into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1.1: Le coach ouvre Board Tactique et voit un écran de démarrage avec deux options : "Nouvelle Séance" (crée une séance vide) et "Éditer un exercice" (charge un exercice existant de la collection).
FR1.2: En mode création/édition, le coach est en "Exercise Builder" : header affiche nom exercice + contexte séance, Dock/Sidebar actifs pour sélection joueur/asset/trajectoire, terrain centré et maximisé, bouton Save visible.
FR2.1: Le coach sélectionne Équipe A/B + un Poste (AG, ARG, DC, PIV, ARD, AD, Demi) via Dock/Sidebar. Limite: 6 joueurs de champ + 1 gardien par équipe (max 7 par équipe, 14 total). Le coach peut sélectionner un même poste plusieurs fois (ex: 2 pivots, pas de demi) — aucune formation standard n'est imposée.
FR2.2: Après sélection Équipe+Poste, le coach clique sur le terrain pour placer le joueur à cet endroit. Le joueur apparaît avec un badge de poste. Placements multiples possibles (ex: 2e pivot). Cliquer sur un joueur déjà placé permet de le déplacer ou le supprimer.
FR2.3: Chaque joueur affiché montre : label de poste (AG, DC, PIV...), couleur d'équipe (distincte A vs B), numéro de position si applicable (ex: "PIV 1", "PIV 2").
FR3.1: Le coach sélectionne un type d'asset (Plots, Cônes, Haies, Cibles, Swiss Balls, Coupelles, Cerceaux, Échelles, Mannequins, Murs, Zones, etc.) via Dock/Sidebar, puis clique sur le terrain pour le placer. Placements multiples possibles (ex: 5 plots en ligne).
FR3.2: Chaque asset affiché montre une icône/symbole (plot = cercle, cône = triangle, etc.) et un label au survol (optionnel).
FR4.1: Le coach dessine des trajectoires après avoir placé les joueurs : sélectionne un type (Course, Passe, Tir, Croisé, Fixation) + un joueur lié, puis dessine sur le terrain (ex: "Passe + DC" → trace une ligne du DC vers un autre joueur).
FR4.2: Les trajectoires sont dessinées comme des lignes/flèches colorées, montrant départ (joueur) et chemin/fin. Plusieurs trajectoires possibles sur le même exercice. Trajectoires labellisées/codées par couleur selon le type.
FR5.1: Le coach sélectionne la vue du terrain (Demi-terrain ou Terrain Complet) au démarrage de la séance (s'applique à toute la séance ou par exercice — à trancher).
FR5.2: Le terrain reste centré et maximisé ; aucun Dock/Sidebar n'obscurcit le terrain ; joueurs/assets/trajectoires visibles sans scroll.
FR6.1: Le coach finalise l'exercice via le bouton "Save Exercise", nomme l'exercice (ou nom auto), sauvegardé dans la collection (récupérable via "Éditer un exercice").
FR6.2: Les données de l'exercice incluent : liste des joueurs (équipe, poste, position), liste des assets (type, position), liste des trajectoires (type, joueur lié, chemin dessiné), vue du terrain (demi/complet), timestamp + nom coach (optionnel).

### NonFunctional Requirements

NFR1: Placement joueur : réponse au clic <100ms (feedback visuel instantané).
NFR2: Placement asset : réponse au clic <100ms.
NFR3: Dessin de trajectoire : fluide à 60fps pendant le glissement (drag).
NFR4: Pas de lag canvas avec 20+ éléments à l'écran (joueurs/assets/trajectoires).
NFR5: Contrôles tactiles ≥44px (support tablette).
NFR6: Utilisabilité tablette : Asus C425T (1024×600px) pleinement fonctionnel, sans scroll horizontal.
NFR7: Dock + Sidebar responsive tablette + desktop (design hérité du Sprint Dock UI v1).
NFR8: Terrain scale au viewport disponible sans obscurcir les contrôles.
NFR9: Sauvegarde locale (localStorage) ; pas de perte de données au refresh du navigateur.
NFR10: Undo/Redo basique — différé à v2 (hors scope v1, cf. Spine AD-11).

### Additional Requirements

- Paradigme Hybrid Rendering : canvas terrain statique (rendu une fois) + couche HTML overlay dynamique (joueurs/assets/trajectoires en `<div>` positionnés en absolute). (Spine AD-2, `[ADOPTED]`)
- Mapping de coordonnées : clic canvas-relatif → position overlay HTML (mapping 1:1, `canvas.getBoundingClientRect()`). (Spine AD-8, `[ADOPTED]`)
- Layout UI : Dock (bottom, 64px, menu déroulant "Joueurs / Assets / Trajectoires") + Sidebar (gauche, responsive 120–220px) toujours visibles — pas d'auto-hide. (Spine AD-3, AD-4, `[ADOPTED]`)
- Modèle de données strict pour Player/Asset/Trajectory (JSON sérialisable, cf. Spine AD-6) — id, equipe/poste/position pour Player ; id/type/position pour Asset ; id/type/linked_player_id/path pour Trajectory.
- Persistance : localStorage en primaire + export/import manuel vers GitHub (pas d'auto-sync). (Spine AD-7, `[ADOPTED]`)
- Grid layout CSS hérité de Dock UI v1 : `grid-template-columns: [sidebar] 1fr; grid-template-rows: 1fr 64px; grid-template-areas: "sidebar canvas" "dock dock"`. (Spine AD-10, `[ADOPTED]`)
- Flux d'interaction standardisés : placement (clic après sélection), déplacement (différé v1.1/v2), suppression (double-clic ou touche Delete), trajectoires (clic+glisser polyline). (Spine AD-9, `[ADOPTED]`)
- **[OPEN]** Choix final du framework (React vs Vue) — décidé au Sprint 1, n'affecte pas la structure des epics/stories.
- **[OPEN]** Vue terrain (demi/complet) : par séance ou par exercice — à clarifier avant Epic 1.

### UX Design Requirements

Aucun document UX dédié séparé (bmad-ux non exécuté sur cette feature). Les éléments UX pertinents sont capturés dans les FR ci-dessus (FR1 écran démarrage, FR2-FR4 flux de sélection/placement, FR5 configuration terrain) et dans la Spine (AD-3, AD-4, AD-10 pour layout Dock/Sidebar/Canvas).

### FR Coverage Map

FR1.1: Epic 1 - Écran de démarrage (Nouvelle Séance / Éditer exercice)
FR1.2: Epic 1 - Mode Exercise Builder (layout, header, save button)
FR5.1: Epic 1 - Sélection vue terrain (demi/complet)
FR5.2: Epic 1 - Terrain centré et maximisé
FR2.1: Epic 2 - Sélection Équipe + Poste
FR2.2: Epic 2 - Placement joueur sur terrain
FR2.3: Epic 2 - Feedback visuel joueur (label, couleur, numéro)
FR3.1: Epic 3 - Sélection et placement d'assets
FR3.2: Epic 3 - Feedback visuel asset (icône, label)
FR4.1: Epic 4 - Sélection type trajectoire + joueur lié, dessin
FR4.2: Epic 4 - Visualisation trajectoire (ligne/flèche, couleur)
FR6.1: Epic 5 - Sauvegarde et finalisation exercice
FR6.2: Epic 5 - Modèle de données exercice complet

## Epic List

### Epic 1: Exercise Builder — Fondations & Configuration Terrain
Le coach démarre une séance ou édite un exercice existant, entre en mode Exercise Builder avec Dock/Sidebar/Canvas en place, et configure la vue du terrain (demi/complet). Le terrain reste centré et maximisé.
**FRs covered:** FR1.1, FR1.2, FR5.1, FR5.2

### Epic 2: Placement des Joueurs
Le coach sélectionne équipe + poste et place librement jusqu'à 7 joueurs par équipe sur le terrain, avec déplacement/suppression et feedback visuel clair (label, couleur, numéro).
**FRs covered:** FR2.1, FR2.2, FR2.3

### Epic 3: Placement des Assets
Le coach sélectionne un type d'asset (plots, cônes, haies...) et le place librement sur le terrain pour définir les délimitations, avec feedback visuel (icône, label).
**FRs covered:** FR3.1, FR3.2

### Epic 4: Trajectoires Liées aux Joueurs
Le coach dessine des trajectoires (course, passe, tir, croisé, fixation) toujours liées à un joueur placé, visualisées comme lignes/flèches colorées et codées par type.
**FRs covered:** FR4.1, FR4.2

### Epic 5: Sauvegarde & Collection d'Exercices
Le coach finalise et sauvegarde l'exercice (joueurs, assets, trajectoires, vue terrain) dans sa collection locale, récupérable plus tard via "Éditer un exercice".
**FRs covered:** FR6.1, FR6.2

## Epic 1: Exercise Builder — Fondations & Configuration Terrain

Le coach démarre une séance ou édite un exercice existant, entre en mode Exercise Builder avec Dock/Sidebar/Canvas en place, et configure la vue du terrain (demi/complet). Le terrain reste centré et maximisé.
**FRs covered:** FR1.1, FR1.2, FR5.1, FR5.2

### Story 1.1: Écran de démarrage — Nouvelle Séance ou Éditer un exercice

As a coach,
I want voir un écran de démarrage avec les options "Nouvelle Séance" et "Éditer un exercice",
So that je choisis rapidement de créer ou reprendre mon travail.

**Acceptance Criteria:**

**Given** j'ouvre Board Tactique
**When** l'application charge
**Then** je vois un écran de démarrage avec deux boutons : "Nouvelle Séance" et "Éditer un exercice"
**And** cliquer "Nouvelle Séance" crée une séance vide et m'amène en mode Exercise Builder
**And** cliquer "Éditer un exercice" affiche la liste des exercices de ma collection, sélectionner un exercice le charge en mode Exercise Builder

### Story 1.2: Mode Exercise Builder — Layout Dock/Sidebar/Canvas

As a coach,
I want que le mode Exercise Builder affiche un header (nom exercice + contexte séance), le Dock, la Sidebar et le terrain centré,
So that j'ai tous mes outils visibles sans avoir à naviguer.

**Acceptance Criteria:**

**Given** je suis en mode Exercise Builder (nouvelle séance ou édition)
**When** l'écran s'affiche
**Then** le header montre le nom de l'exercice et le contexte de la séance
**And** le Dock (bottom, 64px) et la Sidebar (gauche, responsive) sont visibles en permanence
**And** le terrain canvas est centré et maximise l'espace restant
**And** un bouton "Save Exercise" est visible

### Story 1.3: Sélection de la vue terrain (Demi-terrain / Terrain Complet)

As a coach,
I want choisir entre Demi-terrain et Terrain Complet au démarrage,
So that je configure le terrain adapté à mon exercice.

**Acceptance Criteria:**

**Given** je suis en mode Exercise Builder
**When** je sélectionne "Demi-terrain" ou "Terrain Complet" dans la Sidebar
**Then** le canvas affiche la vue correspondante
**And** le terrain reste centré et maximisé, sans être obscurci par le Dock/Sidebar
**And** aucun scroll n'est nécessaire pour voir l'intégralité du terrain choisi

## Epic 2: Placement des Joueurs

Le coach sélectionne équipe + poste et place librement jusqu'à 7 joueurs par équipe sur le terrain, avec déplacement/suppression et feedback visuel clair (label, couleur, numéro).
**FRs covered:** FR2.1, FR2.2, FR2.3

### Story 2.1: Sélection Équipe + Poste

As a coach,
I want sélectionner une Équipe (A ou B) et un Poste (AG, ARG, DC, PIV, ARD, AD, Demi) via le Dock/Sidebar,
So that je prépare le placement de mes joueurs selon ma formation.

**Acceptance Criteria:**

**Given** je suis en mode Exercise Builder, contexte "Joueurs" actif (via menu déroulant du Dock)
**When** je sélectionne Équipe A ou B, puis un Poste dans la liste
**Then** la sélection est visuellement confirmée (poste actif surligné)
**And** je peux sélectionner le même poste plusieurs fois (ex: 2 pivots) — aucune formation standard n'est imposée
**And** la limite de 6 joueurs de champ + 1 gardien par équipe est appliquée (bouton grisé au-delà)

### Story 2.2: Placement d'un joueur sur le terrain

As a coach,
I want cliquer sur le terrain pour placer le joueur sélectionné (équipe+poste),
So that je construise ma formation rapidement.

**Acceptance Criteria:**

**Given** j'ai sélectionné Équipe + Poste (Story 2.1)
**When** je clique sur une position du terrain
**Then** un joueur apparaît à cette position avec son badge de poste
**And** le clic répond en moins de 100ms (feedback visuel instantané)
**And** je peux répéter le placement pour ajouter plusieurs joueurs du même poste (ex: 2e pivot)

### Story 2.3: Déplacer ou supprimer un joueur placé

As a coach,
I want cliquer sur un joueur déjà placé pour le déplacer ou le supprimer,
So that je corrige ma formation sans tout recommencer.

**Acceptance Criteria:**

**Given** un joueur est déjà placé sur le terrain
**When** je clique dessus
**Then** je peux le déplacer (glisser vers une nouvelle position) ou le supprimer (double-clic ou touche Delete)
**And** la suppression retire le joueur du terrain et de l'état de l'exercice

### Story 2.4: Feedback visuel des joueurs (label, couleur, numéro)

As a coach,
I want que chaque joueur affiche son poste, la couleur de son équipe et un numéro si plusieurs joueurs du même poste,
So that je distingue clairement ma formation.

**Acceptance Criteria:**

**Given** des joueurs sont placés sur le terrain
**When** j'observe le terrain
**Then** chaque joueur affiche son label de poste (AG, DC, PIV, etc.)
**And** la couleur distingue Équipe A vs Équipe B
**And** si plusieurs joueurs partagent le même poste, un numéro de position est affiché (ex: "PIV 1", "PIV 2")

## Epic 3: Placement des Assets

Le coach sélectionne un type d'asset (plots, cônes, haies...) et le place librement sur le terrain pour définir les délimitations, avec feedback visuel (icône, label).
**FRs covered:** FR3.1, FR3.2

### Story 3.1: Sélection d'un type d'asset

As a coach,
I want sélectionner un type d'asset (Plots, Cônes, Haies, Cibles, Swiss Balls, Coupelles, Cerceaux, Échelles, Mannequins, Murs, Zones) via le Dock/Sidebar,
So that je prépare le placement des délimitations de terrain.

**Acceptance Criteria:**

**Given** je suis en mode Exercise Builder, contexte "Assets" actif (via menu déroulant du Dock)
**When** je sélectionne un type d'asset dans la liste
**Then** la sélection est visuellement confirmée (asset actif surligné)

### Story 3.2: Placement d'un asset sur le terrain

As a coach,
I want cliquer sur le terrain pour placer l'asset sélectionné,
So that je délimite mon exercice rapidement.

**Acceptance Criteria:**

**Given** j'ai sélectionné un type d'asset (Story 3.1)
**When** je clique sur une position du terrain
**Then** l'asset apparaît à cette position avec son icône/symbole (plot = cercle, cône = triangle, etc.)
**And** le clic répond en moins de 100ms
**And** je peux répéter le placement pour ajouter plusieurs assets du même type (ex: 5 plots en ligne)

### Story 3.3: Feedback visuel des assets (icône, label au survol)

As a coach,
I want que chaque asset affiche une icône claire et un label au survol,
So that j'identifie facilement chaque élément sur le terrain.

**Acceptance Criteria:**

**Given** des assets sont placés sur le terrain
**When** j'observe le terrain
**Then** chaque asset affiche son icône/symbole distinctif selon son type
**And** survoler un asset affiche son label (nom du type) en tooltip

## Epic 4: Trajectoires Liées aux Joueurs

Le coach dessine des trajectoires (course, passe, tir, croisé, fixation) toujours liées à un joueur placé, visualisées comme lignes/flèches colorées et codées par type.
**FRs covered:** FR4.1, FR4.2

### Story 4.1: Sélection type de trajectoire + joueur lié

As a coach,
I want sélectionner un type de trajectoire (Course, Passe, Tir, Croisé, Fixation) et un joueur déjà placé,
So that je prépare le dessin de la trajectoire de ce joueur.

**Acceptance Criteria:**

**Given** au moins un joueur est placé sur le terrain, contexte "Trajectoires" actif (via menu déroulant du Dock)
**When** je sélectionne un type de trajectoire puis un joueur placé
**Then** la sélection est visuellement confirmée (joueur sélectionné surligné, type actif indiqué)
**And** si aucun joueur n'est placé, l'option trajectoire est indisponible (pas de trajectoire orpheline)

### Story 4.2: Dessiner une trajectoire sur le terrain

As a coach,
I want dessiner (clic + glisser) une trajectoire depuis le joueur sélectionné,
So that je visualise le déplacement ou l'action de ce joueur.

**Acceptance Criteria:**

**Given** j'ai sélectionné un type de trajectoire + un joueur (Story 4.1)
**When** je clique et glisse sur le terrain depuis la position du joueur
**Then** une ligne/flèche suit mon tracé en temps réel à 60fps
**And** relâcher le clic finalise la trajectoire, liée définitivement au joueur choisi
**And** je peux ajouter plusieurs trajectoires sur le même exercice (ex: passe DC + course Pivot)

### Story 4.3: Visualisation codée par couleur/type des trajectoires

As a coach,
I want que chaque type de trajectoire ait une couleur distincte,
So that je distingue immédiatement course, passe, tir, croisé et fixation.

**Acceptance Criteria:**

**Given** des trajectoires de différents types sont dessinées sur le terrain
**When** j'observe le terrain
**Then** chaque trajectoire est colorée selon son type (ex: bleu = course, rouge = passe)
**And** le point de départ (joueur) et le chemin/fin sont visuellement clairs

## Epic 5: Sauvegarde & Collection d'Exercices

Le coach finalise et sauvegarde l'exercice (joueurs, assets, trajectoires, vue terrain) dans sa collection locale, récupérable plus tard via "Éditer un exercice".
**FRs covered:** FR6.1, FR6.2

### Story 5.1: Sauvegarder un exercice

As a coach,
I want cliquer sur "Save Exercise" pour nommer et sauvegarder mon exercice,
So that je le retrouve plus tard dans ma collection.

**Acceptance Criteria:**

**Given** j'ai construit un exercice (joueurs, assets, trajectoires optionnels)
**When** je clique sur "Save Exercise"
**Then** je suis invité à nommer l'exercice (ou un nom auto est proposé)
**And** l'exercice est sauvegardé dans le localStorage sous ma collection
**And** aucune perte de données ne survient au refresh du navigateur (NFR9)

### Story 5.2: Modèle de données complet de l'exercice

As a coach,
I want que mon exercice sauvegardé conserve tous les détails (joueurs, assets, trajectoires, vue terrain),
So that je peux le rouvrir et le retrouver identique.

**Acceptance Criteria:**

**Given** un exercice est sauvegardé (Story 5.1)
**When** je le recharge via "Éditer un exercice"
**Then** la liste des joueurs (équipe, poste, position) est restaurée à l'identique
**And** la liste des assets (type, position) est restaurée à l'identique
**And** la liste des trajectoires (type, joueur lié, chemin) est restaurée à l'identique
**And** la vue du terrain (demi/complet) est restaurée
**And** le timestamp de création/modification est conservé
