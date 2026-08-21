import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createRepositoryLayerContractFixture } from './helpers/repository_layer_contract_fixture.mjs';
import { retiredSurfacesForDomain } from '../tools/wp_public_surface_policy_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const repositoryLayerContract = createRepositoryLayerContractFixture({
  root,
  currentDate: '2026-08-05',
});

test('dimension layer ownership stores current statements without migration history', () => {
  const { baseline, report } = repositoryLayerContract();
  assert.equal(report.ok, true, JSON.stringify(report.failures));
  assert.equal(baseline.version, '3.0');
  assert.equal(Object.hasOwn(baseline, 'migrationBudgets'), false);
  assert.equal(Object.hasOwn(baseline, 'migrationRetirements'), false);
  assert.equal(Object.hasOwn(baseline, 'migrationConsolidations'), false);
  assert.equal(baseline.compatibilityBudgets.length, 4);
  assert.equal(baseline.reviewedOwnershipBudgets.length, 133);
  assert.equal(new Set(baseline.reviewedOwnershipBudgets.map(entry => entry.id)).size, 133);
  assert.equal(
    baseline.reviewedOwnershipBudgets.every(
      entry =>
        !Object.hasOwn(entry, 'entryNumber') &&
        !Object.hasOwn(entry, 'reviewedAt') &&
        !Object.hasOwn(entry, 'nextReviewBy') &&
        !Object.hasOwn(entry, 'evidenceContracts')
    ),
    true
  );
});

test('dimension edge accounting decomposes each observed statement into current ownership or general budget', () => {
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
      edge.compatibilityStatements + edge.reviewedOwnershipStatements + edge.reviewedGeneralStatements,
      `${edgeKey}: each statement has exactly one current ownership category`
    );
    assert.equal(edge.generalBudget, edge.reviewedGeneralStatements, `${edgeKey}: general budget drift`);
  }
});

test('retired dimension paths stay absent while the supported Runtime and Services surface remains exact', () => {
  const manifest = readJson('tools/wp_wardrobe_dimension_public_surface_manifest.json');
  const policy = readJson('tools/wp_public_surface_policy.json');
  const retiredDimensionSurfaces = retiredSurfacesForDomain(policy, 'dimensions');
  assert.deepEqual(
    {
      symbols: manifest.symbolCount,
      values: manifest.valueCount,
      types: manifest.typeCount,
      routes: manifest.symbols.length,
      retiredSurfaces: retiredDimensionSurfaces.length,
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
  for (const surface of retiredDimensionSurfaces) {
    assert.equal(fs.existsSync(path.join(root, surface.path)), false, surface.path);
  }
});
