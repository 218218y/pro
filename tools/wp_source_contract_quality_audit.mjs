#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const FIXED_SHA256_LITERAL_RE = /['"]([0-9a-f]{64})['"]/gu;
const SOURCE_FINGERPRINT_MARKER_RE =
  /\b(?:canonicalSemanticAst|canonicalAst|semanticSha256|semanticHash|functionHashes|semanticFingerprints|rawSemanticSha256|consumerBodySha256|numericHash|rawTailSha256|uiSemanticFingerprint|formulaHashes|initializerSha256|ownerInitializerSha256)\b/u;

// This is a ratchet, not an allow-forever list. A file must be removed from this ledger
// as soon as its opaque source/AST baseline is replaced by explicit ownership/behavior facts.
export const OPAQUE_SOURCE_FINGERPRINT_DEBT = Object.freeze({});

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

  return {
    ok: failures.length === 0,
    files: actual.length,
    fixedSha256Baselines: actual.reduce((sum, entry) => sum + entry.fixedSha256Baselines, 0),
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
    `[source-contract-quality] ok (${result.files} debt files, ${result.fixedSha256Baselines} fixed SHA-256 baselines)`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
