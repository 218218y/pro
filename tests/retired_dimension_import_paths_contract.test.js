import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runFeaturesPublicApiContract } from '../tools/wp_features_public_api_contract.mjs';
import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';
import { retiredSurfaceForSpecifier } from '../tools/wp_public_surface_policy_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policy = JSON.parse(fs.readFileSync(path.join(root, 'tools/wp_public_surface_policy.json'), 'utf8'));
const fixtureRel = 'esm/native/services/retirement_fixture.ts';

function retiredDependencies(source) {
  return analyzeModuleDependencies(fixtureRel, source).imports.filter(dependency =>
    retiredSurfaceForSpecifier(fixtureRel, dependency.specifier, policy)
  );
}

test('retired dimension surfaces are absent and the repository has no route back to them', () => {
  assert.deepEqual(
    policy.retiredSurfaces.map(surface => surface.path),
    ['esm/shared/wardrobe_dimension_tokens_shared.ts', 'esm/native/features/dimensions/index.ts']
  );
  for (const surface of policy.retiredSurfaces) {
    assert.equal(fs.existsSync(path.join(root, surface.path)), false, surface.path);
  }

  const result = runFeaturesPublicApiContract(root);
  assert.deepEqual(result.retiredSurfaceViolations, []);
  assert.deepEqual(result.violations, []);
  assert.equal(result.ok, true);
});

test('static, namespace, wildcard, dynamic, alias, absolute, extensionless, and index routes are rejected', () => {
  const fixtures = [
    `import { WARDROBE_LIMITS } from '../../shared/wardrobe_dimension_tokens_shared.js';`,
    `import * as dimensions from '../../shared/wardrobe_dimension_tokens_shared.js';`,
    `export * from '../../shared/wardrobe_dimension_tokens_shared.js';`,
    `export { WARDROBE_LIMITS } from '../../shared/wardrobe_dimension_tokens_shared';`,
    `export const dimensions = import('../../shared/wardrobe_dimension_tokens_shared.js');`,
    `import dimensions from '@/shared/wardrobe_dimension_tokens_shared.ts?raw';`,
    `import dimensions from '/esm/shared/wardrobe_dimension_tokens_shared.js#legacy';`,
    `export * from '../features/dimensions';`,
    `export * from '../features/dimensions/index.js';`,
    `export const dimensions = import('@/native/features/dimensions/index.ts');`,
  ];

  for (const source of fixtures) {
    const dependencies = retiredDependencies(source);
    assert.equal(dependencies.length, 1, source);
  }
});

test('the retirement record separates 46 retired routes from 15 globally retired facade-owned symbols', () => {
  assert.equal(policy.owner, 'architecture-contract');
  assert.equal(policy.applicationPolicy.includes('private application'), true);
  assert.deepEqual(
    [
      policy.retiredFacadeOnlyRoutes.length,
      policy.retiredFacadeOnlyRoutes.filter(entry => entry.kind === 'value').length,
      policy.retiredFacadeOnlyRoutes.filter(entry => entry.kind === 'type').length,
    ],
    [46, 37, 9]
  );

  const featureManifest = JSON.parse(
    fs.readFileSync(path.join(root, 'tools/wp_features_public_api_manifest.json'), 'utf8')
  );
  const runtimeManifest = JSON.parse(
    fs.readFileSync(path.join(root, 'tools/wp_wardrobe_dimension_public_surface_manifest.json'), 'utf8')
  );
  assert.equal(policy.retiredFacadeOwnedSymbols.length, 15);
  const retiredNames = new Set(policy.retiredFacadeOnlyRoutes.map(entry => entry.name));
  assert.equal(
    runtimeManifest.symbols.some(entry => retiredNames.has(entry.name)),
    false
  );
  assert.equal(
    featureManifest.publicEntries.some(entry => entry === 'dimensions/index.js'),
    false
  );
});
