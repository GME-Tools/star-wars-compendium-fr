# AGENTS.md — Star Wars FFG: référentiel canonique

## Mission et périmètre
Créer, à partir du **Livre de règles d'Aux Confins de l'Empire (SWE02)**, un corpus vérifiable composé de **données structurées** ET du **texte intégral structuré**, à destination ultérieure d'un viewer web et d'un adaptateur Foundry VTT v13. Les autres ouvrages et plateformes sont hors périmètre du pilote sauf demande explicite.

L'objectif immédiat est de **qualifier le PDF et tester le processus sur deux petits lots** (un simple, un complexe), pas de traiter tout le livre ni de concevoir une architecture générale.

## Source de vérité et réemploi
1. L'édition de SWE02 fournie/licenciée par l'utilisateur, lorsque son PDF est accessible, fait autorité pour l'exactitude éditoriale. Ne jamais prétendre l'avoir lue sans l'avoir ouverte.
2. Les **datasets OggDude anglais** sont une source secondaire de découverte et de préremplissage : clés, noms anglais, structures, relations et propriétés candidates. Épingler leur dépôt, commit, fichiers et licence constatée. Ne jamais les considérer comme exhaustifs, officiels ou automatiquement valables pour SWE02.
3. `src/packs/` est un **patrimoine français à réemployer**, pas une preuve d'exactitude ni une source de vérité. Comparer à SWE02 et consigner les divergences.
4. Avant de produire une fiche : rapprocher mécaniquement les candidats OggDude et `src/packs`, puis soumettre au PDF les valeurs retenues. Documenter les clés externes séparément de l'identité canonique; aucun nom traduit ne suffit à démontrer une correspondance.
5. Ne jamais inventer du texte, des coûts, valeurs, noms, pages, exceptions, intitulés ou relations. En cas d'absence du PDF ou de doute, bloquer le lot concerné et rendre une liste précise des pièces nécessaires.
6. Ne pas transposer automatiquement dans SWE02 du contenu attesté seulement dans un autre ouvrage.
7. Conserver les identifiants Foundry et autres liens existants comme correspondances de compatibilité; créer des identifiants métiers stables indépendants du nom français. Ne pas changer des UUID déjà publiés sans décision explicite.

Voir `.agents/skills/swffg-orchestrate/references/oggdude-reconciliation.md` pour le protocole de rapprochement. Les descriptions OggDude ne sont jamais une source pour le texte intégral SWE02.

## Séparation des contenus
- **Texte intégral** : préserver les mots, ponctuation, titres, ordre, notes, listes, tableaux, encadrés et exemples de SWE02; ne jamais paraphraser la transcription. La mise en forme est reconstruite de manière contrôlée, avec trace des décisions.
- **Données structurées** : transcrire les propriétés et relations explicitement établies par le livre; ne pas confondre règle métier, description éditoriale et automatisation Foundry.
- Un même passage peut alimenter les deux sorties sans duplication arbitraire de la vérité; chaque sortie renvoie à la provenance commune.
- La définition des données canoniques ne doit pas dépendre des champs `system.*` ou des Active Effects de `starwarsffg`.
- YAML pour les fiches structurées est un **candidat à éprouver** lors du pilote, pas un format irrévocable.

## Provenance obligatoire
Chaque unité de sortie référence au minimum : `source: SWE02`, page **imprimée** (et page PDF si différente), identifiant du lot, section/bloc d'origine, statut de vérification. Conserver l'ambiguïté si la correspondance n'est pas sûre. Ne pas écraser la source brute ni la remplacer par une interprétation.

## Procédure et validations
- Pour toute tâche couvrant extraction, planification de lots, structuration ou relecture SWE02 : suivre `.agents/skills/swffg-orchestrate/SKILL.md`.
- D'abord détecter la présence et la qualité d'une **couche texte PDF**. Extraction déterministe en priorité; OCR ciblé seulement quand nécessaire. Ne jamais OCRiser aveuglément un livre entier.
- Traiter de petits **lots paginés**, avec état explicite et artefacts de reprise. Employer seulement les pages et les schémas nécessaires au lot.
- Validation en trois portes : **contrôles déterministes** (schémas, couverture, liens, valeurs) ; **relecture indépendante avec retour à la source** ; **validation humaine explicite**.
- Codex peut signaler `ready_for_human_review`, mais **ne peut jamais attribuer lui-même `human_approved`**.
- Toute erreur ou information incertaine donne lieu à un constat sourcé, non à une correction silencieuse. Un changement après approbation invalide la validation des éléments concernés.

## Économie de contexte
- Ne pas charger le PDF complet, tous les packs, ni tous les skills pour une petite tâche.
- Préindexer les candidats OggDude filtrés SWE02 et `src/packs` par scripts; envoyer à l'agent les seules divergences, ambiguïtés et pages pertinentes. Réutiliser l'existant par comparaison ciblée.
- Faire une seule production du lot puis une relecture indépendante, plutôt que plusieurs reformulations intégrales.
- Sorties de compte rendu compactes : fichiers modifiés, pages traitées, résultats des validations, écarts bloquants, décisions demandées.
- Ne pas maximiser les tokens au détriment de la fidélité : escalader les pages ambiguës à une inspection visuelle.

## Protection du dépôt et de la distribution
- Travailler sur une branche dédiée; ne pas modifier `main`, les packs binaires, `module.json`, le processus de release, ni les traductions déjà validées sans demande explicite.
- Ne pas déclencher de publication automatisée en travaillant sur des branches de production de données.
- Les descriptions, images et datasets OggDude peuvent contenir du contenu tiers protégé, même dans un dépôt GitHub accessible. Ne pas présumer d'une licence de republication; utiliser les métadonnées et résultats de comparaison non substitutifs tant que les droits ne sont pas établis.
- Le PDF, ses images et ses transcriptions complètes sont potentiellement protégés par droits d'auteur. **Ne pas les publier sur un dépôt public**, dans les artefacts CI publics, un viewer public ou une release sans validation des droits. Développer les formats et procédures sans y déposer le contenu protégé.
- Conserver les sources et transcriptions dans un espace local/privé approprié, ignoré par Git si nécessaire; ne versionner dans ce dépôt public que le code, les schémas, des métadonnées non sensibles et des exemples originaux/fictifs.
- Foundry V13 est une **cible future de validation fonctionnelle**, non l'autorité éditoriale.

## Définition de « terminé »
Un lot n'est terminé qu'après : provenance vérifiable, couverture de tous ses blocs, données et textes présents ou explicitement justifiés, contrôles automatiques passés, rapport de relecture indépendante, et approbation humaine consignée. Si le PDF n'est pas accessible, on peut préparer les outils et manifestes, pas attester la fidélité des contenus.

## Préservation
Conserver la logique existante du navigateur Foundry, des scripts `build/`, des conventions d'assets et du README historique tant qu'aucune migration spécifique n'est approuvée. L'objectif de cette étape est seulement de rendre le workflow Codex reproductible.
