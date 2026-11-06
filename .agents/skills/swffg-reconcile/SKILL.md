---
name: swffg-reconcile
description: Rapprocher les datasets OggDude anglais, les JSON Foundry français src/packs et les entités canoniques inter-livres pour éviter la ressaisie, détecter les manques et préserver les identités.
---

# Inventaire et rapprochement des sources existantes

Entrées : livre/section, édition PDF ciblée, exports OggDude épinglés, src/packs, catalogues d'entités déjà validées.

1. Référencer dépôt OggDude, commit exact, fichier XML et clés ; contrôler la licence sans supposer qu'un dépôt public permet de redistribuer ses textes. Réutiliser l'index entre plusieurs livres.
2. Parser les XML avec un parseur XML sûr, et les JSON Foundry avec un parseur JSON ; n'utiliser regex que pour des recherches non structurées. Extraire identité, type, source déclarée, valeur candidate, relations/arbres et provenance.
3. Mapper les sources anglaises aux ouvrages français par une table **explicite et réversible** ; filtrer les candidats par source, mais garder ceux de provenance inconnue dans une file d'examen, jamais comme absence définitive.
4. Rapprocher par type + identifiant attesté + structure + source. Même nom français ≠ même objet (homonymes) ; même nom anglais ≠ même édition. États : exact_verified, candidate, ambiguous, conflict, out_of_scope, not_found.
5. Confronter les candidats aux pages de l'édition PDF ; SWE02 ou le livre concerné arbitre les valeurs éditoriales. Corriger seulement dans la nouvelle couche canonique, jamais directement dans src/packs sans commande explicite.
6. Séparer « identité du concept » et « attestations par ouvrage ». Les règles réimprimées, variantes, errata et traductions préservent leurs différences et leurs sources.
7. Présenter un **rapport différentiel ciblé** : objets récupérables, manquants, uniquement Foundry, uniquement OggDude, valeurs divergentes, conflits bloquants et coût estimé de vérification. Ne transmettre à l'agent que les cas ambigus.

Lire, si besoin, la référence détaillée existante .agents/skills/swffg-orchestrate/references/oggdude-reconciliation.md. Elle est un exemple initial, pas une restriction à SWE02.

Ne pas importer les descriptions anglaises comme texte intégral français. En l'absence de PDF, les correspondances restent candidates et ne prouvent pas l'exhaustivité du livre.
