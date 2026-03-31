import path from "node:path";
import {
  createReporter,
  loadJson,
  ensureDirExists,
  listJsonFiles
} from "./validation-helpers.mjs";

export async function runValidationSuite({
  label,
  dirPath,
  relativeDir,
  validateDocument
}) {
  const { fail, warn, info, ok, getWarningCount } = createReporter();

  ensureDirExists(dirPath, fail, `Répertoire ${label}`);

  const files = listJsonFiles(dirPath);
  if (files.length === 0) {
    fail(`Aucun fichier JSON trouvé dans ${dirPath}`);
  }

  const seenIds = new Map();
  const seenNames = new Map();

  for (const file of files) {
    const relativePath = path.join(relativeDir, file);
    const absolutePath = path.join(dirPath, file);

    try {
      const doc = loadJson(absolutePath, fail);
      if (!doc) continue;

      await validateDocument({
        doc,
        filePath: relativePath,
        fail,
        warn,
        info,
        seenIds,
        seenNames
      });
    } catch (error) {
      fail(`${relativePath}: exception inattendue pendant la validation (${error.message})`);
    }
  }

  if (!ok()) {
    console.error(`\nValidation ${label}: ÉCHEC`);
    process.exit(1);
  }

  info(`Validation ${label} OK (${files.length} fichier(s), ${getWarningCount()} warning(s))`);
}