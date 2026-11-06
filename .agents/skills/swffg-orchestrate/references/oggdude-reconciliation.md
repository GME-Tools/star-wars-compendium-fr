# Rapprochement OggDude ↔ src/packs ↔ SWE02

## Rôle des sources et précédence

1. **SWE02 français (PDF réellement consulté)** : seule référence normative du pilote pour règle, valeur, texte français, pagination et appartenance au livre.
2. **OggDude anglais (dataset identifié et version épinglée)** : source secondaire pour découverte, clés d'objets, propriétés candidates, structures des arbres, relations et références bibliographiques.
3. **`src/packs` français** : travail existant, utile pour éviter la ressaisie et maintenir les correspondances Foundry, sans présumer de son exactitude.
4. Aucune source secondaire ne remplace une preuve tirée de SWE02. Deux datasets OggDude issus d'une même généalogie **ne comptent pas** comme deux validations indépendantes.

## Dataset candidat

`https://github.com/Septaris/OggDudes-Custom-Dataset-SW`, répertoire `DataCustom/`. Exemples observés : `Talents.xml`, `Careers/*.xml`, `Specializations/*.xml`, `CoreSources.xml`, ainsi que espèces, équipements, vaisseaux. Ces fichiers montrent des `Key`, `Name`, `Description`, `Source(s)`, et parfois `ItemChanges` et des structures d'arbre.

**Ne pas dépendre de la branche flottante** : enregistrer URL, commit SHA, chemins examinés, empreintes des fichiers et licence/provenance **vérifiée**. En absence de licence explicite, ne pas supposer que les descriptions sont réutilisables pour publication. Ne pas importer les médias et les descriptions substantielles dans le dépôt public.

## Prétraitement déterministe

Avant d'envoyer du contenu au modèle :
1. Lire les XML avec un parseur XML standard sûr (pas par regex), produire un inventaire par type, source originale et clé; comptabiliser doublons, références absentes et objets sans source.
2. Normaliser les variations de nom de source (`Edge of the Empire Core Rulebook`, `EOTE`, etc.) par une table de correspondance **explicite, testée et réversible**. Une autre édition n'est pas automatiquement SWE02.
3. Sélectionner des **candidats** SWE02 par références, jamais simplement par présence dans une carrière; les entrées sans source ou ambiguës restent `unverified_scope`. Les données OggDude couvrent plusieurs ouvrages : ne pas les traiter comme le sommaire exhaustif de SWE02.
4. Extraire seulement des champs nécessaires au lot : clés, noms, type, paramètres, relations, références et indicateurs de description. Garder les descriptions intégrales de datasets tiers hors des rapports publics.
5. Indexer les documents `src/packs` pertinents avec leurs identifiants Foundry, noms, sources et relations.
6. Générer une table de rapprochement et des écarts *avant* toute génération canonique. Ne pas écraser les originaux.

## Rapprochement d'identité

Prioriser : identifiant explicitement vérifié / source+type+identité métier+structure. Noms traduits ou ressemblances textuelles seuls ne suffisent pas. Les homonymes (plusieurs spécialités « Éclaireur », talents de mêmes noms, réimpressions) exigent des disambiguations. Ne jamais créer une correspondance forte sur simple traduction automatique.

États autorisés : `exact_verified`, `candidate`, `ambiguous`, `not_found`, `out_of_scope`, `conflict`. Seul `exact_verified` peut alimenter automatiquement une référence d'identité sans arbitrage, et ne signifie pas que les champs mécaniques sont validés.

## Champs de la table de rapprochement

Chaque ligne comporte au minimum :
- `entity_type`, `oggdude_key`, `oggdude_name_en`, `oggdude_source`, `oggdude_dataset_commit` ;
- `foundry_pack`, `foundry_id`, `foundry_name_fr` (null si absent) ;
- `canonical_id` candidat (distinct des identifiants externes) ;
- `match_status`, `confidence_reason`, `swe02_page` (null tant que non contrôlée) ;
- `field_differences`, `provenance`, `review_status`.

Ne pas enregistrer de `swe02_page` comme vérifiée parce qu'OggDude la fournit : c'est une **page candidate** jusqu'à contrôle du PDF.

## Résolution des divergences

- Absence dans `src/packs` : candidate `new`, à vérifier sur SWE02.
- Absence chez OggDude : ne pas supprimer un objet SWE02 valide.
- Divergence de valeur, de rang ou de connexion : `conflict`, avec champs et preuves; arbitrage par SWE02, sans correction silencieuse.
- Texte français préexistant : `reuse_candidate`, comparaison de fidélité au PDF avant adoption.
- Effets OggDude (p.ex. `ItemChanges`) ou Active Effects Foundry : **indices d'automatisation**, pas vérité mécanique ni schéma canonique à recopier.
- Les différences d'errata, d'édition ou de source doivent rester explicitement visibles.

## Comparaison pilote recommandée

Faire un premier **inventaire différentiel des talents candidats SWE02** : OggDude EN vs `src/packs/talents` FR, **sans encore importer ni traduire les descriptions**. Sortir : correspondances exactes vérifiées, candidats, objets uniquement d'un côté, références ambiguës, statistiques par statut. Les validations de contenu ne commencent qu'une fois les pages SWE02 accessibles.

## Mesure et économie de tokens

Une seule extraction XML locale par version épinglée, puis index/résumés réutilisables. Ne transmettre à l'agent que les lignes `candidate`/`ambiguous`/`conflict` et les portions du PDF concernées. Distinguer coût de traitement, couverture, taux de résolution, taux de faux positifs et taux d'erreurs détectées par la relecture.

## Limites

OggDude ne fournit pas une transcription éditoriale complète de SWE02 et ne suffit pas à recréer titres, encadrés, exemples, ordre des pages, tableaux et illustrations du **texte intégral**. Le pipeline PDF reste obligatoire, séparé et de même priorité. Une extraction XML réussie n'est pas une validation éditoriale.
