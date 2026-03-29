import path from "node:path";
import {
  ROOT,
  createReporter,
  loadJson,
  ensureDirExists,
  listJsonFiles,
  isPlainObject,
  validateHtmlField,
  validateHtmlSyntax,
  validateSourcesArray,
  validateUniqueString,
  validateAttributesEffectsMapping,
  isNonEmptyString,
  warnOnAllCapsTextLines
} from "./helpers.mjs";

const TALENTS_DIR = path.join(ROOT, "src", "packs", "talents");

const { fail, warn, info, ok, getWarningCount } = createReporter();

async function validateTalent(talent, filePath, seenIds, seenNames) {
  if (!isPlainObject(talent)) return;

  if (talent.type !== "talent") {
    fail(`${filePath}: type doit valoir "talent" (actuel: ${talent.type})`);
  }

  validateUniqueString(talent._id, "_id", filePath, seenIds, fail);
  validateUniqueString(talent.name, "name", filePath, seenNames, fail);

  if (!isPlainObject(talent.system)) {
    fail(`${filePath}: system manquant`);
    return;
  }

  validateHtmlField(talent.system.description, "system.description", filePath, fail);
  validateHtmlField(talent.system.longDesc, "system.longDesc", filePath, fail);
  await validateHtmlSyntax(talent.system.description, "system.description", filePath, fail);
  await validateHtmlSyntax(talent.system.longDesc, "system.longDesc", filePath, fail);
  warnOnAllCapsTextLines(talent.system.description, "system.description", filePath, warn);
  warnOnAllCapsTextLines(talent.system.longDesc, "system.longDesc", filePath, warn);
  validateSourcesArray(talent?.system?.metadata?.sources, filePath, fail);

  if (!isNonEmptyString(talent?.system?.activation?.value)) {
    fail(`${filePath}: system.activation.value manquant`);
  }

  if (
    typeof talent?.system?.tier !== "number" ||
    !Number.isInteger(talent.system.tier) ||
    talent.system.tier < 1
  ) {
    fail(`${filePath}: system.tier doit être un entier >= 1`);
  }

  if (typeof talent?.system?.ranks?.ranked !== "boolean") {
    fail(`${filePath}: system.ranks.ranked doit être booléen`);
  }

  if (talent?.system?.ranks?.ranked === true) {
    if (
      typeof talent?.system?.ranks?.current !== "number" ||
      !Number.isInteger(talent.system.ranks.current) ||
      talent.system.ranks.current < 1
    ) {
      fail(`${filePath}: system.ranks.current doit être un entier >= 1 quand system.ranks.ranked vaut true`);
    }
  }

  if (typeof talent?.system?.isForceTalent !== "boolean") {
    fail(`${filePath}: system.isForceTalent doit être booléen`);
  }

  if (typeof talent?.system?.isConflictTalent !== "boolean") {
    fail(`${filePath}: system.isConflictTalent doit être booléen`);
  }

  validateAttributesEffectsMapping(talent, filePath, fail);
}

async function main() {
    ensureDirExists(TALENTS_DIR, fail, "Répertoire des talents");

    const files = listJsonFiles(TALENTS_DIR);
    if (files.length === 0) {
    fail(`Aucun fichier JSON trouvé dans ${TALENTS_DIR}`);
    }

    const seenIds = new Map();
    const seenNames = new Map();

    for (const file of files) {
        const relativePath = path.join("src", "packs", "talents", file);
        const absolutePath = path.join(TALENTS_DIR, file);
        const talent = loadJson(absolutePath, fail);
        if (!talent) continue;
    await validateTalent(talent, relativePath, seenIds, seenNames);
    }

    if (!ok()) {
        console.error("\nValidation des talents: ÉCHEC");
        process.exit(1);
    }

    info(`Validation des talents OK (${files.length} fichier(s), ${getWarningCount()} warning(s))`);
}

await main();