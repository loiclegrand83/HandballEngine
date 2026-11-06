---
title: HaWeb — Outil clé en main de gestion des exercices, séances et suivi handball
status: final
created: 2026-09-06
updated: 2026-09-10
---

# PRD: HaWeb

## 0. Document Purpose

Ce PRD recadre HaWeb, une application déjà partiellement construite, autour d'un usage clé en main : créer des exercices de handball, les organiser en bibliothèque, en construire des séances imprimables, et suivre sa saison (entraînements + matchs) dans un calendrier — le tout en local, sans dépendance internet (à l'exception ponctuelle et isolée de l'Extraction vidéo post-MVP, voir §4.5/§5). Il s'adresse à l'unique utilisateur du produit (le coach lui-même, qui est aussi le constructeur) et sert de référence pour prioriser les refontes et développements à venir. Les fonctionnalités sont groupées avec leurs exigences fonctionnelles (FR) numérotées globalement ; les hypothèses inférées sont marquées `[ASSUMPTION]` et listées en §9.

## 1. Vision

HaWeb est l'outil unique et local d'un coach de handball pour concevoir ses exercices tactiques, les capitaliser dans une bibliothèque personnelle, construire ses séances d'entraînement, et suivre sa saison — sans dépendre d'une connexion internet ni jongler entre plusieurs sites web *(à l'exception ponctuelle et isolée de l'Extraction vidéo post-MVP, voir §5)*.

Aujourd'hui, le coach utilise un outil externe (tactical-board.com) pour dessiner ses exercices — mais celui-ci devient inutilisable à la moindre coupure internet — et un second site (entrainement-handball.fr) pour trouver l'inspiration et le format de fiche d'exercice qu'il veut reproduire. Ce va-et-vient fait perdre du temps et empêche tout suivi centralisé.

HaWeb résout ça en réunissant, dans une seule application locale : un éditeur de terrain fluide pour créer ses propres exercices, une bibliothèque personnelle classée par thématique, un compositeur de séances qui génère un PDF prêt à emporter sur le terrain, et un calendrier pour planifier et relire sa saison.

## 2. Target User

### 2.1 Jobs To Be Done

- En tant que coach, je veux créer rapidement un exercice tactique sans que l'outil de dessin me ralentisse (clics superflus), pour ne pas perdre le fil de mon idée pendant que je la modélise.
- En tant que coach, je veux retrouver un exercice déjà créé par thématique (Attaque, Défense, Gardien, Enclenchement) ou par mot-clé, pour construire mes séances sans repartir de zéro.
- En tant que coach, je veux assembler une séance à partir d'ateliers de ma bibliothèque et obtenir un PDF prêt à suivre sur le terrain, pour ne pas avoir à retranscrire mes exercices à la main.
- En tant que coach, je veux voir mes séances et mes matchs dans un calendrier, pour planifier ma saison à l'avance et m'y retrouver après coup.
- En tant que coach, je veux que tout ça fonctionne sans connexion internet, pour ne jamais être bloqué en plein gymnase ou en déplacement.

### 2.2 Non-Users (v1)

- Pas d'autres coachs, joueurs, ou membres du club — usage strictement solo. Pas de partage, pas de comptes multiples, pas de synchronisation multi-appareils en v1.

### 2.3 Key User Journeys

- **UJ-1. Le coach modélise un nouvel exercice sans friction.**
  Le coach, en préparation de séance un soir de semaine, ouvre le Board, place ses joueurs et dessine une course jusqu'au point de tir. Il double-clique pour terminer le tracé (realizes FR-1) au lieu de chercher un bouton "Fin de trajectoire". Il enchaîne plusieurs phases, anime le résultat pour vérifier la cohérence, puis enregistre l'exercice dans sa bibliothèque sous la thématique Attaque.

- **UJ-2. Le coach retrouve et assemble une séance.**
  Le coach ouvre la Bibliothèque, filtre par thématique Défense, puis cherche "1-6" par mot-clé pour affiner. Il sélectionne trois ateliers, les place en blocs (échauffement / thème principal / retour au calme) dans le compositeur de Séances, ajuste la durée de chacun, et génère un PDF récapitulatif avec les schémas — qu'il imprime pour l'avoir sous les yeux à l'entraînement.

- **UJ-3. Le coach planifie et relit sa saison.**
  Le coach ouvre le Calendrier en vue mensuelle, place ses séances de la semaine et un match du week-end. Deux semaines plus tard, il revient sur le calendrier pour vérifier ce qui a été travaillé avant ce même adversaire la saison passée.

- **UJ-4. Le coach transforme une vidéo trouvée en ligne en exercice prêt à l'emploi** *(post-MVP, expérimental)*.
  Le coach tombe sur une vidéo courte (ex. réseau social) montrant une séquence d'attaque qui l'intéresse. Il colle le lien de la vidéo dans HaWeb. L'outil récupère la vidéo, en extrait automatiquement les éléments clés (positionnement des joueurs, courses, passes, tir) et génère un nouvel Exercice avec autant de Phases que l'action en compte réellement, animable comme n'importe quel exercice dessiné à la main. Le coach relit le résultat, corrige à la main (avec les outils du Board existants) les points que l'IA a mal interprétés, puis sauvegarde l'Exercice dans sa Bibliothèque. **Edge case:** si l'extraction échoue ou produit un résultat trop éloigné de la vidéo, le coach reconstruit l'exercice normalement au Board — l'échec de l'extraction ne bloque jamais la création manuelle.

## 3. Glossary

- **Exercice** — Une modélisation tactique unique (placements, trajectoires, phases animées) créée dans le Board et sauvegardée dans la Bibliothèque. Porte une thématique, une description, un matériel requis, une durée estimée, un nombre de joueurs et un niveau.
- **Board** — L'éditeur de terrain où le coach place des joueurs, dessine des trajectoires et compose les phases d'un Exercice.
- **Trajectoire** — Un tracé (course, tir, passe, croisé, fixation) associé à un joueur sur une phase du Board.
- **Phase** — Une étape numérotée d'un Exercice, rejouable en Animation.
- **Bibliothèque** — Le stockage local des Exercices sauvegardés, filtrable par Thématique et recherchable par mot-clé.
- **Thématique** — La catégorie principale d'un Exercice : Attaque, Défense, Gardien, ou Enclenchement.
- **Atelier** — Un Exercice choisi depuis la Bibliothèque pour être inclus dans une Séance.
- **Bloc** — Un regroupement d'Ateliers dans une Séance (ex. échauffement, thème principal, retour au calme).
- **Séance** — Un plan d'entraînement composé de Blocs d'Ateliers, avec durée totale calculée, exportable en PDF.
- **Calendrier** — La vue de planification et de suivi affichant les Séances et les Matchs sur un mois ou une semaine.
- **Match** — Un événement du Calendrier distinct d'une Séance (compte rendu de match hors scope v1, voir §5).
- **Extraction vidéo** — Fonctionnalité post-MVP qui génère un Exercice à partir d'une vidéo externe fournie par lien, en détectant automatiquement joueurs, courses, passes et tir (voir §4.5).

## 4. Features

### 4.1 Board — Éditeur d'exercices

**Description:** Le Board est l'éditeur de terrain existant (placement de joueurs, trajectoires, phases, animation), conservé mais revu sur son point de friction principal : la fin de tracé d'une trajectoire nécessite aujourd'hui un clic explicite sur un bouton "Terminer traj.", ce qui casse le geste de conception. Le module Temps mort (planche tactique de mi-temps) est retiré du produit — le coach utilise une planche physique classique pour cet usage. Realizes UJ-1.

**Functional Requirements:**

#### FR-1: Fin de trajectoire par double-clic/double-tap

Le coach peut terminer le tracé d'une trajectoire (course, tir, passe, croisé, fixation) par un double-clic (souris) ou un double-tap (tablette), sans action supplémentaire. Realizes UJ-1.

**Consequences (testable):**
- Un double-clic/double-tap sur le terrain pendant un tracé en cours clôt la trajectoire au dernier point simple-cliqué avant le double.
- Le bouton "Terminer traj." est retiré de l'interface.
- Le comportement fonctionne identiquement sur souris (PC) et tactile (tablette Android/Chromebook).

#### FR-2: Retrait du module Temps mort

Le module Temps mort (tableau tactique de mi-temps, `timeout.html`) est retiré de l'écran d'accueil et de la navigation.

**Consequences (testable):**
- L'écran d'accueil ne propose plus que Board (et les autres modules du présent PRD) — plus d'entrée "Temps mort".
- Le code et les assets dédiés au module Temps mort ne sont plus chargés en usage courant. `[ASSUMPTION: le fichier peut être supprimé du dépôt plutôt que simplement masqué.]`

**Notes:** Les autres fonctionnalités existantes du Board (types de trajectoires, postes, équipements, animation par phase, halo coloré, page d'explication auto-générée) sont conservées telles quelles — aucun changement demandé au-delà de FR-1 et FR-2.

### 4.2 Bibliothèque

**Description:** Stockage local des Exercices, organisé par Thématique et complété par une recherche mot-clé. La fiche d'exercice (générée depuis la page d'explication du Board) gagne des champs structurés pour se rapprocher du rendu visé (type entrainement-handball.fr) et pour alimenter le compositeur de Séances. Realizes UJ-1, UJ-2.

**Functional Requirements:**

#### FR-3: Classement par thématique

Le coach peut assigner une Thématique à chaque Exercice parmi : Attaque, Défense, Gardien, Enclenchement ; et filtrer la Bibliothèque par Thématique.

**Consequences (testable):**
- Chaque Exercice sauvegardé porte exactement une Thématique parmi les 4 valeurs listées.
- Le filtre par Thématique dans la Bibliothèque restreint la liste affichée en conséquence.

#### FR-4: Recherche par mot-clé

Le coach peut rechercher un Exercice par mot-clé, la recherche portant au minimum sur le nom de l'exercice, le(s) poste(s) impliqué(s) et le matériel requis.

**Consequences (testable):**
- Une recherche texte retourne tout Exercice dont le nom, un poste impliqué, ou un élément de matériel contient la chaîne recherchée (insensible à la casse).
- La recherche mot-clé peut être combinée avec le filtre Thématique (ET logique).

#### FR-5: Champs enrichis de la fiche exercice

La fiche d'exercice (page d'explication) inclut, en plus des champs existants (description, points d'attention, matériel, système offensif/défensif, secteur de jeu), trois champs éditables : durée estimée, nombre de joueurs requis, niveau/catégorie d'âge.

**Consequences (testable):**
- Les champs Durée, Nombre de joueurs et Niveau sont éditables et sauvegardés avec l'Exercice.
- Ces trois champs sont disponibles pour être affichés/utilisés dans le compositeur de Séances (FR-6 à FR-9).

**Notes:** Le comportement existant (sauvegarde explicite uniquement, chargement, suppression, export/import JSON) est conservé sans changement.

### 4.3 Séances

**Description:** Module refait pour permettre au coach de composer une Séance à partir d'Ateliers de sa Bibliothèque, organisés en Blocs, avec un export PDF récapitulatif prêt à emporter sur le terrain. Realizes UJ-2.

**Functional Requirements:**

#### FR-6: Composition en blocs

Le coach peut créer une Séance composée de Blocs nommés (ex. échauffement, thème principal, retour au calme), chaque Bloc contenant un ou plusieurs Ateliers choisis depuis la Bibliothèque.

**Consequences (testable):**
- Une Séance contient au moins un Bloc ; un Bloc contient au moins un Atelier.
- L'ordre des Blocs et des Ateliers au sein d'un Bloc est modifiable par le coach avant export.
- Chaque Atelier ajouté conserve la référence à l'Exercice source (description, matériel, schéma).

#### FR-7: Durée par atelier et total de séance

Le coach peut indiquer ou ajuster la durée de chaque Atelier dans une Séance ; le total de la Séance est calculé automatiquement à partir des durées des Ateliers qui la composent.

**Consequences (testable):**
- Le total affiché est la somme des durées des Ateliers de tous les Blocs de la Séance, recalculé à chaque modification.
- La durée par défaut d'un Atelier est pré-remplie depuis la durée estimée de l'Exercice source (FR-5) et reste modifiable.

#### FR-8: Export PDF récapitulatif

Le coach peut générer un PDF récapitulatif de la Séance présentant les schémas des Ateliers en format compact multi-ateliers par page (à la manière d'un récap, plutôt qu'une page dédiée par atelier).

**Consequences (testable):**
- Le PDF regroupe entre 3 et 5 schémas d'Ateliers par page selon la complexité des schémas.
- Chaque Atelier affiché inclut au minimum : schéma, description courte, matériel nécessaire, durée.
- Le PDF est généré localement (aucun appel réseau).

#### FR-9: Sauvegarde et réédition de la Séance

Le coach peut sauvegarder une Séance en cours de construction et la rouvrir plus tard pour la modifier avant export ou avant qu'elle ne soit planifiée dans le Calendrier (§4.4).

**Consequences (testable):**
- Une Séance sauvegardée conserve ses Blocs, Ateliers, durées, et ordre au rechargement.
- Une Séance non explicitement sauvegardée n'apparaît pas dans la liste des séances disponibles pour le Calendrier.

### 4.4 Calendrier / Planning

**Description:** Vue de planification et de suivi de la saison, affichant les Séances (issues de §4.3) et les Matchs sur un mois ou une semaine, utilisable aussi bien pour planifier en avant que pour consulter l'historique passé. Realizes UJ-3.

**Functional Requirements:**

#### FR-10: Vues mensuelle et hebdomadaire

Le coach peut basculer entre une vue mensuelle et une vue hebdomadaire du Calendrier.

**Consequences (testable):**
- Les deux vues affichent les mêmes événements (Séances, Matchs) sur la période concernée.
- Le basculement entre les deux vues conserve la date affichée (même mois/semaine de référence).

#### FR-11: Placement de Séances et de Matchs sur le calendrier

Le coach peut associer une Séance existante à une date du Calendrier, et créer un événement Match à une date (date + adversaire au minimum).

**Consequences (testable):**
- Une date du Calendrier peut porter zéro, une ou plusieurs Séances et/ou Matchs.
- Cliquer sur une Séance planifiée depuis le Calendrier ouvre cette Séance (ou son PDF, §4.3) pour consultation/réédition.

#### FR-12: Consultation de l'historique

Le coach peut naviguer vers des dates passées du Calendrier pour revoir les Séances et Matchs qui y avaient été placés.

**Consequences (testable):**
- La navigation vers un mois/une semaine antérieure affiche les événements passés tels qu'ils avaient été enregistrés, sans limite de profondeur dans l'historique de la saison en cours.

**Notes:** Le contenu détaillé affiché par Match (score, résumé) n'est volontairement pas spécifié ici — le compte rendu de match est hors scope v1 (§5). `[NOTE FOR PM]` Le champ "adversaire" est un minimum ; à revoir si le compte rendu de match est réintroduit en v2.

### 4.5 Extraction vidéo *(post-MVP, expérimental)*

**Description:** Le coach fournit le lien d'une vidéo externe (ex. réseau social) montrant une séquence tactique qui l'intéresse. HaWeb récupère la vidéo, en extrait automatiquement les éléments clés — positionnement des joueurs, courses, passes, tir — et génère un nouvel Exercice standard (mêmes Phases, même moteur d'animation et d'export que les exercices créés à la main au Board ; aucun format dédié). Le coach corrige les erreurs d'extraction directement avec les outils existants du Board (glisser un point, retracer une trajectoire) — aucun mécanisme de correction dédié. Realizes UJ-4.

C'est la seule fonctionnalité de ce PRD à nécessiter un accès internet ponctuel (récupération de la vidéo et appel à un service d'analyse) ; le reste de l'application continue de fonctionner intégralement sans connexion (voir §5, exception notée).

**Functional Requirements:**

#### FR-13: Génération d'Exercice depuis un lien vidéo

Le coach peut coller le lien d'une vidéo externe ; HaWeb récupère la vidéo et génère automatiquement un Exercice (positionnement des joueurs, Phases de courses/passes/tir) sans intervention manuelle de saisie. Realizes UJ-4.

**Consequences (testable):**
- Un lien vidéo valide déclenche la récupération de la vidéo puis la génération d'un Exercice sans étape de clic manuel intermédiaire par le coach.
- L'Exercice généré compte autant de Phases que l'action détectée en comporte réellement (pas de nombre fixe imposé).
- L'Exercice généré est un Exercice standard au sens du Glossary — mêmes champs, même stockage, même comportement d'animation/export que tout autre Exercice (aucune structure de données séparée).
- Si l'extraction échoue ou produit un résultat jugé trop éloigné de la vidéo par le coach, celui-ci peut toujours créer l'exercice manuellement au Board sans que l'échec ne bloque quoi que ce soit.

**Out of Scope:**
- Aucune garantie de précision en v1 — fonctionnalité explicitement expérimentale (voir NFR ci-dessous et SM-C2).
- Pas de mécanisme de correction dédié : la correction se fait avec les outils Board existants.
- Pas d'upload de fichier vidéo local — seule la fourniture d'un lien est supportée en v1.

**Feature-specific NFRs:**
- Cette fonctionnalité peut dépendre d'un accès internet et/ou d'un service d'analyse tiers pour la récupération vidéo et l'extraction — c'est une exception assumée et isolée au NFR §5 "fonctionne sans connexion", qui continue de s'appliquer à toutes les autres fonctionnalités du PRD.

**Notes:** `[NOTE FOR PM]` Le choix du service/modèle d'extraction (local vs cloud, fournisseur) est une décision technique qui revient à l'architecture, pas à ce PRD.

## 5. Non-Goals (Explicit)

- HaWeb ne devient pas un outil multi-utilisateur : pas de comptes, pas de partage entre coachs, pas de synchronisation cloud.
- HaWeb ne dépend d'aucun service internet pour fonctionner au quotidien : la génération de PDF, la sauvegarde des exercices/séances/calendrier sont 100% locales. Seule exception assumée : l'Extraction vidéo (§4.5), qui peut utiliser internet ponctuellement pour récupérer une vidéo et l'analyser — le reste de l'application reste utilisable sans connexion même quand cette fonctionnalité n'est pas disponible.
- Le module Temps mort (planche tactique de mi-temps) n'est pas maintenu — un support physique classique le remplace hors de l'application.
- Les comptes rendus de match ne sont pas traités par ce PRD (voir §8 pour le suivi en backlog).

## 6. MVP Scope

### 6.1 In Scope

- Board : ergonomie de fin de trajectoire par double-clic/double-tap (FR-1), retrait du module Temps mort (FR-2), reste du Board inchangé.
- Bibliothèque : classement par Thématique (FR-3), recherche mot-clé (FR-4), champs enrichis de fiche exercice (FR-5).
- Séances : composition en Blocs (FR-6), durée/total (FR-7), export PDF récapitulatif (FR-8), sauvegarde/réédition (FR-9).
- Calendrier : vues mensuelle/hebdomadaire (FR-10), placement Séances/Matchs (FR-11), consultation historique (FR-12).

### 6.2 Out of Scope for MVP

- Comptes rendus de match détaillés — reporté en backlog, revisiter si le besoin redevient prioritaire. `[NOTE FOR PM]`
- Tout usage multi-utilisateur ou synchronisation entre appareils.
- Le module Temps mort n'est pas out-of-scope temporaire : il est définitivement retiré (§5), pas seulement déprioritisé.
- Extraction vidéo (FR-13, §4.5) — délibérément hors MVP, livrée après stabilisation du socle (Board, Bibliothèque, Séances, Calendrier). `[NOTE FOR PM]` Feature souhaitée et déjà spécifiée, mais son caractère expérimental (précision d'IA incertaine) et sa dépendance à un service tiers justifient de ne pas la coupler au risque du MVP.

## 7. Success Metrics

**Primary**
- **SM-1**: Le coach utilise HaWeb chaque semaine en période de saison sans revenir à tactical-board.com ou entrainement-handball.fr pour créer un exercice ou construire une séance. Validates FR-1 à FR-9.

**Secondary**
- **SM-2**: Créer un exercice complet (placements + trajectoires + phases) prend moins de temps qu'avant, perçu par le coach comme fluide (plus de friction citée sur la fin de trajectoire). Validates FR-1.
- **SM-3**: Une séance (sélection d'ateliers + PDF) peut être montée en quelques minutes plutôt qu'en retranscrivant manuellement des exercices trouvés ailleurs. Validates FR-6 à FR-9.
- **SM-4**: L'Extraction vidéo fait gagner du temps par rapport à une retranscription manuelle de la vidéo au Board, même en tenant compte du temps de correction des erreurs d'IA. Validates FR-13.

**Counter-metrics (do not optimize)**
- **SM-C1**: Le nombre de champs obligatoires à la fiche exercice (FR-5) ne doit pas décourager la sauvegarde d'un exercice rapide — ne pas optimiser la richesse des champs au prix de la vitesse de saisie. Counterbalances SM-2.
- **SM-C2**: Le taux d'usage de l'Extraction vidéo ne doit pas être optimisé en masquant ou minimisant ses erreurs — un Exercice mal extrait et sauvegardé sans correction produit une donnée de Bibliothèque fausse, pire que l'absence de la fonctionnalité. Counterbalances SM-4.

## 8. Open Questions

1. Le fichier/module Temps mort doit-il être supprimé du dépôt ou seulement retiré de la navigation ? (voir `[ASSUMPTION]` en FR-2)
2. Comptes rendus de match : sous quelle forme les reconsidérer (score simple vs structuré par mi-temps) ? Trigger de relance proposé : revisiter si le besoin est exprimé sur 2 saisons consécutives ou plus.
3. Le champ "niveau/catégorie d'âge" (FR-5) doit-il suivre une liste fermée (ex. catégories fédérales) ou rester texte libre ?
4. Quel service/modèle d'extraction vidéo utiliser (FR-13) — local vs cloud, quel fournisseur ? Décision technique déléguée à l'architecture.
5. Quels formats/plateformes de lien vidéo doivent être supportés en premier (réseaux sociaux, hébergeurs vidéo) ? À trancher à l'implémentation selon la disponibilité réelle des services d'extraction.

## 9. Assumptions Index

- Inline assumption from §4.1 (FR-2) — le module Temps mort peut être supprimé du code plutôt que simplement masqué de la navigation ; à confirmer en implémentation.
