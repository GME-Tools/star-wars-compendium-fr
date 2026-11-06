#!/usr/bin/env node
// Deterministic validation of a private full-text + entity bundle. Not a semantic PDF review.
import fs from 'node:fs';
import path from 'node:path';

const p = process.argv[2];
if (!p) { console.error('Usage: node tools/check-bundle.mjs .swffg-work/books/BOOK/units/UNIT/bundle.json'); process.exit(2); }
const file = path.resolve(p);
if (!fs.existsSync(file)) { console.error('Bundle missing: ' + file); process.exit(2); }
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const privateRoot = path.join(root, '.swffg-work');
if (!file.startsWith(privateRoot + path.sep)) { console.error('Bundle must be inside private workspace'); process.exit(2); }
const b = JSON.parse(fs.readFileSync(file, 'utf8'));
const errors = [];
const textFiles = new Set();
const ids = new Set();
const entityIds = new Set((b.entities || []).map(e => e.id));
if (b.schema_version !== 1 || !b.book_id || !b.unit_id || !b.edition_sha256)
  errors.push('Missing schema/book/unit/edition identity');
if (!Array.isArray(b.pdf_pages) || !b.pdf_pages.length) errors.push('Missing PDF page scope');
if (!Array.isArray(b.blocks) || !b.blocks.length) errors.push('Missing source block inventory');
if (!Array.isArray(b.entities)) errors.push('Missing entities array (may be empty)');
for (const block of b.blocks || []) {
  if (!block.id || ids.has(block.id)) errors.push('Missing/duplicate block id ' + block.id);
  ids.add(block.id);
  if (!b.pdf_pages?.includes(block.pdf_page)) errors.push(block.id + ': outside PDF page scope');
  const t = block.fulltext || {};
  if (!['transcribed', 'visual_anchor', 'excluded'].includes(t.status))
    errors.push(block.id + ': fulltext not accounted for');
  if (t.status === 'excluded' && !t.reason) errors.push(block.id + ': excluded without reason');
  if (['transcribed', 'visual_anchor'].includes(t.status)) {
    if (!t.file) errors.push(block.id + ': missing output text/visual file');
    else {
      const target = path.resolve(path.dirname(file), t.file);
      if (!target.startsWith(privateRoot + path.sep) || !fs.existsSync(target))
        errors.push(block.id + ': output not found inside private workspace');
      textFiles.add(target);
    }
  }
  const data = block.data || {};
  if (!['entities', 'text_only', 'blocked'].includes(data.disposition))
    errors.push(block.id + ': data disposition missing');
  if (data.disposition === 'entities') {
    if (!data.entity_ids?.length) errors.push(block.id + ': no entity ids');
    for (const id of data.entity_ids || [])
      if (!entityIds.has(id)) errors.push(block.id + ': unknown entity ' + id);
  }
  if (data.disposition === 'blocked' && !data.reason)
    errors.push(block.id + ': blocked without reason');
}
for (const e of b.entities || []) {
  if (!e.id || !e.type) errors.push('Entity without id or type');
  if (!e.source_block_ids?.length) errors.push(e.id + ': no provenance blocks');
  for (const id of e.source_block_ids || []) if (!ids.has(id)) errors.push(e.id + ': unknown source block ' + id);
  if (!e.file) errors.push(e.id + ': no canonical file');
  else {
    const target = path.resolve(path.dirname(file), e.file);
    if (!target.startsWith(privateRoot + path.sep) || !fs.existsSync(target))
      errors.push(e.id + ': canonical file missing or outside private workspace');
  }
}
const report = { book: b.book_id, unit: b.unit_id, blocks: ids.size, entities: (b.entities || []).length,
                 text_artifacts: textFiles.size, pass: !errors.length, errors };
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
