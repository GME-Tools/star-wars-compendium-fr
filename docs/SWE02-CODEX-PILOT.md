# SWE02 : premier ouvrage du corpus intégral

Cette page conserve un point d'entrée pour **SWE02**, mais toutes les procédures sont maintenant **multi-livres**. Ne pas utiliser l'ancienne instruction « deux lots et on arrête » comme limite de production.

Lire d'abord docs/CODEX-RUNBOOK.md et docs/CORPUS-ARCHITECTURE.md. Le skill principal est .agents/skills/swffg-orchestrate/SKILL.md.

## Préparer la source privée

~~~bash
node tools/corpus.mjs catalog
node tools/corpus.mjs init SWE02 --pdf /chemin/prive/SWE02.pdf
python -m pip install pymupdf
python tools/pdf_probe.py --pdf /chemin/prive/SWE02.pdf --out .swffg-work/books/SWE02/ingest --extract
node tools/corpus.mjs set-pages SWE02 <nombre-pages-PDF-verifie>
~~~

Ne pas prendre les numéros du livre pour les indices de pages PDF sans vérifier la correspondance.

## Indexer les existants

~~~bash
node tools/foundry_index.mjs
python tools/oggdude_index.py --data /chemin/prive/OggDude/DataCustom --commit <SHA-40-caracteres> --out .swffg-work/shared/oggdude/index.json
~~~

Ces scripts produisent des **inventaires candidats**, pas une preuve de couverture ou de conformité SWE02. Les livres et textes complets restent privés tant que leur diffusion n'est pas autorisée.

## Prompt Codex recommandé

> Utilise $swffg-orchestrate en mode book SWE02. Notre objectif est de couvrir **tout SWE02**, puis tous les autres livres de la gamme avec exactement les mêmes procédures. Qualifie le PDF, crée la carte exhaustive des pages/chapitres, indexe OggDude et src/packs, puis traite réellement les unités : textes intégraux, objets métier, contrôles automatiques et contre-lecture agentique. Organise mes validations par chapitres ou lots raisonnables, et poursuis sans redemander mon accord pour les opérations autonomes sûres. Si une page est bloquée, signale-la et continue les autres. Produis l'état et la prochaine tâche depuis le registre, sans inventer de pages ou de règles. N'édite pas directement les packs distribués.

Les deux premiers lots (un simple et un complexe) servent seulement à **calibrer** extraction, OCR ciblé, structuration et QA. Après calibration, la procédure continue sur le livre entier.

## Suivi

~~~bash
node tools/corpus.mjs next SWE02
node tools/corpus.mjs status SWE02
node tools/corpus.mjs check SWE02
~~~

Pour les autres ouvrages, remplacer SWE02 par leur ID du catalogue (ou ajouter le livre s'il n'est pas encore référencé).
