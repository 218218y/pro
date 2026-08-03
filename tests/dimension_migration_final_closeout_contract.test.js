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

test('dimension migration ledger has no active entries and keeps its retirement fingerprint', () => {
  const { baseline, report } = repositoryLayerContract();
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

test('dimension edge ownership categories exactly decompose every closed edge', () => {
  const { report } = repositoryLayerContract();
  for (const edgeKey of [
    'builder>shared',
    'services>shared',
    'features>shared',
    'ui>shared',
    'platform>shared',
    'runtime>shared',
  ]) {
    const [from, to] = edgeKey.split('>');
    const edge = report.edges.find(candidate => candidate.from === from && candidate.to === to);
    assert.ok(edge, edgeKey);
    assert.equal(
      edge.importCount,
      edge.activeMigrationStatements +
        edge.compatibilityStatements +
        edge.consolidationStatements +
        edge.reviewedOwnershipStatements +
        edge.reviewedGeneralStatements,
      `${edgeKey}: every statement must have exactly one ownership category`
    );
    assert.equal(edge.generalBudget, edge.reviewedGeneralStatements, `${edgeKey}: general budget drift`);
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
