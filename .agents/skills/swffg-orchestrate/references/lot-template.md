# Unité de travail — contrat valable pour tous les ouvrages

Ce document est un modèle de **suivi**, pas la limite du système. Le corpus doit couvrir chaque page de chaque ouvrage accessible, avec des unités suffisamment petites pour être inspectables mais suffisamment larges pour avancer efficacement.

Le registre machine est maintenu par tools/corpus.mjs dans .swffg-work/books/BOOK/state.json. Pour chaque unité, renseigner :
- identité : book_id, unit_id, empreinte PDF, pages physiques et imprimées, titre/section, dépendances ;
- ingestion : cache et blocs source vérifiés (avec boîtes englobantes si utile) ;
- texte intégral : sorties, couverture des blocs, mise en forme des tableaux/encadrés/images ;
- entités : listes des objets et attestations, références, variantes, exceptions ;
- écarts : OggDude/Foundry/source officielle et conflits ouverts ;
- QA : preuves des contrôles automatiques, relecture indépendante et acceptation humaine ;
- statut opérationnel et blocages pour reprise automatique.

Un bundle JSON par unité (.swffg-work/books/BOOK/units/UNIT/bundle.json) expose la relation entre blocs de source, transcriptions, objets structurés et fichiers privés. Voir corpus/unit-bundle.example.json et node tools/check-bundle.mjs.

## Couverture

Chacun des blocs doit avoir :
1. un identifiant stable, une page et un type ;
2. un état texte (transcribed, visual_anchor, excluded avec raison) ;
3. un état métier (entities avec IDs, text_only ou blocked avec raison) ;
4. des sorties existantes et de provenance inspectable.

Une page d'illustration ou une page blanche ne doit pas être prise pour une absence mystérieuse : l'inventaire d'ingestion la note et le traitement est explicitement justifié.

## Avancement

Étapes : extraction, fulltext, entities, automatic_review, independent_review et human_approval. L'outil empêche de valider la revue indépendante avant le contrôle automatique et réserve l'approbation finale au terminal humain interactif.

La relecture agentique doit réellement consulter les preuves sources. Aucun statut « done » ne prouve à lui seul la fidélité : le paquet d'évidence doit être inspectable.

## Traitement volumineux

Commencer chaque nouvelle famille de mise en page par un échantillon, calibrer puis enchaîner **toutes** les unités. Utiliser une revue à risque et des scripts déterministes. Ne pas limiter le chantier à deux exemples, à SWE02 ni à une seule catégorie d'items.
