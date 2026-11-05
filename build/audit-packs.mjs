import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "audit", "results");
const EXTRACTED = path.join(ROOT, "audit", "extracted");
const MANIFEST = JSON.parse(fs.readFileSync("module.json", "utf8"));
const PACKS = MANIFEST.packs.map(p => p.name);
const errors = [];
const extraction = {};
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(EXTRACTED, { recursive: true });
const exists = p => fs.existsSync(p);
const traverse = (dir) => exists(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? traverse(path.join(dir, e.name)) : e.name.endsWith(".json") ? [path.join(dir, e.name)] : []) : [];
for (const pack of PACKS) {
  const src = path.join(ROOT, "src", "packs", pack);
  const manifestPack = MANIFEST.packs.find(p => p.name === pack);
  const bin = path.join(ROOT, manifestPack.path);
  const output = path.join(EXTRACTED, pack);
  const sourceFiles = traverse(src);
  if (sourceFiles.length) {
    extraction[pack] = { origin: "src/packs", success: true, files: sourceFiles.length };
    continue;
  }
  if (!exists(bin)) {
    extraction[pack] = { origin: "missing", success: false, error: "no pack directory" };
    errors.push(pack + ": pack directory missing");
    continue;
  }
  fs.mkdirSync(output, { recursive: true });
  const p = spawnSync("npx", ["fvtt", "package", "unpack", pack, "--outputDirectory", output], {
    encoding: "utf8", timeout: 180000, shell: process.platform === "win32"
  });
  const success = p.status === 0;
  const files = traverse(output);
  extraction[pack] = { origin: "LevelDB", success, files: files.length,
    error: success ? null : (p.stderr || p.stdout || "unpack failed").slice(-1600) };
  if (!success) errors.push(pack + ": " + extraction[pack].error);
}
const documents = {};
const idIndex = new Map();
const records = [];
for (const pack of PACKS) {
  const folder = extraction[pack]?.origin === "src/packs" ? path.join(ROOT, "src", "packs", pack) : path.join(EXTRACTED, pack);
  const files = traverse(folder);
  const sum = { files: files.length, documentTypes: {}, documents: 0, folders: 0, journalPages: 0,
    activeEffects: 0, effectChanges: 0, sourceReferences: 0, idsMissing: 0,
    duplicatedIds: [], duplicatedNames: [], errors: [] };
  const names = new Set();
  const ids = new Set();
  for (const file of files) {
    try {
      const d = JSON.parse(fs.readFileSync(file, "utf8"));
      const key = typeof d._key === "string" ? d._key : "";
      const isFolder = key.startsWith("!folders!");
      const isDocument = !!d._id && !isFolder;
      if (isFolder) sum.folders++;
      if (!isDocument) continue;
      sum.documents++;
      const type = d.type ?? (Array.isArray(d.pages) ? "JournalEntry" : "unspecified");
      sum.documentTypes[type] = (sum.documentTypes[type] || 0) + 1;
      sum.journalPages += Array.isArray(d.pages) ? d.pages.length : 0;
      sum.activeEffects += Array.isArray(d.effects) ? d.effects.length : 0;
      sum.effectChanges += (d.effects || []).reduce((n, e) => n + (e.changes || []).length, 0);
      sum.sourceReferences += (d.system?.metadata?.sources || []).length;
      if (!d._id) sum.idsMissing++;
      if (ids.has(d._id)) sum.duplicatedIds.push(d._id); else ids.add(d._id);
      if (names.has(d.name)) sum.duplicatedNames.push(d.name); else names.add(d.name);
      idIndex.set(pack + "/" + d._id, { name: d.name, file: path.relative(ROOT, file) });
      records.push({ pack, id: d._id, name: d.name, type, file: path.relative(ROOT, file),
        sources: d.system?.metadata?.sources ?? [], pages: d.pages?.length || 0,
        effects: d.effects?.length || 0, description: typeof d.system?.description === "string",
        raw: d });
    } catch (e) { sum.errors.push(path.relative(ROOT, file) + ": " + e.message); }
  }
  documents[pack] = sum;
}
const references = { total: 0, resolved: 0, missing: [], foreign: 0 };
const uuid = /(?:@UUID\[)?Compendium\.star-wars-compendium-fr\.([A-Za-z0-9_-]+)\.(?:Item|Actor|JournalEntry|Adventure)\.([A-Za-z0-9]{8,32})/g;
for (const d of records) {
  const raw = JSON.stringify(d.raw);
  for (const m of raw.matchAll(uuid)) {
    references.total++;
    if (idIndex.has(m[1] + "/" + m[2])) references.resolved++;
    else references.missing.push({ from: d.pack + "/" + d.id, to: m[1] + "/" + m[2] });
  }
  delete d.raw;
}
const seenMissing = new Set();
references.missing = references.missing.filter(r => {
  const k = r.from + "->" + r.to;
  if (seenMissing.has(k)) return false;
  seenMissing.add(k);
  return true;
});
const result = { generatedAt: new Date().toISOString(), sourceCommit: process.env.GITHUB_SHA || null,
  manifestVersion: MANIFEST.version, extraction, documents, references, errors };
fs.writeFileSync(path.join(OUT, "inventory.json"), JSON.stringify(result, null, 2) + "\n");
fs.writeFileSync(path.join(OUT, "documents.json"), JSON.stringify(records, null, 2) + "\n");
const escape = s => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const rows = PACKS.map(p => {
  const e = extraction[p], d = documents[p];
  return "| " + [p, e.origin, e.success ? "OK" : "FAIL", d.documents, d.folders, d.journalPages, d.activeEffects, d.effectChanges, d.errors.length].map(escape).join(" | ") + " |";
});
const report = [
  "# Inventaire automatisé — Star Wars Compendium FR",
  "",
  "Source: \`" + (result.sourceCommit || "local") + "\` · Module " + result.manifestVersion,
  "",
  "## Packs",
  "",
  "| Pack | Origine | Extraction | Documents | Dossiers | Pages | Effects | Changes | Erreurs JSON |",
  "|---|---|---|---:|---:|---:|---:|---:|---:|",
  ...rows,
  "",
  "## Liens entre compendiums",
  "",
  "- Occurrences de références internes : " + references.total,
  "- Références résolues : " + references.resolved,
  "- Occurrences non résolues : " + (references.total - references.resolved),
  "- Paires source/cible non résolues : " + references.missing.length,
  "",
  "Les références sont contrôlées par expression régulière; liens sans UUID et références aux pages de journal nécessitent un contrôle complémentaire.",
  "",
  "## Extraction",
  "",
  ...errors.map(x => "- " + x.replace(/\n/g, " ")),
  ...(errors.length ? [] : ["Aucune erreur d'extraction signalée."]),
  "",
  "## Limites",
  "",
  "La présence de documents ne prouve ni l'exhaustivité éditoriale ni la validité des Active Effects en jeu.",
  "Ce rapport reste un contrôle statique. Les cas de test V13 seront traités séparément.",
  ""
].join("\n");
fs.writeFileSync(path.join(OUT, "REPORT.md"), report);
console.log(report);
if (errors.length) process.exitCode = 1;
