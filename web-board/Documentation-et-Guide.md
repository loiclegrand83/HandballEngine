# 🤾‍♂️ Handball Tactical Board - Documentation & Guide

Bienvenue dans la documentation officielle du **Handball Tactical Board**, votre outil ultime pour concevoir, animer et partager vos exercices de handball comme un pro !

---

## 🏗️ Architecture & Structure du Projet

L'application est construite autour d'une architecture moderne, légère et autonome. Elle ne nécessite pas de base de données lourde ni de connexion internet pour fonctionner. Tout est pensé pour être rapide et pérenne.

### Le Modèle Technologique
- **Frontend (L'interface)** : Conçu en pur **HTML5, CSS3 et JavaScript (Vanilla)**. Aucun framework lourd (comme React ou Angular) n'est utilisé, ce qui garantit une vitesse d'exécution fulgurante et un contrôle absolu sur le dessin (via l'élément `<canvas>`).
- **Backend (Le serveur local)** : Un mini-serveur natif en **Node.js** gère la distribution des fichiers et fait le pont avec votre disque dur.
- **Stockage (La base de données)** : Les exercices sont sauvegardés sous forme de fichiers **JSON** physiques. Cela permet un archivage durable, l'envoi par email, et une compatibilité infinie.

### Le Rôle des Fichiers

Voici ce que contient le dossier `web-board` :

* 📄 **`index.html`** : Le squelette de la page. C'est ici que sont définis les menus, les boutons, et l'espace de dessin (le *canvas*).
* 🎨 **`styles.css`** : Le designer de l'application. Il gère l'esthétique sombre, les effets de verre (glassmorphism), les couleurs néon, et l'ergonomie globale pour un rendu professionnel.
* 🧠 **`app.js`** : Le cerveau de l'application. Ce fichier contient toute la logique mathématique (tracés de courbes de Bézier, calculs des trajectoires), la gestion des clics, le moteur d'animation temporelle, et la communication avec le serveur.
* ⚙️ **`server.js`** : Le chef d'orchestre local. Il lance un serveur web sur votre machine, ouvre le navigateur, et s'occupe de lire/écrire les fichiers JSON quand vous enregistrez vos exercices.
* 📁 **`bibli/`** (Dossier) : Votre coffre-fort. C'est ici que le serveur range soigneusement chaque exercice sous forme de fichier `.json`.
* 🚀 **`Lancer-Board.sh` / `Handball-Board.desktop`** : Vos clés de contact. Ces fichiers permettent de lancer l'application en un simple double-clic sans jamais ouvrir un terminal de commande.

---

## 🎮 Guide d'Utilisation Ludique (Le "Comment qu'on joue ?")

Prêt à dessiner la tactique du siècle ? Suivez le guide !

### 1. Démarrer la machine 🚀
Double-cliquez sur `Handball-Board.desktop` ou `Lancer-Board.sh`. Boom ! Le serveur démarre, votre navigateur s'ouvre, et le terrain vous attend.

### 2. Peupler le terrain 🏃‍♂️
1. Regardez en bas de l'écran, dans le panneau **Haies & Assets**.
2. Cliquez sur l'élément de votre choix (un joueur, un ballon, un plot, etc.).
3. Cliquez n'importe où sur le terrain pour le poser. Magique !
4. **Astuce de pro :** Choisissez l'Équipe A (Bleu) ou l'Équipe B (Rouge) avant de poser un joueur pour qu'il prenne la bonne couleur et qu'un numéro automatique lui soit attribué !
5. **Tourner ou Supprimer :** Un *double-clic* sur un objet le fait pivoter de 90°. Un *clic-droit* le supprime du terrain.

### 3. Mode "Sélect" (Le doigt magique) 👆
Dans le menu de gauche, choisissez le mode **Sélect**.
- Cliquez et glissez un joueur pour le déplacer.
- Cliquez sur une trajectoire pour faire apparaître ses "points de contrôle" (les petits ronds blancs). Vous pouvez alors tirer sur ces points pour courber votre passe ou votre course avec une précision millimétrique !

### 4. Dessiner comme Picasso 🎨
Le menu de gauche vous offre trois pinceaux :
- **Course (Bleu pointillé)** : Tracez le déplacement d'un joueur.
- **Passe (Jaune pointillé)** : Tracez la trajectoire du ballon entre deux joueurs.
- **Tir (Rouge vif)** : BOUM. La frappe vers le but.

*Comment faire ?* Cliquez sur un point de départ, puis cliquez pour ajouter des points de passage. Une courbe élégante se dessine automatiquement !
Quand vous avez fini votre tracé, cliquez sur **Terminer traj.** (ou changez de mode).

### 5. L'Animation... Action ! 🎬
Vous avez tracé une course et une passe ?
1. Cliquez sur le bouton "toggle" **[ Lié à la trajectoire précédente ]** avant de dessiner un nouveau trait si vous voulez que les actions s'enchaînent de manière synchronisée (le joueur court EN MÊME TEMPS que la passe part).
2. Laissez-le décoché pour que l'action se passe *après* la précédente.
3. Cliquez sur **▶ Animation** et admirez vos petits joueurs bouger tout seuls sur le terrain comme de vrais pros. Appuyez sur **⏹ Arrêter** pour les remettre à leur place initiale.

### 6. Gérer sa Bibliothèque 📚
* "C'est beau, mais je veux le garder pour demain !"
* Donnez un **Nom** à votre chef-d'œuvre, choisissez une **Catégorie** (Ex: Montée de balle), écrivez quelques notes de coaching, et cliquez sur **Enregistrer**.
* Cliquez sur **Bibliothèque**. Vos exercices sont là, bien rangés, triables par couleur et catégorie. Un clic sur "Charger" et le terrain se remplit de nouveau.

### 7. Le Partage (L'export JSON) 🤝
Vous voulez envoyer votre exercice à l'entraîneur adjoint ? Cliquez sur **Export JSON**. Un petit fichier se télécharge. Envoyez-le par mail. L'adjoint n'aura qu'à cliquer sur "Choisir un fichier" sous "Importer JSON" sur son propre logiciel, et votre exercice apparaîtra sur son écran !

---

Amusez-vous bien, et que la tactique soit avec vous ! 🤾‍♀️🔥
