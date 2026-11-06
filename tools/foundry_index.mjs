#!/usr/bin/env node
// Index src/packs metadata without copying long descriptions to reports.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'src', 'packs');
const out = path.join(root, '.swffg-work', 'shared', 'foundry', 'index.json');
const result = { schema_version: 1, source: 'src/packs', records: [], errors: [] };
for (const dir of fs.readdirSync(source, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  for (const file of fs.readdirSync(path.join(source, dir.name)).filter(x => x.endsWith('.json'))) {
    const p = path.join(source, dir.name, file);
    try {
      const d = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (!d._id || (d._key || '').startsWith('!folders!')) continue;
      result.records.push({ pack: dir.name, id: d._id, name_fr: d.name,
        kind: d.type || (d.pages ? 'JournalEntry' : 'unspecified'),
        file: path.relative(root, p),
        sources: d.system?.metadata?.sources || [],
        page_count: Array.isArray(d.pages) ? d.pages.length : 0 });
    } catch (e) { result.errors.push({ file: path.relative(root, p), error: e.message }); }
  }
}
result.records.sort((a,b) => (a.pack+'/'+a.id).localeCompare(b.pack+'/'+b.id));
fs.mkdirSync(path.dirname(out), { recursive:true });
fs.writeFileSync(out, JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({ records: result.records.length, errors: result.errors.length, out },null,2));
process.exitCode = result.errors.length ? 1 : 0;
