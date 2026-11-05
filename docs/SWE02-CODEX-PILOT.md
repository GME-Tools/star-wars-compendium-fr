# Pilote SWE02 avec Codex

Cette branche prépare **le processus**, pas la transcription du livre. Le projet public ne doit pas recevoir le PDF SWE02, les transcriptions intégrales ou des exports qui reproduisent substantiellement le texte officiel sans vérification des droits.

## Préparation dans Codex

1. Ouvrir le dépôt sur la branche `work/swe02-codex-pipeline`.
2. Placer le PDF français de SWE02 dans un emplacement **local/privé** accessible à Codex, hors du suivi Git et des artefacts CI publics.
3. Appeler explicitement le skill `$swffg-orchestrate` pour qualifier le PDF.
4. Laisser le skill proposer deux vrais lots (simple et complexe), avec pagination imprimée/PDF et méthodes d'extraction.
5. Après validation du découpage, lancer le pilote simple. Le lot ne devient définitif qu'après revue indépendante et approbation humaine.

## Premier prompt Codex

> Utilise `$swffg-orchestrate` et respecte `AGENTS.md`. Nous traitons uniquement le livre de règles français Aux Confins de l'Empire (SWE02). Commence par retrouver et qualifier le PDF que je t'ai rendu accessible : couche texte, pagination imprimée/PDF, colonnes, tableaux, encadrés, illustrations, risques de transcription. Inspecte uniquement les fichiers existants pertinents dans `src/packs` pour mesurer la réutilisation. Propose ensuite deux lots concrets, un simple et un complexe, avec leurs pages et critères de validation. **Ne transcris pas encore tout le livre et ne modifie pas les packs Foundry.** Si le PDF manque, arrête la partie éditoriale et indique exactement ce qu'il faut fournir.

## Livrable attendu du premier lancement

Un diagnostic court contenant :
- référence et empreinte du PDF réellement utilisé ;
- table ou règle de correspondance des paginations ;
- méthode d'extraction textuelle et régions nécessitant OCR ou inspection visuelle ;
- deux lots paginés, dont un complexe ;
- écart entre contenu actuel de `src/packs` et contenu effectivement rencontré ;
- liste des décisions humaines et du travail restant.

La création des données YAML, la transcription et les contrôles détaillés commencent uniquement sur les lots approuvés.

## Notes d'intégration

- `AGENTS.md` fournit les invariants généraux.
- `.agents/skills/swffg-orchestrate/SKILL.md` fournit l'ordonnancement à la demande.
- `.agents/skills/swffg-orchestrate/references/lot-template.md` fournit le contrat des lots.
- La CI traditionnelle du module est désactivée **sur cette branche uniquement** pour éviter toute republication de `latest`.
- Aucun autre skill dédié ni moteur de base canonique n'est encore implémenté : ils seront spécifiés à partir des résultats des deux pilotes.
