---
name: swffg-orchestrate
description: Piloter sur Codex la production complète, multi-ouvrages et reprise sur incident du corpus Star Wars FFG/Edge (PDF, OCR, textes intégraux, objets structurés, datasets OggDude et Foundry, relecture, validation humaine, exports). Utiliser pour démarrer, continuer, planifier, vérifier ou terminer n'importe quel livre.
---

# Orchestrateur global du corpus

Ce skill est le **chef d'orchestre de la gamme**, et non un pilote limité à SWE02. Lire AGENTS.md puis docs/CORPUS-ARCHITECTURE.md si une décision d'architecture est nécessaire. Charger les skills spécialisés seulement au moment de les appeler.

## Commandes de départ
- node tools/corpus.mjs catalog : catalogue initial des livres (README + ajouts).
- node tools/corpus.mjs status [BOOK] : avancement consolidé et blocages.
- node tools/corpus.mjs next [BOOK] : prochaine action reprise sans reconstruire le contexte.
- node tools/corpus.mjs init BOOK [--pdf CHEMIN] : espace privé et état du livre.
- node tools/corpus.mjs add-unit BOOK UNIT --pages 1-5 [--title TITRE] : unité réellement délimitée à partir du PDF.
- node tools/corpus.mjs check [BOOK] : intégrité structurelle et couverture. Ce contrôle ne remplace pas la comparaison éditoriale.

## Modes acceptés
1. **bootstrap** : inventorier l'ensemble des livres à partir du catalogue, ajouter ceux absents, décider un ordre de production en fonction des sources réellement disponibles.
2. **run / continue** : choisir le prochain ouvrage/unité non bloqué, exécuter les étapes opérables jusqu'à la prochaine porte humaine, enregistrer chaque sortie et reprendre sur interruption.
3. **book BOOK** : traiter un ouvrage complet, chapitre après chapitre, sans réduire arbitrairement l'objectif à deux pages ou deux exemples.
4. **batch** : appliquer une procédure maîtrisée à plusieurs unités/livres, avec limite explicite de coûts et tests d'échantillons.
5. **review / recover** : traiter les écarts ou reprendre après changement de PDF, de source ou de modèle.
6. **release / export** : consolider les objets inter-ouvrages et déléguer la génération des cibles après contrôle.

## Orchestration par livre
A. Consulter catalog/books.json et l'état dans .swffg-work/books/BOOK/state.json. Créer l'état si absent, mais ne pas inventer la présence du PDF.

B. Charger swffg-ingest pour identifier édition/empreinte, carte des pages, couche texte, sommaire/chapitres, figures/tables ; produire le plan **exhaustif de toutes les pages**, pas seulement deux échantillons. Échantillonner seulement pour calibrer la méthode, pas pour limiter la production.

C. Charger swffg-reconcile pour établir les index de référence réutilisables de src/packs et OggDude. Épingler chaque provenance. Ne pas traiter OggDude comme une liste exhaustive ni comme source française normative.

D. Construire les **unités de production** à partir des sections du livre : page(s) contiguës, frontières de tableaux/encadrés explicites, IDs stables, dépendances. Tous les intervalles du PDF ont un propriétaire ou une exclusion motivée. Utiliser un registre pour suivre les pages hors périmètre (couverture, publicités, pages blanches). Une page hors production de données peut toujours requérir la filière texte.

E. Pour chaque unité, lancer :
   1. swffg-fulltext : texte intégral structuré et registre de blocs.
   2. swffg-entities : extraction et réconciliation des objets, identifiants/attestations/relations, sans recopier les contraintes Foundry.
   Les deux spécialisations travaillent sur les **mêmes IDs de blocs** ; aucune ne peut masquer des passages de l'autre.
   3. swffg-quality : contrôles automatiques puis relecture sémantique indépendante à partir des pages sources.
   4. Si contrôle OK : préparer un paquet de validation humaine. Sinon : affecter les corrections au propriétaire de l'écart, relancer seulement les contrôles affectés.
   5. Après validation humaine explicite : sceller la version de l'unité et continuer les autres unités.

F. À la fermeture d'un chapitre ou livre : audit de couverture, entités orphelines/dupliquées, tables et renvois, variantes entre ouvrages, références et illustrations, version du PDF, suivi des validations. Ne **jamais** appeler un livre complet sur la base du seul nombre de fichiers.

G. swffg-deliver : à la demande, créer sorties web et Foundry V13 à partir du corpus validé et tester les régressions ; conserver les données indépendantes des cibles.

## Scheduling et gestion des blocages
- Le planificateur doit fournir la prochaine action faisable selon : disponibilité de la source, dépendances, état de chaque unité, risque et lot prioritaire (SWE02 d'abord).
- Source inaccessible : noter le blocage, préparer ce qui est possible depuis les métadonnées, **passer au prochain travail réalisable**, ne pas arrêter toute la gamme.
- Conflit de références : stocker candidat(s) et preuves, affecter une revue ; poursuivre les éléments indépendants.
- Si plusieurs unités indépendantes peuvent être traitées en parallèle, déléguer à des sous-agents seulement quand l'environnement le permet et quand le gain est réel ; éviter qu'ils éditent les mêmes fichiers.
- L'agent relecteur reçoit le PDF/rendu et les artefacts finals, pas l'argumentaire de l'agent producteur, pour limiter les biais de confirmation.
- Rendre la progression réelle et mesurable : pages couvertes, unités validées, objets par type, erreurs ouvertes, décisions restantes, par livre et globalement.

## Contrats de livrables
Référence : docs/CORPUS-ARCHITECTURE.md. Dans l'espace privé, par livre :
- source et manifeste de pagination ;
- extraction source en cache, OCR et images nécessaires ;
- sections / unités / blocs avec provenance ;
- texte intégral structuré, tableaux et médias référencés ;
- fichiers canoniques et attestations des valeurs ;
- rapprochements OggDude / Foundry / autres livres ;
- rapports QA automatiques, revue indépendante et décisions humaines.

## Points de non-retour
Ne pas publier des contenus protégés dans le dépôt public, changer d'édition en silence, considérer un texte résumé comme transcription, promouvoir une fiche non vérifiée, attribuer une approbation humaine fictive ni écraser des artefacts sans historique. **Ne pas réduire tout le système à un pilote** : le pilote sert à calibrer les procédures appliquées ensuite à tous les livres.

## Réponse Codex
À chaque invocation : (1) ouvrage(s) et unités traités, (2) livrables, (3) couverture chiffrée, (4) contrôles et divergences, (5) prochaine tâche automatiquement réalisable, (6) validations humaines à effectuer. Exécuter le travail possible, ne pas se contenter d'une proposition.
