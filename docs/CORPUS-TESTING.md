# Contrôles déterministes du corpus

## Outils réellement fournis

- node tools/corpus.mjs : registre multi-livres, état privé, empreinte PDF, unités et page coverage, preuves d'étapes, signature humaine interactive.
- python tools/pdf_probe.py --pdf /private/BOOK.pdf --out .swffg-work/books/BOOK/ingest --extract : inspection PDF avec PyMuPDF (à installer si absent), inventaire des pages et blocs de texte natifs. **Ne fait pas l'OCR**, indique les pages suspectes.
- node tools/check-bundle.mjs .swffg-work/books/BOOK/units/UNIT/bundle.json : vérification des blocs recensés, de la filière texte, des entités et de leur provenance, avec statut machine.
- node --test tools/tests/corpus.test.mjs : tests du registre, des gardes d'états et de la validation.

## Contrat de bundle

Le modèle purement fictif corpus/unit-bundle.example.json montre les champs attendus. Il doit être placé dans l'atelier privé et adapté aux pages/résultats réels. Un bloc est répertorié par ID, page, type, traitement du texte (transcribed, visual_anchor ou excluded avec raison) et traitement de données (entities, text_only ou blocked avec raison). Les entités sont reliées à des blocs et à des fichiers canoniques.

Le contrôle de bundle vérifie **la structure**, pas la fidélité du contenu au livre. La validation agentique indépendante et l'approbation humaine restent obligatoires. Un outil technique ne doit pas déclarer ce qu'il n'a pas vérifié.

## Suites techniques ouvertes

L'extraction native, la modélisation, l'OCR de secours et les adaptateurs sont des étapes spécialisées de Codex. Le parseur XML OggDude, les schémas canoniques par catégorie, les comparaisons automatiques entre contenus et la génération du viewer/Foundry devront être codés et testés au fur et à mesure. Ces composants ne sont **pas** prétendus déjà opérationnels du seul fait que leurs procédures sont écrites.
