import fs from "node:fs";
import path from "node:path";
import { HtmlValidate } from "html-validate";
import { PNG } from "pngjs";

export const ROOT = process.cwd();
export const MODULE_ID = "star-wars-compendium-fr";

export const NONE_VALUES = new Set(["(none)", "", null, undefined]);
export const PAGE_RE = /\bpg\.\s*\d+\b/;
export const FORBIDDEN_HTML_ATTR_RE = /\s(?:role|data-[a-z0-9_-]+)\s*=/i;

export const MAX_IMAGE_SIZE_BYTES = 1024 * 1024; // 1 MiB
export const MAX_IMAGE_DIMENSION = 1000;
export const IMAGE_BASENAME_RE = /^[a-z0-9_]+\.png$/;

const htmlvalidate = new HtmlValidate({
  extends: ["html-validate:recommended"],
  rules: {
    // On valide des fragments, pas des pages HTML complètes
    "doctype-style": "off",
    "void-style": "off",
    "element-required-attributes": "off",
    "close-order": "error",
    "no-dup-attr": "error",
    "no-implicit-close": "error",
    "void-content": "error"
  }
});

export function createReporter() {
  let hasError = false;
  let warningCount = 0;

  function fail(message) {
    console.error(`❌ ${message}`);
    hasError = true;
  }

  function warn(message) {
    console.warn(`⚠️  ${message}`);
    warningCount += 1;
  }

  function info(message) {
    console.log(`ℹ️  ${message}`);
  }

  function ok() {
    return !hasError;
  }

  function getWarningCount() {
    return warningCount;
  }

  return { fail, warn, info, ok, getWarningCount };
}

export function loadJson(filePath, fail) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`${path.relative(ROOT, filePath)}: JSON invalide (${error.message})`);
    return null;
  }
}

export function ensureDirExists(dirPath, fail, label = "Répertoire") {
  if (!fs.existsSync(dirPath)) {
    fail(`${label} introuvable: ${dirPath}`);
    return false;
  }
  return true;
}

export function listJsonFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath).filter((file) => file.endsWith(".json")).sort();
}

export function countNonNoneEntries(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
  return Object.values(value).filter((entry) => {
    if (typeof entry === "string") return !NONE_VALUES.has(entry.trim());
    if (entry == null) return false;
    return true;
  }).length;
}

export function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function hasHtmlMarkup(value) {
  return typeof value === "string" && /<[^>]+>/.test(value);
}

export function hasForbiddenHtmlAttributes(value) {
  return typeof value === "string" && FORBIDDEN_HTML_ATTR_RE.test(value);
}

export function validateHtmlField(value, fieldPath, filePath, fail) {
  if (!isNonEmptyString(value)) {
    fail(`${filePath}: ${fieldPath} manquant ou vide`);
    return;
  }

  if (!hasHtmlMarkup(value)) {
    fail(`${filePath}: ${fieldPath} doit contenir du HTML`);
  }

  if (hasForbiddenHtmlAttributes(value)) {
    fail(`${filePath}: ${fieldPath} contient des attributs interdits (role ou data-*)`);
  }
}

export function validateSourcesArray(sources, filePath, fail) {
  if (!Array.isArray(sources) || sources.length === 0) {
    fail(`${filePath}: au moins une source est requise`);
    return;
  }

  sources.forEach((source, index) => {
    if (!isNonEmptyString(source)) {
      fail(`${filePath}: source #${index + 1} invalide`);
      return;
    }
    if (!PAGE_RE.test(source)) {
      fail(`${filePath}: source #${index + 1} doit contenir une page au format "pg. X" (actuel: ${source})`);
    }
  });
}

export function validateUniqueString(value, label, filePath, seenMap, fail) {
  if (!isNonEmptyString(value)) {
    fail(`${filePath}: ${label} manquant`);
    return;
  }

  if (seenMap.has(value)) {
    fail(`${filePath}: ${label} dupliqué avec ${seenMap.get(value)}`);
  } else {
    seenMap.set(value, filePath);
  }
}

export function validateAttributesEffectsMapping(document, filePath, fail) {
  const attributes = document?.system?.attributes;
  const effects = document?.effects;

  if (!isPlainObject(attributes)) {
    fail(`${filePath}: system.attributes doit être un objet`);
    return;
  }

  if (!Array.isArray(effects)) {
    fail(`${filePath}: effects doit être un tableau`);
    return;
  }

  const attributeKeys = Object.keys(attributes);
  const effectNames = new Set();

  effects.forEach((effect, index) => {
    if (!isPlainObject(effect)) {
      fail(`${filePath}: effet invalide à l'index ${index}`);
      return;
    }

    if (!isNonEmptyString(effect.name)) {
      fail(`${filePath}: effet sans nom à l'index ${index}`);
      return;
    }

    if (effect.name === "(inherent)") {
      fail(`${filePath}: effet "(inherent)" interdit à l'index ${index}`);
    }

    if (effectNames.has(effect.name)) {
      fail(`${filePath}: nom d'effet dupliqué "${effect.name}"`);
    } else {
      effectNames.add(effect.name);
    }
  });

  for (const attrKey of attributeKeys) {
    if (!effectNames.has(attrKey)) {
      fail(`${filePath}: system.attributes["${attrKey}"] n'a pas d'effet correspondant`);
    }
  }

  for (const effectName of effectNames) {
    if (/^attr\d+$/.test(effectName) && !attributeKeys.includes(effectName)) {
      fail(`${filePath}: effet "${effectName}" ne correspond à aucune clé de system.attributes`);
    }
  }
}

export function validatePngImage(imagePath, absoluteImagesDir, filePath, fail) {
  if (!isNonEmptyString(imagePath)) {
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

  const absoluteImagePath = path.join(absoluteImagesDir, basename);
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

export function stripHtml(html) {
  if (typeof html !== "string") return "";

  return html
    // blocs -> sauts de ligne
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<p\b[^>]*>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<div\b[^>]*>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n")
    .replace(/<\/ul>/gi, "\n")
    .replace(/<ul\b[^>]*>/gi, "\n")
    .replace(/<\/ol>/gi, "\n")
    .replace(/<ol\b[^>]*>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<h[1-6]\b[^>]*>/gi, "\n")
    .replace(/<\/section>/gi, "\n")
    .replace(/<section\b[^>]*>/gi, "\n")
    .replace(/<\/article>/gi, "\n")
    .replace(/<article\b[^>]*>/gi, "\n")

    // suppression des autres balises
    .replace(/<[^>]+>/g, " ")

    // quelques entités HTML courantes
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")

    // nettoyage
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export function looksLikeAllCapsLine(line) {
  if (typeof line !== "string") return false;

  const trimmed = line.trim();
  if (!trimmed) return false;

  // Ignore les lignes trop courtes
  if (trimmed.length < 4) return false;

  // Garde seulement les lettres latines accentuées de base pour l'analyse
  const letters = trimmed.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g);
  if (!letters || letters.length < 3) return false;

  const joined = letters.join("");
  const upper = joined.toUpperCase();
  const lower = joined.toLowerCase();

  // Il faut que ce soit réellement alphabétique
  if (upper === lower) return false;

  // Tout en capitales
  return joined === upper;
}

export function warnOnAllCapsTextLines(html, fieldPath, filePath, warn) {
  if (typeof html !== "string" || html.trim().length === 0) return;

  const text = stripHtml(html);
  if (!text) return;

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (looksLikeAllCapsLine(line)) {
      warn(`${filePath}: ${fieldPath} contient une ligne en majuscules "${line}"`);
    }
  }
}

export function getHtmlExcerpt(value, line, column, radius = 120) {
  if (typeof value !== "string") return "";

  const lines = value.split(/\r?\n/);

  if (
    typeof line !== "number" ||
    typeof column !== "number" ||
    line < 1 ||
    line > lines.length
  ) {
    return "";
  }

  const currentLine = lines[line - 1] ?? "";
  const start = Math.max(0, column - 1 - radius);
  const end = Math.min(currentLine.length, column - 1 + radius);

  return currentLine.slice(start, end).trim();
}

export async function validateHtmlSyntax(value, fieldPath, filePath, fail) {
  if (typeof value !== "string" || value.trim().length === 0) return;

  const report = await htmlvalidate.validateString(value, {
    rules: {
      "element-required-content": "off"
    }
  });

  const results = Array.isArray(report?.results) ? report.results : [];

  if (!report?.valid) {
    for (const result of results) {
      const messages = Array.isArray(result?.messages) ? result.messages : [];

      for (const message of messages) {
        const location =
          typeof message.line === "number" && typeof message.column === "number"
            ? `ligne ${message.line}, colonne ${message.column}`
            : "position inconnue";

        const details = [
          message.ruleId ? `règle: ${message.ruleId}` : null,
          message.selector ? `selector: ${message.selector}` : null,
          message.context ? `contexte: ${JSON.stringify(message.context)}` : null
        ]
          .filter(Boolean)
          .join(" | ");

        const excerpt = getHtmlExcerpt(value, message.line, message.column);

        fail(
            `${filePath}: ${fieldPath} HTML invalide (${location}) - ${message.message}${
                details ? ` [${details}]` : ""
            }${excerpt ? ` | extrait: ${excerpt}` : ""}`
        );
      }
    }
  }
}