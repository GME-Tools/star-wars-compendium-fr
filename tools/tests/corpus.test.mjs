import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const script = fs.readFileSync(path.join(root, 'tools/corpus.mjs'));
const catalog = fs.readFileSync(path.join(root, 'corpus/books.json'));
function fixture() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'swffg-test-'));
  fs.mkdirSync(path.join(tmp, 'tools'));
  fs.mkdirSync(path.join(tmp, 'corpus'));
  fs.writeFileSync(path.join(tmp, 'tools', 'corpus.mjs'), script);
  fs.writeFileSync(path.join(tmp, 'corpus', 'books.json'), catalog);
  return tmp;
}
function run(tmp, ...args) {
  return spawnSync(process.execPath, [path.join(tmp, 'tools/corpus.mjs'), ...args], { cwd: tmp, encoding: 'utf8' });
}
test('catalog includes the three game lines and first book', () => {
  const tmp = fixture();
  const a = run(tmp, 'catalog');
  assert.equal(a.status, 0, a.stderr);
  assert.match(a.stdout, /SWE02/);
  assert.match(a.stdout, /SWA02/);
  assert.match(a.stdout, /SWF02/);
  assert.match(a.stdout, /54 books/);
});
test('initialize, map, detect incomplete review and reject premature completion', () => {
  const tmp = fixture(), pdf = path.join(tmp, 'local-test.pdf');
  fs.writeFileSync(pdf, 'fake source fingerprint for CLI test');
  assert.equal(run(tmp, 'init', 'SWE02', '--pdf', pdf).status, 0);
  assert.equal(run(tmp, 'set-pages', 'SWE02', '3').status, 0);
  assert.equal(run(tmp, 'add-unit', 'SWE02', 'SWE02-U01', '--pages', '1-3', '--title', 'Synthetic').status, 0);
  const next = run(tmp, 'next', 'SWE02');
  assert.equal(next.status, 0);
  assert.match(next.stdout, /"task": "extraction"/);
  const strict = run(tmp, 'check', 'SWE02', '--strict');
  assert.equal(strict.status, 1);
  assert.match(strict.stdout, /not yet human approved/);
  const e = path.join(tmp, '.swffg-work', 'books', 'SWE02', 'proof.json');
  fs.writeFileSync(e, '{"proof":"synthetic"}');
  const premature = run(tmp, 'mark', 'SWE02', 'SWE02-U01', 'automatic_review', '--evidence', e);
  assert.equal(premature.status, 1);
  const st = JSON.parse(fs.readFileSync(path.join(tmp, '.swffg-work','books','SWE02','state.json'),'utf8'));
  const qa = path.join(tmp, '.swffg-work','books','SWE02','qa.json');
  fs.writeFileSync(qa, JSON.stringify({book:'SWE02',unit:'SWE02-U01',edition_sha256:st.pdf_sha256,blocks:1,pass:true,errors:[]}));
  const independent = path.join(tmp, '.swffg-work','books','SWE02','review.json');
  fs.writeFileSync(independent, JSON.stringify({book:'SWE02',unit:'SWE02-U01',edition_sha256:st.pdf_sha256,source_examined:true,verdict:'pass',reviewer:'independent-test'}));
  const artifacts = {extraction:e,fulltext:e,entities:e,automatic_review:qa,independent_review:independent};
  for (const step of ['extraction','fulltext','entities','automatic_review','independent_review']) {
    const x = run(tmp, 'mark', 'SWE02', 'SWE02-U01', step, '--evidence', artifacts[step]);
    assert.equal(x.status, 0, step + ': ' + x.stderr);
  }
  const review = run(tmp, 'next', 'SWE02');
  assert.match(review.stdout, /human_review/);
  const approval = run(tmp, 'approve', 'SWE02', 'SWE02-U01');
  assert.equal(approval.status, 1);
  assert.match(approval.stderr, /interactive terminal/);
});
test('duplicate unit and out-of-bounds pages are rejected', () => {
  const tmp = fixture(), pdf = path.join(tmp,'source.pdf');
  fs.writeFileSync(pdf, 'x');
  run(tmp, 'init','SWE02','--pdf',pdf);
  run(tmp, 'set-pages','SWE02','2');
  assert.equal(run(tmp,'add-unit','SWE02','SWE02-U01','--pages','1-5').status,1);
  assert.equal(run(tmp,'add-unit','SWE02','SWE02-U01','--pages','1-2').status,0);
  assert.equal(run(tmp,'add-unit','SWE02','SWE02-U01','--pages','1-2').status,1);
});
