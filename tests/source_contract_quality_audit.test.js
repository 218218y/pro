import test from 'node:test';
import assert from 'node:assert/strict';

import {
  collectOpaqueSourceFingerprintDebt,
  OPAQUE_SOURCE_FINGERPRINT_DEBT,
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

test('source-contract quality debt ledger is exact and ratchets the current repository', () => {
  const actual = collectOpaqueSourceFingerprintDebt();
  assert.deepEqual(
    actual,
    Object.entries(OPAQUE_SOURCE_FINGERPRINT_DEBT)
      .map(([file, entry]) => ({ file, fixedSha256Baselines: entry.fixedSha256Baselines }))
      .sort((left, right) => left.file.localeCompare(right.file))
  );
  const result = runSourceContractQualityAudit();
  assert.equal(result.ok, true, JSON.stringify(result.failures));
});
