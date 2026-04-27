#!/usr/bin/env node
/*
 * tools/wp_type_hotspots.js
 *
 * Consistent AST-based metric for type-hardening hotspots.
 * Counts only real syntax nodes (not comments/strings):
 * - explicit `any` keywords
 * - `as` assertions
 * - angle-bracket assertions
 * - non-null assertions (`!`)
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ts = require('typescript');

const args = process.argv.slice(2);
let json = false;
let top = 40;
const roots = [];
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--json') {
    json = true;
    continue;
  }
  if (arg === '--top') {
    const next = Number(args[i + 1]);
    top = Number.isFinite(next) && next > 0 ? Math.floor(next) : top;
    i += 1;
    continue;
  }
  roots.push(arg);
}

const scope = roots.length ? roots : ['esm', 'types'];
const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'release', 'coverage']);
const allowedExt = new Set(['.ts', '.tsx', '.mts', '.cts']);
const cwd = process.cwd();
const files = [];

function walk(target) {
  if (!fs.existsSync(target)) return;
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    const base = path.basename(target);
    if (ignoreDirs.has(base)) return;
    for (const entry of fs.readdirSync(target)) walk(path.join(target, entry));
    return;
  }
  if (!allowedExt.has(path.extname(target))) return;
  files.push(target);
}

for (const root of scope) walk(root);
files.sort();

function createZeroCounts() {
  return {
    explicitAny: 0,
    asExpression: 0,
    angleAssertion: 0,
    nonNull: 0,
  };
}

function addCounts(target, source) {
  target.explicitAny += source.explicitAny;
  target.asExpression += source.asExpression;
  target.angleAssertion += source.angleAssertion;
  target.nonNull += source.nonNull;
}

function totalCounts(counts) {
  return counts.explicitAny + counts.asExpression + counts.angleAssertion + counts.nonNull;
}

function visitTypeNode(typeNode, counts) {
  if (!typeNode) return;
  if (typeNode.kind === ts.SyntaxKind.AnyKeyword) counts.explicitAny += 1;
  ts.forEachChild(typeNode, child => visitTypeNode(child, counts));
}

function collectCounts(file) {
  const text = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const counts = createZeroCounts();

  function visit(node) {
    if (ts.isAsExpression(node)) counts.asExpression += 1;
    if (ts.isTypeAssertionExpression(node)) counts.angleAssertion += 1;
    if (ts.isNonNullExpression(node)) counts.nonNull += 1;
    if ('type' in node && node.type) visitTypeNode(node.type, counts);
    ts.forEachChild(node, visit);
  }

  visit(sf);
  return counts;
}

const rows = [];
const totals = createZeroCounts();
for (const file of files) {
  const counts = collectCounts(file);
  const total = totalCounts(counts);
  if (!total) continue;
  rows.push({ file: path.relative(cwd, file), ...counts, total });
  addCounts(totals, counts);
}
rows.sort((a, b) => b.total - a.total || a.file.localeCompare(b.file));

const payload = {
  scope,
  fileCount: files.length,
  totals: { ...totals, total: totalCounts(totals) },
  rows: rows.slice(0, top),
};

if (json) {
  process.stdout.write(JSON.stringify(payload, null, 2));
} else {
  console.log('[WP Type Hotspots] AST metric');
  console.log(`[WP Type Hotspots] scope: ${scope.join(', ')}`);
  console.log(`[WP Type Hotspots] scanned files: ${files.length}`);
  console.log(
    `[WP Type Hotspots] totals: any=${payload.totals.explicitAny}, as=${payload.totals.asExpression}, angle=${payload.totals.angleAssertion}, nonNull=${payload.totals.nonNull}, total=${payload.totals.total}`
  );
  console.log(`[WP Type Hotspots] top ${Math.min(top, rows.length)} files:`);
  for (const row of payload.rows) {
    console.log(
      `  ${String(row.total).padStart(4, ' ')}  ${row.file}  (any:${row.explicitAny}, as:${row.asExpression}, angle:${row.angleAssertion}, !:${row.nonNull})`
    );
  }
}
