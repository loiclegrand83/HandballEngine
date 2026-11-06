# Documentation — Handball Engine

## Sommaire

| Document | Pour qui | Contenu |
|---|---|---|
| [guide-utilisateur.md](guide-utilisateur.md) | Entraîneurs | Installation, premier exercice, bibliothèques, trame, export PDF, sauvegarde, raccourcis, dépannage |
| [architecture.md](architecture.md) | Développeurs | Organisation technique du projet (serveur, base de données, pages, échanges) |
| [relecture.md](relecture.md) | Équipe projet | Compte rendu de relecture de la documentation (verdict, problèmes relevés, points vérifiés) |

Autres ressources :

- [`../pages/guide.html`](../pages/guide.html) : guide en une page, intégré à l'application (lien « Guide » de la barre de navigation).
- [`../README.md`](../README.md) : présentation technique et démarrage rapide.

---

## Le projet en une page

### En une phrase

Handball Engine est un outil local qui aide l'entraîneur de handball à dessiner ses exercices, à les ranger, à composer ses séances et à les imprimer.

### Pour qui

Pour l'entraîneur qui prépare ses séances sur un ordinateur, sans compte, sans abonnement et sans connexion Internet obligatoire.

### Ce que l'on peut faire

- **Board** : dessiner un exercice sur un terrain complet ou un demi-terrain. Joueurs par équipe et par poste, matériel (ballons, plots, haies…), trajectoires (course, passe, tir, croisé, fixation), animation pas à pas.
- **Versions** : chaque enregistrement d'exercice ou de trame crée une version numérotée. L'historique permet de revenir en arrière sans rien perdre.
- **Bibliothèques** : ranger les exercices dans des classeurs. Un exercice peut appartenir à plusieurs bibliothèques. Recherche par mot et par thématique.
- **Trame** : composer une séance en blocs (échauffement, exercice, opposition, retour au calme). Durée totale et liste du matériel calculées automatiquement. La trame garde la version exacte de chaque exercice.
- **Export PDF archivé** : imprimer la trame avec schémas, descriptions, matériel et cadre de notes. Chaque export est conservé avec sa date et son numéro de version.
- **Planning** : calendrier des entraînements et des matchs, par mois ou par semaine.
- **Sauvegarde** : un seul fichier contient toutes les données. La restauration garde une copie de l'état précédent.

### Comment ça marche

- L'application tourne sur l'ordinateur de l'entraîneur. On la lance, puis on l'ouvre dans Chrome ou Edge à l'adresse `http://localhost:3000`.
- Elle peut être installée comme une application (icône et fenêtre dédiées).
- Les données restent sur l'ordinateur. Vos données restent sur l'ordinateur, et les autres appareils du réseau ne peuvent pas s'y connecter.
- Si l'application est arrêtée en cours de travail, la consultation reste possible ; l'enregistrement reprend dès qu'elle est relancée.

### Les pages

| Page | Adresse | Rôle |
|---|---|---|
| Accueil | `/` | Raccourcis, bibliothèques, trames et exercices récents, sauvegarde |
| Bibliothèques | `/pages/bibliotheque.html` | Classer, chercher, consulter l'historique des exercices |
| Trames | `/pages/seance.html` | Composer, enregistrer et exporter une séance |
| Board | `/pages/board.html` | Dessiner et animer un exercice |
| Planning | `/pages/planning.html` | Calendrier des entraînements et des matchs |
| Guide | `/pages/guide.html` | Résumé d'utilisation en une page |
