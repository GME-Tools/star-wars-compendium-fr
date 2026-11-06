import path from "node:path";
import {
  ROOT,
  isPlainObject,
  isNonEmptyString
} from "./lib/validation-helpers.mjs";
import { runValidationSuite } from "./lib/validation-core.mjs";
import {
  validateCommonDocument,
  validateCommonHtmlTextField,
  validateDocumentSources,
  validateRequiredInteger
} from "./lib/validation-rules.mjs";

const QUALITES_DIR = path.join(ROOT, "src", "packs", "qualites");
const EXPECTED_IMG = "icons/svg/item-bag.svg";
const VALID_SYSTEM_TYPES = new Set(["all", "weapon", "armor"]);

function validateArrayField(value, fieldPath, filePath, fail) {
  if (!Array.isArray(value)) {
    fail(`${filePath}: ${fieldPath} doit être un tableau`);
  }
}

function validateObjectField(value, fieldPath, filePath, fail) {
  if (!isPlainObject(value)) {
    fail(`${filePath}: ${fieldPath} doit être un objet`);
  }
}

function warnOnEffectsDebt(doc, filePath, warn) {
  const attributes = doc?.system?.attributes;
  const effects = doc?.effects;
  if (!isPlainObject(attributes) || !Array.isArray(effects)) return;

  const attributeKeys = Object.keys(attributes);
  if (attributeKeys.length === 0 && effects.length === 0) return;

  const effectNames = new Set(
    effects
      .map((effect) => effect?.name)
      .filter((name) => isNonEmptyString(name))
  );

  const attributesWithoutEffect = attributeKeys.filter((key) => !effectNames.has(key));
  const effectsWithoutAttribute = [...effectNames].filter((name) => /^attr\d+$/.test(name) && !attributeKeys.includes(name));

  if (attributesWithoutEffect.length > 0) {
    warn(`${filePath}: dette effects, attribut(s) sans effet correspondant: ${attributesWithoutEffect.join(", ")}`);
  }

  if (effectsWithoutAttribute.length > 0) {
    warn(`${filePath}: dette effects, effet(s) sans attribut correspondant: ${effectsWithoutAttribute.join(", ")}`);
  }
}

await runValidationSuite({
  label: "des qualités",
  dirPath: QUALITES_DIR,
  relativeDir: path.join("src", "packs", "qualites"),
  validateDocument: async ({ doc, filePath, fail, warn, seenIds, seenNames }) => {
    const ok = await validateCommonDocument({
      doc,
      filePath,
      fail,
      seenIds,
      seenNames,
      expectedType: "itemmodifier"
    });

    if (!ok) return;

    if (doc.img !== EXPECTED_IMG) {
      fail(`${filePath}: img doit valoir "${EXPECTED_IMG}" (actuel: ${doc.img})`);
    }

    await validateCommonHtmlTextField({
      value: doc.system.description,
      fieldPath: "system.description",
      filePath,
      fail,
      warn
    });

    validateDocumentSources({ doc, filePath, fail });

    if (!VALID_SYSTEM_TYPES.has(doc.system.type)) {
      fail(`${filePath}: system.type invalide (${doc.system.type})`);
    }

    validateRequiredInteger(doc.system.rank, "system.rank", filePath, fail, { min: 0 });

    if (![0, 1].includes(doc.system.rank)) {
      fail(`${filePath}: system.rank doit valoir 0 ou 1 (actuel: ${doc.system.rank})`);
    }

    validateObjectField(doc.system.attributes, "system.attributes", filePath, fail);
    validateArrayField(doc.system.itemmodifier, "system.itemmodifier", filePath, fail);
    validateArrayField(doc.system.adjusteditemmodifer, "system.adjusteditemmodifer", filePath, fail);
    validateArrayField(doc.effects, "effects", filePath, fail);

    warnOnEffectsDebt(doc, filePath, warn);
  }
});
