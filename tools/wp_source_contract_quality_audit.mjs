#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSourceFile, walkAst } from './wp_ast_adapter.mjs';

const ROOT = process.cwd();
const FIXED_SHA256_LITERAL_RE = /['"]([0-9a-f]{64})['"]/gu;
const SOURCE_FINGERPRINT_MARKER_RE =
  /\b(?:canonicalSemanticAst|canonicalAst|semanticSha256|semanticHash|functionHashes|semanticFingerprints|rawSemanticSha256|consumerBodySha256|numericHash|rawTailSha256|uiSemanticFingerprint|formulaHashes|initializerSha256|ownerInitializerSha256)\b/u;

// This is a ratchet, not an allow-forever list. A file must be removed from this ledger
// as soon as its opaque source/AST baseline is replaced by explicit ownership/behavior facts.
export const OPAQUE_SOURCE_FINGERPRINT_DEBT = Object.freeze({});

const SOURCE_READER_MARKER_RE =
  /(?:readSource|bundleSources|readFirstExisting|readFileSync|fs\.readFileSync)/u;
export const SOURCE_SHAPE_REGEX_KEYS = Object.freeze([
  'crossStatement',
  'exactObjectCall',
  'optionalTypeSyntax',
  'indexedAccessSyntax',
  'ternaryUndefined',
  'loopSyntax',
]);

// Aggregate implementation-shape indicator ratchet. These patterns are not all invalid:
// import/export, CSS, and negative architecture contracts can legitimately remain source-based.
// The ratchet prevents silent growth while later modernization waves replace only the brittle
// implementation-coupled cases with semantic AST, ownership, or runtime assertions.
export const SOURCE_SHAPE_REGEX_RATCHET = Object.freeze({
  files: 143,
  patterns: 570,
  categories: Object.freeze({
    crossStatement: 346,
    exactObjectCall: 100,
    optionalTypeSyntax: 101,
    indexedAccessSyntax: 32,
    ternaryUndefined: 32,
    loopSyntax: 1,
  }),
});

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      out.push(...walk(full));
    } else if (entry.isFile() && /\.(?:[cm]?[jt]sx?)$/u.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function normalize(projectRoot, file) {
  return path.relative(projectRoot, file).split(path.sep).join('/');
}

export function scanOpaqueSourceFingerprintText(source) {
  const text = String(source || '');
  const hasSourceFingerprintMarker = SOURCE_FINGERPRINT_MARKER_RE.test(text);
  SOURCE_FINGERPRINT_MARKER_RE.lastIndex = 0;
  const fixedSha256Baselines = [...text.matchAll(FIXED_SHA256_LITERAL_RE)].length;
  return {
    hasSourceFingerprintMarker,
    fixedSha256Baselines: hasSourceFingerprintMarker ? fixedSha256Baselines : 0,
  };
}

export function classifySourceShapeRegexPattern(patternIn) {
  const pattern = String(patternIn || '');
  return {
    crossStatement: pattern.includes('[\\s\\S]'),
    exactObjectCall: /\\\(\\\{|\\\(\\s\*\\\{/u.test(pattern),
    optionalTypeSyntax: /\\\?\s*:\s*/u.test(pattern),
    indexedAccessSyntax: /\\\[[A-Za-z_$][A-Za-z0-9_$]*\\\]/u.test(pattern),
    ternaryUndefined: /[?\\]\s*[^\n]{0,100}:\s*(?:undefined|null)/u.test(pattern),
    loopSyntax: /for\\s\*?\\\(/u.test(pattern),
  };
}

function emptySourceShapeCategoryCounts() {
  return Object.fromEntries(SOURCE_SHAPE_REGEX_KEYS.map(key => [key, 0]));
}

export function collectSourceShapeRegexMetrics(projectRoot = ROOT) {
  const testRoot = path.join(projectRoot, 'tests');
  const categories = emptySourceShapeCategoryCounts();
  const byFile = [];
  let patterns = 0;

  for (const file of walk(testRoot)) {
    const rel = normalize(projectRoot, file);
    if (!/\.test\.(?:[cm]?[jt]sx?)$/u.test(rel)) continue;
    const source = fs.readFileSync(file, 'utf8');
    if (!SOURCE_READER_MARKER_RE.test(source)) continue;

    let sourceFile;
    try {
      sourceFile = createSourceFile(path.basename(file), source);
    } catch {
      continue;
    }

    const local = emptySourceShapeCategoryCounts();
    let localPatterns = 0;
    walkAst(sourceFile, node => {
      if (node?.type !== 'Literal' || !node.regex?.pattern) return;
      const classification = classifySourceShapeRegexPattern(node.regex.pattern);
      let counted = false;
      for (const key of SOURCE_SHAPE_REGEX_KEYS) {
        if (!classification[key]) continue;
        local[key] += 1;
        counted = true;
      }
      if (counted) localPatterns += 1;
    });

    if (!localPatterns) continue;
    patterns += localPatterns;
    for (const key of SOURCE_SHAPE_REGEX_KEYS) categories[key] += local[key];
    byFile.push({ file: rel, patterns: localPatterns, categories: local });
  }

  byFile.sort((left, right) => right.patterns - left.patterns || left.file.localeCompare(right.file));
  return { files: byFile.length, patterns, categories, byFile };
}

export function collectOpaqueSourceFingerprintDebt(projectRoot = ROOT) {
  const testRoot = path.join(projectRoot, 'tests');
  return walk(testRoot)
    .filter(file => normalize(projectRoot, file) !== 'tests/source_contract_quality_audit.test.js')
    .map(file => {
      const source = fs.readFileSync(file, 'utf8');
      const scan = scanOpaqueSourceFingerprintText(source);
      return {
        file: normalize(projectRoot, file),
        fixedSha256Baselines: scan.fixedSha256Baselines,
      };
    })
    .filter(entry => entry.fixedSha256Baselines > 0)
    .sort((left, right) => left.file.localeCompare(right.file));
}

export function runSourceContractQualityAudit(projectRoot = ROOT) {
  const actual = collectOpaqueSourceFingerprintDebt(projectRoot);
  const actualByFile = new Map(actual.map(entry => [entry.file, entry.fixedSha256Baselines]));
  const sourceShape = collectSourceShapeRegexMetrics(projectRoot);
  const failures = [];

  for (const entry of actual) {
    const debt = OPAQUE_SOURCE_FINGERPRINT_DEBT[entry.file];
    if (!debt) {
      failures.push(
        `${entry.file}: unregistered opaque source/AST SHA-256 baseline (${entry.fixedSha256Baselines})`
      );
      continue;
    }
    if (entry.fixedSha256Baselines !== debt.fixedSha256Baselines) {
      failures.push(
        `${entry.file}: opaque baseline count changed ${debt.fixedSha256Baselines} -> ${entry.fixedSha256Baselines}; ` +
          'replace the fingerprint or ratchet the debt ledger deliberately'
      );
    }
  }

  for (const [file, debt] of Object.entries(OPAQUE_SOURCE_FINGERPRINT_DEBT)) {
    const actualCount = actualByFile.get(file) ?? 0;
    if (actualCount === 0) {
      failures.push(`${file}: stale source-fingerprint debt entry; remove it from the ledger`);
    } else if (!String(debt.reason || '').trim()) {
      failures.push(`${file}: source-fingerprint debt entry requires a migration reason`);
    }
  }

  for (const key of ['files', 'patterns']) {
    const expected = SOURCE_SHAPE_REGEX_RATCHET[key];
    const value = sourceShape[key];
    if (value > expected) {
      failures.push(
        `source-shape regex ${key} increased ${expected} -> ${value}; modernize the new implementation-shaped contract or ratchet deliberately`
      );
    } else if (value < expected) {
      failures.push(
        `source-shape regex ${key} decreased ${expected} -> ${value}; lower SOURCE_SHAPE_REGEX_RATCHET deliberately`
      );
    }
  }
  for (const key of SOURCE_SHAPE_REGEX_KEYS) {
    const expected = SOURCE_SHAPE_REGEX_RATCHET.categories[key];
    const value = sourceShape.categories[key];
    if (value > expected) {
      failures.push(
        `source-shape regex category ${key} increased ${expected} -> ${value}; modernize the new implementation-shaped contract or ratchet deliberately`
      );
    } else if (value < expected) {
      failures.push(
        `source-shape regex category ${key} decreased ${expected} -> ${value}; lower SOURCE_SHAPE_REGEX_RATCHET deliberately`
      );
    }
  }

  return {
    ok: failures.length === 0,
    files: actual.length,
    fixedSha256Baselines: actual.reduce((sum, entry) => sum + entry.fixedSha256Baselines, 0),
    sourceShape,
    failures,
    actual,
  };
}

function main() {
  const result = runSourceContractQualityAudit(ROOT);
  if (!result.ok) {
    console.error(`[source-contract-quality] FAILED with ${result.failures.length} issue(s)`);
    for (const failure of result.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(
    `[source-contract-quality] ok (${result.files} opaque debt files, ${result.fixedSha256Baselines} fixed SHA-256 baselines; ` +
      `${result.sourceShape.files} source-shape files, ${result.sourceShape.patterns} indicators)`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
