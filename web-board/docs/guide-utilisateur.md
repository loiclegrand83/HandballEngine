# Handball Engine — Guide de l'entraîneur

Ce guide s'adresse à l'entraîneur qui découvre Handball Engine.
Il explique comment dessiner un exercice, le ranger, construire un entraînement, l'imprimer et mettre ses données à l'abri.

Les mots entre « guillemets » sont les libellés exacts des boutons à l'écran.

---

## Sommaire

1. [Ce que fait l'application](#1-ce-que-fait-lapplication)
2. [Installation](#2-installation)
3. [Se repérer](#3-se-repérer)
4. [Premier exercice](#4-premier-exercice)
5. [Bibliothèques](#5-bibliothèques)
6. [Trame d'entraînement](#6-trame-dentraînement)
7. [Export PDF et archive](#7-export-pdf-et-archive)
8. [Sauvegarde et restauration](#8-sauvegarde-et-restauration)
9. [Raccourcis clavier](#9-raccourcis-clavier)
10. [Dépannage](#10-dépannage)

Le Planning n'est pas détaillé dans ce guide.

---

## 1. Ce que fait l'application

Handball Engine vous aide à préparer vos entraînements.

- **Le Board** : vous dessinez un exercice sur un terrain (joueurs, ballons, plots, passes, courses, tirs).
- **Les bibliothèques** : vous rangez vos exercices par classeur (« Défense », « Gardien », « U15 »…).
- **La trame** : vous composez le déroulé d'une séance, bloc par bloc.
- **L'export PDF** : vous imprimez la trame, avec le schéma de chaque exercice.
- **Le planning** : vous placez vos entraînements et vos matchs dans un calendrier (vues « Mois » et « Semaine » ; non détaillé dans ce guide).

Vos exercices et vos trames ne quittent jamais votre ordinateur.

---

## 2. Installation

### 2.1 Lancer Handball Engine

Handball Engine fonctionne sur votre ordinateur. Il doit être lancé avant chaque utilisation.

1. La première fois, faites installer Node.js (version 22.13 ou plus récente) sur l'ordinateur.
2. Cliquez sur l'icône de lancement « Handball Engine » que vous a donnée la personne qui a installé l'outil. Si vous n'en avez pas, demandez-lui comment l'application se lance chez vous.
3. Votre navigateur s'ouvre tout seul sur l'adresse **http://localhost:3000**.
4. S'il ne s'ouvre pas, ouvrez Chrome ou Edge et tapez vous-même `localhost:3000` dans la barre d'adresse.

Laissez la fenêtre de lancement ouverte pendant que vous travaillez. Si vous la fermez, l'application ne peut plus enregistrer.

Bon à savoir : au lancement, Handball Engine arrête le programme qui occupe déjà l'adresse `localhost:3000` sur l'ordinateur.

Pour la personne qui installe l'outil : le dossier contient `start.sh` (script à lancer dans un terminal, sous Linux ou macOS) et `launcher.sh`, appelé par les icônes `handball-engine.desktop` (Linux) et `Handball-Engine.command` (macOS). Ces icônes contiennent le chemin du dossier : adaptez-le à votre ordinateur. Aucun lanceur n'est fourni pour Windows.

### 2.2 Installer l'application (Chrome ou Edge)

Vous pouvez installer Handball Engine comme une application. Elle aura alors sa propre icône et sa propre fenêtre, sans barre d'adresse.

**Avec Google Chrome :**

1. Lancez Handball Engine et ouvrez `localhost:3000` dans Chrome.
2. Dans la barre d'adresse, à droite, cliquez sur l'icône d'installation (un petit écran avec une flèche).
3. Cliquez sur « Installer ».
4. L'application « Handball Engine » apparaît dans vos applications et sur le bureau.

Si l'icône n'apparaît pas : ouvrez le menu de Chrome (les trois points en haut à droite), puis « Caster, enregistrer et partager », puis « Installer la page en tant qu'application ».

**Avec Microsoft Edge :**

1. Lancez Handball Engine et ouvrez `localhost:3000` dans Edge.
2. Ouvrez le menu d'Edge (les trois points en haut à droite).
3. Choisissez « Applications », puis « Installer ce site en tant qu'application ».
4. Confirmez avec « Installer ».

Les menus de Chrome et d'Edge changent parfois de nom selon la version. Cherchez le mot « Installer ».

> Important : même installée, l'application a besoin que Handball Engine soit lancé sur l'ordinateur (étape 2.1) pour enregistrer vos changements.

---

## 3. Se repérer

### 3.1 L'accueil

L'accueil s'ouvre à l'adresse `localhost:3000`. Vous y trouvez :

- deux grands boutons : « Nouvel exercice » et « Nouvelle trame » ;
- **Bibliothèques** : une carte par bibliothèque, avec son nombre d'exercices, et la carte « Toutes les bibliothèques » ;
- **Trames récentes** : cliquez sur une trame pour la rouvrir ;
- **Exercices récents** : cliquez sur un exercice pour l'ouvrir dans le Board ;
- **Sauvegarde** : « Télécharger une sauvegarde complète », « Restaurer… » et « Guide ».

### 3.2 La barre de navigation

En haut de chaque page, une barre vous emmène partout : **Accueil**, **Bibliothèques**, **Trames**, **Board**, **Planning**, **Guide**.

Dans le Board, cette barre est réduite à des icônes. Passez la souris dessus pour lire leur nom.

### 3.3 Le guide en une page

Le lien « Guide » ouvre un résumé en quatre cartes : Bibliothèques, Trame, Export PDF, Sauvegarde. Ce document-ci en est la version complète.

---

## 4. Premier exercice

### 4.1 Ouvrir un terrain vierge

1. À l'accueil, cliquez sur « Nouvel exercice ».
2. Le Board s'ouvre avec un terrain vide.

Le Board a trois zones :

- **à gauche**, la colonne de réglages (sections « Vue », « Mode », « Exercice », « Aide ») ;
- **au centre**, le terrain, avec au-dessus la barre rapide (« Joueur », « Passe », « Course », « Tir », « Annuler », « Nom », « Durée », « Enregistrer ») ;
- **en bas**, une rangée d'icônes : « Joueurs », « Assets », « Trajectoires », « Animation », « Bibliothèque », « Trame », « Planning », « Postes », « Vue », « Annuler ».

En bas du terrain, une ligne de texte vous dit ce qui vient de se passer (par exemple « Mode : course » ou « Trajectoire terminée »).

### 4.2 Choisir le terrain

1. Ouvrez la section « Vue » à gauche (ou l'icône « Vue » en bas).
2. Cliquez sur « Terrain complet » ou « Demi-terrain ».

### 4.3 Placer des joueurs

1. Cliquez sur l'icône « Joueurs » en bas.
2. Choisissez « Équipe A » ou « Équipe B ».
3. Choisissez un poste : « AG », « ARG », « DC », « PIV », « ARD », « AD » ou « Gardien ».
4. Cliquez sur le terrain à l'endroit voulu.

Le panneau « Joueurs » reste ouvert : chaque clic sur le terrain pose un nouveau joueur. Fermez-le avec « × » ou la touche **Échap**.

Chaque équipe compte au plus 6 joueurs de champ et 1 gardien. Quand la limite est atteinte, les boutons de poste deviennent grisés.

Pour aller plus vite, cliquez sur « Joueur » dans la barre rapide (ou appuyez sur **J**), puis cliquez sur le terrain.

### 4.4 Ajouter du matériel

1. Cliquez sur l'icône « Assets » en bas.
2. Choisissez un objet : Ballon, Haie, Haltère, Cible, Swiss Ball, Coupelle, Cerceau, Échelle, Mannequin, Mur, Plot ou Zone.
3. Cliquez sur le terrain pour le poser.

Quand vous cliquez sur « Assets », la rangée d'icônes du bas est remplacée par la grille du matériel. Chaque clic sur le terrain pose alors un nouvel objet. Pour retrouver les autres icônes (« Joueurs », « Trajectoires »…), cliquez sur la flèche « ← » de la grille.

Les objets posés sur le terrain ne remplissent pas tout seuls la liste de matériel de la trame et du PDF. Voir 4.9.

### 4.5 Déplacer, tourner, supprimer

- **Déplacer** : cliquez sur un joueur ou un objet et faites-le glisser.
- **Supprimer** : clic droit sur l'objet. Ou bien sélectionnez-le, puis appuyez sur la touche **Suppr**. Un double-clic sur un objet le supprime aussi.
- **Tourner** : choisissez d'abord une trajectoire (par exemple « Course », voir 4.6), puis double-cliquez sur un objet. Il tourne d'un quart de tour. Ne double-cliquez pas sans trajectoire choisie : l'objet serait supprimé.
- **Annuler** : cliquez sur « Annuler » (ou **Ctrl+Z**).

### 4.6 Dessiner une passe, une course ou un tir

Une trajectoire part toujours d'un joueur. Placez donc au moins un joueur avant.

1. Cliquez sur l'icône « Trajectoires » en bas. Choisissez « Course », « Passe », « Tir », « Croisé » ou « Fixation ».
   (Raccourci : « Passe », « Course » ou « Tir » dans la barre rapide, ou les touches **P**, **C**, **T**.)
2. Cliquez sur le joueur qui démarre l'action.
3. Cliquez sur le terrain pour chaque point de passage.
4. Double-cliquez pour terminer le tracé.

Chaque type de trajectoire a sa couleur et son style de trait. Un numéro indique l'ordre des étapes.

Pour supprimer une trajectoire : clic droit dessus.

### 4.7 Voir l'animation

Cliquez sur « ▶ Animation » dans la section « Mode » à gauche, ou sur l'icône « Animation » en bas. Les joueurs suivent leurs trajectoires, étape par étape.

### 4.8 Décrire l'exercice

Ouvrez la section « Exercice » à gauche et remplissez :

- **Nom** (si vous le laissez vide, l'exercice s'enregistre sous « Sans nom ») ;
- **Catégorie** (Échauffement, Travail physique, Travail offensif…) ;
- **Thématique** : Attaque, Défense, Gardien ou Enclenchement ;
- **Durée estimée (min)** : entre 1 et 180 minutes ;
- **Nombre de joueurs**, **Niveau / catégorie d'âge**, **Notes**.

Le **Nom** et la **Durée** sont aussi dans la barre rapide, au-dessus du terrain. Les deux endroits restent synchronisés.

Conseil : renseignez toujours la durée. Sans elle, l'exercice ne pourra pas être exporté en PDF dans une trame.

### 4.9 Compléter la fiche de l'exercice (description et matériel)

La description et le matériel imprimés dans la trame et le PDF viennent de la page « Explication ».

1. Enregistrez d'abord l'exercice (4.10).
2. Dans la colonne de gauche du Board, cliquez sur « 📋 EXPLICATION & POINTS D’ATTENTION ». La page s'ouvre dans un nouvel onglet.
3. Remplissez « Description générale » (c'est le même texte que le champ **Notes** du Board) et « Matériel nécessaire ».

Si « Matériel nécessaire » est vide, la page le pré-remplit avec les objets posés sur le terrain. Vérifiez-le et corrigez-le si besoin.

Attention : cette page enregistre toute seule, un peu plus d'une seconde après chaque saisie, et chaque enregistrement crée une nouvelle version de l'exercice.

### 4.10 Enregistrer

1. Cliquez sur « Enregistrer » (barre rapide ou colonne de gauche), ou appuyez sur **Ctrl+S**.
2. Un message confirme : « Version n°1 enregistrée ».

Chaque nouvel enregistrement crée une nouvelle version (n°2, n°3…). Si rien n'a changé, le message dit « Aucun changement depuis la version n°… ».

Après le premier enregistrement, vos changements sont aussi gardés en brouillon automatiquement. Dans le Board, seul « Enregistrer » crée une version (la page « Explication » en crée aussi, voir 4.9).

### 4.11 Rouvrir un exercice

Trois chemins possibles :

- à l'accueil, dans **Exercices récents** ;
- dans le Board, bouton « Bibliothèque » puis « Charger » sur la carte de l'exercice ;
- dans la page Bibliothèques, sélectionnez l'exercice puis « Ouvrir dans le Board ».

### 4.12 Repartir de zéro

Dans la colonne de gauche du Board, cliquez sur « Nouveau ». Si le terrain contient déjà quelque chose, l'application vous demande confirmation : le travail non enregistré sera perdu.

---

## 5. Bibliothèques

Une bibliothèque est un classeur d'exercices. Un même exercice peut être rangé dans plusieurs bibliothèques à la fois, sans être copié.

Ouvrez la page avec **Bibliothèques** dans la barre de navigation.

La page a trois colonnes :

- **à gauche**, la liste des bibliothèques ;
- **au centre**, les exercices, avec leur schéma ;
- **à droite**, le détail de l'exercice sélectionné.

### 5.1 Créer une bibliothèque

1. En bas de la colonne de gauche, tapez un nom dans le champ « Nouvelle bibliothèque » (60 caractères au plus).
2. Cliquez sur « Ajouter ».

### 5.2 Renommer ou supprimer une bibliothèque

- **Renommer** : cliquez sur le crayon ✎, tapez le nouveau nom, puis appuyez sur **Entrée**. **Échap** annule.
- **Supprimer** : cliquez sur la corbeille 🗑, puis confirmez avec « Supprimer ».

Supprimer une bibliothèque ne supprime jamais ses exercices. Ils restent dans « Tous les exercices ».

### 5.3 Ranger un exercice dans une bibliothèque

**Méthode 1, depuis l'exercice :**

1. Cliquez sur un exercice au centre.
2. À droite, sous « Bibliothèques », cochez les bibliothèques voulues.
3. Décochez pour le retirer. L'exercice n'est pas supprimé.

**Méthode 2, depuis la bibliothèque :**

1. Cliquez sur une bibliothèque à gauche.
2. Cliquez sur « + Ajouter un exercice ».
3. Cliquez sur l'exercice à ajouter. La fenêtre se ferme après chaque ajout ; cliquez de nouveau sur « + Ajouter un exercice » pour en ajouter un autre. « Fermer » quitte la fenêtre sans rien ajouter.

### 5.4 Trouver un exercice

- Cliquez sur une bibliothèque à gauche, ou sur « Tous les exercices ».
- Tapez un mot dans « Rechercher un exercice… ». La recherche porte sur le nom et les notes.
- Choisissez une thématique dans la liste (« Toutes », « Attaque », « Défense », « Gardien », « Enclenchement »).

Les filtres se combinent. Si rien ne s'affiche, cliquez sur « Effacer les filtres ».

### 5.5 L'historique d'un exercice

Chaque enregistrement garde une version. Vous pouvez revenir en arrière.

1. Sélectionnez un exercice.
2. À droite, sous « Historique », cliquez sur une version (par exemple « v2 · 05/11/2026 14:30 · … »).
3. La version s'affiche en lecture seule.
4. Cliquez sur « Restaurer cette version » pour la reprendre, ou sur « Revenir à la version actuelle ».

Restaurer ne détruit rien : l'ancienne version devient une nouvelle version, et tout l'historique reste visible.

### 5.6 Supprimer un exercice

1. Sélectionnez l'exercice.
2. Cliquez sur « Supprimer l'exercice », puis confirmez.

L'exercice disparaît de toutes les bibliothèques. Les trames qui l'utilisent gardent leur copie de l'exercice.

---

## 6. Trame d'entraînement

La trame est le déroulé de votre séance : échauffement, exercices, opposition, retour au calme.

Ouvrez-la avec « Nouvelle trame » à l'accueil, ou **Trames** dans la barre de navigation.

La page a trois colonnes :

- **à gauche**, les informations de la trame ;
- **au centre**, les blocs ;
- **à droite**, la liste des exercices à ajouter.

### 6.1 Remplir les informations

À gauche, remplissez :

- **Titre de la trame** (obligatoire, par exemple « Défense étagée ») ;
- **Date** ;
- **Thème**, **Coach**, **Objectif**.

En dessous, deux cadres se remplissent tout seuls :

- **Durée totale**, calculée à partir des exercices ;
- **Matériel**, la liste du « Matériel nécessaire » de chaque exercice (voir 4.9).

### 6.2 Créer les blocs

Sous la zone centrale, cliquez sur un des boutons :

« + Échauffement », « + Exercice », « + Opposition libre », « + Retour au calme », « + Bloc libre ».

Le bloc apparaît avec un numéro (BLOC 01, BLOC 02…). Vous pouvez changer son nom en cliquant dessus.

Pour chaque bloc :

- **↑** et **↓** changent sa place ;
- **✕** le supprime (une confirmation est demandée s'il contient des exercices) ;
- le champ « Consignes du coach (facultatif) » sert à noter vos consignes.

### 6.3 Ajouter des exercices

1. Cliquez sur un bloc. Il devient le bloc cible. À droite, la ligne « Ajout dans : BLOC 02 · … » le confirme.
2. Dans la colonne de droite, filtrez si besoin : bibliothèque, thématique, ou « Rechercher… ».
3. Cliquez sur le bouton **+** de l'exercice voulu.

S'il n'y a encore aucun bloc, le premier **+** crée un bloc « Exercice ».

Pour chaque exercice ajouté :

- **↑** et **↓** changent l'ordre dans le bloc ;
- **✕** le retire de la trame ;
- la case « min » permet de changer la durée pour cette trame seulement. Laissez-la vide pour garder la durée de l'exercice.

### 6.4 Les versions d'exercice dans la trame

La trame garde la version exacte de chaque exercice au moment où vous l'avez ajouté. Si vous modifiez l'exercice plus tard dans le Board, la trame ne change pas.

Quand une version plus récente existe, l'étiquette « Nouvelle version disponible » apparaît. Cliquez sur « Utiliser la dernière version » si vous voulez la mise à jour.

Si l'étiquette « Durée manquante » apparaît, tapez une durée dans la case « min ».

### 6.5 Enregistrer la trame

1. Cliquez sur « Enregistrer » en haut (ou **Ctrl+S**).
2. Le message « Trame enregistrée — version n°… » confirme.

En haut à droite, un petit texte indique l'état : « Nouvelle trame », « Modifications non enregistrées » ou « Version n°… ».

Si vous fermez la page sans enregistrer, vos modifications sont gardées sur cet ordinateur. À la prochaine ouverture, le bandeau « Modifications non enregistrées retrouvées. » vous propose « Reprendre » ou « Ignorer ».

### 6.6 Mes trames

Cliquez sur « Mes trames » en haut. Chaque trame affiche sa date, son numéro de version et sa durée, avec quatre boutons :

- « Ouvrir » : reprendre la trame ;
- « Versions » : voir les anciennes versions ;
- « Exports » : voir les PDF déjà produits (voir chapitre 7) ;
- « Supprimer » : supprimer la trame. Ses versions et ses exports restent archivés.

« ← Retour à la trame » vous ramène à l'éditeur. « Nouvelle trame » repart d'une trame vide.

### 6.7 Revenir à une ancienne version de trame

1. Dans « Mes trames », cliquez sur « Versions », puis sur une version.
2. La trame s'affiche en lecture seule, avec un bandeau.
3. Cliquez sur « Reprendre cette version », puis sur « Enregistrer » : elle devient une nouvelle version (si elle diffère de la version actuelle ; sinon le message « Aucun changement » s'affiche).
4. Ou cliquez sur « Revenir à la trame actuelle ».

---

## 7. Export PDF et archive

### 7.1 Exporter une trame en PDF

1. Dans la trame, cliquez sur « Exporter en PDF ».
2. La trame est d'abord enregistrée automatiquement.
3. L'application prépare le document, puis la fenêtre d'impression s'ouvre.
4. Comme imprimante, choisissez « Enregistrer au format PDF ».
5. Cliquez sur « Enregistrer » et choisissez où ranger le fichier.

Vous pouvez aussi choisir une vraie imprimante pour l'imprimer sur papier.

Une fois le PDF enregistré, l'écran affiche toujours le document. Cliquez sur « ← Retour à la trame » pour reprendre l'édition.

Comme la trame est enregistrée avant la préparation du document, elle reste dans « Mes trames » même si l'export est refusé (7.3).

### 7.2 Ce que contient le document

- en tête : titre, date, thème, coach, durée totale, objectif, matériel et résumé des blocs ;
- pour chaque bloc : son nom, sa durée et ses exercices ;
- pour chaque exercice : le schéma, le nom, la durée, la description et le matériel (remplis dans la page « Explication », voir 4.9) ;
- les consignes du coach de chaque bloc ;
- à la fin, un cadre « Notes du coach » avec des lignes pour écrire à la main.

### 7.3 Ce qui peut bloquer l'export

L'application vous prévient avec un message rouge si :

- la trame n'a pas de titre ;
- la trame ne contient aucun exercice ;
- un exercice n'a pas de durée (la ligne est mise en évidence) ;
- un bloc contient plus de 4 exercices : scindez-le en deux blocs ;
- un bloc est trop long pour une page : raccourcissez les descriptions ou scindez le bloc ;
- un schéma est indisponible : ouvrez l'exercice dans le Board, puis réessayez.

### 7.4 Retrouver un ancien export

Chaque export est archivé avec sa date et son numéro de version. Vous retrouvez donc le document exact remis aux joueurs, même si la trame a changé depuis.

1. Cliquez sur « Mes trames ».
2. Sur la trame voulue, cliquez sur « Exports ».
3. Pour chaque export :
   - « Ouvrir l'archive » affiche le document dans un nouvel onglet. Faites **Ctrl+P** pour le réimprimer ;
   - « Rouvrir cette version » affiche la trame telle qu'elle était, en lecture seule.

---

## 8. Sauvegarde et restauration

Vos données sont sur cet ordinateur seulement. Faites une sauvegarde régulière, par exemple chaque semaine.

### 8.1 Faire une sauvegarde

1. Allez à l'accueil.
2. Dans le cadre « Sauvegarde », cliquez sur « Télécharger une sauvegarde complète ».
3. Un fichier nommé `handball-engine-sauvegarde-…json` est téléchargé.
4. Copiez-le sur une clé USB, un disque externe ou un autre ordinateur.

Ce fichier unique contient tout : bibliothèques, exercices, versions, trames, exports et planning.

Chaque fois que vous téléchargez une sauvegarde, une copie est aussi rangée dans le dossier `data/backups` du dossier Handball Engine (les 20 dernières). Rien n'est sauvegardé tant que vous ne cliquez pas.

### 8.2 Restaurer une sauvegarde

Attention : la restauration **remplace toutes les données actuelles** par celles du fichier.

1. Allez à l'accueil.
2. Cliquez sur « Restaurer… ».
3. Choisissez le fichier de sauvegarde.
4. Lisez le message, puis cliquez sur « Restaurer » pour confirmer (ou « Annuler »).
5. Un message indique ce qui a été restauré : nombre d'exercices, de versions, de bibliothèques, de trames, d'exports et d'événements.

Avant de remplacer quoi que ce soit, l'application garde une copie de l'état actuel. En cas d'erreur, la personne qui a installé l'outil peut la retrouver dans le dossier des sauvegardes.

### 8.3 Exporter ou importer un seul exercice

Dans le Board :

- « Export JSON » télécharge l'exercice affiché dans un fichier ;
- le bouton de choix de fichier juste en dessous permet de l'importer.

Un exercice importé n'est pas enregistré tout de suite. Cliquez sur « Enregistrer » pour le garder (le message de l'application dit « cliquez Sauvegarder » : il s'agit du bouton « Enregistrer »).

---

## 9. Raccourcis clavier

### Dans le Board

| Touche | Action |
|---|---|
| **J** | Poser un joueur |
| **P** | Dessiner une passe |
| **C** | Dessiner une course |
| **T** | Dessiner un tir |
| **Ctrl+Z** | Annuler la dernière action |
| **Ctrl+S** | Enregistrer l'exercice |
| **Suppr** ou **Retour arrière** | Supprimer l'objet sélectionné |
| **Échap** | Fermer le panneau ouvert |
| **Tab** / **Maj+Tab** | Passer d'une icône du bas à l'autre |
| **Flèches** | Se déplacer dans la grille du matériel (« Assets ») |

Les touches J, P, C, T et Ctrl+Z ne marchent pas quand vous êtes en train d'écrire dans un champ (Nom, Notes…).

Sur Mac, remplacez **Ctrl** par **Cmd**.

### Dans la trame

| Touche | Action |
|---|---|
| **Ctrl+S** | Enregistrer la trame |

### Dans les bibliothèques

| Touche | Action |
|---|---|
| **Entrée** | Valider le nouveau nom d'une bibliothèque |
| **Échap** | Annuler le renommage |

### À la souris, sur le terrain

| Geste | Action |
|---|---|
| Glisser | Déplacer un joueur ou un objet |
| Double-clic sur un objet | Le supprimer (« Annuler » le rétablit) |
| Double-clic sur un objet, une trajectoire étant choisie | Le tourner d'un quart de tour |
| Double-clic pendant un tracé | Terminer la trajectoire |
| Clic droit | Supprimer l'objet ou la trajectoire |

---

## 10. Dépannage

### La page ne s'ouvre pas (« Ce site est inaccessible »)

Handball Engine n'est pas lancé. Relancez-le (chapitre 2.1), puis rechargez la page.

### Un bandeau dit « Hors ligne : consultation possible, enregistrement impossible… »

Handball Engine a été arrêté pendant que vous travailliez. Ce bandeau apparaît sur les pages Accueil, Bibliothèques et Trames, dès que vous faites une action qui a besoin du serveur (ouvrir un exercice, enregistrer…). Vous pouvez encore consulter vos exercices et vos trames, mais les boutons d'enregistrement sont grisés.

1. Relancez Handball Engine.
2. Attendez une quinzaine de secondes au plus : le bandeau disparaît tout seul et les boutons redeviennent actifs.

Dans le Board, le message est : « Le serveur local est arrêté : la modification n'est pas enregistrée. Relancez Handball Engine. »

### J'ai perdu des modifications de trame

Rouvrez la trame sur le même ordinateur et dans le même navigateur. Si le bandeau « Modifications non enregistrées retrouvées. » apparaît, cliquez sur « Reprendre », puis sur « Enregistrer ».

### Je ne peux pas dessiner de trajectoire

Une trajectoire part toujours d'un joueur. Placez d'abord un joueur, puis cliquez dessus pour commencer le tracé. Sans joueur sur le terrain, les boutons de trajectoire sont grisés.

### Je ne peux plus ajouter de joueur à un poste

Chaque équipe est limitée à 6 joueurs de champ et 1 gardien. Supprimez un joueur ou changez d'équipe.

### L'enregistrement d'un exercice est refusé

Lisez le message affiché. Les causes les plus fréquentes :

- la durée n'est pas un nombre entier entre 1 et 180 ;
- les notes dépassent 2000 caractères.

Le champ en cause est mis en évidence.

### L'export PDF ne démarre pas

Lisez le message rouge et suivez-le. Les cas sont listés au chapitre 7.3.

Si le message parle d'un « Schéma indisponible », ouvrez l'exercice dans le Board, puis relancez l'export.

### Le PDF est coupé ou un bloc déborde

Un bloc contient au plus 4 exercices et doit tenir sur une page. Scindez le bloc en deux, ou raccourcissez les descriptions des exercices.

### « Ce fichier n'est pas une sauvegarde Handball Engine. »

Le fichier choisi pour « Restaurer… » n'est pas une sauvegarde. Choisissez le fichier `handball-engine-sauvegarde-…json` téléchargé depuis l'accueil.

### La tablette ou un autre ordinateur ne trouve pas l'application

C'est normal. Pour protéger vos données, Handball Engine n'accepte que l'ordinateur sur lequel il est lancé. Travaillez sur cet ordinateur.

### Le bouton d'installation n'apparaît pas dans Chrome ou Edge

- Vérifiez que l'adresse est bien `localhost:3000`.
- Vérifiez que l'application n'est pas déjà installée (cherchez « Handball Engine » dans vos applications).
- Rechargez la page, puis cherchez « Installer » dans le menu du navigateur.
