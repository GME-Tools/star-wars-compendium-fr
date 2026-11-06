# Exécution Codex — corpus complet de la gamme

## Préparation
Depuis la branche de travail, placer les PDF et ressources autorisées dans un espace privé accessible à Codex. Ne pas verser les textes intégraux dans le dépôt GitHub public. Conserver une sauvegarde privée du dossier .swffg-work/.

Les procédures sont dans AGENTS.md et le skill $swffg-orchestrate. Celui-ci délègue à six skills : swffg-ingest, swffg-reconcile, swffg-fulltext, swffg-entities, swffg-quality, swffg-deliver.

Le catalogue doit contenir tous les ouvrages du README ; il est **extensible** à d'autres références. Il ne signifie pas que les PDF soient disponibles ni que les livres aient été vérifiés.

## Démarrer
~~~bash
node tools/corpus.mjs catalog
node tools/corpus.mjs init SWE02 --pdf /chemin/prive/SWE02.pdf
node tools/corpus.mjs status SWE02
node tools/corpus.mjs next SWE02
~~~

Le CLI maintient les états et vérifie le respect des contrats de suivi. Il **ne fait pas lui-même l'OCR, la traduction, l'extraction sémantique, la revue agentique ou l'approbation humaine** : ces tâches sont exécutées par Codex via les skills appropriés.

## Prompt maître réutilisable

> Utilise $swffg-orchestrate pour **produire le corpus complet de Star Wars FFG/Edge**, ouvrage après ouvrage. Le catalogue initial est corpus/books.json. Commence par SWE02, mais ne limite jamais l'architecture aux livres de base ni aux deux pilotes. Lis les sources réellement accessibles et le statut persistant, qualifie les PDF et crée un plan couvrant toutes les pages. Pour chaque unité, rapproche OggDude et src/packs, réalise le texte intégral fidèle et les données structurées, vérifie les deux filières automatiquement et par un agent relecteur indépendant, puis prépare les lots pour ma validation. Continue toutes les étapes autonomes réalisables et conserve les artefacts/reports pour reprendre sans perte de contexte. Ne publie aucun texte sous droits dans ce dépôt public, ne modifie pas les packs distribués. À la fin de la session, produis couverture chiffrée, exceptions, blocages, et prochaine action exécutable.

## Reprendre plus tard

> Utilise $swffg-orchestrate en mode continue. Exécute node tools/corpus.mjs status et next, récupère les manifestes et artefacts privés, puis poursuis les unités réalisables sans repartir de zéro. Signale uniquement les arbitrages nécessitant mon intervention.

## Ajouter un livre

Le registre corpus/books.json est la liste amorcée à partir du README, pas un verrou. Ajouter une entrée avec id unique, titre, gamme, référence si connue et source de catalogage, puis initialiser son état privé.

## Unité de production
~~~bash
node tools/corpus.mjs add-unit SWE02 SWE02-CH01-001 --pages 12-15 --title "Titre vérifié"
node tools/corpus.mjs status SWE02
node tools/corpus.mjs check SWE02
~~~
Les pages ci-dessus sont **purement illustratives** : ne pas les utiliser sans consulter le PDF.

Codex renseigne les états réels dans .swffg-work/books/BOOK/state.json et les artefacts correspondants. Ne pas avancer un état pour « faire joli » : chaque passage est conditionné par des preuves et les contrôles associés.

## Critères de validation
- Pagination et unité réelles ; texte intégral et tables vérifiés, illustrations ancrées.
- Entités et relations avec attestations par ouvrage, pas une fusion indistincte d'OggDude.
- Couverture complète de l'ouvrage, écarts et exceptions comptés.
- Revue indépendante ciblée sur les preuves sources ; validation humaine distincte.
- Export web et Foundry V13 **après** définition des projections et tests, sans empêcher le corpus d'avancer.

## Stratégie de lots
Calibrer l'extraction et la QA sur un passage simple et un complexe lors du premier livre, puis **enchaîner réellement tout le livre**. On peut prendre de grands lots quand le texte est simple et diminuer la granularité pour tables/arbres/OCR ; cela n'est pas un plafond de production.
