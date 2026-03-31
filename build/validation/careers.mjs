import path from "node:path";
import { ROOT } from "./lib/validation-helpers.mjs";
import { runValidationSuite } from "./lib/validation-core.mjs";
import {
  validateCommonDocument,
  validateCommonHtmlTextField,
  validateDocumentSources,
  validateDocumentAttributesEffects,
  validateCareerSkillsObject,
  validateCompendiumRefsObject,
  validatePngImageField
} from "./lib/validation-rules.mjs";

const CAREERS_DIR = path.join(ROOT, "src", "packs", "carrieres");
const IMAGES_DIR = path.join(ROOT, "assets", "images", "carrieres");

const SPECIAL_CASES = new Map([
  ["Jedi", { specializations: 4, signatureabilities: 1 }],
  ["Soldat Clone", { specializations: 6, signatureabilities: 1 }]
]);

const SPECIALITES_LINK_RE = /^Compendium\.star-wars-compendium-fr\.specialites\.Item\.([A-Za-z0-9]+)$/;
const SIGNATUREABILITIES_LINK_RE =
  /^Compendium\.star-wars-compendium-fr\.capacites_emblematiques\.Item\.([A-Za-z0-9]+)$/;

await runValidationSuite({
  label: "des carrières",
  dirPath: CAREERS_DIR,
  relativeDir: path.join("src", "packs", "carrieres"),
  validateDocument: async ({ doc, filePath, fail, warn, seenIds, seenNames }) => {
    const ok = await validateCommonDocument({
      doc,
      filePath,
      fail,
      seenIds,
      seenNames,
      expectedType: "career"
    });

    if (!ok) return;

    await validateCommonHtmlTextField({
      value: doc.system.description,
      fieldPath: "system.description",
      filePath,
      fail,
      warn
    });

    validatePngImageField({
      imagePath: doc.img,
      expectedPrefix: "modules/star-wars-compendium-fr/assets/images/carrieres/",
      absoluteImagesDir: IMAGES_DIR,
      filePath,
      fail,
      maxBytes: 1024 * 1024,
      maxWidth: 1000,
      maxHeight: 1000
    });

    validateDocumentSources({ doc, filePath, fail });
    validateCareerSkillsObject(doc.system.careerSkills, "system.careerSkills", filePath, fail);

    validateCompendiumRefsObject({
      value: doc.system.specializations,
      fieldPath: "system.specializations",
      filePath,
      fail,
      expectedCount: SPECIAL_CASES.get(doc.name)?.specializations ?? 6,
      countLabel: `${doc.name} spécialités`,
      linkRegex: SPECIALITES_LINK_RE
    });

    validateCompendiumRefsObject({
      value: doc.system.signatureabilities,
      fieldPath: "system.signatureabilities",
      filePath,
      fail,
      expectedCount: SPECIAL_CASES.get(doc.name)?.signatureabilities ?? 2,
      countLabel: `${doc.name} capacités emblématiques`,
      linkRegex: SIGNATUREABILITIES_LINK_RE
    });

    validateDocumentAttributesEffects({ doc, filePath, fail });
  }
});