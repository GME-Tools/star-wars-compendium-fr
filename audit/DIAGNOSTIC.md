# Diagnostic de récupération — 5 novembre 2026

## État vérifié

L'action d'audit a exécuté `fvtt package unpack` sur les packs sans source JSON. Le rapport reproductible est dans `audit/results/REPORT.md` et `audit/results/inventory.json`. Les documents extraits sont accessibles en artefact GitHub Actions, et ne sont pas encore promus comme sources canoniques.

- 811 documents inventoriés, répartis sur 20 familles non vides.
- 43 dossiers et 249 pages de journaux.
- 478 Active Effects, 1 104 changements d'effets.
- 21 des 22 packs ont été lus ou extraits sans erreur de commande ; `motivations` s'ouvre mais n'a livré aucun document.
- 1 pack en échec : `obligations`, déclaré sur le chemin physique `packs/obligationss`.

## Blocage LevelDB

Un premier essai utilisait à tort `packs/obligations` alors que le manifeste désigne `packs/obligationss`. Après correction, l'extraction accède au répertoire mais échoue avec `LEVEL_ITERATOR_NOT_OPEN` (« Iterator is not open »). C'est une erreur de lecture du pack, pas une absence de dossier. **Ne pas modifier ni supprimer ce pack avant sauvegarde et tentative de récupération contrôlée**.

## Références

L'inventaire signale 1 619 occurrences d'UUID de documents internes, dont 1 477 se résolvent dans les documents inventoriés et 142 ne se résolvent pas. Ces 142 occurrences représentent 136 paires source-cible distinctes :

- 86 paires pointent vers l'ancien nom de pack `ameliorations_armes`, absent du manifeste courant (pack actuel : `ameliorations`).
- 48 paires pointent vers `obligations`, qui n'a pas pu être extrait.
- 1 paire pointe vers une carrière absente du jeu de sources analysé.
- 1 paire pointe vers une capacité absente.

**Attention :** les deux premiers ensembles ne démontrent pas 134 documents manquants : les références peuvent être des noms de pack obsolètes ou devenir résolubles après récupération LevelDB. Il faut comparer les identifiants après extraction complète avant de conclure.

## Doublon de dénomination

Deux spécialités portent le nom français « Éclaireur ». Leurs identifiants distincts ne constituent pas à eux seuls une erreur : vérifier si elles correspondent à deux arbres différents et documenter leurs noms originaux.

## Limites de la preuve

L'analyse vérifie des documents exportés, pas le bon fonctionnement de leurs effets dans Foundry V13. La résolution par regex ne couvre pas tous les UUID de pages, les relations implicites ou les liens externes. Les métriques ne démontrent pas l'exhaustivité par ouvrage.

## Suites prioritaires

1. Récupérer `obligationss` sur copie isolée, examiner les fichiers LevelDB et retenter l'export ; conserver l'original.
2. Vérifier les 86 références `ameliorations_armes` par identifiant contre les 41 documents `ameliorations`.
3. Résoudre les deux références isolées et vérifier les spécialités « Éclaireur ».
4. Ajouter des contrôles d'intégrité pour les pages des journaux et les relations propres aux spécialités.
5. Établir la couverture éditoriale par ouvrage, puis commencer la migration canonique pilote.
