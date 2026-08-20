import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifySourceShapeRegexPattern,
  collectImplementationShapeRegexMetrics,
  collectOpaqueSourceFingerprintDebt,
  OPAQUE_SOURCE_FINGERPRINT_DEBT,
  SOURCE_POLICY_REGEX_CONTRACTS,
  SOURCE_SHAPE_REGEX_RATCHET,
  runSourceContractQualityAudit,
  scanOpaqueSourceFingerprintText,
} from '../tools/wp_source_contract_quality_audit.mjs';

test('source-contract quality audit detects opaque semantic source baselines but ignores ordinary hashes', () => {
  assert.deepEqual(
    scanOpaqueSourceFingerprintText(`
      const semanticHash = value => value;
      const expected = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    `),
    { hasSourceFingerprintMarker: true, fixedSha256Baselines: 1 }
  );
  assert.deepEqual(
    scanOpaqueSourceFingerprintText(`
      const integrity = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    `),
    { hasSourceFingerprintMarker: false, fixedSha256Baselines: 0 }
  );
});

test('source-contract quality classifies implementation-shape regex indicators semantically', () => {
  assert.deepEqual(classifySourceShapeRegexPattern(String.raw`runThing\(\{[\s\S]*meta\?: ActionMetaLike`), {
    crossStatement: true,
    exactObjectCall: true,
    optionalTypeSyntax: true,
    indexedAccessSyntax: false,
    ternaryUndefined: false,
    loopSyntax: false,
  });
  assert.equal(classifySourceShapeRegexPattern(String.raw`items\[i\]`).indexedAccessSyntax, true);
  assert.equal(
    classifySourceShapeRegexPattern(
      String.raw`return actions \? getValueAtPath\(actions, path\) : undefined;`
    ).ternaryUndefined,
    true
  );
  assert.equal(classifySourceShapeRegexPattern(String.raw`for\s*\(`).loopSyntax, true);
});

test('source-contract quality debt ledger is exact and ratchets the current repository', () => {
  const actual = collectOpaqueSourceFingerprintDebt();
  assert.deepEqual(
    actual,
    Object.entries(OPAQUE_SOURCE_FINGERPRINT_DEBT)
      .map(([file, entry]) => ({ file, fixedSha256Baselines: entry.fixedSha256Baselines }))
      .sort((left, right) => left.file.localeCompare(right.file))
  );
  const sourceShape = collectImplementationShapeRegexMetrics();
  assert.deepEqual(
    { files: sourceShape.files, patterns: sourceShape.patterns, categories: sourceShape.categories },
    SOURCE_SHAPE_REGEX_RATCHET
  );
  assert.deepEqual(
    sourceShape.policy.byFile.map(entry => entry.file).sort(),
    Object.keys(SOURCE_POLICY_REGEX_CONTRACTS).sort()
  );
  assert.equal(sourceShape.raw.patterns, sourceShape.patterns + sourceShape.policy.patterns);
  const result = runSourceContractQualityAudit();
  assert.equal(result.ok, true, JSON.stringify(result.failures));
});
