# Architecture du corpus Star Wars FFG/Edge

## Objectif réel
Construire **toutes les données structurées** et **les textes intégraux fidèles** de tous les ouvrages accessibles de la gamme, sans faire de SWE02, de Foundry ou d'OggDude une limite structurelle. SWE02 est le premier livre dans la file de travail. Le corpus est un produit durable, indépendamment des adaptateurs.

Le dépôt contient déjà src/packs/ avec des JSON FR, et un suivi manuel des livres dans README.md. Les deux doivent être réutilisés. Le catalogue créé dans corpus/books.json reprend les ouvrages listés dans README.md **sans prétendre que cette liste est bibliographiquement exhaustive**. De nouveaux livres s'ajoutent à mesure de leur vérification.

## Composants

1. **Orchestrateur** : .agents/skills/swffg-orchestrate/SKILL.md choisit les livres, sections, lots et compétences, suit blocages et validations.
2. **Moteur de suivi déterministe** : tools/corpus.mjs pour catalog, init, add-unit, status, next, check. Il gère les IDs/états et évite une relecture complète des conversations.
3. **Ingestion** : swffg-ingest prend le PDF d'une édition, en qualifie les pages, extrait par couche texte, rend les zones ambiguës, puis applique OCR ciblé si nécessaire.
4. **Rapprochement** : swffg-reconcile indexe OggDude, src/packs et les autres livres canoniques. Les datasets secondaires donnent des **candidats**, jamais le texte intégral ni une preuve de conformité.
5. **Filière intégrale** : swffg-fulltext reconstruit fidèlement tous les blocs éditoriaux, tables, notes, encadrés et légendes.
6. **Filière métier** : swffg-entities crée les objets et relations à partir des mêmes blocs ; le modèle est extensible à toutes les catégories.
7. **Assurance qualité** : swffg-quality réalise les tests automatiques, la contre-lecture indépendante, puis prépare les paquets humains.
8. **Adaptateurs** : swffg-deliver transforme le corpus validé en web, Foundry V13 ou autres formats futurs.

## Surfaces de stockage

**Métadonnées publiques, versionnées**
- corpus/books.json : inventaire de départ (titre, référence, gamme, catégorie, provenance) ; pas de PDF ni de transcription.
- AGENTS.md, skills, docs et scripts : modes opératoires et validations.
- README.md : suivi historique existant, conservé à côté du nouveau catalogue jusqu'à un rapprochement décidé.

**Atelier privé/local, exclu de Git**
- .swffg-work/books/BOOK/state.json : pagination, unités, états, empreintes, dépendances, validation et fichiers.
- .swffg-work/books/BOOK/source/ : PDF du livre/édition, références aux errata et autres sources fournies.
- .swffg-work/books/BOOK/ingest/ : cache du texte brut, images de contrôle, mapping pages, blocs et zones OCR.
- .swffg-work/books/BOOK/fulltext/ : transcription hiérarchisée complète, figures et tableaux.
- .swffg-work/books/BOOK/entities/ : données structurées (YAML ou JSON suivant schéma décidé) et attestations.
- .swffg-work/books/BOOK/reconcile/ : rapprochements avec sources existantes.
- .swffg-work/books/BOOK/qa/ : tests, relectures, écarts, acceptation humaine.
- .swffg-work/shared/ : catalogue inter-livres des identités, descriptions autorisées, variantes et relations.
- .swffg-work/exports/ : projections privées et prévisualisations.

Le dossier privé doit être sauvegardé séparément. Un changement de machine sans copie de l'atelier ne doit pas être présenté comme une reprise complète. Les scripts n'y créent jamais du texte officiel fictif.

## Granularités et identité

- Collection → Gamme → Ouvrage → Édition (PDF/errata) → Chapitre → Section → Unité de pages → Bloc.
- **Unité de production** : fragment borné de pages et de structure éditoriale ; couvre les deux filières, pas une seule catégorie de jeu.
- **Entité canonique** : concept de jeu stable, indépendamment de sa traduction/édition.
- **Attestation** : occurrence du concept dans une édition/page/bloc avec valeur, texte, version ou variante.
- **Identifiants externes** : clés OggDude, UUID Foundry, références bibliographiques, sans écraser l'ID canonique.
- **Texte intégral** : blocs originaux avec position, hiérarchie, relation et support de table/image, liés à des attestations.
- Chaque artefact garde ses provenances et un statut de qualité; pas de duplications silencieuses entre sources.

Exemple *illustratif*, sans texte officiel :

~~~yaml
id: talent.example
type: talent
name: {fr: "Exemple fictif"}
external_ids:
  foundry: []
  oggdude: []
attestations:
  - book: SWE02
    edition_sha256: "<empreinte PDF>"
    source_spans: [{pdf_page: 12, printed_page: 8, block_id: "SWE02-P12-B03"}]
    values: {ranked: true}
    review_status: candidate
~~~

## Scheduling, couverture et qualité

Tous les livres du catalogue sont une file de production. L'ordre par défaut donne priorité à SWE02 puis suit la disponibilité des PDF et les dépendances métiers, sans imposer un ordre rigide entre les gammes.

Pour chaque édition, un inventaire couvre **toutes** les pages et délimite les unités. Chaque bloc significatif produit du texte intégral, une donnée structurée et le texte, ou une justification explicite de l'absence de fiche métier. La couverture se mesure en pages/blocs, pas en nombre de talents.

États recommandés des unités : planned → extracted → transcribed → modelled → auto_checked → agent_checked → ready_for_human_review → human_approved. Des sous-états texte et données sont conservés si une filière avance plus vite. « blocked » est indépendant de l'état pour permettre la reprise.

Une validation mécanique ne peut garantir la fidélité. Relecture agentique indépendante à partir de la source, puis approbation de l'utilisateur. Les pages/tableaux complexes et valeurs critiques reçoivent une revue plus stricte. Toutes les actions importantes sont idempotentes ou journalisées.

## Reproductibilité et économies de tokens

- Un index OggDude épinglé par commit, mis en cache et partagé par les livres.
- Extraction PDF une fois par empreinte, cache des blocs + rendus des zones problématiques uniquement.
- Prompts à portée d'unité et de quelques objets candidats, pas le livre entier.
- Découpage des responsabilités sans relecture N fois des mêmes contenus.
- Tests de couverture/schémas/relations par code, sans agent.
- Rapport de progression calculé depuis l'état sur disque, non depuis la mémoire conversationnelle.
- La relecture indépendante cible l'erreur sémantique ; ne la remplacer ni par l'autovalidation du producteur ni par un second résumé.

## Confidentialité et distribution

Ce dépôt GitHub est public. Les matériaux issus de PDF commerciaux et les longues descriptions de datasets tiers ne doivent pas être copiés dans les commits et artefacts publics sans autorisation. Le processus peut créer **l'intégralité du corpus privé**, puis générer des variantes de diffusion conformes aux droits disponibles. La disponibilité technique du corpus n'équivaut pas à une autorisation de republication.

## Definition of Done

Un livre est complet si : pages/sections et blocs couverts, texte intégral fidèle, objets métier et liens traités, errata/variantes explicités, rapports automatiques et revue agentique archivés, approbation humaine explicite enregistrée. Le site web et Foundry peuvent alors être générés séparément ; un adaptateur incomplet n'invalide pas la complétude de la base.
