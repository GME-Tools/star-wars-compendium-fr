---
name: swffg-deliver
description: Générer et tester les sorties du corpus Star Wars FFG/Edge validé : index/recherche pour le viewer web et packs Foundry V13, puis autres adaptateurs, sans faire de la représentation Foundry la source de vérité.
---

# Adaptateurs et livraison du corpus

Entrée : version précise des textes et entités canoniques, attestations et statut de validation.
Sortie : projections déterministes et rapports de compatibilité/régression.

1. Identifier la cible : site web indépendant, Foundry V13 starwarsffg, export interopérable, ou autre cible ultérieure. Définir un schéma et des tests propres à cette cible.
2. Ne prendre que les données validées dans la portée explicitement approuvée, ou produire un export de prévisualisation **identifié non validé** dans un environnement privé. Respecter la séparation des droits : le viewer public ne contient pas automatiquement les textes intégralement transcrits.
3. Générer les index de recherche par livre, catégorie, mot-clé, source, page, relation et langue. Conserver les URLs/IDs stables, les références aux chapitres et le contenu textuel autorisé.
4. Pour Foundry V13 : projeter les champs en documents Item/Actor/JournalEntry, gérer les arbres et relations, réutiliser les _id/UUID existants autant que possible, comparer les effets mécaniques à l'implémentation en jeu. Les Active Effects sont une couche optionnelle, jamais la règle canonique.
5. Compiler dans un répertoire isolé, sans écraser les packs publiés. Valider les schémas, les nombres de documents, les liens, la présence des assets autorisés et les comportements représentatifs dans Foundry V13.
6. Mesurer les écarts entre édition source et projection : champ impossible à représenter, comportement non automatisé, conversion avec perte, avertissements de licence et compatibilité.
7. Publier seulement après approbation du lot/export et contrôles adaptés ; conserver manifeste de génération (source SHA, schémas, outils et versions) pour reproductibilité.
8. Le traitement de l'ensemble des livres est indépendant de l'existence actuelle d'un adaptateur : une catégorie encore non supportée ne doit pas être abandonnée.

Ne pas activer une publication GitHub Actions ou une release depuis la branche de travail sans décision explicite.
