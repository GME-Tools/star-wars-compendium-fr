# Inventaire automatisé — Star Wars Compendium FR

Source: `febf63f384a522e2cb7662a36e17d70d4d867732` · Module 0.0.35

## Packs

| Pack | Origine | Extraction | Documents | Dossiers | Pages | Effects | Changes | Erreurs JSON |
|---|---|---|---:|---:|---:|---:|---:|---:|
| livres | src/packs | OK | 59 | 6 | 249 | 0 | 0 | 0 |
| aventures | LevelDB | OK | 1 | 0 | 0 | 0 | 0 | 0 |
| especes | LevelDB | OK | 19 | 0 | 0 | 78 | 177 | 0 |
| carrieres | src/packs | OK | 20 | 0 | 0 | 27 | 167 | 0 |
| specialites | LevelDB | OK | 114 | 0 | 0 | 281 | 668 | 0 |
| talents | src/packs | OK | 233 | 0 | 0 | 42 | 42 | 0 |
| capacites | LevelDB | OK | 22 | 0 | 0 | 0 | 0 | 0 |
| pouvoirs-de-force | LevelDB | OK | 11 | 0 | 0 | 11 | 11 | 0 |
| armes | LevelDB | OK | 37 | 7 | 0 | 14 | 14 | 0 |
| ameliorations | LevelDB | OK | 41 | 4 | 0 | 20 | 20 | 0 |
| qualites | LevelDB | OK | 30 | 0 | 0 | 5 | 5 | 0 |
| armures | LevelDB | OK | 6 | 0 | 0 | 0 | 0 | 0 |
| equipement | LevelDB | OK | 48 | 9 | 0 | 0 | 0 | 0 |
| vaisseaux | LevelDB | OK | 26 | 7 | 0 | 0 | 0 | 0 |
| pnj | LevelDB | OK | 14 | 2 | 0 | 0 | 0 | 0 |
| critiques | LevelDB | OK | 28 | 0 | 0 | 0 | 0 | 0 |
| historiques | LevelDB | OK | 27 | 8 | 0 | 0 | 0 | 0 |
| motivations | LevelDB | OK | 0 | 0 | 0 | 0 | 0 | 0 |
| obligations | LevelDB | FAIL | 0 | 0 | 0 | 0 | 0 | 0 |
| armes_vaisseaux | LevelDB | OK | 19 | 0 | 0 | 0 | 0 | 0 |
| degats_critiques | LevelDB | OK | 18 | 0 | 0 | 0 | 0 | 0 |
| capacites_emblematiques | LevelDB | OK | 38 | 0 | 0 | 0 | 0 | 0 |

## Liens entre compendiums

- Occurrences de références internes : 1619
- Références résolues : 1477
- Occurrences non résolues : 142
- Paires source/cible non résolues : 136

Les références sont contrôlées par expression régulière; liens sans UUID et références aux pages de journal nécessitent un contrôle complémentaire.

## Extraction

- obligations: ModuleError: Iterator is not open: cannot call next() after close()     at Iterator._next (/home/runner/work/star-wars-compendium-fr/star-wars-compendium-fr/node_modules/abstract-level/lib/deferred-iterator.js:56:31)     at /home/runner/work/star-wars-compendium-fr/star-wars-compendium-fr/node_modules/abstract-level/lib/deferred-iterator.js:54:32     at [undefer] (/home/runner/work/star-wars-compendium-fr/star-wars-compendium-fr/node_modules/abstract-level/abstract-level.js:755:7)     at /home/runner/work/star-wars-compendium-fr/star-wars-compendium-fr/node_modules/abstract-level/abstract-level.js:163:25 {   code: 'LEVEL_ITERATOR_NOT_OPEN' } 

## Limites

La présence de documents ne prouve ni l'exhaustivité éditoriale ni la validité des Active Effects en jeu.
Ce rapport reste un contrôle statique. Les cas de test V13 seront traités séparément.
