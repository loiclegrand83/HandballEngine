# Relecture de la documentation — Handball Engine

## Passe 2 (2026-11-06) — Verdict : VALIDÉ (3 réserves cosmétiques)

Points de la passe 1 : G1 à G13 corrigés dans `guide-utilisateur.md` (rotation seulement avec une trajectoire choisie, Nom vide = « Sans nom », section Explication, flèche « ← », lanceurs et Node 22.13, copie de sauvegarde au téléchargement, « Mode : course », « si elle diffère », fenêtre d'ajout, « Retour à la trame », bandeau hors ligne, « ne quittent jamais votre ordinateur », Planning « non détaillé »). A1 à A4 corrigés dans `architecture.md`. README : lien `relecture.md` valide.
Vérifié par relancement : `node --test --test-concurrency=1 tests/api/*.test.js` → 52 tests, 52 réussis, 0 échec (55 s), ce que dit `architecture.md:371`. Citations contrôlées : `security.test.js:66-93` et `95-100` exact ; `explanation.html:565-586` exact ; `launcher.sh:23-30` exact ; `server.js:43` (CSP avec `frame-ancestors`, `img-src`) exact.
Limite de cette passe : relecture ciblée sur les textes corrigés, comparés au code ; les procédures n'ont pas été rejouées entièrement dans Playwright (aucun serveur lancé, port 3100 libre).

Réserves restantes :
- cosmétique — `docs/README.md` « Comment ça marche » : « Rien n'est envoyé sur Internet » (même point que G12, polices Google). Correction : « Vos données restent sur l'ordinateur. »
- cosmétique — G14 (hors doc) : `src/js/app.js:1760` affiche « cliquez Sauvegarder » alors que le bouton s'appelle « Enregistrer ». Défaut d'application.
- à signaler au développeur (hors doc, non corrigé) : le double-clic en mode par défaut supprime au lieu de tourner (`src/js/app.js:1355-1358`) ; le guide l'indique désormais correctement.

---

(Passe 1 conservée ci-dessous.)

**Verdict : À CORRIGER**

Date : 2026-11-06. Branche `feat/bibliotheques-trames-historique` (HEAD `3a1db66`, arbre de travail modifié : `../tests/api/security.test.js`).
Documents relus : `docs/guide-utilisateur.md`, `docs/architecture.md`, `docs/README.md`.
Gravités : **bloquant** (le lecteur est induit en erreur ou perd du travail), **gênant** (le lecteur est freiné ou la doc contredit le code), **cosmétique** (imprécision).

Bilan : 1 bloquant, 8 gênants, 9 cosmétiques (Guide : 1 / 5 / 8 ; Architecture : 0 / 3 / 1 ; README : 0 / 0 / 0).

## Méthode

- Guide : chaque procédure rejouée avec Playwright (Python, Chromium) sur `node server.js` avec `HAWEB_DATA_DIR` = dossier temporaire du scratchpad, `HAWEB_PORT=3100`, `NO_OPEN_BROWSER=1`. Le dossier `web-board/data` n'a jamais été utilisé. Les libellés ont été comparés au HTML et au JS (`pages/*.html`, `index.html`, `src/js/*.js`).
- Architecture : chaque `fichier:ligne` ouvert et comparé (server.js, lib/*.js, sw.js, src/js/*.js, scripts, tests). Contrôles HTTP rejoués avec `curl` (Host, Origin, 415, 413, 404 statique, CSP, Cache-Control).
- Tests : `node --test --test-concurrency=1 tests/api/*.test.js` relancé (serveur de test arrêté avant, car la suite utilise aussi le port 3100).
- Le serveur de test a été arrêté en fin de relecture (port 3100 libre).

---

## 1. Problèmes — `guide-utilisateur.md`

### G1 — bloquant — §4.5 « Déplacer, tourner, supprimer » et §9 « À la souris, sur le terrain »

Citations :
- « **Tourner** : double-cliquez sur un objet. Il tourne d'un quart de tour. »
- Tableau §9 : « Double-clic sur un objet | Le tourner d'un quart de tour »

Constat : dans le mode par défaut du Board (mode « asset », celui où l'on déplace les objets), un double-clic sur un objet ou un joueur le **supprime** (message « Asset supprimé »). Rejoué : Plot posé, double-clic → l'objet disparaît, rotation inchangée. La rotation ne se produit que lorsqu'un mode de trajectoire est actif (Course, Passe…). Cause : `src/js/app.js:1355-1358` (`isDoubleTap` → `deleteItemAt`) pour les modes `select`/`asset` ; la rotation est dans `src/js/app.js:1541-1548` (événement `dblclick`), qui n'est atteint que hors de ces modes.
Effet pour l'entraîneur : en suivant le guide, il détruit son travail (récupérable seulement avec « Annuler » / Ctrl+Z).
Correction proposée : corriger l'application (rotation en mode par défaut) ou, tant que ce n'est pas fait, retirer la ligne « Tourner » (§4.5) et la ligne du tableau §9, et écrire : « Double-clic sur un objet (mode par défaut) : le supprime ; « Annuler » le rétablit. »
À signaler au développeur : en mode trajectoire, le double-clic qui termine un tracé fait aussi tourner de 90° le joueur (déplacé en bout de course), statut « Asset tourné de 90° » à la place de « Trajectoire terminée ».

### G2 — gênant — §4.8 et §10 : le Nom n'est pas « obligatoire »

Citations :
- §4.8 : « **Nom** (obligatoire) ; »
- §10 : « le nom est vide ou trop long (100 caractères au plus) ; »

Constat : un nom vide est accepté. L'application le remplace par « Sans nom » avant l'envoi (`src/js/app.js:1626`, `name: exerciseName.value || 'Sans nom'`). Rejoué : champ Nom vidé, « Enregistrer » → « Version n°1 enregistrée » ; l'historique affiche « v1 · … · Sans nom ». Le serveur refuse un nom vide (`lib/validate.js:18`) mais le client ne le lui envoie jamais. Le champ est limité à 100 caractères (`maxlength` de `#quickName`), donc « trop long » n'arrive pas non plus depuis l'écran.
Correction proposée : §4.8 « **Nom** (si vous le laissez vide, l'exercice s'enregistre sous « Sans nom ») ; » et §10 retirer « le nom est vide ou trop long (100 caractères au plus) » de la liste des causes de refus.

### G3 — gênant — §4.4, §4.8, §6.1, §7.2 : d'où viennent « Description » et « Matériel » du PDF

Citations :
- §4.4 « Ajouter du matériel … Cliquez sur le terrain pour le poser. »
- §6.1 « **Matériel**, la liste de tout le matériel des exercices. »
- §7.2 « pour chaque exercice : le schéma, le nom, la durée, la description et le matériel ; »

Constat : la description et le matériel d'un exercice dans la trame et le PDF ne viennent **pas** des objets posés sur le terrain. Ils viennent de la page « Explication » ouverte par le bouton « 📋 EXPLICATION & POINTS D'ATTENTION » (colonne de gauche du Board, ouvre un nouvel onglet), champs « Description générale » et « Matériel nécessaire » (`lib/trames.js:91-93`, `describe()` lib/trames.js:75-80 : les Notes de l'exercice d'abord). Rejoué : exercice avec un plot posé, ajouté à une trame → « Matériel — » dans la trame, « Matériel Non renseigné » dans le PDF. Ce bouton et cette page n'apparaissent nulle part dans le guide.
Même page, autre écart avec §4.9 (« Seul « Enregistrer » crée une version ») : elle enregistre toute seule 1,2 s après chaque saisie et crée une version (rejoué : saisie de « Matériel » → « ✓ Version n°2 » sans clic ; catalogue : Exo B passe de v1 à v2) — `pages/explanation.html:566-585`.
Correction proposée : ajouter un §4.x « Compléter la fiche de l'exercice » (bouton « Explication & points d'attention », champs « Description générale » et « Matériel nécessaire », enregistrement automatique qui crée une version) ; en §4.4 ajouter « Les objets posés sur le terrain ne remplissent pas la liste de matériel de la trame » ; en §4.9 nuancer « Seul « Enregistrer » crée une version » par « Dans le Board, seul… ».

### G4 — gênant — §4.4 : sortie du mode « Assets » non expliquée

Citation : « 1. Cliquez sur l'icône « Assets » en bas. 2. Choisissez un objet… 3. Cliquez sur le terrain pour le poser. »
Constat : après le clic sur « Assets », la rangée d'icônes est **remplacée** par la grille du matériel ; les icônes « Joueurs », « Trajectoires »… disparaissent. On en sort avec le bouton « ← » (`aria-label` « Retour au dock », `src/js/dock.js:398-406`) ; chaque clic sur le terrain pose un nouvel objet tant qu'on n'est pas sorti. Le guide ne le dit pas : le débutant cherche « Trajectoires » (§4.6) et ne le trouve pas.
Correction proposée : ajouter en §4.4 « Chaque clic sur le terrain pose un objet. Pour revenir aux autres icônes, cliquez sur la flèche « ← » de la grille. » (même remarque pour §4.3 : le panneau « Joueurs » reste ouvert et chaque clic pose un joueur ; fermer avec « × » ou Échap).

### G5 — gênant — §2.1 : lancement et version de Node

Citations :
- « Double-cliquez sur le fichier `start.sh` du dossier Handball Engine »
- « faites installer Node.js (version 22 ou plus récente) »

Constat 1 : `start.sh` est un script shell (`web-board/start.sh`, 5 lignes). Le double-clic dépend du système (non vérifié ici) et ne fonctionne pas sous Windows. Le dépôt contient d'autres lanceurs, absents du guide : `../Handball-Engine.command` et `../handball-engine.desktop` (appellent `web-board/launcher.sh`). De plus `start.sh` libère le port 3000 en tuant ce qui l'occupe (`fuser -k 3000/tcp`).
Constat 2 : le serveur utilise `node:sqlite` (`lib/db.js:5`). Ce module est utilisable sans option à partir de Node 22.13, d'après la documentation de Node (non vérifié sur une machine 22.0-22.12 ; aucune déclaration `engines`, cf. architecture §9.14). Test réalisé ici avec Node v24.22.1 uniquement.
Correction proposée : nommer le lanceur réellement remis à l'entraîneur (ou écrire « demandez à la personne qui a installé l'outil de vous donner l'icône de lancement ») ; remplacer « version 22 » par la version minimale confirmée par le développeur (probablement « 22.13 »).

### G6 — gênant — §8.1 : copie automatique

Citation : « Une copie est aussi gardée automatiquement dans le dossier Handball Engine (les 20 dernières). »
Constat : la copie n'est écrite que quand on clique sur « Télécharger une sauvegarde complète » (`server.js:226`, `lib/backup.js:59-66`), dans `data/backups/`. Sans clic, rien n'est sauvegardé. Rejoué : le dossier `backups/` est vide au départ, puis contient `handball-engine-sauvegarde-AAAA-MM-JJ-HHMMSS.json` après le téléchargement et `avant-restauration-….json` après une restauration.
Correction proposée : « Chaque fois que vous téléchargez une sauvegarde, une copie est aussi rangée dans le dossier `data/backups` du dossier Handball Engine (les 20 dernières). Rien n'est sauvegardé tant que vous ne cliquez pas. »

### G7 — cosmétique — §4.1 : message d'état « Prêt »

Citation : « (par exemple « Prêt » ou « Trajectoire terminée ») »
Constat : « Prêt » est dans le HTML (`pages/board.html:141`) mais immédiatement remplacé au chargement : le texte affiché est « Mode : asset » (`src/js/app.js:153`). « Trajectoire terminée » est exact (`src/js/app.js:1422`).
Correction proposée : « (par exemple « Mode : course » ou « Trajectoire terminée ») ».

### G8 — cosmétique — §6.7 point 3 : « elle devient une nouvelle version »

Citation : « Cliquez sur « Reprendre cette version », puis sur « Enregistrer » : elle devient une nouvelle version. »
Constat : vrai si le contenu diffère de la version actuelle (rejoué avec la v1 → « version n°5 »). Si on reprend la version déjà actuelle (v3), « Enregistrer » répond « Aucun changement » et ne crée rien (`lib/trames.js:41-43`).
Correction proposée : ajouter « (si elle diffère de la version actuelle) ».

### G9 — cosmétique — §5.3 méthode 2 : fenêtre d'ajout

Citation : « Cliquez sur l'exercice à ajouter. « Fermer » quitte la fenêtre. »
Constat : la fenêtre se ferme toute seule après chaque ajout (`src/js/bibliotheque.js:219`) ; il faut la rouvrir pour ajouter un deuxième exercice.
Correction proposée : « La fenêtre se ferme après chaque ajout ; cliquez de nouveau sur « + Ajouter un exercice » pour en ajouter un autre. »

### G10 — cosmétique — §7.1 : ce qui s'affiche après l'export

Citation : « 3. L'application prépare le document, puis la fenêtre d'impression s'ouvre. »
Constat : après l'export l'écran reste sur le **document** (barre : « ← Retour à la trame », « Exporter en PDF », « Imprimer »), pas sur l'éditeur. Un export refusé (ex. aucun exercice) laisse aussi une trame enregistrée dans « Mes trames » (étape 2 : enregistrement d'abord) ; rejoué : une trame « 0 min » créée par un export refusé.
Correction proposée : ajouter « Une fois le PDF enregistré, cliquez sur « ← Retour à la trame » pour reprendre l'édition. »

### G11 — cosmétique — §10 : moment d'apparition du bandeau « Hors ligne »

Citation : « Handball Engine a été arrêté pendant que vous travailliez. Ce bandeau apparaît sur les pages Accueil, Bibliothèques et Trames. »
Constat : le bandeau n'apparaît pas de lui-même à l'arrêt du serveur ; il apparaît à la première action qui appelle le serveur (rejoué : clic sur un exercice → bandeau + bouton « Ajouter » grisé). Il disparaît tout seul en moins de 13 s après le relancement (sondage toutes les 10 s, `src/js/api.js:19-26`). Le texte du bandeau et le message du Board sont exacts.
Correction proposée : « Ce bandeau apparaît dès que vous faites une action qui a besoin du serveur (ouvrir un exercice, enregistrer…). »

### G12 — cosmétique — §1 : « Rien n'est envoyé sur Internet »

Citation : « Tout reste sur votre ordinateur. Rien n'est envoyé sur Internet. »
Constat : les données restent bien locales, mais chaque page charge les polices Google (`fonts.googleapis.com` dans `index.html`, `pages/*.html` ; CSP `server.js:43`). Le navigateur contacte donc Google à l'ouverture d'une page (sans vos données).
Correction proposée : « Vos exercices et vos trames ne quittent jamais votre ordinateur. »

### G13 — cosmétique — §1 et §3 : le Planning n'a pas de chapitre

Citation : « **Le planning** : vous placez vos entraînements et vos matchs dans un calendrier. »
Constat : le Planning est cité (§1, §3.2) et présent (vues « Mois » / « Semaine » dans `pages/planning.html`), mais aucun chapitre ni procédure ne l'explique ; le sommaire n'en a pas.
Correction proposée : ajouter un chapitre court ou préciser « non détaillé dans ce guide ».

### G14 — cosmétique — §8.3 : libellé du message d'import (écart application, pas guide)

Citation : « Un exercice importé n'est pas enregistré tout de suite. Cliquez sur « Enregistrer » pour le garder. »
Constat : le guide est exact (le bouton s'appelle « Enregistrer ») mais l'application affiche « Importé (non sauvegardé — cliquez Sauvegarder pour conserver) » (`src/js/app.js:1760`). Aucun bouton « Sauvegarder » n'existe.
Correction proposée : corriger le message de l'application en « cliquez Enregistrer ».

---

## 2. Problèmes — `architecture.md`

Les chemins et numéros de ligne cités ont été vérifiés un par un. Hormis les points ci-dessous, ils sont exacts (voir §4).

### A1 — gênant — §7 « Trous de couverture » et §9 point 1, Résumé point 6

Citations :
- §7 : « les contrôles Host, Origin et Content-Type (server.js:323-336) ne sont couverts par aucun test. »
- §9.1 : « **Contrôles Host/Origin/Content-Type non testés** (voir §7). »
- Résumé : « principaux manques : contrôles Host/Origin/415 non testés »

Constat : faux dans l'arbre de travail actuel. `../tests/api/security.test.js` (modifié, non commité, 17:09, après la rédaction du document à 17:05) contient désormais des tests Host (l. 54), Origin étrangère (l. 59), 415 (l. 67), Origin locale (l. 75) et liste blanche statique (l. 83). La plage « ../tests/api/security.test.js:12-50 » du tableau §7 est donc aussi périmée (12-90).
Correction proposée : écrire « au commit 3a1db66, … ; ajoutés depuis dans `security.test.js:54-90` (non commités) » ou mettre à jour le texte, le tableau et le résumé une fois les tests commités.

### A2 — gênant — §7 « 47 tests, 47 réussis, 0 échec »

Citation : « `node --test --test-concurrency=1 tests/api/*.test.js` → **47 tests, 47 réussis, 0 échec** (durée ≈ 55 s). »
Constat : relancé aujourd'hui sur l'arbre de travail : **52 tests, 51 réussis, 1 échec** (`✖ Host étranger refusé (403) : protection contre le DNS rebinding`, `../tests/api/security.test.js:54-57`, reçoit 200 au lieu de 403). Le serveur, lui, est correct : `curl -H "Host: evil.example" http://localhost:3100/api/health` → 403. Cause probable (non démontrée) : le `fetch` de Node n'applique pas un en-tête `Host` forcé, donc le test est défectueux, pas le serveur.
Correction proposée : après correction du test, remplacer par le chiffre réel ; mentionner que les 47 valent pour le commit 3a1db66.

### A3 — gênant — §3.2 « Brouillon » et §8 « Brouillon auto non versionné, seule l'action « Enregistrer » versionne »

Citation (§8) : « Brouillon auto non versionné, seule l'action « Enregistrer » versionne | Q8 : éviter une version à chaque frappe. | src/js/app.js:1554 ; lib/exercises.js:132-136 »
Constat : vrai pour le Board, faux pour la page Explication : `pages/explanation.html:566-585` enregistre automatiquement (délai 1,2 s) par `POST /api/exercises`, ce qui crée une version à chaque modification de contenu (rejoué : v1 → v2 sans action). §2.2 cite bien `explanation.html:570-585` (« réenregistre l'exercice ») mais ne relie pas cela à la règle de versionnage.
Correction proposée : nuancer la ligne §8 (« côté Board ») et ajouter une phrase en §3.2 : « La page Explication enregistre seule (1,2 s) et crée donc une version à chaque modification. »

### A4 — cosmétique — §9 point 13 et §6 en-têtes

- §9.13 cite « launcher.sh:24-30 » : la commande `lsof` est à la ligne 23, les `kill -9` aux lignes 27-29 ; écrire « launcher.sh:23-30 » (§2.1 « launcher.sh:20-35 » est correct).
- §6 « En-têtes … CSP `default-src 'self'` (avec `'unsafe-inline'` pour scripts et styles, polices Google) » ne mentionne pas `frame-ancestors 'self'` ni `img-src 'self' data:` présents à `server.js:43`.

---

## 3. Problèmes — `README.md` (docs)

Aucun problème bloquant, gênant ou cosmétique relevé. Les liens `guide-utilisateur.md`, `architecture.md`, `../pages/guide.html`, `../README.md` existent ; `relecture.md` existe à partir de ce document (le lien annoncé « à venir » est désormais valide : mettre à jour la ligne « document à venir » du tableau). Le tableau des pages correspond aux routes réelles (`index.html`, `pages/bibliotheque.html`, `seance.html`, `board.html`, `planning.html`, `guide.html`). `pages/startup.html` existe mais n'est pas listé (non nécessaire pour l'entraîneur).
Réserve : l'affirmation « Rien n'est envoyé sur Internet » (§« Comment ça marche ») est la même que G12 pour les polices Google ; la phrase « sans connexion Internet obligatoire » est correcte (l'application fonctionne hors ligne, polices de repli).

---

## 4. Ce qui est correct

### Guide — vérifié dans l'application

- §3.1 Accueil : boutons « Nouvel exercice », « Nouvelle trame » ; sections Bibliothèques (cartes + « Toutes les bibliothèques »), Trames récentes, Exercices récents (clic ouvre le Board / la trame), Sauvegarde (« Télécharger une sauvegarde complète », « Restaurer… », « Guide »).
- §3.2 Barre de navigation : 6 entrées (Accueil, Bibliothèques, Trames, Board, Planning, Guide) ; réduite à des icônes dans le Board avec infobulle (`src/js/ui.js:63-86`). §3.3 Guide en une page : 4 cartes exactes.
- §4.1 : quatre sections « Vue », « Mode », « Exercice », « Aide » ; barre rapide « Joueur, Passe, Course, Tir, Annuler, Nom, Durée, Enregistrer » ; rangée du bas « Joueurs, Assets, Trajectoires, Animation, Bibliothèque, Trame, Planning, Postes, Vue, Annuler » (10 icônes, même ordre).
- §4.2 « Terrain complet » / « Demi-terrain » ; §4.3 Équipe A/B, postes AG, ARG, DC, PIV, ARD, AD, Gardien ; plafond 6 + 1 par équipe, boutons grisés (rejoué : Gardien grisé après 1, tous les postes grisés après 6) ; touche J et bouton « Joueur » posent un joueur.
- §4.4 les 12 objets (Ballon, Haie, Haltère, Cible, Swiss Ball, Coupelle, Cerceau, Échelle, Mannequin, Mur, Plot, Zone).
- §4.5 déplacer par glisser, clic droit supprime, Suppr et Retour arrière suppriment l'objet sélectionné, Ctrl+Z / « Annuler » annule.
- §4.6 trajectoires : 5 types ; boutons grisés et message « Placez un joueur pour activer les trajectoires. » sans joueur ; départ sur un joueur, points de passage, double-clic termine, clic droit supprime ; touches P, C, T.
- §4.7 « ▶ Animation » dans « Mode » et icône « Animation ».
- §4.8 champs (Catégorie : 5 valeurs + aucune ; Thématique ; Durée 1-180 avec le message exact) ; Nom et Durée synchronisés entre barre rapide et colonne de gauche.
- §4.9 « Version n°1 enregistrée », « Aucun changement depuis la version n°… » ; Ctrl+S ; brouillon automatique après le premier enregistrement (`src/js/app.js:1556-1558`).
- §4.10 trois chemins d'ouverture (Exercices récents ; « Bibliothèque » puis « Charger » ; « Ouvrir dans le Board »). §4.11 « Nouveau » demande confirmation.
- §5 : création (champ « Nouvelle bibliothèque », « Ajouter »), renommer (✎, Entrée valide, Échap annule), supprimer (🗑 + « Supprimer », exercices conservés), cases à cocher par exercice, « + Ajouter un exercice », recherche (nom et notes), liste de thématiques, « Effacer les filtres », historique (« v2 · 06/11/2026 17:11 · … »), « Restaurer cette version », « Revenir à la version actuelle », restauration = nouvelle version (« Restaurée depuis v2 »), « Supprimer l'exercice » + confirmation.
- §6 : champs de la trame, Durée totale et Matériel calculés, 5 boutons « + Échauffement … + Bloc libre », numérotation BLOC 01…, nom de bloc modifiable, ↑ ↓ ✕, confirmation avant suppression d'un bloc non vide, « Consignes du coach (facultatif) », ligne « Ajout dans : BLOC 02 · … », premier « + » sans bloc crée un bloc « Exercice », case « min » (durée propre à la trame), badges « Nouvelle version disponible » / « Durée manquante » / bouton « Utiliser la dernière version », « Trame enregistrée — version n°… », états « Nouvelle trame » / « Modifications non enregistrées » / « Version n°… », bandeau « Modifications non enregistrées retrouvées. » avec « Reprendre » / « Ignorer », « Mes trames » avec « Ouvrir », « Versions », « Exports », « Supprimer » (+ confirmation), versions en lecture seule avec « Reprendre cette version » / « Revenir à la trame actuelle ».
- §7 : « Exporter en PDF » enregistre d'abord ; contenu du document conforme (en-tête, blocs, schémas, consignes, « Notes du coach ») ; messages bloquants titre, aucun exercice, plus de 4 exercices (« Scindez-le en deux blocs »), durée manquante, bloc trop haut, schéma indisponible (relus dans `src/js/seance.js:684-743`, le cas « plus de 4 » rejoué) ; archive : « Exports », « Ouvrir l'archive » (nouvel onglet, « Imprimez avec Ctrl+P »), « Rouvrir cette version » (lecture seule).
- §8 : fichier `handball-engine-sauvegarde-2026-11-06.json` ; confirmation avant restauration ; message de fin « Sauvegarde restaurée : 4 exercices, 8 versions, 2 bibliothèques, 2 trames, 1 exports, 0 événements. » ; copie `avant-restauration-…json` créée ; « Ce fichier n'est pas une sauvegarde Handball Engine. » pour un fichier non JSON et pour un JSON étranger ; « Export JSON » télécharge `<nom>-handball.json` et l'import remplit le Board sans enregistrer.
- §9 Raccourcis : J, P, C, T, Ctrl+Z, Ctrl+S, Suppr / Retour arrière, Échap (ferme le panneau, rejoué), lettres sans effet dans un champ texte (rejoué), Entrée / Échap dans le renommage de bibliothèque.
- §10 : trajectoires grisées sans joueur, plafond de joueurs, durée 1-180, bandeau hors ligne (texte exact) et message du Board (texte exact, `src/js/app.js:1656`), retour automatique après relancement, brouillon de trame retrouvé.
- §10 « La tablette ou un autre ordinateur ne trouve pas l'application » : cohérent avec l'écoute sur `127.0.0.1` (`server.js:364`) et le contrôle Host (rejoué : 403).

### Architecture — vérifié par lecture et par exécution

- `server.js` : toutes les plages citées (23-25, 38-48, 50-61, 63-71, 74-246 et chaque route de la table §5, 248-268, 270-298, 312-346, 348-359, 361-379) ; limites de corps 1/20/200 Mo (l. 19-21) ; codes 403/415/204 (l. 323-341) ; 404 `Route inconnue` ; 413 + `Connection: close` ; CSP stricte des exports (l. 179) ; `Cache-Control … immutable` (l. 101).
- Rejoué par `curl` : Host étranger 403, Origin étrangère 403, `text/plain` 415, corps > 1 Mo 413, `/server.js` et `/lib/db.js` 404, OPTIONS 204, route inconnue 404, id invalide 400, CSP `default-src 'none'; img-src data:; style-src 'unsafe-inline'` sur `/api/exports/1`, `PATCH /api/libraries/:id` accepté sans `Content-Type` (limite §9.2 confirmée).
- `lib/config.js`, `lib/http.js`, `lib/canonical.js`, `lib/fs-atomic.js`, `lib/db.js` (PRAGMA, `tx()`, migration, les 10 tables aux lignes citées, index), `lib/validate.js`, `lib/exercises.js`, `lib/libraries.js`, `lib/trames.js`, `lib/backup.js`, `lib/import-legacy.js` : toutes les plages de lignes et affirmations (dédoublonnage par hash, `version_no`, restauration, brouillon, suppression logique, vignettes 900 Ko / 409, copie tournante de 20, étapes de restauration, `sqlite_sequence`, échange du dossier planning) sont exactes.
- `sw.js` : 127 lignes, cache `handball-engine-v2` / `handball-engine-data-v1`, stratégies et lignes 120-126 exactes ; `manifest.json` 17 lignes.
- Front : `api.js` (9-35, 37-63, 65), `ui.js` (5-12, 115), `snapshots.js` (6, 8-32, 35-45, 47), `app.js` (1555-1571, 1575-1604, 1608-1621, 1623-1641, 1644-1659, 1663-1676, 1717-1728, 2588, 2602, 2607-2637 ; 2 681 lignes), `canvas-reflow.js`, `dock.js`, `keyboard-nav.js`, `board-quickbar.js`, `bibliotheque.js`, `seance.js` (20, 145, 156, 161-172, 205-216, 245-250, 438-461, 659-673, 684-701, 703-744, 746-754), `home.js`, `planning.js` (36, 47, 306-310, 327), `pwa.js` (2-8).
- Chargement des scripts par page : exact pour les 5 pages (le Board et le Planning ne chargent pas `api.js`).
- Scripts (`scripts/*.js` lignes 2-3 / 2-6), `start.sh:3`, `../package.json:5-8, 10-12`, `../playwright.config.js:7-24`, `../tests/helpers/server.js:3, 10-13, 37-40`, les 11 fichiers de `../tests/api/` et leurs plages (au commit 3a1db66), 16 fichiers `../tests/e2e/*.spec.js`, `offline.spec.js:8`, `trame-pdf.spec.js:32`, `versions.spec.js:7`.
- Limites connues §9 points 2 à 15 : confirmées (point 2 rejoué ; points 3 à 8, 10 à 13 et 15 par lecture du code).

### README (docs)

Résumé du projet, liste des fonctions, pages et adresses : conformes à l'application.

---

## 5. Non vérifié (menus propres à Chrome et Edge — signalé, non jugé)

- §2.2 Chrome : icône d'installation « un petit écran avec une flèche », bouton « Installer », menu « Caster, enregistrer et partager » puis « Installer la page en tant qu'application ».
- §2.2 Edge : menu « Applications », « Installer ce site en tant qu'application », bouton « Installer ».
- §7.1 étapes 4-5 : destination « Enregistrer au format PDF » et bouton « Enregistrer » de la fenêtre d'impression du navigateur (l'application affiche bien le texte « Choisissez « Enregistrer au format PDF » », `src/js/seance.js:737`).
- §10 dernier point : disponibilité du bouton d'installation selon le navigateur. Seuls les prérequis côté application ont été contrôlés (`manifest.json` : nom « Handball Engine », icônes 192/512 px, `start_url` `/` ; service worker enregistré par `src/js/pwa.js`).
- Non rejoués (lus dans le code seulement) : navigation Tab / Maj+Tab et flèches dans la grille Assets (§9), message « schéma indisponible » (§7.3), notes > 2000 caractères (§10), double-clic sur `start.sh` selon le système (§2.1).

## 6. Défauts d'application rencontrés (hors documentation)

- Double-clic en mode par défaut : supprime au lieu de tourner (G1).
- Fin de tracé par double-clic : le joueur déplacé est tourné de 90° (G1, note).
- Message d'import « cliquez Sauvegarder » (G14).
- Test `../tests/api/security.test.js:54` en échec (A2).
