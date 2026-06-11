#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const scanRoots = ['docs', 'package.json', 'tools'];
const ignoredDirNames = new Set(['archive']);
const coreDocs = [
  'docs/ARCHITECTURE_OVERVIEW.md',
  'docs/TEST_PORTFOLIO_GUIDELINES.md',
  'docs/dev_guide.md',
  'docs/layering_completion_audit.md',
  'docs/e2e_smoke.md',
  'docs/install_idempotency_patterns.md',
  'docs/supabase_cloud_sync_setup.md',
  'docs/supabase_cloud_sync.sql',
  'docs/REFACTOR_NEXT_STAGE_PLAN.md',
];

function walk(target, files = []) {
  const abs = path.join(repoRoot, target);
  if (!fs.existsSync(abs)) return files;
  const stat = fs.statSync(abs);
  if (stat.isFile()) {
    files.push(target);
    return files;
  }
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirNames.has(entry.name)) continue;
    walk(path.join(target, entry.name), files);
  }
  return files;
}

function read(file) {
  return fs.readFileSync(path.join(repoRoot, file), 'utf8');
}

function findDocRefs(text) {
  const refs = new Set();
  const inlineRx = /(?:^|[\s`'"([,])(?<ref>docs\/[^^\s`'"),]+\.(?:md|json|sql))/g;
  for (const match of text.matchAll(inlineRx)) {
    const ref = match.groups?.ref;
    if (ref) refs.add(ref.trim());
  }
  return [...refs];
}

const scannedFiles = scanRoots.flatMap(target => walk(target));
const missingCoreDocs = coreDocs.filter(file => !fs.existsSync(path.join(repoRoot, file)));
const missingRefs = [];

for (const file of scannedFiles) {
  const refs = findDocRefs(read(file));
  for (const ref of refs) {
    if (!fs.existsSync(path.join(repoRoot, ref))) {
      missingRefs.push({ file, ref });
    }
  }
}

if (!missingCoreDocs.length && !missingRefs.length) {
  console.log('[docs-control-plane-audit] PASS');
  console.log(`- scanned_files: ${scannedFiles.length}`);
  console.log(`- core_docs: ${coreDocs.length}`);
  process.exit(0);
}

console.error('[docs-control-plane-audit] FAIL');
if (missingCoreDocs.length) {
  console.error('- missing_core_docs:');
  for (const file of missingCoreDocs) console.error(`  - ${file}`);
}
if (missingRefs.length) {
  console.error('- missing_refs:');
  for (const entry of missingRefs) console.error(`  - ${entry.file} -> ${entry.ref}`);
}
process.exit(1);
