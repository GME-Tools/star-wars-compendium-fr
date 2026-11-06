---
name: swffg-quality
description: Vérifier automatiquement et par relecture agentique indépendante la fidélité, la complétude, la provenance et la cohérence des textes intégraux et objets structurés de tous les ouvrages Star Wars FFG/Edge ; préparer la validation humaine.
---

# Assurance qualité multi-niveaux

Entrées : PDF/éditions et rendus de pages, inventaire de blocs, textes, entités, relations, manifestes de lot, références externes.
Sorties : rapport machine, rapport sémantique indépendant, paquets de validation humaine et décisions/écarts traçables.

## Contrôles automatiques
- fichier existant et parseable ; schéma et types ; clés uniques et index sans collision ;
- chaque bloc/page déclaré avec origine et état ; pas d'intervalle non affecté à un lot ;
- chaque unité complète dans ses deux filières (ou justification explicite d'absence d'entité) ;
- référence source_spans vers un livre, sa version/empreinte, une page et un bloc existants ;
- liens canoniques résolus ou consignés dans une file d'exceptions ; liens Foundry/OggDude séparés ;
- tables : cardinalité lignes/colonnes et valeurs typées ; titres, encadrés et légendes recensés ;
- comparaison des jeux de données et alertes sur les valeurs divergentes, champs absents, références d'édition différentes ;
- contrôles de régression sur les entités partagées et attestations lors des suppléments suivants.

## Relecture agentique vraiment indépendante
Donner au relecteur les pages/rendus sources et la production, **pas** les justifications ou conclusions du producteur. Chercher activement :
1. Omission d'un paragraphe, d'une note, d'une cellule, d'un encadré ou d'un visuel ;
2. Altération du sens, de la ponctuation significative, des symboles de dés, des noms, des chiffres et des prérequis ;
3. Mauvaise hiérarchie de titres / ordre des colonnes / fragmentation de tables et notes ;
4. Fausse correspondance entre livre, objet OggDude, UUID Foundry et entité canonique ;
5. Mauvaise fusion de réimpressions, variantes et errata entre ouvrages ;
6. Défaut de source_spans et incohérence entre bloc de texte intégral et valeur structurée.
Chaque écart a gravité, page/bloc, observation vérifiable, fichier affecté et mesure corrective proposée. Une relecture indépendante n'est pas un simple « semble correct ».

## Stratégie de revue et coût
- Validation auto : exhaustive et répétable.
- Contrôle sémantique : exhaustif pour les valeurs critiques, les tableaux, les graphes/arbres, les textes OCR et les exceptions ; échantillonnage explicite sur le reste, augmenté en cas d'erreur.
- Contrôler les chapitres difficiles à granularité plus fine, sans inventer de « taux de précision » qui n'a pas été mesuré.
- Correction : assigner au producteur, conserver le rapport, relancer les tests affectés, puis une contre-relecture ciblée.
- Humain : proposer des paquets par lots/chapitres, synthèse des preuves et écarts, aperçus, choix demandés. L'utilisateur peut demander une couverture plus large ; ne pas présumer de son approbation.

## Fermeture
Un lot peut être « ready_for_human_review » seulement si les vérifications machine et agentique sont tracées ; « human_approved » nécessite une confirmation explicite de l'utilisateur avec portée et version. Après changement d'une source, d'une donnée ou d'un schéma touchant une attestation, invalider ses validations dépendantes.

Le CLI node tools/corpus.mjs check valide la structure et la couverture de suivi ; il ne certifie pas à lui seul la fidélité au PDF.
