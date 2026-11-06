# Star Wars FFG — Corpus intégral et base canonique

## Mission permanente
Produire et maintenir **l'ensemble de la gamme Star Wars FFG/Edge** : données de jeu structurées exhaustives et **textes intégraux** fidèles des ouvrages, avec références croisées, provenance, validation et sorties réutilisables (viewer web, Foundry V13, autres adaptateurs ultérieurs). SWE02 est **le premier ouvrage**, jamais une limite de l'architecture. La liste du README est un inventaire initial, ouvert aux ouvrages manquants.

## Contrôle de production
L'orchestrateur racine est .agents/skills/swffg-orchestrate/SKILL.md. Il délègue par travail à des skills spécialisés, ne se contente pas de proposer un plan et doit continuer à traiter les lots disponibles jusqu'à une vraie limite : source absente, décision humaine requise, budget explicite ou demande de l'utilisateur satisfaite. Ne pas demander l'autorisation entre chaque opération mécanique sûre.

Le registre des ouvrages se trouve dans corpus/books.json. Les commandes déterministes sont dans tools/corpus.mjs. L'espace de travail .swffg-work/ (ignoré par Git) conserve les sources et productions susceptibles de reproduire des œuvres protégées. La documentation d'architecture se trouve dans docs/CORPUS-ARCHITECTURE.md.

## Sources, ordre d'autorité et réutilisation
1. L'édition exacte du livre traité, réellement consultée (PDF, pages rendues, errata associés explicitement), fait autorité pour son **contenu éditorial**. Ne jamais inventer une lecture ni une pagination.
2. Les JSON déjà présents dans src/packs/ sont de précieux candidats FR : réutilisation ciblée, contrôle de fidélité, conservation des identifiants Foundry.
3. Les datasets OggDude EN sont des candidats de **couverture, identité, paramètres et relations**. Enregistrer dépôt, commit, source éditoriale, droits connus ; leurs descriptions ne remplacent pas les textes français.
4. Aucune correspondance sur les seuls noms, aucune fusion silencieuse entre éditions, ouvrages, traductions et errata.
5. Un élément métier réutilisé d'un livre à l'autre garde une identité canonique stable, avec attestations et variantes **par source** ; ne pas dupliquer arbitrairement, ne pas écraser les versions divergentes.

## Double filière obligatoire
- **Texte intégral** : ordre des blocs, titres, paragraphes, tableaux, encadrés, notes, exemples, légendes et références aux illustrations. Pas de résumé substitué au texte ; conserver une représentation éditable et un identifiant/provenance par bloc.
- **Données structurées** : carrières, spécialités/arbres, talents, espèces, caractéristiques, compétences, pouvoirs, équipement, véhicules, PNJ, obligations/devoirs/moralités, motivations, historiques, blessures critiques, planètes, rencontres, règles et tableaux, aventures, etc. Modéliser uniquement les faits attestés et expliciter les champs inconnus.
- Les deux filières progressent **ensemble pour chaque segment source** et pointent vers les mêmes blocs, tout en possédant des validations indépendantes.
- Le modèle canonique ne dépend pas de system.* / Active Effects Foundry ; ceux-ci appartiennent aux adaptateurs de sortie.

## Provenance et auditabilité
Chaque livre possède une identité, une empreinte de l'édition PDF, un mapping page PDF ↔ page imprimée, un sommaire et un registre de couverture. Chaque bloc et donnée dérivée garde l'ouvrage, l'édition, les pages, les IDs de blocs et l'état de preuve. En cas de divergence : noter les deux valeurs et leur preuve ; ne pas résoudre au hasard.

## Cycle d'un ouvrage
cataloguer → ingérer PDF → relever structure/sommaire → découper en unités de travail → comparer à l'existant → transcrire intégralement → extraire les objets → valider automatiquement → revue indépendante → approbation humaine par lots → consolider le corpus → tester les sorties. Réviser les unités si la source, le schéma ou le contenu change.

L'ordre local privilégie **la couverture des pages et chapitres** pour éviter les omissions ; les dépendances entre types d'items guident la résolution des références et la consolidation. Le catalogue permet d'enchaîner plusieurs livres de toutes les gammes, en donnant priorité à SWE02 au départ.

## Niveaux d'assurance et décision humaine
- Déterministe : parse, schéma, unicité, relations, source/page/bloc, couverture de blocs et sections, nombres/tables quand comparables, sortie et régression.
- Relecture agentique indépendante : comparer le **PDF ou son rendu** aux textes et valeurs produits, rechercher omissions, altérations, faux rapprochements et défauts de mise en page.
- Humain : approuve ou demande des corrections par lot/chapitre/livre. Codex ne peut pas se déclarer approuvé par l'humain. Donner un paquet de revue compréhensible (écarts, aperçus, couverture), sans lui imposer de lire mécaniquement chaque champ.
- Les éléments à haut risque (nombres, arbres et connexions, listes exhaustives, tableaux, errata, ambiguïtés) exigent une attention renforcée. Toute correction rouvre les contrôles concernés.

## Coût, progression et autonomie
- Préférer scripts pour inventaire PDF, extraction native, filtres XML, comparaisons, diff, hashes, tests et tableaux d'avancement. OCR **ciblé** après inspection de la couche texte et du rendu.
- Contextes bornés à une unité source et aux objets candidats ; cache local des extractions ; aucun rechargement systématique d'un livre ou de tous les datasets.
- Le travail reprend à partir du registre et des artefacts, sans dépendre du résumé d'un chat. Produire des rapports courts avec résultats, blocages et prochaine unité.
- Ne pas fabriquer de données pour combler une absence, mais avancer sur les autres unités et livres non bloqués.

## Dépôt public et sorties
Le dépôt GitHub est **public**. Ne pas y committer les PDF propriétaires, images extraites, textes intégraux ou datasets tiers reproduisant du contenu protégé sans autorisation de publication. Travailler avec ces matériaux dans .swffg-work/ ou un stockage privé. Les manifests et résumés de suivi peuvent être versionnés s'ils ne reproduisent pas l'œuvre. Vérifier les droits avant diffusion publique ; ne pas confondre accès GitHub et licence.

La branche de travail ne doit pas publier la release latest. Ne pas modifier les packs distribués, les UUID existants, le navigateur actuel ou le pipeline de release sans tâche d'adaptateur approuvée. Préserver le fonctionnement Foundry V13.

## Fin de chantier
Un **livre** n'est complet que lorsque 100 % de ses pages/blocs attendus sont traités ou explicitement exclus avec motif, que tous les objets et liens identifiés sont résolus ou signalés comme exceptions approuvées, que les deux filières ont passé leurs validations et que l'approbation humaine est enregistrée. Une compilation réussie ne vaut pas contrôle de fidélité.
