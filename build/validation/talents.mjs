import path from "node:path";
import { ROOT, isNonEmptyString } from "./lib/validation-helpers.mjs";
import { runValidationSuite } from "./lib/validation-core.mjs";
import {
  validateCommonDocument,
  validateCommonHtmlTextField,
  validateDocumentSources,
  validateDocumentAttributesEffects,
  validateRequiredBoolean,
  validateRequiredInteger
} from "./lib/validation-rules.mjs";

const TALENTS_DIR = path.join(ROOT, "src", "packs", "talents");

await runValidationSuite({
  label: "des talents",
  dirPath: TALENTS_DIR,
  relativeDir: path.join("src", "packs", "talents"),
  validateDocument: async ({ doc, filePath, fail, warn, seenIds, seenNames }) => {
    const ok = await validateCommonDocument({
      doc,
      filePath,
      fail,
      seenIds,
      seenNames,
      expectedType: "talent"
    });

    if (!ok) return;

    await validateCommonHtmlTextField({
      value: doc.system.description,
      fieldPath: "system.description",
      filePath,
      fail,
      warn
    });

    await validateCommonHtmlTextField({
      value: doc.system.longDesc,
      fieldPath: "system.longDesc",
      filePath,
      fail,
      warn
    });

    validateDocumentSources({ doc, filePath, fail });

    if (!isNonEmptyString(doc?.system?.activation?.value)) {
      fail(`${filePath}: system.activation.value manquant`);
    }

    validateRequiredInteger(doc?.system?.tier, "system.tier", filePath, fail, { min: 1 });
    validateRequiredBoolean(doc?.system?.ranks?.ranked, "system.ranks.ranked", filePath, fail);

    if (doc?.system?.ranks?.ranked === true) {
      validateRequiredInteger(doc?.system?.ranks?.current, "system.ranks.current", filePath, fail, { min: 1 });
    }

    validateRequiredBoolean(doc?.system?.isForceTalent, "system.isForceTalent", filePath, fail);
    validateRequiredBoolean(doc?.system?.isConflictTalent, "system.isConflictTalent", filePath, fail);

    validateDocumentAttributesEffects({ doc, filePath, fail });
  }
});