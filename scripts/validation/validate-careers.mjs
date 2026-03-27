import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const ROOT = process.cwd();
const CAREERS_DIR = path.join(ROOT, "src", "packs", "carrieres");
const IMAGES_DIR = path.join(ROOT, "assets", "images", "carrieres");
const MODULE_ID = "star-wars-compendium-fr";
const MAX_IMAGE_SIZE_BYTES = 1024 * 1024; // 1 MiB
const MAX_IMAGE_DIMENSION = 1000;
const IMAGE_BASENAME_RE = /^[a-z0-9_]+\.png$/;
const PAGE_RE = /\bpg\.\s*\d+\b/;
const COMPENDIUM_LINK_RE = /^Compendium\.star-wars-compendium-fr\.specialites\.Item\.([A-Za-z0-9]+)$/;
const NONE_VALUES = new Set(["(none)", "", null, undefined]);
const SPECIAL_CASES = new Map([
  ["Jedi", { specializations: 4, signatureabilities: 1 }],
  ["Soldat Clone", { specializations: 6, signatureabilities: 1 }]
]);

let hasError = false;

function fail(message) {
  console.error(`❌ ${message}`);
  hasError = true;
}

function info(message) {
  console.log(`ℹ️  ${message}`);
}

function loadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`${path.relative(ROOT, filePath)}: JSON invalide (${error.message})`);
    return null;
  }
}

function countNonNoneEntries(value) {
  if (!value || typeof value !== "object") return 0;
  return Object.values(value).filter((entry) => {
    if (typeof entry === "string") return !NONE_VALUES.has(entry.trim());
    if (entry == null) return false;
    return true;
  }).length;
}

function validateImage(career, imagePath, filePath) {
  if (typeof imagePath !== "string" || imagePath.length === 0) {
    fail(`${filePath}: champ img manquant`);
    return;
  }

  const expectedPrefix = `modules/${MODULE_ID}/assets/images/carrieres/`;
  if (!imagePath.startsWith(expectedPrefix)) {
    fail(`${filePath}: img doit commencer par ${expectedPrefix} (actuel: ${imagePath})`);
    return;
  }

  const basename = path.basename(imagePath);
  if (!IMAGE_BASENAME_RE.test(basename)) {
    fail(`${filePath}: nom d'image invalide (${basename}). Attendu: minuscules, chiffres, underscore uniquement, extension .png`);
  }

  const absoluteImagePath = path.join(IMAGES_DIR, basename);
  if (!fs.existsSync(absoluteImagePath)) {
    fail(`${filePath}: image introuvable (${absoluteImagePath})`);
    return;
  }

  const stat = fs.statSync(absoluteImagePath);
  if (stat.size >= MAX_IMAGE_SIZE_BYTES) {
    fail(`${filePath}: image ${basename} trop lourde (${stat.size} octets, max ${MAX_IMAGE_SIZE_BYTES - 1})`);
  }

  try {
    const png = PNG.sync.read(fs.readFileSync(absoluteImagePath));
    if (png.width > MAX_IMAGE_DIMENSION || png.height > MAX_IMAGE_DIMENSION) {
      fail(`${filePath}: image ${basename} trop grande (${png.width}x${png.height}, max ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION})`);
    }
  } catch (error) {
    fail(`${filePath}: impossible de lire l'image PNG ${basename} (${error.message})`);
  }
}

function validateSources(career, filePath) {
  const sources = career?.system?.metadata?.sources;
  if (!Array.isArray(sources) || sources.length === 0) {
    fail(`${filePath}: au moins une source est requise`);
    return;
  }

  sources.forEach((source, index) => {
    if (typeof source !== "string" || source.trim().length === 0) {
      fail(`${filePath}: source #${index + 1} invalide`);
      return;
    }
    if (!PAGE_RE.test(source)) {
      fail(`${filePath}: source #${index + 1} doit contenir une page au format "pg. X" (actuel: ${source})`);
    }
  });
}

function validateSpecializations(career, filePath) {
  const specs = career?.system?.specializations;
  if (!specs || typeof specs !== "object" || Array.isArray(specs)) {
    fail(`${filePath}: system.specializations doit être un objet`);
    return;
  }

  const entries = Object.entries(specs);
  const expectedCount = SPECIAL_CASES.get(career.name)?.specializations ?? 6;
  if (entries.length !== expectedCount) {
    fail(`${filePath}: ${career.name} doit avoir ${expectedCount} spécialités (actuel: ${entries.length})`);
  }

  for (const [key, spec] of entries) {
    if (!spec || typeof spec !== "object") {
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
  if (!abilities || typeof abilities !== "object" || Array.isArray(abilities)) {
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
  if (!skills || typeof skills !== "object" || Array.isArray(skills)) {
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

function validateEffects(career, filePath) {
  const effects = career.effects;
  if (!Array.isArray(effects)) {
    fail(`${filePath}: effects doit être un tableau`);
    return;
  }

  effects.forEach((effect, index) => {
    if ((effect?.name === "(inherent)") || (/^attr\d+$/.test(effect?.name))) {
      fail(`${filePath}: nom d'effet "${effect.name}" invalide à l'index ${index}`);
    }
  });
}

function validateCareer(career, filePath, seenIds, seenNames) {
  if (!career || typeof career !== "object") return;

  if (career.type !== "career") {
    fail(`${filePath}: type doit valoir "career" (actuel: ${career.type})`);
  }

  if (typeof career.name !== "string" || career.name.trim().length === 0) {
    fail(`${filePath}: name manquant`);
  }

  if (typeof career._id !== "string" || career._id.trim().length === 0) {
    fail(`${filePath}: _id manquant`);
  } else {
    if (seenIds.has(career._id)) {
      fail(`${filePath}: _id dupliqué avec ${seenIds.get(career._id)}`);
    } else {
      seenIds.set(career._id, filePath);
    }
  }

  if (typeof career.name === "string") {
    if (seenNames.has(career.name)) {
      fail(`${filePath}: name dupliqué avec ${seenNames.get(career.name)}`);
    } else {
      seenNames.set(career.name, filePath);
    }
  }

  if (!career.system || typeof career.system !== "object") {
    fail(`${filePath}: system manquant`);
    return;
  }

  if (typeof career.system.description !== "string") {
    fail(`${filePath}: system.description manquant`);
  }

  validateImage(career, career.img, filePath);
  validateSources(career, filePath);
  validateCareerSkills(career, filePath);
  validateSpecializations(career, filePath);
  validateSignatureAbilities(career, filePath);
  validateEffects(career, filePath);
}

if (!fs.existsSync(CAREERS_DIR)) {
  fail(`Répertoire introuvable: ${CAREERS_DIR}`);
}
if (!fs.existsSync(IMAGES_DIR)) {
  fail(`Répertoire d'images introuvable: ${IMAGES_DIR}`);
}

const files = fs.existsSync(CAREERS_DIR)
  ? fs.readdirSync(CAREERS_DIR).filter((file) => file.endsWith(".json")).sort()
  : [];

if (files.length === 0) {
  fail(`Aucun fichier JSON trouvé dans ${CAREERS_DIR}`);
}

const seenIds = new Map();
const seenNames = new Map();

for (const file of files) {
  const relativePath = path.join("src", "packs", "carrieres", file);
  const absolutePath = path.join(CAREERS_DIR, file);
  const career = loadJson(absolutePath);
  if (!career) continue;
  validateCareer(career, relativePath, seenIds, seenNames);
}

if (hasError) {
  console.error("\nValidation des carrières: ÉCHEC");
  process.exit(1);
}

info(`Validation des carrières OK (${files.length} fichier(s))`);
