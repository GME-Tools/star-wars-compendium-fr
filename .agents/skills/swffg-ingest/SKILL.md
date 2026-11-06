---
name: swffg-ingest
description: Ingestion fiable de PDF de n'importe quel ouvrage Star Wars FFG/Edge, qualification de couche texte, pagination, extraction par blocs, tableaux, images, rendus et OCR ciblé pour alimenter le corpus intégral.
---

# Ingestion documentaire multi-livres

Entrée : ouvrage du catalogue, PDF local privé de l'édition identifiée, éventuels scans complémentaires.
Sortie : manifeste d'édition/empreinte, inventaire complet des pages, carte imprimée↔PDF, extraction ordonnée et géométrique par blocs, inventaire tableaux/encadrés/images, rapport de qualité.

1. Identifier la version exacte de l'ouvrage, langue, PDF, nombre de pages, checksum SHA256. Différencier les pages liminaires des pages imprimées; vérifier la pagination sur les rendus.
2. Extraire d'abord la couche texte native et ses coordonnées, sans perte de l'original. Préserver lignes, colonnes, ligatures, césures et ordre logique ; conserver un cache déterministe réutilisable.
3. Échantillonner plusieurs mises en page pour calibrer la méthode : prose simple, plusieurs colonnes, tableaux, encadrés, illustrations, pages de fin. Établir critères de qualité et confiance par page.
4. Sur pages ambiguës : rendre visuellement et vérifier. OCR **uniquement les régions qui le nécessitent** (texte manquant/corrompu), puis confronter au rendu. Ne jamais faire passer une sortie OCR brute pour une transcription validée.
5. Inventorier chaque page, titre, section, figure, table, encadré, légende, note et renvoi; ne pas effacer les pages sans données métier. Segmenter de façon déterministe si possible ; confier les frontières ambiguës à l'agent.
6. Bâtir le plan **de couverture complète** du livre, jusqu'à la dernière page ; conserver un état explicite des pages sans texte, blancs/illustrations et exclusions justifiées.
7. En cas de changement de PDF/empreinte, invalider uniquement les unités touchées après comparaison de pages ; ne pas substituer discrètement une autre édition.

Les outils d'extraction ou OCR installés dans Codex peuvent évoluer. Les scripts reproductibles et le rendu PDF font foi pour l'observation technique ; l'inspection visuelle est requise pour les pages complexes.

Ne pas engager d'édition de données métiers ici ; appeler swffg-fulltext et swffg-entities après l'ingestion. Ne pas placer PDF, rendus, OCR ou transcriptions dans Git public.

Échec : produire une liste page/région/cause, enregistrer le blocage, poursuivre les pages valides.
