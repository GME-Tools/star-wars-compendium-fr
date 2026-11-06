---
name: swffg-entities
description: Extraire et normaliser toutes les données structurables des ouvrages Star Wars FFG/Edge, avec schémas évolutifs, identifiants canoniques, attestations par livre, relations, arbres et mécanique indépendante de Foundry.
---

# Filière des données structurées

Entrée : blocs d'un lot transcrit depuis le PDF ; candidats OggDude et src/packs ; catalogue existant d'entités ; schémas applicables.
Sortie : entités canoniques, attestations par ouvrage, liens au texte intégral, divergences non résolues.

## Classification exhaustive
Examiner chaque bloc, pas seulement les listes d'items connues. Catégories initiales :
- règles : caractéristiques, compétences, actions/manœuvres, conditions, jets, rangs, monnaie, unités, dés, portées, tableaux, blessures/dégâts critiques, difficultés ;
- personnages : historiques, obligations, devoirs, moralités, motivations, espèces, carrières, spécialités, arbres de talents, talents, pouvoirs de Force et améliorations, capacités emblématiques ;
- équipement : catégories d'objets, armes, armures, matériel, qualités, modifications, accessoires, cybernétique, crafting ;
- véhicules : véhicules terrestres, vaisseaux, armes de vaisseaux, améliorations, équipages, actions et règles liées ;
- univers : personnages et PNJ, adversaires, créatures, factions, lieux, systèmes, planètes ;
- aventures : scènes, rencontres, tables, récompenses, événements et références documentaires ;
- tout concept nouveau identifié dans un livre doit être enregistré dans le catalogue des types avant modélisation, jamais jeté car absent d'une liste initiale.

## Démarche
1. Partir des blocs éditoriaux du lot. Étiqueter les blocs : simple texte / tableau de données / une ou plusieurs entités / règle ou interaction / illustration annotée. Renseigner la couverture même si aucune entité n'est créée.
2. Réconcilier les identités avec les objets existants et les candidats Foundry/OggDude. Conserver une clé métier stable, les IDs externes et les désambiguïsations. Ne jamais faire de simple translittération « EN=FR » comme preuve.
3. Isoler **concept global** de **attestation par édition/ouvrage** : valeur, description, exceptions, variante, errata, page/bloc. Une valeur changeante dans un supplément n'écrase pas celle d'un livre de base.
4. Représenter les relations de manière typée : appartenance carrière→spécialisation, spécialisation→arbre et cases/liaisons, item→qualité, PNJ→équipement, règle→condition, renvoi→section. Conserver ordre, coûts, coordonnées et contraintes des arbres.
5. Pour les chiffres/dés, enregistrer valeurs et unités exactes ; pour la mécanique, noter explicitement règles automatisables, conditionnelles ou non automatisées. Aucune imitation automatique d'Active Effects Foundry.
6. Lier chaque donnée à des IDs de blocs et pages du livre. Si une information n'est pas attestée dans le PDF, conserver le statut candidate/unknown ; ne pas inventer de valeur.
7. Enregistrer les besoins de schéma de manière incrémentale. Tester au moins un cas banal et une exception avant de généraliser, mais **ne pas s'arrêter à ce test** : continuer à couvrir le chapitre puis l'ouvrage.
8. Détecter les entrées absentes des deux datasets en confrontant au texte et aux tables du PDF ; les datasets ne décident pas de la complétude.
9. Compiler des index par type et par source, et des contrôles de liens vers le texte intégral. Ne jamais oublier les règles narratives non représentables comme « Item ».

## Format et validation
Les fichiers canoniques peuvent être YAML pour l'édition humaine, avec un index machine JSON dérivé et vérifié, jamais une vérité concurrente. Un enregistrement doit exposer au minimum id, type, désignation, source_spans et review_status, et des références externes si disponibles.

Les schémas évoluent par type, de façon versionnée ; les modifications incompatibles déclenchent migration et revalidation ciblées. En cas de conflit entre ouvrages, garder les deux attestations documentées jusqu'à arbitrage éditorial.

Publier seulement ce qui est autorisé et conforme aux règles de provenance. Transmettre le lot à swffg-quality pour une seconde lecture des nombres, liens, arbres et exceptions.
