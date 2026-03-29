import path from "node:path";
import {
  ROOT,
  createReporter,
  loadJson,
  ensureDirExists,
  listJsonFiles,
  countNonNoneEntries,
  isPlainObject,
  validateHtmlField,
  validateHtmlSyntax,
  validateSourcesArray,
  validateUniqueString,
  validateAttributesEffectsMapping,
  validatePngImage,
  warnOnAllCapsTextLines
} from "./helpers.mjs";

const CAREERS_DIR = path.join(ROOT, "src", "packs", "carrieres");
const IMAGES_DIR = path.join(ROOT, "assets", "images", "carrieres");

const COMPENDIUM_LINK_RE = /^Compendium\.star-wars-compendium-fr\.specialites\.Item\.([A-Za-z0-9]+)$/;

const SPECIAL_CASES = new Map([
  ["Jedi", { specializations: 4, signatureabilities: 1 }],
  ["Soldat Clone", { specializations: 6, signatureabilities: 1 }]
]);

const { fail, warn, info, ok, getWarningCount } = createReporter();

function validateSpecializations(career, filePath) {
  const specs = career?.system?.specializations;
  if (!isPlainObject(specs)) {
    fail(`${filePath}: system.specializations doit être un objet`);
    return;
  }

  const entries = Object.entries(specs);
  const expectedCount = SPECIAL_CASES.get(career.name)?.specializations ?? 6;
  if (entries.length !== expectedCount) {
    fail(`${filePath}: ${career.name} doit avoir ${expectedCount} spécialités (actuel: ${entries.length})`);
  }

  for (const [key, spec] of entries) {
    if (!isPlainObject(spec)) {
      fail(`${filePath}: spécialité ${key} invalide`);
      continue;
    }

    if (spec.id !== key) {
      fail(`${filePath}: spécialité ${key} a un id incohérent (${spec.id})`);
    }

    if (typeof spec.name !== "string" || spec.name.trim().length === 0) {
      fail(`${filePath}: spécialité ${key} sans nom`);
    }

    if (typeof spec.source !== "string") {
      fail(`${filePath}: spécialité ${key} sans source`);
      continue;
    }

    const match = spec.source.match(COMPENDIUM_LINK_RE);
    if (!match) {
      fail(`${filePath}: spécialité ${key} a une source invalide (${spec.source})`);
      continue;
    }

    if (match[1] !== spec.id) {
      fail(`${filePath}: spécialité ${key} référence ${match[1]} mais id vaut ${spec.id}`);
    }
  }
}

function validateSignatureAbilities(career, filePath) {
  const abilities = career?.system?.signatureabilities;
  if (!isPlainObject(abilities)) {
    fail(`${filePath}: system.signatureabilities doit être un objet`);
    return;
  }

  const count = Object.keys(abilities).length;
  const expectedCount = SPECIAL_CASES.get(career.name)?.signatureabilities ?? 2;
  if (count !== expectedCount) {
    fail(`${filePath}: ${career.name} doit avoir ${expectedCount} capacité(s) emblématique(s) (actuel: ${count})`);
  }
}

function validateCareerSkills(career, filePath) {
  const skills = career?.system?.careerSkills;
  if (!isPlainObject(skills)) {
    fail(`${filePath}: system.careerSkills doit être un objet`);
    return;
  }

  const keys = Object.keys(skills);
  if (keys.length !== 8) {
    fail(`${filePath}: system.careerSkills doit contenir 8 entrées (actuel: ${keys.length})`);
  }

  const filled = countNonNoneEntries(skills);
  if (filled === 0) {
    fail(`${filePath}: au moins une compétence de carrière est requise`);
  }
}

async function validateCareer(career, filePath, seenIds, seenNames) {
  if (!isPlainObject(career)) return;

  if (career.type !== "career") {
    fail(`${filePath}: type doit valoir "career" (actuel: ${career.type})`);
  }

  validateUniqueString(career._id, "_id", filePath, seenIds, fail);
  validateUniqueString(career.name, "name", filePath, seenNames, fail);

  if (!isPlainObject(career.system)) {
    fail(`${filePath}: system manquant`);
    return;
  }

  validateHtmlField(career.system.description, "system.description", filePath, fail);
  await validateHtmlSyntax(career.system.description, "system.description", filePath, fail);
  warnOnAllCapsTextLines(career.system.description, "system.description", filePath, warn);
  validatePngImage(career.img, IMAGES_DIR, filePath, fail);
  validateSourcesArray(career?.system?.metadata?.sources, filePath, fail);
  validateCareerSkills(career, filePath);
  validateSpecializations(career, filePath);
  validateSignatureAbilities(career, filePath);
  validateAttributesEffectsMapping(career, filePath, fail);
}

async function main() {
  ensureDirExists(CAREERS_DIR, fail, "Répertoire des carrières");
  ensureDirExists(IMAGES_DIR, fail, "Répertoire d'images des carrières");

  const files = listJsonFiles(CAREERS_DIR);
  if (files.length === 0) {
    fail(`Aucun fichier JSON trouvé dans ${CAREERS_DIR}`);
  }

  const seenIds = new Map();
  const seenNames = new Map();

  for (const file of files) {
    const relativePath = path.join("src", "packs", "carrieres", file);
    const absolutePath = path.join(CAREERS_DIR, file);
    try {
      const career = loadJson(absolutePath, fail);
      if (!career) continue;
      await validateCareer(career, relativePath, seenIds, seenNames);
    } catch (error) {
      fail(`${relativePath}: exception inattendue pendant la validation (${error.message})`);
    }
  }

  if (!ok()) {
    console.error("\nValidation des carrières: ÉCHEC");
    process.exit(1);
  }

  info(`Validation des carrières OK (${files.length} fichier(s), ${getWarningCount()} warning(s))`);
}

await main();