#!/usr/bin/env node
// Modernize variable declarations in-place:
// - Convert statement-leading `var` to `let` (conservative; leaves `for (var ...)` untouched)
// - Convert a subset of single-name `let x = ...;` to `const x = ...;` when `x` is never reassigned
//
// No external deps.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const TARGET_DIRS = [path.join(ROOT, 'esm')];

function isJsFile(p) {
  return p.endsWith('.js') && !p.endsWith('.min.js');
}

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      walk(p, out);
    } else if (e.isFile() && isJsFile(p)) {
      out.push(p);
    }
  }
  return out;
}

function findConstCandidates(lines) {
  // Only single-name declarations on a single line, with initializer.
  // Avoid destructuring: `let {a} =` or `let [a] =`
  // Avoid multi declarators: `let a=1, b=2;`
  const candidates = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^([\t ]*)let\s+([A-Za-z_$][\w$]*)\s*=\s*(.+?);\s*(\/\/.*)?$/);
    if (!m) continue;
    const [, indent, name, rhs] = m;
    if (rhs.includes(',')) {
      // Too risky to reason about multi declarators or tricky comma expressions.
      continue;
    }
    if (line.includes('let {') || line.includes('let[') || line.includes('let [')) continue;
    candidates.push({ lineIndex: i, indent, name });
  }
  return candidates;
}

function isReassigned(fullText, declLineIndex, lines, name) {
  // Exclude the declaration line itself.
  const before = lines.slice(0, declLineIndex).join('\n');
  const after = lines.slice(declLineIndex + 1).join('\n');
  const text = before + '\n' + after;

  // Reassignments / updates. Be conservative: if we *think* it might be reassigned, return true.
  // Avoid property assignments: `.name =` should not count as reassign.
  const id = name.replace(/[$]/g, '\\$');
  const assign = new RegExp(`(?<![\\w$.])\\b${id}\\b\\s*(?:\\|\\|=|&&=|\\?\\?=|[+\\-*/%&|^]?=)`);
  const postUpdate = new RegExp(`(?<![\\w$.])\\b${id}\\b\\s*(?:\\+\\+|--)`);
  const preUpdate = new RegExp(`(?:\\+\\+|--)\\s*(?<![\\w$.])\\b${id}\\b`);

  return assign.test(text) || postUpdate.test(text) || preUpdate.test(text);
}

function modernizeFile(filePath) {
  const orig = fs.readFileSync(filePath, 'utf8');
  const origLines = orig.split(/\r?\n/);
  let lines = [...origLines];

  let varToLet = 0;
  // Convert statement-leading var -> let.
  lines = lines.map(line => {
    const m = line.match(/^([\t ]*)var\b/);
    if (!m) return line;
    varToLet++;
    return line.replace(/^([\t ]*)var\b/, '$1let');
  });

  // Convert eligible let -> const.
  const candidates = findConstCandidates(lines);
  let letToConst = 0;

  // Work from bottom to top so indexes remain valid.
  for (let c = candidates.length - 1; c >= 0; c--) {
    const { lineIndex, name } = candidates[c];
    if (isReassigned(lines.join('\n'), lineIndex, lines, name)) continue;
    const line = lines[lineIndex];
    // Replace only the first `let` on the line.
    lines[lineIndex] = line.replace(/^([\t ]*)let\b/, '$1const');
    letToConst++;
  }

  const next = lines.join('\n');
  const changed = next !== orig;
  if (changed) {
    fs.writeFileSync(filePath, next, 'utf8');
  }

  return { changed, varToLet, letToConst };
}

function main() {
  const files = TARGET_DIRS.flatMap(d => walk(d));
  let changedFiles = 0;
  let totalVarToLet = 0;
  let totalLetToConst = 0;

  for (const f of files) {
    const r = modernizeFile(f);
    if (r.changed) changedFiles++;
    totalVarToLet += r.varToLet;
    totalLetToConst += r.letToConst;
  }

  console.log('[Modernize] Files scanned:', files.length);
  console.log('[Modernize] Files changed:', changedFiles);
  console.log('[Modernize] var->let:', totalVarToLet);
  console.log('[Modernize] let->const:', totalLetToConst);
}

main();
