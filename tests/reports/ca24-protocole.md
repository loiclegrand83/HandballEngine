# CA24 — Créer un exercice complet en moins de 60 secondes

Critère : un utilisateur qui connaît l'outil crée un exercice complet (nom, terrain avec au moins deux joueurs et une passe, durée) en moins de 60 secondes.

Pilotes et date de mesure : à définir (question ouverte Q9).

## Préparation

1. Lancer Handball Engine sur le poste du pilote (`./start.sh` ou raccourci du bureau).
2. Ouvrir le navigateur en plein écran, résolution 1366×768 ou 1920×1080.
3. Montrer une fois la barre rapide du Board au pilote (Joueur J, Passe P, Course C, Tir T, Annuler, Nom, Durée, Enregistrer Ctrl+S). La mesure commence après cette démonstration.

## Mesure (3 pilotes, 1 essai chacun)

1. L'observateur ouvre `http://localhost:3000/pages/board.html?new=1` et lance le chronomètre dès que la page est affichée.
2. Le pilote, sans aide :
   - pose au moins deux joueurs ;
   - trace une passe d'un joueur à l'autre ;
   - saisit un nom et une durée dans la barre rapide ;
   - enregistre (bouton « Enregistrer » ou Ctrl+S).
3. L'observateur arrête le chronomètre à l'apparition du message « Version n°1 enregistrée ».
4. Vérifier ensuite dans « Bibliothèques » que l'exercice a bien son nom, sa durée, deux joueurs et une passe.

Seuil : 60 secondes pour **chaque** pilote. Un essai interrompu par une erreur de l'outil compte comme un échec.

## Résultats

| Pilote | Date | Durée (s) | Exercice complet (oui/non) | Remarques |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

Décision : CA24 validé si les trois durées sont inférieures à 60 s et les trois exercices complets.

Repère automatisé (indicatif, ne remplace pas la mesure) : `tests/e2e/board-quick.spec.js` réalise le même parcours en moins de 15 s.
