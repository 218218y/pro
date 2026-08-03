import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createRepositoryLayerContractFixture } from './helpers/repository_layer_contract_fixture.mjs';

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
const repositoryLayerContract = createRepositoryLayerContractFixture({
  root,
  currentDate: '2026-07-30',
});

test('Checkpoint 4J closes all 178 historical Entries with one clean proposal and unchanged fingerprint', () => {
  const { baseline, proposal, report } = repositoryLayerContract();
  assert.equal(report.ok, true, JSON.stringify(report.failures));
  assert.equal(proposal.reviewRequired, false);
  assert.deepEqual(proposal.diff.addedEdges, []);
  assert.deepEqual(proposal.diff.budgetChanges, []);
  assert.deepEqual(proposal.diff.ratchetViolations, []);
  assert.deepEqual(proposal.diff.migrationBudgetFailures, []);

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
  const { report } = repositoryLayerContract();
  const expected = new Map([
    ['builder>shared', [280, 0, 0, 6, 61, 213, 213]],
    ['services>shared', [214, 0, 0, 4, 47, 163, 163]],
    ['features>shared', [60, 0, 0, 11, 0, 49, 49]],
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

test('legacy source paths are retired while all 53 supported Runtime and Services routes remain locked', () => {
  const manifest = readJson('tools/wp_wardrobe_dimension_public_surface_manifest.json');
  const policy = readJson('tools/wp_public_surface_policy.json');
  assert.deepEqual(
    {
      symbols: manifest.symbolCount,
      values: manifest.valueCount,
      types: manifest.typeCount,
      routes: manifest.symbols.length,
      retiredSurfaces: policy.retiredSurfaces.length,
      retiredSymbols: policy.retiredFacadeOnlyRoutes.length,
    },
    {
      symbols: 53,
      values: 52,
      types: 1,
      routes: 53,
      retiredSurfaces: 2,
      retiredSymbols: 46,
    }
  );
  for (const surface of policy.retiredSurfaces) {
    assert.equal(fs.existsSync(path.join(root, surface.path)), false, surface.path);
  }
});
