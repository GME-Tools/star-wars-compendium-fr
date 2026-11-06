#!/usr/bin/env node
// Corpus CLI: deterministic, resumable book/unit ledger. No PDF content in Git.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG = path.join(ROOT, 'corpus', 'books.json');
const PRIVATE = path.join(ROOT, '.swffg-work');
const STEPS = ['extraction', 'fulltext', 'entities', 'automatic_review', 'independent_review'];
const DONE = 'done';
const stamp = () => new Date().toISOString();
const fail = (msg) => { throw new Error(msg); };
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const write = (p, value) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const temp = p + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(temp, p);
};
const sha256 = (p) => {
  const h = crypto.createHash('sha256'), f = fs.openSync(p, 'r'), buffer = Buffer.alloc(1024 * 1024);
  try {
    let n;
    while ((n = fs.readSync(f, buffer, 0, buffer.length, null)) > 0) h.update(buffer.subarray(0, n));
  } finally { fs.closeSync(f); }
  return h.digest('hex');
};
const books = () => read(CATALOG).books;
const book = (id) => books().find((b) => b.id === id) || fail('Unknown book ' + id + '. Run catalog.');
const statePath = (id) => path.join(PRIVATE, 'books', id, 'state.json');
const state = (id) => { book(id); const p = statePath(id); if (!fs.existsSync(p)) fail(id + ' is not initialized. Run init ' + id); return read(p); };
const save = (s) => { s.updated_at = stamp(); write(statePath(s.book_id), s); };
const argsOf = (args) => {
  const positions = [], opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      if (key === 'strict' || key === 'replace-pdf') opts[key] = true;
      else { if (!args[i + 1] || args[i + 1].startsWith('--')) fail('Missing value for ' + args[i]); opts[key] = args[++i]; }
    } else positions.push(args[i]);
  }
  return { positions, opts };
};
const parsePages = (expr) => {
  if (!expr) fail('Missing --pages N-M or N,M');
  const out = new Set();
  for (const term of expr.split(',')) {
    const m = term.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) fail('Invalid page range: ' + term);
    const a = Number(m[1]), b = Number(m[2] ?? m[1]);
    if (a < 1 || b < a || b - a > 2000) fail('Invalid page range: ' + term);
    for (let p = a; p <= b; p++) out.add(p);
  }
  return [...out].sort((a, b) => a - b);
};
const unitOf = (s, id) => s.units.find((u) => u.id === id) || fail('Unknown unit ' + id);
const toDisplay = (x) => JSON.stringify(x, null, 2);
const evidence = (value) => {
  if (!value) fail('Evidence file required: --evidence PATH');
  const p = path.resolve(ROOT, value);
  if (!fs.existsSync(p) || !fs.statSync(p).isFile()) fail('Evidence file not found: ' + p);
  // Provenance may refer to a PDF or transcript; evidence should never be in public paths.
  if (!p.startsWith(PRIVATE + path.sep)) fail('Evidence must be inside .swffg-work (private)');
  return path.relative(PRIVATE, p);
};
function createState(id, pdf) {
  const b = book(id);
  const s = { schema_version: 1, book_id: id, title: b.title, source_pdf: null,
    pdf_sha256: null, pdf_page_count: null, pagination_map: null,
    units: [], excluded_pages: [], source_indexes: [], questions: [], blockers: [],
    status: 'initialized', created_at: stamp(), updated_at: stamp(), history: [] };
  if (pdf) { const p = path.resolve(pdf); if (!fs.existsSync(p)) fail('PDF file not found: ' + p); s.source_pdf = p; s.pdf_sha256 = sha256(p); }
  return s;
}
const allDone = (u) => STEPS.every((step) => u.steps?.[step]?.status === DONE);
const approved = (u) => allDone(u) && u.human_approval?.status === 'approved';
function checkOne(s, { strict = false } = {}) {
  const errors = [], warnings = [], seenIds = new Set(), used = new Map();
  const n = s.pdf_page_count;
  if (!Number.isInteger(n) || n < 1) warnings.push('PDF page count unknown; complete coverage cannot be certified');
  if (!s.source_pdf || !s.pdf_sha256) warnings.push('No fingerprinted source PDF');
  else if (!fs.existsSync(s.source_pdf)) warnings.push('Source PDF unavailable at recorded path');
  else if (sha256(s.source_pdf) !== s.pdf_sha256) errors.push('Source PDF hash changed: invalidate and re-ingest affected units');
  for (const u of s.units) {
    if (seenIds.has(u.id)) errors.push('Duplicate unit ID: ' + u.id);
    seenIds.add(u.id);
    if (!u.pages?.length) errors.push('Unit without pages: ' + u.id);
    for (const p of u.pages || []) {
      if (!Number.isInteger(p) || p < 1 || (n && p > n)) errors.push('Out-of-bounds page ' + p + ' in ' + u.id);
      else used.set(p, (used.get(p) || 0) + 1);
    }
    for (const step of STEPS) {
      const st = u.steps?.[step];
      if (!st) errors.push(u.id + ': missing step ' + step);
      if (st?.status === DONE && !st.evidence) errors.push(u.id + ': missing evidence for ' + step);
      if (st?.status === DONE && st.evidence && !fs.existsSync(path.join(PRIVATE, st.evidence)))
        errors.push(u.id + ': evidence file lost for ' + step);
    }
    if (u.human_approval?.status === 'approved' && !allDone(u))
      errors.push(u.id + ': human approved but prerequisite reviews incomplete');
    if (u.human_approval?.status !== 'approved') warnings.push(u.id + ': not yet human approved');
  }
  const excluded = new Set();
  for (const e of s.excluded_pages) {
    if (!Number.isInteger(e.page) || e.page < 1 || (n && e.page > n)) errors.push('Invalid excluded page ' + e.page);
    if (!e.reason?.trim()) errors.push('Excluded page without justification: ' + e.page);
    excluded.add(e.page);
  }
  const uncovered = [];
  if (n) for (let p = 1; p <= n; p++) if (!used.has(p) && !excluded.has(p)) uncovered.push(p);
  if (uncovered.length) warnings.push(uncovered.length + ' pages not assigned or explicitly excluded');
  const overlaps = [...used].filter(([, count]) => count > 1).map(([page]) => page);
  // Multiple semantic sections may share one printed/PDF page.
  if (overlaps.length) warnings.push(overlaps.length + ' pages assigned to multiple units; inspect section boundaries');
  const result = { book: s.book_id, pdf_pages: n, units: s.units.length,
    approved_units: s.units.filter(approved).length, mapped_pages: used.size,
    excluded_pages: excluded.size, uncovered_pages: uncovered, overlapping_pages: overlaps,
    errors, warnings, complete: !!n && uncovered.length === 0 && errors.length === 0 &&
      s.units.length > 0 && s.units.every(approved) };
  if (strict && !result.complete) result.errors.push('Book does not meet completeness gates');
  return result;
}
function nextOne(s) {
  if (!s.source_pdf) return { book: s.book_id, task: 'source_required', detail: 'Provide the book PDF with init --pdf PATH' };
  if (!s.pdf_page_count) return { book: s.book_id, task: 'pdf_ingestion', detail: 'Run swffg-ingest, then set-pages BOOK N based on verified PDF count' };
  const c = checkOne(s);
  if (c.uncovered_pages.length) return { book: s.book_id, task: 'plan_coverage', next_pages: c.uncovered_pages.slice(0, 20), count: c.uncovered_pages.length };
  for (const u of s.units) {
    if (u.blockers?.length) continue;
    for (const step of STEPS) {
      if (u.steps[step].status !== DONE) return { book: s.book_id, unit: u.id, task: step, status: u.steps[step].status };
    }
    if (u.human_approval.status !== 'approved') return { book: s.book_id, unit: u.id, task: 'human_review' };
  }
  if (c.complete) return { book: s.book_id, task: 'ready_to_close' };
  return { book: s.book_id, task: 'resolve_blockers_and_checks', blockers: s.units.filter((u) => u.blockers?.length).map((u) => u.id) };
}
async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const { positions: a, opts } = argsOf(rest);
  switch (command) {
    case 'catalog': {
      const b = books(); console.log('Corpus catalog: ' + b.length + ' books (README seed, not exhaustive)');
      for (const item of b) console.log(item.id.padEnd(23) + item.title + ' — ' + item.family);
      break;
    }
    case 'init': {
      const id = a[0]; if (!id) fail('Usage: init BOOK [--pdf PATH] [--replace-pdf]');
      const p = statePath(id), pdf = opts.pdf;
      if (fs.existsSync(p)) {
        const s = state(id);
        if (pdf) {
          const f = path.resolve(pdf); if (!fs.existsSync(f)) fail('PDF file not found');
          const hash = sha256(f);
          if (s.pdf_sha256 && s.pdf_sha256 !== hash && !opts['replace-pdf'])
            fail('PDF fingerprint differs. Use --replace-pdf to reset verification state after review.');
          if (s.pdf_sha256 && s.pdf_sha256 !== hash) {
            s.history.push({ at: stamp(), event: 'pdf_changed', old_sha256: s.pdf_sha256 });
            s.pdf_page_count = null;
            s.pagination_map = null;
            for (const u of s.units) {
              for (const step of STEPS) u.steps[step] = { status: 'pending', evidence: null };
              u.human_approval = { status: 'pending' };
            }
          }
          s.source_pdf = f; s.pdf_sha256 = hash; save(s);
        }
        console.log('State already exists: ' + p);
      } else { write(p, createState(id, pdf)); console.log('Initialized ' + p); }
      break;
    }
    case 'set-pages': {
      const [id, number] = a, s = state(id), n = Number(number);
      if (!s.source_pdf || !s.pdf_sha256) fail('Source PDF required before recording verified page count');
      if (!Number.isInteger(n) || n < 1) fail('Positive integer page count required');
      if (s.pdf_page_count && s.pdf_page_count !== n && s.units.length) fail('Page count change would affect existing units; inspect manually');
      s.pdf_page_count = n; s.history.push({ at: stamp(), event: 'page_count_verified', pages: n }); save(s); console.log('Recorded PDF page count ' + n);
      break;
    }
    case 'add-unit': {
      const [id, uid] = a; if (!id || !uid) fail('Usage: add-unit BOOK UNIT --pages N-M --title TITLE');
      const s = state(id);
      if (!s.pdf_page_count) fail('Verify PDF page count with set-pages first');
      if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{2,80}$/.test(uid)) fail('Invalid unit ID');
      if (s.units.some((u) => u.id === uid)) fail('Unit already exists');
      const pages = parsePages(opts.pages);
      if (pages.some((p) => p > s.pdf_page_count)) fail('Unit page exceeds PDF page count');
      s.units.push({ id: uid, title: opts.title || null, pages, printed_pages: [], source_block_ids: [],
        steps: Object.fromEntries(STEPS.map((step) => [step, { status: 'pending', evidence: null }])),
        human_approval: { status: 'pending' }, blockers: [], outputs: { fulltext: [], entities: [] } });
      s.units.sort((x, y) => Math.min(...x.pages) - Math.min(...y.pages));
      save(s); console.log('Added ' + uid + ' pages ' + pages.join(','));
      break;
    }
    case 'mark': {
      const [id, uid, step] = a; if (!STEPS.includes(step)) fail('Step must be one of: ' + STEPS.join(', '));
      const s = state(id), u = unitOf(s, uid);
      const st = opts.status || 'done';
      if (!['done', 'pending', 'blocked', 'in_progress'].includes(st)) fail('Invalid status ' + st);
      if (st === DONE) {
        if (step !== 'extraction' && u.steps.extraction.status !== DONE) fail('Extraction must be done first');
        if (step === 'automatic_review' && (u.steps.fulltext.status !== DONE || u.steps.entities.status !== DONE))
          fail('Both fulltext and entities must be done before automatic review');
        if (step === 'independent_review' && u.steps.automatic_review.status !== DONE)
          fail('Automatic review must be done first');
      }
      const e = st === DONE ? evidence(opts.evidence) : null;
      u.steps[step] = { status: st, evidence: e, updated_at: stamp() };
      if (u.human_approval.status === 'approved') u.human_approval = { status: 'revoked', reason: 'Unit changed after approval', at: stamp() };
      // Downstream reviews cannot remain valid when their inputs are modified.
      if (['extraction', 'fulltext', 'entities'].includes(step)) {
        for (const dep of ['automatic_review', 'independent_review']) if (dep !== step)
          u.steps[dep] = { status: 'pending', evidence: null };
      } else if (step === 'automatic_review') u.steps.independent_review = { status: 'pending', evidence: null };
      save(s); console.log('Marked ' + uid + ' ' + step + ' as ' + st);
      break;
    }
    case 'approve': {
      const [id, uid] = a, s = state(id), u = unitOf(s, uid);
      if (!allDone(u)) fail('All deterministic and independent reviews must be done first');
      if (!process.stdin.isTTY) fail('Human approval requires interactive terminal; agents must not approve automatically');
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const phrase = 'APPROVE ' + id + ' ' + uid;
      const answer = await rl.question('Type "' + phrase + '" to approve this reviewed unit: ');
      if (answer !== phrase) fail('Approval cancelled');
      const reviewer = await rl.question('Reviewer name or identifier: '); rl.close();
      if (!reviewer.trim()) fail('Reviewer required');
      u.human_approval = { status: 'approved', reviewer: reviewer.trim(), at: stamp() };
      save(s); console.log('Human approval recorded for ' + uid);
      break;
    }
    case 'exclude-page': {
      const [id, pg] = a, s = state(id), page = Number(pg);
      if (!s.pdf_page_count || !Number.isInteger(page) || page < 1 || page > s.pdf_page_count)
        fail('Valid PDF page number required');
      if (!opts.reason?.trim()) fail('Exclusion reason required (--reason TEXT)');
      if (!s.excluded_pages.some((x) => x.page === page))
        s.excluded_pages.push({ page, reason: opts.reason, at: stamp() });
      save(s); console.log('Recorded justified exclusion of page ' + page);
      break;
    }
    case 'next': {
      if (a[0]) console.log(toDisplay(nextOne(state(a[0]))));
      else {
        const out = [];
        for (const b of books()) if (fs.existsSync(statePath(b.id))) out.push(nextOne(state(b.id)));
        console.log(toDisplay(out.length ? out : { task: 'init', book: 'SWE02' }));
      }
      break;
    }
    case 'status': {
      const bs = a[0] ? [book(a[0])] : books();
      for (const b of bs) {
        if (!fs.existsSync(statePath(b.id))) { console.log(b.id + ': not initialized'); continue; }
        const s = state(b.id), c = checkOne(s);
        console.log(b.id + ': pages=' + (c.pdf_pages ?? '?') + ' mapped=' + c.mapped_pages +
          ' units=' + c.units + ' approved=' + c.approved_units + ' uncovered=' + c.uncovered_pages.length +
          ' errors=' + c.errors.length + (c.complete ? ' COMPLETE' : ''));
      }
      break;
    }
    case 'check': {
      const bs = a[0] ? [book(a[0])] : books().filter((b) => fs.existsSync(statePath(b.id)));
      if (!bs.length) fail('No initialized books');
      let bad = false;
      for (const b of bs) {
        const r = checkOne(state(b.id), { strict: !!opts.strict });
        console.log(toDisplay(r));
        if (r.errors.length) bad = true;
      }
      if (bad) process.exitCode = 1;
      break;
    }
    default:
      console.log('Usage: node tools/corpus.mjs catalog|init|set-pages|add-unit|mark|approve|exclude-page|next|status|check');
      if (command) process.exitCode = 2;
  }
}
main().catch((e) => { console.error('ERROR:', e.message); process.exitCode = 1; });
