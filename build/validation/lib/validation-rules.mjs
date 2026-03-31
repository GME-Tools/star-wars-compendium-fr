import {
  isPlainObject,
  isNonEmptyString,
  countNonNoneEntries,
  validateHtmlField,
  validateHtmlSyntax,
  validateSourcesArray,
  validateUniqueString,
  validateAttributesEffectsMapping,
  validatePngImage,
  warnOnAllCapsTextLines,
  warnOnDirAttribute,
  warnOnEmptyParagraphs,
  isNonEmptyArray
} from "./validation-helpers.mjs";

// Validation of base properties shared by all documents
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

// Validation of HTML correctness and syntax
export async function validateCommonHtmlTextField({
  value,
  fieldPath,
  filePath,
  fail,
  warn
}) {
  const isOk = validateHtmlField(value, fieldPath, filePath, fail);
  if (!isOk) return;
  await validateHtmlSyntax(value, fieldPath, filePath, fail);
  warnOnAllCapsTextLines(value, fieldPath, filePath, warn);
}

// Validate that the sources array is valid
export function validateDocumentSources({ doc, filePath, fail }) {
  validateSourcesArray(doc?.system?.metadata?.sources, filePath, fail);
}

// Validate that attributes are named and attribute-effects mapping is valid
export function validateDocumentAttributesEffects({ doc, filePath, fail }) {
  validateAttributesEffectsMapping(doc, filePath, fail);
}

// Validate a property is boolean
export function validateRequiredBoolean(value, fieldPath, filePath, fail) {
  if (typeof value !== "boolean") {
    fail(`${filePath}: ${fieldPath} doit être booléen`);
  }
}

// Validate a property is a valid integer
export function validateRequiredInteger(value, fieldPath, filePath, fail, { min = null } = {}) {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    fail(`${filePath}: ${fieldPath} doit être un entier`);
    return;
  }

  if (min != null && value < min) {
    fail(`${filePath}: ${fieldPath} doit être >= ${min}`);
  }
}

// Validate a property is a valid object
export function validateObjectField(value, fieldPath, filePath, fail) {
  if (!isPlainObject(value)) {
    fail(`${filePath}: ${fieldPath} doit être un objet`);
    return false;
  }
  return true;
}

// Validate career skills field structure
export function validateCareerSkillsObject(skills, fieldPath, filePath, fail) {
  if (!validateObjectField(skills, fieldPath, filePath, fail)) return;

  const keys = Object.keys(skills);
  if (keys.length !== 8) {
    fail(`${filePath}: ${fieldPath} doit contenir 8 entrées (actuel: ${keys.length})`);
  }

  const filled = countNonNoneEntries(skills);
  if (filled === 0) {
    fail(`${filePath}: au moins une compétence de carrière est requise`);
  }
}

// Validate an image field points to a complient image
export function validatePngImageField({
  imagePath,
  expectedPrefix,
  absoluteImagesDir,
  filePath,
  fail,
  maxBytes,
  maxWidth,
  maxHeight
}) {
  validatePngImage({
    imagePath,
    expectedPrefix,
    absoluteImagesDir,
    filePath,
    fail,
    maxBytes,
    maxWidth,
    maxHeight
  });
}

// Validate an object structure referenced by compendium id
export function validateCompendiumRefsObject({
  value,
  fieldPath,
  filePath,
  fail,
  expectedCount = null,
  linkRegex,
  countLabel = fieldPath,
  validateEntry
}) {
  if (!validateObjectField(value, fieldPath, filePath, fail)) return;

  const entries = Object.entries(value);

  if (expectedCount != null && entries.length !== expectedCount) {
    fail(`${filePath}: ${countLabel} doit contenir ${expectedCount} entrées (actuel: ${entries.length})`);
  }

  for (const [key, entry] of entries) {
    if (!isPlainObject(entry)) {
      fail(`${filePath}: ${fieldPath}.${key} invalide`);
      continue;
    }

    if (entry.id !== key) {
      fail(`${filePath}: ${fieldPath}.${key} a un id incohérent (${entry.id})`);
    }

    if (!isNonEmptyString(entry.name)) {
      fail(`${filePath}: ${fieldPath}.${key} sans nom`);
    }

    if (!isNonEmptyString(entry.source)) {
      fail(`${filePath}: ${fieldPath}.${key} sans source`);
      continue;
    }

    if (linkRegex) {
      const match = entry.source.match(linkRegex);
      if (!match) {
        fail(`${filePath}: ${fieldPath}.${key} a une source invalide (${entry.source})`);
      } else if (match[1] !== entry.id) {
        fail(`${filePath}: ${fieldPath}.${key} référence ${match[1]} mais id vaut ${entry.id}`);
      }
    }

    if (validateEntry) {
      validateEntry(entry, key);
    }
  }
}

// Validate a JournalEntry page structure
export function validateTextPageStructure(page, pageLabel, fail) {
  if (!validateObjectField(page.title, "title", pageLabel, fail)) return;

  validateRequiredBoolean(page.title.show, "title.show", pageLabel, fail);
  validateRequiredInteger(page.title.level, "title.level", pageLabel, fail, { min: 1 });

  if (!validateObjectField(page.text, "text", pageLabel, fail)) return;

  if (!isNonEmptyString(page.text.content)) {
    fail(`${pageLabel}: text.content manquant ou vide`);
  }
}

// Validate that JournalEntry pages are valid
export function validateJournalEntryPagesBasic(doc, filePath, fail) {
  const pages = doc?.pages;

  if (!isNonEmptyArray(pages)) {
    fail(`${filePath}: pages doit être un tableau non vide`);
    return;
  }

  const seenPageIds = new Map();
  const seenPageNames = new Map();

  for (const [index, page] of pages.entries()) {
    const pageLabel = `${filePath}: page[${index}]`;

    if (!isPlainObject(page)) {
      fail(`${pageLabel}: page invalide`);
      continue;
    }

    validateUniqueString(page._id, "_id de page", pageLabel, seenPageIds, fail);
    validateUniqueString(page.name, "name de page", pageLabel, seenPageNames, fail);

    if (!isNonEmptyString(page.type)) {
      fail(`${pageLabel}: type manquant`);
      continue;
    }

    if (page.type !== "text") {
      fail(`${pageLabel}: type non supporté pour le moment (${page.type})`);
      continue;
    }

    validateTextPageStructure(page, pageLabel, fail);
  }
}

// Validate a JournalEntry folder structure
export function validateFolderDocumentBasic({
  doc,
  filePath,
  fail,
  seenIds,
  seenNames
}) {
  if (!isPlainObject(doc)) {
    fail(`${filePath}: document invalide`);
    return false;
  }

  validateUniqueString(doc._id, "_id", filePath, seenIds, fail);
  validateUniqueString(doc.name, "name", filePath, seenNames, fail);

  if (doc._key && !String(doc._key).startsWith("!folders!")) {
    fail(`${filePath}: folder avec _key inattendu (${doc._key})`);
  }

  if (doc.type !== "JournalEntry") {
    fail(`${filePath}: folder.type doit valoir "JournalEntry" (actuel: ${doc.type})`);
  }

  return true;
}

// Validate a JournalEntry document structure
export function validateJournalEntryDocumentBasic({
  doc,
  filePath,
  fail,
  seenIds,
  seenNames
}) {
  if (!isPlainObject(doc)) {
    fail(`${filePath}: document invalide`);
    return false;
  }

  validateUniqueString(doc._id, "_id", filePath, seenIds, fail);
  validateUniqueString(doc.name, "name", filePath, seenNames, fail);

  if (doc._key && !String(doc._key).startsWith("!journal!")) {
    fail(`${filePath}: journal avec _key inattendu (${doc._key})`);
  }

  if (!Array.isArray(doc.pages)) {
    fail(`${filePath}: pages doit être un tableau`);
    return false;
  }

  if (doc.pages.length === 0) {
    fail(`${filePath}: pages doit être un tableau non vide`);
  }

  return true;
}

// Validate a journal page HTML content
export async function validateJournalPageHtml(page, pageLabel, fail, warn) {
  const value = page?.text?.content;
  const fieldPath = "text.content";

  validateHtmlField(value, fieldPath, pageLabel, fail);
  await validateHtmlSyntax(value, fieldPath, pageLabel, fail);
  warnOnAllCapsTextLines(value, fieldPath, pageLabel, warn);
  warnOnDirAttribute(value, fieldPath, pageLabel, warn);
  warnOnEmptyParagraphs(value, fieldPath, pageLabel, warn);
}

// Validate all pages of a JournalEntry
export async function validateJournalEntryPagesHtml(doc, filePath, fail, warn) {
  const pages = doc?.pages;

  if (!isNonEmptyArray(pages)) {
    return;
  }

  for (const [index, page] of pages.entries()) {
    const pageLabel = `${filePath}: page[${index}]`;

    if (!isPlainObject(page)) continue;
    if (page.type !== "text") continue;

    await validateJournalPageHtml(page, pageLabel, fail, warn);
  }
}