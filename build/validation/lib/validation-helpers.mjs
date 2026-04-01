import fs from "node:fs";
import path from "node:path";
import { HtmlValidate } from "html-validate";
import { PNG } from "pngjs";

export const ROOT = process.cwd();
export const MODULE_ID = "star-wars-compendium-fr";

export const NONE_VALUES = new Set(["(none)", "", null, undefined]);
export const PAGE_RE = /\bpg\.\s*\d+\b/;
export const FORBIDDEN_HTML_ATTR_RE = /\s(?:role|data-[a-z0-9_-]+)\s*=/i;
export const FORBIDDEN_ATTRIBUTE_KEY_RE = /^attr\d+$/;
export const IMAGE_BASENAME_RE = /^[a-z0-9_]+\.png$/;
export const INLINE_STYLE_RE = /\sstyle\s*=/i;
export const DIR_ATTR_RE = /\sdir\s*=/i;
export const EMPTY_PARAGRAPH_RE = /<p\b[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi;
export const EMPTY_P_IN_TD_RE = /<td[^>]*>\s*<p>\s*<\/p>\s*<\/td>/gi;
export const UUID_TAG_RE = /@UUID\[([^[\]]+)\](?:\{([^}]*)\})?/g;
export const SRC_ATTR_RE = /\ssrc\s*=\s*"([^"]+)"/gi;
export const HEADING_RE = /<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi;
export const ID_ATTR_RE = /\sid\s*=\s*"([^"]+)"/i;

const SYMBOL_MAP = {
  "[TR]": "x",
  "[DE]": "y",
  "[AD]": "a",
  "[TH]": "t"
};

export const ALL_CAPS_ALLOWED_LINES = new Set([
  "41-VEX",
  "TCL-TT"
]);

export const IGNORED_PACKS_FOR_UUID = new Set([
  "pnj",
  "armes",
  "ameliorations_armes",
  "vaisseaux",
  "armes_vaisseaux",
  "qualites",
  "especes",
  "historiques",
  "pouvoirs-de-force",
  "equipement",
  "obligations",
  "armures",
  "critiques",
  "degats_critiques"
]);

const htmlvalidate = new HtmlValidate({
  extends: ["html-validate:recommended"],
  rules: {
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

export function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
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

export async function validateCommonDocument({
  doc,
  filePath,
  fail,
  seenIds,
  seenNames,
  expectedType
}) {
  if (!isPlainObject(doc)) return false;

  if (doc.type !== expectedType) {
    fail(`${filePath}: type doit valoir "${expectedType}" (actuel: ${doc.type})`);
  }

  validateUniqueString(doc._id, "_id", filePath, seenIds, fail);
  validateUniqueString(doc.name, "name", filePath, seenNames, fail);

  if (!isPlainObject(doc.system)) {
    fail(`${filePath}: system manquant`);
    return false;
  }

  return true;
}

export function validateAttributeKeysFormat(document, filePath, fail) {
  const attributes = document?.system?.attributes;

  if (!isPlainObject(attributes)) {
    fail(`${filePath}: system.attributes doit être un objet`);
    return;
  }

  for (const key of Object.keys(attributes)) {
    if (FORBIDDEN_ATTRIBUTE_KEY_RE.test(key)) {
      fail(`${filePath}: clé system.attributes invalide "${key}" (format interdit: attr123...)`);
    }
  }
}

export function validateAttributesEffectsMapping(document, filePath, fail) {
  const attributes = document?.system?.attributes;
  const effects = document?.effects;

  validateAttributeKeysFormat(document, filePath, fail);

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

export function validatePngImage({
  imagePath,
  expectedPrefix,
  absoluteImagesDir,
  filePath,
  fail,
  maxBytes,
  maxWidth,
  maxHeight
}) {
  if (!isNonEmptyString(imagePath)) {
    fail(`${filePath}: champ img manquant`);
    return;
  }

  if (!isNonEmptyString(expectedPrefix)) {
    fail(`${filePath}: expectedPrefix manquant pour la validation d'image`);
    return;
  }

  if (!imagePath.startsWith(expectedPrefix)) {
    fail(`${filePath}: img doit commencer par ${expectedPrefix} (actuel: ${imagePath})`);
    return;
  }

  const basename = path.basename(imagePath);
  if (!IMAGE_BASENAME_RE.test(basename)) {
    fail(
      `${filePath}: nom d'image invalide (${basename}). Attendu: minuscules, chiffres, underscore uniquement, extension .png`
    );
  }

  const absoluteImagePath = path.join(absoluteImagesDir, basename);
  if (!fs.existsSync(absoluteImagePath)) {
    fail(`${filePath}: image introuvable (${absoluteImagePath})`);
    return;
  }

  const stat = fs.statSync(absoluteImagePath);
  if (stat.size > maxBytes) {
    fail(`${filePath}: image ${basename} trop lourde (${stat.size} octets, max ${maxBytes})`);
  }

  try {
    const png = PNG.sync.read(fs.readFileSync(absoluteImagePath));

    if (png.width > maxWidth || png.height > maxHeight) {
      fail(
        `${filePath}: image ${basename} trop grande (${png.width}x${png.height}, max ${maxWidth}x${maxHeight})`
      );
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

function stripBracketCodes(text) {
  return text.replace(/\[[^\]]*\]/g, "");
}

export function looksLikeAllCapsLine(line) {
  if (typeof line !== "string") return false;

  const cleaned = stripBracketCodes(line);
  const trimmed = cleaned.trim();
  if (!trimmed) return false;

  // Ignore les lignes trop courtes
  //if (trimmed.length < 4) return false;
  if (ALL_CAPS_ALLOWED_LINES.has(trimmed)) return false;

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

export function shouldCheckAllCaps() {
  return process.argv.includes("--check-all-caps");
}

export function warnOnAllCapsTextLines(html, fieldPath, filePath, warn) {
  if (!shouldCheckAllCaps()) return;

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

export async function validateCommonHtmlTextField({
  value,
  fieldPath,
  filePath,
  fail,
  warn
}) {
  validateHtmlField(value, fieldPath, filePath, fail);
  await validateHtmlSyntax(value, fieldPath, filePath, fail);
  warnOnAllCapsTextLines(value, fieldPath, filePath, warn);
}

export function hasDirAttribute(value) {
  return typeof value === "string" && DIR_ATTR_RE.test(value);
}

export function hasEmptyParagraph(value) {
  if (typeof value !== "string") return false;

  const allowed = new Set();
  for (const match of value.matchAll(EMPTY_P_IN_TD_RE)) {
    const inner = match[0];
    const pMatch = inner.match(/<p>\s*<\/p>/i);
    if (pMatch) {
      allowed.add(pMatch.index + match.index);
    }
  }

  for (const match of value.matchAll(EMPTY_PARAGRAPH_RE)) {
    const globalIndex = match.index;
    if (allowed.has(globalIndex)) continue;
    return true;
  }

  return false;
}

export function warnOnDirAttribute(value, fieldPath, filePath, warn) {
  if (hasDirAttribute(value)) {
    warn(`${filePath}: ${fieldPath} contient des attributs dir=`);
  }
}

export function warnOnEmptyParagraphs(value, fieldPath, filePath, warn) {
  if (hasEmptyParagraph(value)) {
    warn(`${filePath}: ${fieldPath} contient au moins un paragraphe vide`);
  }
}

export function decodeHtmlEntities(text) {
  return String(text ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function replaceGameSymbols(text) {
  if (!text) return text;
  let result = text;
  for (const [symbol, replacement] of Object.entries(SYMBOL_MAP)) {
    const re = new RegExp(symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    result = result.replace(re, replacement);
  }
  return result;
}

export function slugifyHeadingAnchor(text) {
  return replaceGameSymbols(
    decodeHtmlEntities(stripHtml(text))
  )
    .replace(/œ/g, "oe")
    .replace(/Œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/Æ/g, "ae")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function extractHeadingAnchorsFromHtml(html) {
  const anchors = new Set();
  const counts = new Map();

  if (typeof html !== "string" || !html.trim()) return anchors;

  for (const match of html.matchAll(HEADING_RE)) {
    const attrs = match[2] ?? "";
    const innerHtml = match[3] ?? "";

    const explicitId = attrs.match(ID_ATTR_RE)?.[1];
    if (explicitId) {
      anchors.add(explicitId);
      continue;
    }

    const base = slugifyHeadingAnchor(innerHtml);
    if (!base) continue;

    const count = counts.get(base) ?? 0;
    if (count === 0) {
      anchors.add(base);
    }
    else {
      anchors.add(`${base}$${count}`);
    }

    counts.set(base, count + 1);
  }

  return anchors;
}

export function extractUuidReferences(html) {
  const refs = [];
  if (typeof html !== "string" || !html.trim()) return refs;

  for (const match of html.matchAll(UUID_TAG_RE)) {
    const rawTarget = match[1];
    const label = match[2] ?? null;

    const [targetWithoutAnchor, anchor] = rawTarget.split("#");
    refs.push({
      raw: match[0],
      target: rawTarget,
      targetWithoutAnchor,
      anchor: anchor ?? null,
      label
    });
  }

  return refs;
}

export function extractHtmlSrcs(html) {
  const srcs = [];
  if (typeof html !== "string" || !html.trim()) return srcs;

  for (const match of html.matchAll(SRC_ATTR_RE)) {
    srcs.push(match[1]);
  }

  return srcs;
}

export function buildModuleReferenceIndex({ packsDir, moduleId, fail }) {
  const index = {
    exactTargets: new Set(),
    pageAnchorsByPageId: new Map(),
    journalByPageId: new Map(),
    journalNamesById: new Map()
  };

  if (!fs.existsSync(packsDir)) {
    fail?.(`Répertoire des packs introuvable: ${packsDir}`);
    return index;
  }

  const packDirs = fs.readdirSync(packsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const packName of packDirs) {
    const packPath = path.join(packsDir, packName);
    const files = fs.readdirSync(packPath)
      .filter((file) => file.endsWith(".json"))
      .sort();

    for (const file of files) {
      const absolutePath = path.join(packPath, file);
      let doc;
      try {
        doc = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
      } catch {
        continue;
      }

      if (!doc || typeof doc !== "object") continue;

      // Folders ignorés
      if (typeof doc._key === "string" && doc._key.startsWith("!folders!")) {
        continue;
      }

      // JournalEntry
      if (Array.isArray(doc.pages)) {
        if (typeof doc._id === "string") {
          index.exactTargets.add(
            `Compendium.${moduleId}.${packName}.JournalEntry.${doc._id}`
          );
          index.journalNamesById.set(doc._id, doc.name ?? doc._id);
        }

        for (const page of doc.pages) {
          if (!page || typeof page !== "object") continue;
          if (typeof page._id !== "string") continue;

          index.exactTargets.add(
            `Compendium.${moduleId}.${packName}.JournalEntry.${doc._id}.JournalEntryPage.${page._id}`
          );

          index.journalByPageId.set(page._id, {
            journalId: doc._id,
            journalName: doc.name ?? doc._id,
            packName
          });

          if (page.type === "text" && typeof page?.text?.content === "string") {
            index.pageAnchorsByPageId.set(
              page._id,
              extractHeadingAnchorsFromHtml(page.text.content)
            );
          } else {
            index.pageAnchorsByPageId.set(page._id, new Set());
          }
        }

        continue;
      }

      // Items
      if (typeof doc._id === "string") {
        index.exactTargets.add(
          `Compendium.${moduleId}.${packName}.Item.${doc._id}`
        );
      }
    }
  }

  return index;
}

function isRelativePageUuid(targetWithoutAnchor) {
  return /^\.[A-Za-z0-9]+$/.test(targetWithoutAnchor);
}

function isCompendiumUuid(targetWithoutAnchor) {
  return /^Compendium\.[^.]+\.[^.]+\.[A-Za-z]+\.[A-Za-z0-9]+(?:\.[A-Za-z]+\.[A-Za-z0-9]+)?$/.test(
    targetWithoutAnchor
  );
}

export function validateHtmlReferences(html, fieldPath, filePath, fail, context = {}) {
  if (typeof html !== "string" || !html.trim()) return;

  const {
    moduleId = MODULE_ID,
    rootDir = ROOT,
    referenceIndex = null,
    currentDocument = null
  } = context;

  // @UUID
  for (const ref of extractUuidReferences(html)) {
    const { targetWithoutAnchor, anchor, raw } = ref;

    let resolvedTarget = targetWithoutAnchor;
    let anchorSet = null;

    if (isRelativePageUuid(targetWithoutAnchor)) {
      const pageId = targetWithoutAnchor.slice(1);

      if (!referenceIndex?.journalByPageId?.has(pageId)) {
        fail(`${filePath}: ${fieldPath} contient un @UUID relatif vers une page inconnue (${raw})`);
        continue;
      }

      anchorSet = referenceIndex.pageAnchorsByPageId.get(pageId) ?? new Set();
    } else if (isCompendiumUuid(targetWithoutAnchor)) {
      if (!referenceIndex?.exactTargets?.has(targetWithoutAnchor)) {
        const packMatch = targetWithoutAnchor.match(/^Compendium\.[^.]+\.([^.]+)\./);
        const packName = packMatch?.[1];
        if (IGNORED_PACKS_FOR_UUID.has(packName)) {
          return; // skip silencieux
        }
        fail(`${filePath}: ${fieldPath} contient un @UUID vers une cible inexistante (${raw})`);
        continue;
      }

      const pageMatch = targetWithoutAnchor.match(/\.JournalEntryPage\.([A-Za-z0-9]+)$/);
      if (pageMatch) {
        const pageId = pageMatch[1];
        anchorSet = referenceIndex.pageAnchorsByPageId.get(pageId) ?? new Set();
      }
    } else {
      fail(`${filePath}: ${fieldPath} contient un @UUID de syntaxe invalide (${raw})`);
      continue;
    }

    if (anchor) {
      if (!anchorSet || !anchorSet.has(anchor)) {
        fail(`${filePath}: ${fieldPath} contient un @UUID avec ancre introuvable "${anchor}" (${raw})`);
      }
    }
  }

  // src
  for (const src of extractHtmlSrcs(html)) {
    if (src.startsWith(`modules/${moduleId}/`)) {
      const relativeModulePath = src.slice(`modules/${moduleId}/`.length);
      const absolutePath = path.join(rootDir, relativeModulePath);

      if (!fs.existsSync(absolutePath)) {
        fail(`${filePath}: ${fieldPath} contient un src introuvable (${src})`);
      }
      continue;
    }

    if (src.startsWith("icons/") || src.startsWith("systems/") || src.startsWith("data:") || src.startsWith("http://") || src.startsWith("https://")) {
      continue;
    }

    fail(`${filePath}: ${fieldPath} contient un src non supporté (${src})`);
  }
}