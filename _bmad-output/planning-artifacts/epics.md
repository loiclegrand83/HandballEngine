---
stepsCompleted: [1, 2, 3]
inputDocuments: ['_bmad-output/planning-artifacts/prds/prd-haweb-2026-09-06/prd.md', '_bmad-output/planning-artifacts/architecture/architecture-haweb-2026-09-06/ARCHITECTURE-SPINE.md']
---

# HaWeb - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for HaWeb, decomposing the requirements from the PRD and Architecture Spine into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Le coach peut terminer le tracé d'une trajectoire (course, tir, passe, croisé, fixation) par un double-clic (souris) ou un double-tap (tablette), sans clic sur un bouton dédié.
FR2: Le module Temps mort (tableau tactique de mi-temps) est retiré de l'écran d'accueil, de la navigation, et supprimé du dépôt (pas seulement masqué).
FR3: Le coach peut assigner une Thématique à chaque Exercice parmi Attaque, Défense, Gardien, Enclenchement, et filtrer la Bibliothèque par Thématique.
FR4: Le coach peut rechercher un Exercice par mot-clé, portant au minimum sur le nom, le(s) poste(s) impliqué(s) et le matériel requis, combinable avec le filtre Thématique.
FR5: La fiche d'exercice gagne trois champs éditables optionnels: durée estimée, nombre de joueurs requis, niveau/catégorie d'âge — en plus des champs existants (description, points d'attention, matériel, système offensif/défensif, secteur de jeu).
FR6: Le coach peut créer une Séance composée de Blocs nommés (échauffement, thème principal, retour au calme...), chaque Bloc contenant un ou plusieurs Ateliers choisis depuis la Bibliothèque, réordonnables avant export.
FR7: Le coach peut ajuster la durée de chaque Atelier dans une Séance; le total de la Séance est calculé automatiquement et recalculé à chaque modification.
FR8: Le coach peut générer un export imprimable (PDF via impression navigateur) de la Séance, en grille compacte multi-ateliers (3 à 5 schémas par page selon la complexité), chaque Atelier affichant schéma, description courte, matériel et durée.
FR9: Le coach peut sauvegarder une Séance en cours de construction et la rouvrir plus tard pour la modifier avant export ou avant planification au Calendrier; une Séance non sauvegardée n'apparaît pas dans le Calendrier.
FR10: Le coach peut basculer entre une vue mensuelle et une vue hebdomadaire du Calendrier, les deux vues affichant les mêmes événements sur la période concernée.
FR11: Le coach peut associer une Séance existante à une date du Calendrier, et créer un événement Match à une date (date + adversaire au minimum); cliquer sur une Séance planifiée l'ouvre pour consultation/réédition.
FR12: Le coach peut naviguer vers des dates passées du Calendrier pour revoir les Séances et Matchs qui y avaient été placés, sans limite de profondeur dans l'historique de la saison en cours.

### NonFunctional Requirements

NFR1: L'application fonctionne 100% en local, sans dépendance internet — aucune page ne charge de ressource (script, style, fetch) depuis une origine non-localhost. (PRD §1/§5, Spine AD-11)
NFR2: Toute nouvelle route serveur suit le pattern CRUD/sécurité existant: whitelist d'id (`^[a-zA-Z0-9_-]+$`), vérification que le chemin résolu reste dans le répertoire cible, limite de 1 Mo sur le corps de requête, en-têtes de sécurité (CSP, X-Frame-Options, nosniff) appliqués. (Spine AD-7, `[ADOPTED]`)
NFR3: Les champs enrichis de la fiche exercice (FR5) restent optionnels à la sauvegarde — la richesse des champs ne doit jamais ralentir une sauvegarde rapide. (PRD SM-C1, Spine Consistency Conventions)
NFR4: Node.js ≥22 (plancher runtime, corrige le ≥18 obsolète du README). (Spine Stack)
NFR5: Thématique est un enum fixe (`attaque | defense | gardien | enclenchement`) validé côté serveur, pas seulement côté client. (Spine AD-10)

### Additional Requirements

- Extraire la logique client Bibliothèque (fetch/filtre/recherche/rendu) dans un module JS partagé `src/js/bibliotheque.js`, chargé via `<script>` par toute page en ayant besoin (board, seance, planning). (Spine AD-1)
- Extraire le moteur de rendu canvas de `explanation.html` en fonction réutilisable `src/js/schema-render.js`, prenant `items`/`paths` bruts en entrée; aucune image PNG snapshot n'est persistée avec un exercice. (Spine AD-4)
- Récap Séance: grille CSS à template de cellule fixe (schéma + description + matériel + durée), remplissage auto en ordre de Bloc, sauts de page via `break-inside`/`break-after` CSS — pas de comptage fixe par page, pas de réorganisation manuelle en v1. (Spine AD-3)
- Pas de librairie PDF ajoutée: export via `window.print()` sur le CSS d'impression existant de `seance.css`. (Spine AD-2)
- Atelier: champs texte (nom, description, matériel, durée) snapshottés dans la Séance au moment de l'ajout — pas de lien live vers l'Exercice source; seul l'id Exercice reste référencé, uniquement pour re-rendre le schéma. Si l'Exercice source est supprimé, l'Atelier garde son texte snapshotté mais affiche un placeholder à la place du schéma. (Spine AD-8)
- La durée totale d'une Séance n'est jamais persistée — toujours recalculée à l'affichage (builder, tuile Calendrier, export). (Spine AD-9)
- Calendrier: événements légers dans `data/planning/` via la route `/api/planning` existante — `{date, type: 'seance'|'match', seanceId}` ou `{date, type: 'match', adversaire, ...}`; la Séance n'est jamais dupliquée, seulement référencée par id. Détection des références orphelines (séance supprimée) au rendu de la grille calendrier, pas seulement au clic — affichage inline "séance introuvable". (Spine AD-5)
- Migration requise avant implémentation Bibliothèque: les données existantes dans `data/bibli/*.json` utilisent une taxonomie `category` différente (echauffement/physique/offensif/defensif/montee_balle) de l'enum Thématique du PRD — une passe de mapping unique est nécessaire. (Spine Deferred)
- Réconciliation requise: `explanation.html` écrit aujourd'hui ses champs sous `explanation.doc.*` (nested), alors que FR5 doit vivre en champs top-level de l'Exercice — décider migration vs fusion à la lecture. (Spine Deferred)
- `pages/timeout.html` et ses JS/CSS dédiés, ainsi que sa carte sur `index.html`, sont supprimés du dépôt, pas commentés/désactivés. (Spine AD-6, `[ADOPTED]`)

### UX Design Requirements

Aucun document UX dédié (bmad-ux non exécuté sur ce projet). Les éléments d'expérience utilisateur pertinents sont capturés directement dans les FR ci-dessus (FR1 ergonomie board, FR6-FR8 flux séance, FR10-FR12 calendrier).

### FR Coverage Map

FR1: Epic 1 - Double-clic/tap pour terminer un tracé
FR2: Epic 1 - Suppression du module Temps mort
FR3: Epic 2 - Thématique + filtre Bibliothèque
FR4: Epic 2 - Recherche par mot-clé
FR5: Epic 2 - Champs enrichis fiche exercice
FR6: Epic 3 - Construction Séance (Blocs/Ateliers)
FR7: Epic 3 - Durées ajustables + total auto
FR8: Epic 3 - Export imprimable multi-ateliers
FR9: Epic 3 - Sauvegarde/reprise Séance
FR10: Epic 4 - Vue mensuelle/hebdomadaire
FR11: Epic 4 - Association Séance/Match au Calendrier
FR12: Epic 4 - Navigation historique

## Epic List

### Epic 1: Board — Ergonomie & Nettoyage
Le coach peut terminer un tracé rapidement (double-clic/tap) et l'écran d'accueil ne présente plus le module Temps mort (supprimé du dépôt).
**FRs covered:** FR1, FR2

### Epic 2: Bibliothèque — Enrichissement & Recherche
Le coach peut classer ses exercices par Thématique, les retrouver par mot-clé, et enrichir chaque fiche (durée, joueurs, niveau).
**FRs covered:** FR3, FR4, FR5

### Epic 3: Séance — Construction & Export
Le coach peut composer une Séance en Blocs/Ateliers, ajuster les durées (total auto), la sauvegarder/rouvrir, et l'exporter en PDF imprimable.
**FRs covered:** FR6, FR7, FR8, FR9

### Epic 4: Calendrier — Planification & Historique
Le coach peut visualiser mois/semaine, planifier Séances et Matchs sur le Calendrier, et consulter l'historique de la saison.
**FRs covered:** FR10, FR11, FR12

## Epic 1: Board — Ergonomie & Nettoyage

Le coach peut terminer un tracé rapidement (double-clic/tap) et l'écran d'accueil ne présente plus le module Temps mort (supprimé du dépôt).
**FRs covered:** FR1, FR2

### Story 1.1: Terminer un tracé par double-clic/double-tap

As a coach,
I want terminer le tracé d'une trajectoire (course, tir, passe, croisé, fixation) par un double-clic (souris) ou double-tap (tablette),
So that je peux dessiner rapidement sans chercher un bouton dédié.

**Acceptance Criteria:**

**Given** je suis en train de tracer une trajectoire sur le Board
**When** je double-clique (souris) ou double-tape (tablette) sur le canvas
**Then** le tracé en cours se termine à ce point, sans validation par bouton
**And** ce comportement s'applique aux 5 types de trajectoire (course, tir, passe, croisé, fixation)
**And** l'ancien mécanisme (bouton dédié, si présent) est retiré ou reste cohérent sans dupliquer l'action

### Story 1.2: Suppression du module Temps mort

As a coach,
I want que le module Temps mort (tableau tactique de mi-temps) disparaisse complètement de l'application,
So that l'accueil et la navigation ne présentent que les modules pertinents.

**Acceptance Criteria:**

**Given** l'application est à jour
**When** j'ouvre l'écran d'accueil
**Then** aucune carte/lien vers le module Temps mort n'est visible
**And** aucune entrée de navigation ne pointe vers `pages/timeout.html`
**And** `pages/timeout.html` et ses JS/CSS dédiés sont supprimés du dépôt (pas commentés/désactivés)

## Epic 2: Bibliothèque — Enrichissement & Recherche

Le coach peut classer ses exercices par Thématique, les retrouver par mot-clé, et enrichir chaque fiche (durée, joueurs, niveau).
**FRs covered:** FR3, FR4, FR5

### Story 2.1: Migration de la taxonomie vers Thématique

As a coach,
I want que mes exercices existants soient reclassés selon la nouvelle Thématique (Attaque, Défense, Gardien, Enclenchement),
So that la Bibliothèque reste cohérente après la mise à jour.

**Acceptance Criteria:**

**Given** des exercices existants en base utilisant l'ancienne taxonomie `category` (echauffement/physique/offensif/defensif/montee_balle)
**When** la migration s'exécute
**Then** chaque exercice reçoit une valeur de `thematique` parmi l'enum fixe (`attaque|defense|gardien|enclenchement`)
**And** la valeur est validée côté serveur, pas seulement côté client
**And** aucun exercice n'est perdu ou corrompu pendant la migration

### Story 2.2: Assigner une Thématique et filtrer la Bibliothèque

As a coach,
I want assigner une Thématique à chaque Exercice et filtrer la Bibliothèque par Thématique,
So that je retrouve rapidement les exercices pertinents pour ma séance.

**Acceptance Criteria:**

**Given** je suis sur la fiche d'un Exercice
**When** je sélectionne une Thématique parmi Attaque/Défense/Gardien/Enclenchement
**Then** la valeur est sauvegardée et validée côté serveur
**And** sur la Bibliothèque, un filtre par Thématique n'affiche que les exercices correspondants

### Story 2.3: Recherche par mot-clé + champs enrichis de la fiche

As a coach,
I want rechercher un Exercice par mot-clé (nom, poste, matériel) et enrichir sa fiche (durée, joueurs, niveau),
So that je trouve et documente mes exercices plus précisément.

**Acceptance Criteria:**

**Given** je suis sur la Bibliothèque
**When** je tape un mot-clé dans la recherche
**Then** les résultats filtrent sur le nom, le(s) poste(s) impliqué(s) et le matériel requis
**And** la recherche se combine avec le filtre Thématique (Story 2.2)
**Given** je suis sur la fiche d'un Exercice
**When** je renseigne durée estimée, nombre de joueurs requis et/ou niveau/catégorie d'âge
**Then** ces trois champs sont optionnels et n'empêchent jamais une sauvegarde rapide sans eux (NFR3)

## Epic 3: Séance — Construction & Export

Le coach peut composer une Séance en Blocs/Ateliers, ajuster les durées (total auto), la sauvegarder/rouvrir, et l'exporter en PDF imprimable.
**FRs covered:** FR6, FR7, FR8, FR9

### Story 3.1: Construire une Séance en Blocs/Ateliers

As a coach,
I want créer une Séance composée de Blocs nommés (échauffement, thème principal, retour au calme...), chaque Bloc contenant un ou plusieurs Ateliers choisis depuis la Bibliothèque,
So that je structure ma séance d'entraînement de façon claire.

**Acceptance Criteria:**

**Given** je crée une nouvelle Séance
**When** j'ajoute un Bloc et lui donne un nom
**Then** je peux y ajouter un ou plusieurs Ateliers choisis depuis la Bibliothèque
**And** chaque Atelier snapshotte son texte (nom, description, matériel, durée) au moment de l'ajout — pas de lien live vers l'Exercice source (AD-8)
**And** je peux réordonner les Blocs et les Ateliers avant export

### Story 3.2: Ajuster les durées avec total automatique

As a coach,
I want ajuster la durée de chaque Atelier dans une Séance,
So that je contrôle le minutage de mon entraînement.

**Acceptance Criteria:**

**Given** je modifie la durée d'un Atelier dans une Séance
**When** je change la valeur
**Then** le total de la Séance se recalcule automatiquement
**And** cette durée totale n'est jamais persistée — toujours recalculée à l'affichage (AD-9)

### Story 3.3: Sauvegarder et rouvrir une Séance

As a coach,
I want sauvegarder une Séance en cours de construction et la rouvrir plus tard,
So that je peux la finaliser en plusieurs fois avant export ou planification.

**Acceptance Criteria:**

**Given** je construis une Séance
**When** je la sauvegarde avant qu'elle soit terminée
**Then** je peux la rouvrir plus tard pour la modifier
**And** une Séance non sauvegardée n'apparaît pas dans le Calendrier

### Story 3.4: Export imprimable de la Séance

As a coach,
I want générer un export imprimable (PDF via impression navigateur) de ma Séance,
So that je peux l'emporter sur le terrain.

**Acceptance Criteria:**

**Given** une Séance sauvegardée avec ses Blocs/Ateliers
**When** je lance l'export
**Then** `window.print()` s'ouvre sur une grille compacte multi-ateliers (3 à 5 schémas par page selon la complexité), sans lib PDF ajoutée (AD-2)
**And** chaque Atelier affiche schéma, description courte, matériel et durée
**And** la grille utilise un template de cellule fixe avec saut de page CSS automatique (`break-inside`/`break-after`), sans réorganisation manuelle (AD-3)
**And** si l'Exercice source d'un Atelier a été supprimé, l'Atelier garde son texte snapshotté et affiche un placeholder à la place du schéma (AD-8)

## Epic 4: Calendrier — Planification & Historique

Le coach peut visualiser mois/semaine, planifier Séances et Matchs sur le Calendrier, et consulter l'historique de la saison.
**FRs covered:** FR10, FR11, FR12

### Story 4.1: Vue mensuelle/hebdomadaire

As a coach,
I want basculer entre vue mensuelle et hebdomadaire du Calendrier,
So that je choisis la granularité adaptée à mon besoin.

**Acceptance Criteria:**

**Given** je suis sur le Calendrier
**When** je bascule mois/semaine
**Then** les deux vues montrent les mêmes événements pour la période concernée

### Story 4.2: Planifier Séance et Match

As a coach,
I want associer une Séance à une date et créer un événement Match,
So that je planifie mon calendrier d'entraînement et de compétition.

**Acceptance Criteria:**

**Given** une Séance sauvegardée
**When** je l'associe à une date
**Then** elle apparaît au Calendrier, référencée par id, jamais dupliquée (AD-5)
**And** je peux créer un événement Match (date + adversaire minimum)
**And** un clic sur une Séance planifiée l'ouvre pour consultation/réédition
**And** si la Séance référencée est supprimée, la grille affiche inline "séance introuvable" au rendu, pas seulement au clic (AD-5)

### Story 4.3: Historique du Calendrier

As a coach,
I want naviguer vers des dates passées du Calendrier,
So that je revois les Séances et Matchs de la saison en cours.

**Acceptance Criteria:**

**Given** la saison en cours
**When** je navigue vers des dates passées
**Then** je vois les Séances et Matchs placés, sans limite de profondeur dans la saison
