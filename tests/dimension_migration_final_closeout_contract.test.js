import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectLayerContractGraph, evaluateLayerContract } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const sha256File = rel =>
  createHash('sha256')
    .update(fs.readFileSync(path.join(root, rel)))
    .digest('hex');
const stableJson = value => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
};
const semanticSha256 = value => createHash('sha256').update(stableJson(value)).digest('hex');

test('Checkpoint 4J closes all 178 historical Entries without changing the historical fingerprint', () => {
  const baseline = readJson('tools/wp_layer_baseline.json');
  const graph = collectLayerContractGraph({ root });
  const report = evaluateLayerContract(graph, baseline, { currentDate: '2026-07-30' });
  assert.equal(report.ok, true, JSON.stringify(report.failures));

  assert.equal(baseline.migrationBudgets.length, 178);
  assert.equal(baseline.migrationRetirements.length, 178);
  assert.equal(report.activeMigrationEntries.length, 0);
  assert.equal(report.retiredMigrationEntries.length, 178);
  assert.equal(baseline.compatibilityBudgets.length, 4);
  assert.equal(baseline.migrationConsolidations.length, 24);
  assert.equal(baseline.reviewedOwnershipBudgets.length, 108);
  assert.equal(new Set(baseline.migrationRetirements.map(entry => entry.entryNumber)).size, 178);
  assert.equal(
    baseline.migrationRetirements.filter(retirement => retirement.mode === 'ownership-reviewed').length,
    108
  );
  assert.equal(
    baseline.migrationRetirements.filter(retirement => retirement.mode === 'statement-consolidated').length,
    66
  );
  assert.equal(
    baseline.migrationRetirements.filter(retirement => retirement.mode === 'ownership-transferred').length,
    4
  );
  assert.equal(
    semanticSha256(baseline.migrationBudgets),
    '4f2439c0d05c724a812661c16fe408ea53c434a97f62368eb91e34b9aa1e7d67'
  );
});

test('reviewed ownership and general ownership are decomposed exactly on every closed dimension edge', () => {
  const baseline = readJson('tools/wp_layer_baseline.json');
  const graph = collectLayerContractGraph({ root });
  const report = evaluateLayerContract(graph, baseline, { currentDate: '2026-07-30' });
  const expected = new Map([
    ['builder>shared', [280, 0, 0, 6, 61, 213, 213]],
    ['services>shared', [214, 0, 0, 4, 47, 163, 163]],
    ['features>shared', [61, 0, 0, 11, 0, 50, 50]],
    ['ui>shared', [26, 0, 0, 1, 0, 25, 25]],
    ['platform>shared', [4, 0, 0, 1, 0, 3, 3]],
    ['runtime>shared', [36, 0, 4, 1, 0, 31, 31]],
  ]);
  for (const [edgeKey, values] of expected) {
    const [from, to] = edgeKey.split('>');
    const edge = report.edges.find(candidate => candidate.from === from && candidate.to === to);
    assert.ok(edge, edgeKey);
    assert.deepEqual(
      [
        edge.importCount,
        edge.activeMigrationStatements,
        edge.compatibilityStatements,
        edge.consolidationStatements,
        edge.reviewedOwnershipStatements,
        edge.reviewedGeneralStatements,
        edge.generalBudget,
      ],
      values,
      edgeKey
    );
  }
  assert.deepEqual(
    Object.fromEntries(
      ['runtime', 'platform', 'ui', 'features', 'builder', 'services'].map(layer => [
        layer,
        report.activeMigrationEntries.filter(entry => entry.from === layer).length,
      ])
    ),
    { runtime: 0, platform: 0, ui: 0, features: 0, builder: 0, services: 0 }
  );
});

test('all reviewed ownership and consolidation evidence hashes are exact', () => {
  const baseline = readJson('tools/wp_layer_baseline.json');
  for (const owner of baseline.reviewedOwnershipBudgets) {
    assert.equal(owner.evidenceContracts.length >= 1, true, owner.id);
    for (const evidence of owner.evidenceContracts) {
      assert.equal(sha256File(evidence.path), evidence.sha256, `${owner.id}: ${evidence.path}`);
    }
  }
  for (const consolidation of baseline.migrationConsolidations) {
    for (const evidence of consolidation.evidenceContracts) {
      assert.equal(sha256File(evidence.path), evidence.sha256, `${consolidation.id}: ${evidence.path}`);
    }
  }
});

test('public surface remains 89 values and 10 types with all 99 removals blocked', () => {
  const decision = readJson('tools/wp_wardrobe_dimension_public_surface_decision_report.json');
  assert.deepEqual(
    {
      symbols: decision.summary.publicSymbols,
      values: decision.summary.publicValues,
      types: decision.summary.publicTypes,
      removals: decision.summary.removalAuthorized,
      option: decision.recommendation.option,
      proofValues: decision.recommendation.proof.valueRuntimeIdentityParity,
      proofDeclarations: decision.recommendation.proof.declarationFingerprintParity,
    },
    {
      symbols: 99,
      values: 89,
      types: 10,
      removals: 0,
      option: 'A',
      proofValues: 89,
      proofDeclarations: 99,
    }
  );
  assert.equal(
    decision.symbols.every(symbol => symbol.classification === 'undetermined — blocks removal'),
    true
  );
});
