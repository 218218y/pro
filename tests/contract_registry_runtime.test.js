import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { ARCHITECTURE_CONTRACT_REGISTRY } from '../tools/wp_contract_registry.mjs';
import { runContractRegistryAudit } from '../tools/wp_contract_registry_audit.mjs';
import {
  collectContractOverlapTargets,
  collectDirectRepositoryLayerScanTests,
  collectOversizedDirectPackageTestScripts,
  collectRetiredLayerLedgerAccessTests,
} from '../tools/wp_test_portfolio_audit.mjs';

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

test('contract registry owns the canonical architecture checks', () => {
  const result = runContractRegistryAudit();
  assert.equal(result.ok, true, result.failures.join('\n'));
  assert.ok(ARCHITECTURE_CONTRACT_REGISTRY.length >= 15);
  assert.equal(new Set(ARCHITECTURE_CONTRACT_REGISTRY.map(entry => entry.id)).size, result.contracts);
  assert.equal(packageJson.scripts['check:contract-registry'], 'node tools/wp_contract_registry_audit.mjs');
});

test('repository-wide layer collection is centralized and retired ledger fields have no consumers', () => {
  assert.deepEqual(collectDirectRepositoryLayerScanTests(), []);
  assert.deepEqual(collectRetiredLayerLedgerAccessTests(), []);
});

test('cross-kind ownership overlap is explicitly mapped by the portfolio audit', () => {
  const overlaps = collectContractOverlapTargets();
  assert.equal(Array.isArray(overlaps), true);
  assert.equal(
    overlaps.every(entry => entry.kinds.length > 1 && entry.owners.length > 1 && fs.existsSync(entry.target)),
    true
  );
  assert.equal(
    overlaps.some(entry => entry.target === 'esm/shared/wardrobe_dimension_tokens_shared.ts'),
    false
  );
  assert.equal(
    overlaps.some(entry => entry.target === 'esm/native/features/dimensions/index.ts'),
    false
  );
});

test('large named package test lanes are catalog-backed short facades', () => {
  assert.deepEqual(collectOversizedDirectPackageTestScripts(), []);
});
