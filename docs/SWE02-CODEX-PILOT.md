# Pilote SWE02 avec Codex

Cette branche prépare **le processus**, pas la transcription du livre. Le projet public ne doit pas recevoir le PDF SWE02, les transcriptions intégrales ou des exports qui reproduisent substantiellement le texte officiel sans vérification des droits.

## Préparation dans Codex

1. Ouvrir le dépôt sur la branche `work/swe02-codex-pipeline`.
2. Placer le PDF français de SWE02 dans un emplacement **local/privé** accessible à Codex, hors du suivi Git et des artefacts CI publics.
3. Appeler explicitement le skill `$swffg-orchestrate` pour inventorier et rapprocher les **candidats OggDude anglais** de `src/packs`, puis qualifier le PDF.
4. Laisser le skill proposer deux vrais lots (simple et complexe), avec pagination imprimée/PDF et méthodes d'extraction.
5. Après validation du découpage, lancer le pilote simple. Le lot ne devient définitif qu'après revue indépendante et approbation humaine.

## Premier prompt Codex

> Utilise `$swffg-orchestrate` et respecte `AGENTS.md`. Nous traitons uniquement le livre de règles français Aux Confins de l'Empire (SWE02). Commence par vérifier la disponibilité du PDF SWE02 et d'un dataset OggDude anglais. Épingle le commit exact du dépôt OggDude et examine les métadonnées/licences avant réemploi. Prépare un inventaire différentiel **des talents candidats SWE02** entre `DataCustom/Talents.xml` (en filtrant explicitement la source) et `src/packs/talents`, par analyse XML et correspondances tracées, sans importer les descriptions dans le dépôt public. Puis qualifie le PDF : couche texte, pagination imprimée/PDF, colonnes, tableaux, encadrés, illustrations, risques de transcription. Contrôle les correspondances candidates sur le PDF lorsque disponible. Propose ensuite deux lots concrets, un simple et un complexe, avec leurs pages et critères de validation. **Ne transcris pas encore tout le livre et ne modifie pas les packs Foundry.** Si le PDF manque, arrête la partie éditoriale et indique exactement ce qu'il faut fournir.

## Livrable attendu du premier lancement

Un diagnostic court contenant :
- référence et empreinte du PDF réellement utilisé ;
- table ou règle de correspondance des paginations ;
- méthode d'extraction textuelle et régions nécessitant OCR ou inspection visuelle ;
- deux lots paginés, dont un complexe ;
- référence précise du dataset OggDude (dépôt, commit, fichiers, droits connus) ;
- rapport différentiel OggDude ↔ `src/packs` pour les talents candidats SWE02, avec ambiguïtés et omissions, **sans prétendre à la complétude** ;
- écart entre les deux référentiels et le contenu effectivement constaté dans SWE02 ;
- liste des décisions humaines et du travail restant.

La création des données YAML, la transcription et les contrôles détaillés commencent uniquement sur les lots approuvés.

## Notes d'intégration

- `AGENTS.md` fournit les invariants généraux.
- `.agents/skills/swffg-orchestrate/SKILL.md` fournit l'ordonnancement à la demande.
- `.agents/skills/swffg-orchestrate/references/lot-template.md` fournit le contrat des lots.
- `.agents/skills/swffg-orchestrate/references/oggdude-reconciliation.md` définit le protocole d'import, de rapprochement et de résolution des divergences.
- La CI traditionnelle du module est désactivée **sur cette branche uniquement** pour éviter toute republication de `latest`.
- Aucun autre skill dédié ni moteur de base canonique n'est encore implémenté : ils seront spécifiés à partir des résultats des deux pilotes.
