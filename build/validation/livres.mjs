import path from "node:path";
import {
  ROOT,
  MODULE_ID,
  loadJson,
  listJsonFiles,
  buildModuleReferenceIndex
} from "./lib/validation-helpers.mjs";
import { runValidationSuite } from "./lib/validation-core.mjs";
import {
  validateFolderDocumentBasic,
  validateJournalEntryDocumentBasic,
  validateJournalEntryPagesBasic,
  validateJournalEntryPagesHtml,
  validatePngImageField
} from "./lib/validation-rules.mjs";

const BOOKS_DIR = path.join(ROOT, "src", "packs", "livres");
const THUMBS_DIR = path.join(ROOT, "assets", "images", "livres", "thumbnails");

function isFolderDocument(doc) {
  return typeof doc?._key === "string" && doc._key.startsWith("!folders!");
}

function isJournalEntryDocument(doc) {
  return typeof doc?._key === "string" && doc._key.startsWith("!journal!");
}

function buildBooksFolderIndex(dirPath) {
  const folderNamesById = new Map();

  for (const file of listJsonFiles(dirPath)) {
    const absolutePath = path.join(dirPath, file);
    const doc = loadJson(absolutePath, () => {});
    if (!doc) continue;

    if (isFolderDocument(doc)) {
      folderNamesById.set(doc._id, doc.name);
    }
  }

  return folderNamesById;
}

function requiresBookThumbnail(doc) {
  if (isFolderDocument(doc)) {
    return false;
  }

  if (doc.name === "Planètes") {
    return false;
  }

  const folderName = typeof doc.folder === "string" ? folderNamesById.get(doc.folder) : null;
  if (folderName === "Tables") {
    return false;
  }

  return true;
}

const PACKS_DIR = path.join(ROOT, "src", "packs");
const folderNamesById = buildBooksFolderIndex(BOOKS_DIR);
const referenceIndex = buildModuleReferenceIndex({
  packsDir: PACKS_DIR,
  moduleId: MODULE_ID
});

await runValidationSuite({
  label: "des livres",
  dirPath: BOOKS_DIR,
  relativeDir: path.join("src", "packs", "livres"),
  validateDocument: async ({ doc, filePath, fail, warn, seenIds, seenNames }) => {
    if (isFolderDocument(doc)) {
      validateFolderDocumentBasic({
        doc,
        filePath,
        fail,
        seenIds,
        seenNames
      });
      return;
    }

    if (isJournalEntryDocument(doc)) {
      const ok = validateJournalEntryDocumentBasic({
        doc,
        filePath,
        fail,
        seenIds,
        seenNames
      });

      if (!ok) return;

      validateJournalEntryPagesBasic(doc, filePath, fail);

      const referenceContext = {
        moduleId: MODULE_ID,
        rootDir: ROOT,
        referenceIndex,
        currentDocument: doc
      };
      await validateJournalEntryPagesHtml(doc, filePath, fail, warn, referenceContext);

      if (requiresBookThumbnail(doc)) {
        validatePngImageField({
          imagePath: doc?.flags?.["star-wars-compendium-fr"]?.thumbnail,
          expectedPrefix: "modules/star-wars-compendium-fr/assets/images/livres/thumbnails/",
          absoluteImagesDir: THUMBS_DIR,
          filePath,
          fail,
          maxBytes: 250 * 1024,
          maxWidth: 300,
          maxHeight: 388
        });
      }

      return;
    }
  }
});