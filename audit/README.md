# Audit de récupération des données

Branche de travail : `audit/canonical-data-inventory`. Aucun fichier source de `main` ni aucun pack publié n'est modifié.

## Reproduction

Dans un environnement Node.js 20 avec les dépendances du dépôt :

```sh
npm ci
mkdir -p /tmp/foundry-root/Data/modules
ln -s "$PWD" /tmp/foundry-root/Data/modules/star-wars-compendium-fr
npx fvtt configure set dataPath /tmp/foundry-root
npx fvtt package workon star-wars-compendium-fr --type Module
node build/audit-packs.mjs
```

Le script parcourt tous les packs déclarés dans `module.json`. Il utilise les JSON déjà présents dans `src/packs` quand ils existent et tente `fvtt package unpack` pour les autres.

## Sorties

- `audit/results/inventory.json` : statistiques par pack, état d'extraction et contrôle des références internes.
- `audit/results/documents.json` : inventaire individuel des documents avec identifiant, type, fichier, nombre de pages, effets et références de sources.
- `audit/results/REPORT.md` : synthèse lisible.
- `audit/extracted/` : fichiers JSON extraits de LevelDB, à conserver en artefact plutôt que dans le dépôt avant contrôle.

Le workflow `.github/workflows/audit-inventory.yml` effectue l'extraction et publie l'artefact `starwarsffg-inventory`, puis tente de committer uniquement le résumé et l'inventaire agrégé sur cette branche.

## Limites

Ce contrôle mesure le contenu présent, et non l'exhaustivité par ouvrage. La validation regex des références ne couvre pas tous les liens aux pages des journaux, les références externes ni les relations implicites propres au système. Elle ne valide pas le comportement des Active Effects.

**Avant toute migration :** vérifier le succès du workflow, examiner les erreurs d'unpack, et contrôler un échantillon de documents extraits dans Foundry V13. Ne pas fusionner la branche avant revue.
