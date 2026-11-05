# Contrat minimal d'un lot SWE02

Créer un fichier de suivi local/privé par lot (YAML recommandé pour le suivi). Remplir les propriétés avec les **constats réels**, jamais en supposant une pagination ou un contenu. Ce modèle n'est pas une transcription du livre.

```yaml
lot_id: null                # ex: SWE02-<section>-<sequence>, stable
book: SWE02
edition: null               # identification contrôlée du PDF
source_pdf: null            # chemin local/privé, ne pas committer un PDF protégé
source_fingerprint: null    # SHA256 du fichier pour vérifier la version
scope:
  pdf_pages: []             # pages physiques, index 1-based
  printed_pages: []         # pages affichées dans l'ouvrage
  section: null
  source_blocks: []         # blocs identifiés après extraction
dependencies: []            # lots/entités réellement nécessaires
status: planned             # planned|extracted|structured|auto_validated|agent_reviewed|ready_for_human_review|human_approved|blocked
inputs:
  existing_packs: []
outputs:
  full_text: []
  canonical_data: []
  coverage: null
  reports: []
checks:
  extraction: pending
  block_coverage: pending
  data_schema: pending
  references: pending
  source_fidelity: pending
  independent_review: pending
  human_approval: pending
issues: []                  # severity, page, block, evidence, suggested_resolution
human_decision:
  status: pending
  date: null
  notes: null
```

## Convention de couverture

Pour chaque bloc délimité dans le PDF (y compris tableaux, notes, encadrés et légendes) relever :
- `block_id` stable dans le lot ;
- `pdf_page` et `printed_page` si connue ;
- `kind` (heading, paragraph, list, table, sidebar, note, figure, caption, etc.) ;
- `disposition` : `text_only`, `structured_and_text`, `not_applicable`, `blocked` ;
- chemins de sortie ou raison de non-applicabilité / blocage.

Un bloc `not_applicable` **n'autorise pas** à omettre la transcription du texte d'une légende ou d'un encadré : il signifie seulement qu'aucune entrée métier spécifique n'est justifiée.

## Définition des deux pilotes

- **Simple** : passage effectivement observé dont extraction native et segmentation sont nettes, avec au moins une unité de contenu exploitable.
- **Complexe** : passage observé comprenant plusieurs éléments structurels (tableau, encadré, renvois, etc.).
- Choisir les pages **après qualification du PDF**, et non par numéro de page présumé.
- Produire un rapport comparatif des deux pilotes : exactitude de transcription, erreurs de classification, écarts restant, intervention humaine et efficacité du processus.

## Sorties et confidentialité

Ne jamais archiver dans le GitHub public le PDF source, ses transcriptions complètes, ses images dérivées ou les exports contenant une part substantielle du texte protégé. Le manifeste de travail et les résultats de revue détaillés peuvent aussi contenir des extraits protégés : les garder localement ou dans un espace privé approprié. Pour le dépôt public, publier uniquement des scripts, procédures, schémas et un bilan non substitutif au livre.
