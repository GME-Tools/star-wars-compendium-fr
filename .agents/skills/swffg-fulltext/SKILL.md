---
name: swffg-fulltext
description: Reconstruire fidèlement et complètement le texte intégral structuré de chaque ouvrage Star Wars FFG/Edge à partir des pages PDF, avec titres, tableaux, encadrés, illustrations et provenance par bloc.
---

# Filière texte intégral

Entrée : une unité de pages identifiées et leurs blocs/rendus, plus éventuellement le journal Foundry existant.
Sortie : document(s) structurés, registre de blocs, anomalies et critères de couverture.

1. Reprendre **l'ordre éditorial** de l'édition : titres hiérarchisés, paragraphes, listes, renvois, citations, exemples, tables, encadrés, notes et légendes. Stocker chaque bloc avec ID stable, page PDF/imprimée, type et position/source.
2. Choisir Markdown pour la prose simple ; HTML sémantique ou blocs/structures séparées pour tableaux complexes, colonnes, encadrés, images légendées, notes et éléments qu'un Markdown basique dégraderait. Ne pas imposer un unique format lorsque la fidélité en souffrirait.
3. Conserver les formulations et la ponctuation de la source. Ne pas corriger un texte officiel ou une coquille silencieusement ; consigner les anomalies et les éventuelles éditions/errata séparément. Une reformulation destinée à une fiche de règles appartient à swffg-entities.
4. Pour les images : enregistrer ancrage, légende, page, type d'illustration et chemin privé de l'asset si extractible ; ne pas inventer d'images et ne pas perdre leur position logique.
5. Pour les tableaux : préserver cellules, lignes et colonnes, en-têtes, notes, valeurs, signes et unités. Comparer visuellement au rendu, en particulier les dés/symboles du système.
6. Contrôler le nombre et la succession des blocs : chaque portion significative du PDF doit être transcrite, représentée visuellement ou explicitement signalée comme hors périmètre avec justification. Les pages de titre, cartes, sommaires et annexes font partie du livre.
7. Réutiliser un texte de src/packs/livres seulement après comparaison avec la bonne édition/page, puis documenter les différences. Un ancien texte HTML n'est pas une preuve.
8. Attacher aux blocs des références croisées vers les entrées structurées créées par swffg-entities, sans dupliquer massivement les descriptions.

Livrer un aperçu de qualité sur les cas complexes et un rapport de couverture. Puis envoyer une copie indépendante des pages/rendus et du texte à swffg-quality pour recherche d'omissions/altérations.

Tous les contenus et captures susceptibles de reproduire le livre restent dans l'espace privé, et non dans des commits/artefacts CI publics. La transcription intégrale n'est ni remplacée par OggDude ni supprimée au motif que la donnée structurée existe.
