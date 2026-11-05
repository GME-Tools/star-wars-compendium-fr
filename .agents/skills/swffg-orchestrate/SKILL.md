---
name: swffg-orchestrate
description: Orchestrer le traitement contrôlé du PDF SWE02 (Aux Confins de l'Empire) pour produire une base Star Wars FFG structurée et le texte intégral. Utiliser pour planifier ou reprendre un lot, choisir extraction/OCR, comparer à src/packs, déclencher la relecture et préparer la validation humaine.
---

# Orchestration SWE02 — pilote Codex

Lire d'abord `AGENTS.md`. Ce skill est un **chef d'orchestre de procédure**, pas un moteur de transcription ou d'OCR. Il n'autorise ni publication ni validation humaine fictive.

## Démarrage (diagnostic, pas hypothèses)
1. Déterminer la demande exacte : `qualify`, `plan`, `produce`, `review` ou `status`.
2. Vérifier la disponibilité réelle du **PDF français SWE02** et son droit d'utilisation dans l'environnement. Ne pas supposer qu'un fichier est accessible parce qu'il a été mentionné.
3. Repérer `src/packs` et le suivi existant. Ne consulter que les fichiers utiles; préserver les documents existants.
4. Lire le manifeste du livre et du lot, si disponibles; sinon créer un **squelette sans contenu inventé** à partir du modèle dans `references/lot-template.md`.
5. Ne pas lancer un traitement de pages si leur source n'est pas disponible : produire un bilan de blocage et une préparation minimale à la place.

## Phase A — Qualifier le PDF
- Identifier édition, langue, nombre de pages PDF et pagination imprimée; conserver une table de correspondance fiable. Distinguer pages liminaires et pagination du livre.
- Échantillonner une page de prose, une page à colonnes, un tableau, un encadré et une page illustrée (si présents). Marquer les exemples effectivement observés; ne pas supposer qu'ils existent.
- Tester l'extraction native (texte présent, ordre des colonnes, signes diacritiques, coupures, notes et tableaux).
- Définir les critères de recours à l'OCR **par page ou région**. OCRiser seulement les cas non extractibles ou manifestement dégradés; contrôler sur image.
- Remettre : constat de qualité, risques, carte de pagination et **deux propositions de lots réels**, un simple et un complexe. Les pages doivent être choisies à partir du PDF observé.

## Phase B — Préparer un lot
- Préférer une section cohérente de quelques pages à un nombre fixe de pages. Éviter de couper un tableau ou une définition entre lots; si nécessaire, indiquer une dépendance explicite.
- Préparer le manifeste selon `references/lot-template.md`, avec `lot_id`, bornes de pages imprimées et PDF, objectifs, entrées, sorties, dépendances, état, blocages.
- Chercher les éléments pertinents dans `src/packs` à titre de brouillon. Différencier `reuse`, `correct`, `new`, `uncertain`.
- Réduire le contexte à l'extraction textuelle **des pages du lot** et à leurs images seulement si nécessaires; sélectionner les schémas pertinents.

## Phase C — Produire le contenu
- **D'abord le texte intégral** du lot : ordre original, titres et niveaux, paragraphes, listes, tableaux, encadrés, notes, exemples, images référencées. Conserver une segmentation stable par bloc; chaque bloc pointe vers ses pages d'origine. Ne ni résumer ni réécrire le texte.
- Puis identifier les entités structurables (talent, compétence, carrière, spécialité, espèce, qualité, équipement, règle, etc.) présentes sur les pages. Une entité ne doit pas être créée uniquement parce qu'elle est mentionnée dans un exemple.
- Construire les enregistrements canoniques en format pilote (YAML si cela satisfait la lisibilité et la validation), en séparant champ attesté, provenance, relation, et interprétation hypothétique. Ne pas créer de mécanisme de règles non attesté.
- Quand un élément existe dans `src/packs`, contrôler chaque valeur nécessaire contre le PDF et consigner différences, champs réutilisés et inconnues. Ne pas réinjecter de champs Foundry `system.*` comme champs canoniques.
- Tenir la couverture des pages/blocs; chaque bloc source a un statut : `text_only`, `structured_and_text`, `not_applicable` (avec motif), ou `blocked`.
- Ne jamais marquer un lot `structured` si un passage a été ignoré sans justification.

## Phase D — Vérifications
**Automatiques (sans modèle si possible)**
- Parse des sorties; schémas et types; IDs uniques; références existantes ou explicitement différées; pagination et provenance; couverture des blocs; hiérarchie des titres, tableaux et encadrés.
- Contrôler les valeurs critiques (coûts, chiffres, seuils, dés, rangs, conditions) contre les extraits sourcés. Un contrôle de forme n'atteste pas à lui seul de l'exactitude métier.
- Reporter les erreurs de manière exploitable (fichier, champ, page, catégorie).

**Relecture indépendante (agentique)**
- Réexaminer les pages/rendus originaux sans se limiter au rapport de l'agent producteur.
- Rechercher omissions, additions, inversions, fautes de transcription, écarts numériques, sens modifié, titres/tableaux mal structurés et correspondances `src/packs` fausses.
- Produire des écarts ponctuels, avec preuve localisée, sévérité et action proposée. Ne jamais modifier silencieusement.
- Après corrections, relancer les contrôles affectés et une revue ciblée.

**Humaine**
- Synthèse courte : pages, documents touchés, contrôles, écarts restants, décisions à prendre.
- Déclarer `ready_for_human_review` uniquement si les deux premières portes passent.
- La décision `human_approved` appartient exclusivement à l'utilisateur. Un refus entraîne une reprise ciblée.

## États et transitions
`planned -> extracted -> structured -> auto_validated -> agent_reviewed -> ready_for_human_review -> human_approved`.
`blocked` peut intervenir à n'importe quel stade. Consigner la cause et le stade de reprise. Ne jamais sauter une étape; une modification significative invalide les validations ultérieures.

## Budget tokens et outils
- Extraction PDF, découpage, comptages, hash, validation schéma et comparaison de fichiers par **scripts** en priorité.
- L'agent n'intervient que sur classification, hiérarchie éditoriale ambiguë, construction métier, et revue sémantique.
- Ne pas multiplier les relectures de tout le lot pour une erreur locale.
- Ne pas créer prématurément cinq skills et des schémas universels. À l'issue des deux pilotes, mesurer les erreurs et l'effort avant de découper en skills dédiés.
- Les sorties du contexte doivent être compactes : éviter d'imprimer en conversation des transcriptions entières.

## Sortie obligatoire par intervention
1. **Périmètre exact** et source réellement consultée.
2. **Artefacts créés/modifiés** et chemins.
3. **Couverture** : pages/blocs traités, restant, bloqués.
4. **Contrôles** effectués, résultats et limites.
5. **Décisions humaines** et prochaine opération concrète.

## Interdits pour ce pilote
Ne pas déployer de site, publier des contenus de SWE02 sur GitHub public, modifier `src/packs`, générer des Active Effects, refondre les scripts de compilation, inventer des règles, ni marquer comme validé un texte non comparé au PDF.
