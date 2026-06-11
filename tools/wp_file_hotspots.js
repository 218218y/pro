#!/usr/bin/env node
/*
 * tools/wp_file_hotspots.js
 *
 * Consistent AST/token-based metric for file-size hotspots that are strong
 * candidates for professional splitting/refactoring.
 *
 * Counts both:
 * - total physical lines
 * - code-bearing lines (lines with real tokens; comments/whitespace ignored)
 * - function-like declarations/expressions (useful density signal)
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const args = process.argv.slice(2);
let json = false;
let top = 40;
let minCodeLines = 350;
let minTotalLines = 0;
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
  if (arg === '--min-code-lines') {
    const next = Number(args[i + 1]);
    minCodeLines = Number.isFinite(next) && next >= 0 ? Math.floor(next) : minCodeLines;
    i += 1;
    continue;
  }
  if (arg === '--min-total-lines') {
    const next = Number(args[i + 1]);
    minTotalLines = Number.isFinite(next) && next >= 0 ? Math.floor(next) : minTotalLines;
    i += 1;
    continue;
  }
  roots.push(arg);
}

const scope = roots.length ? roots : ['esm', 'types', 'tools'];
const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'release', 'coverage', 'libs', 'vendor']);
const allowedExt = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']);
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

function getScriptKind(file) {
  switch (path.extname(file)) {
    case '.tsx':
      return ts.ScriptKind.TSX;
    case '.jsx':
      return ts.ScriptKind.JSX;
    case '.js':
      return ts.ScriptKind.JS;
    case '.mjs':
      return ts.ScriptKind.JS;
    case '.cjs':
      return ts.ScriptKind.JS;
    case '.mts':
      return ts.ScriptKind.TS;
    case '.cts':
      return ts.ScriptKind.TS;
    case '.ts':
    default:
      return ts.ScriptKind.TS;
  }
}

function countPhysicalLines(text) {
  if (!text.length) return 0;
  return text.split(/\r\n|\r|\n/).length;
}

function countFunctionLikes(sourceFile) {
  let count = 0;
  function visit(node) {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isConstructorDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node)
    ) {
      count += 1;
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return count;
}

const rows = [];
let totalPhysicalLines = 0;
let totalCodeLines = 0;
let totalFunctionLikes = 0;

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, getScriptKind(file));
  const physicalLines = countPhysicalLines(text);
  const codeLines = (() => {
    const codeLineSet = new Set();
    const languageVariant =
      getScriptKind(file) === ts.ScriptKind.TSX || getScriptKind(file) === ts.ScriptKind.JSX
        ? ts.LanguageVariant.JSX
        : ts.LanguageVariant.Standard;
    const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, languageVariant, text);
    let token = scanner.scan();
    while (token !== ts.SyntaxKind.EndOfFileToken) {
      const tokenText = scanner.getTokenText();
      if (tokenText && /\S/.test(tokenText)) {
        const start = scanner.getTokenPos();
        const end = scanner.getTextPos();
        const startLine = ts.getLineAndCharacterOfPosition(sourceFile, start).line + 1;
        const endLine = ts.getLineAndCharacterOfPosition(sourceFile, Math.max(start, end - 1)).line + 1;
        for (let line = startLine; line <= endLine; line += 1) codeLineSet.add(line);
      }
      token = scanner.scan();
    }
    return codeLineSet.size;
  })();
  const functionLikes = countFunctionLikes(sourceFile);

  totalPhysicalLines += physicalLines;
  totalCodeLines += codeLines;
  totalFunctionLikes += functionLikes;

  if (codeLines < minCodeLines || physicalLines < minTotalLines) continue;
  rows.push({
    file: path.relative(cwd, file),
    totalLines: physicalLines,
    codeLines,
    functionLikes,
    avgCodeLinesPerFunction: functionLikes ? Number((codeLines / functionLikes).toFixed(1)) : null,
  });
}

rows.sort((a, b) => b.codeLines - a.codeLines || b.totalLines - a.totalLines || a.file.localeCompare(b.file));

const payload = {
  scope,
  fileCount: files.length,
  thresholds: {
    minCodeLines,
    minTotalLines,
  },
  totals: {
    physicalLines: totalPhysicalLines,
    codeLines: totalCodeLines,
    functionLikes: totalFunctionLikes,
  },
  hotspotCount: rows.length,
  rows: rows.slice(0, top),
};

if (json) {
  process.stdout.write(JSON.stringify(payload, null, 2));
} else {
  console.log('[WP File Hotspots] token-aware size metric');
  console.log(`[WP File Hotspots] scope: ${scope.join(', ')}`);
  console.log(`[WP File Hotspots] scanned files: ${files.length}`);
  console.log(`[WP File Hotspots] thresholds: code>=${minCodeLines}, total>=${minTotalLines}`);
  console.log(
    `[WP File Hotspots] totals: codeLines=${payload.totals.codeLines}, totalLines=${payload.totals.physicalLines}, functionLikes=${payload.totals.functionLikes}`
  );
  console.log(`[WP File Hotspots] top ${Math.min(top, rows.length)} files:`);
  for (const row of payload.rows) {
    const density = row.avgCodeLinesPerFunction == null ? 'n/a' : row.avgCodeLinesPerFunction;
    console.log(
      `  ${String(row.codeLines).padStart(4, ' ')} code  ${String(row.totalLines).padStart(4, ' ')} total  ${String(row.functionLikes).padStart(4, ' ')} fn  avg:${String(density).padStart(5, ' ')}  ${row.file}`
    );
  }
}
