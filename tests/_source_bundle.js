import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function readSource(relPath, baseUrl = import.meta.url) {
  const abs = path.resolve(path.dirname(fileURLToPath(baseUrl)), relPath);
  return fs.readFileSync(abs, 'utf8');
}

export function normalizeWhitespace(input) {
  return String(input || '')
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\[\s+/g, '[')
    .replace(/\s+\]/g, ']')
    .replace(/<\s+/g, '<')
    .replace(/\s+>/g, '>')
    .replace(/\{\s+/g, '{ ')
    .replace(/\s+\}/g, ' }')
    .replace(/,\s+/g, ', ')
    .trim();
}

export function stripNoise(input) {
  return String(input || '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/'[^'\\]*(?:\\.[^'\\]*)*'/g, "''")
    .replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, '""')
    .replace(/`[^`\\]*(?:\\.[^`\\]*)*`/g, '``');
}

export function bundleSources(relPaths, baseUrl = import.meta.url, opts = {}) {
  const strip = opts.stripNoise === true;
  return relPaths
    .map(rel => {
      const body = readSource(rel, baseUrl);
      return `// SOURCE: ${rel}\n${strip ? stripNoise(body) : body}`;
    })
    .join('\n\n');
}

export function assertMatchesAll(assert, source, patterns, label = 'bundle') {
  const normalized = normalizeWhitespace(source);
  for (const pattern of patterns) {
    if (pattern.test(source)) continue;
    assert.match(normalized, pattern, `${label} should match ${String(pattern)}`);
  }
}

export function assertMatchesAny(assert, source, patterns, label = 'bundle') {
  const normalized = normalizeWhitespace(source);
  const ok = patterns.some(pattern => pattern.test(source) || pattern.test(normalized));
  assert.equal(ok, true, `${label} should match at least one pattern`);
}

export function assertLacksAll(assert, source, patterns, label = 'bundle') {
  const normalized = normalizeWhitespace(source);
  for (const pattern of patterns) {
    assert.equal(
      pattern.test(source) || pattern.test(normalized),
      false,
      `${label} should not match ${String(pattern)}`
    );
  }
}

export function bundleFirstExisting(relPathGroups, baseUrl = import.meta.url, opts = {}) {
  const strip = opts.stripNoise === true;
  const blocks = [];
  for (const group of relPathGroups) {
    const candidates = Array.isArray(group) ? group : [group];
    let picked = null;
    for (const rel of candidates) {
      try {
        const body = readSource(rel, baseUrl);
        picked = { rel, body };
        break;
      } catch {
        // try next candidate
      }
    }
    if (!picked) {
      throw new Error(`None of the candidate paths exist in bundleFirstExisting:\n${candidates.join('\n')}`);
    }
    blocks.push(`// SOURCE: ${picked.rel}\n${strip ? stripNoise(picked.body) : picked.body}`);
  }
  return blocks.join('\n\n');
}
