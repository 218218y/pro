import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runFeaturesPublicApiContract } from '../tools/wp_features_public_api_contract.mjs';
import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';
import {
  dimensionOwnerPublicBridgeViolations,
  retiredSurfaceForSpecifier,
} from '../tools/wp_public_surface_policy_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policy = JSON.parse(fs.readFileSync(path.join(root, 'tools/wp_public_surface_policy.json'), 'utf8'));
const fixtureRel = 'esm/native/services/retirement_fixture.ts';
const retiredRouteFingerprint = '16ea536cadb1f27ec55982b296a3223b4be3fd5b13eb31fcbaeabf39ac48eb83';
const retiredOwnedFingerprint = '95250c3f8466079dbbb94ff2a48d3b97605341dde519857d4ae15c8916e8a03f';

function inventoryKeys(entries) {
  return entries.map(entry => `${entry.kind}:${entry.name}`).sort();
}

function inventoryFingerprint(entries) {
  return createHash('sha256').update(inventoryKeys(entries).join('\n')).digest('hex');
}

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
  assert.equal(
    new Set(inventoryKeys(policy.retiredFacadeOnlyRoutes)).size,
    policy.retiredFacadeOnlyRoutes.length
  );
  assert.equal(
    new Set(inventoryKeys(policy.retiredFacadeOwnedSymbols)).size,
    policy.retiredFacadeOwnedSymbols.length
  );
  assert.equal(inventoryFingerprint(policy.retiredFacadeOnlyRoutes), retiredRouteFingerprint);
  assert.equal(inventoryFingerprint(policy.retiredFacadeOwnedSymbols), retiredOwnedFingerprint);
  const retiredRouteKeys = new Set(inventoryKeys(policy.retiredFacadeOnlyRoutes));
  assert.equal(
    inventoryKeys(policy.retiredFacadeOwnedSymbols).every(key => retiredRouteKeys.has(key)),
    true
  );
  const retiredNames = new Set(policy.retiredFacadeOnlyRoutes.map(entry => entry.name));
  assert.equal(
    runtimeManifest.symbols.some(entry => retiredNames.has(entry.name)),
    false
  );
  assert.equal(
    featureManifest.publicEntries.some(entry => entry === 'dimensions/index.js'),
    false
  );

  assert.deepEqual(
    policy.supportedSurfaces.map(surface => [surface.scope, surface.path, surface.contract]),
    [
      ['runtime', 'esm/native/runtime/api.ts', 'tools/wp_wardrobe_dimension_public_surface_manifest.json'],
      [
        'services-base',
        'esm/native/services/api_runtime_base_surface.ts',
        'tools/wp_wardrobe_dimension_public_surface_manifest.json',
      ],
      [
        'services-entry',
        'esm/native/services/api.ts',
        'tools/wp_wardrobe_dimension_public_surface_manifest.json',
      ],
    ]
  );
  assert.deepEqual(
    policy.supportedSurfaces.map(surface => surface.path),
    ['runtime', 'servicesBase', 'servicesEntry'].map(surface => runtimeManifest.surfaceTopology[surface].file)
  );
  for (const entry of [...policy.supportedSurfaces, ...policy.publicManifests]) {
    assert.equal(fs.existsSync(path.join(root, entry.path)), true, entry.path);
    if (entry.contract) assert.equal(fs.existsSync(path.join(root, entry.contract)), true, entry.contract);
  }
});

test('only exact manifest routes may bridge focused dimension owners into the Runtime surface', () => {
  const runtimeManifest = JSON.parse(
    fs.readFileSync(path.join(root, 'tools/wp_wardrobe_dimension_public_surface_manifest.json'), 'utf8')
  );
  const inspect = (fromFile, source) =>
    dimensionOwnerPublicBridgeViolations(
      fromFile,
      analyzeModuleDependencies(fromFile, source).imports,
      policy,
      runtimeManifest
    );

  assert.deepEqual(
    inspect(
      'esm/native/runtime/api.ts',
      `export { DEFAULT_WIDTH } from '../../shared/dimensions/wardrobe_defaults.js';`
    ),
    []
  );
  assert.notDeepEqual(
    inspect('esm/native/runtime/api.ts', `export * from '../../shared/dimensions/units.js';`),
    []
  );
  assert.notDeepEqual(
    inspect(
      'esm/native/runtime/api.ts',
      `export { DEFAULT_WIDTH as legacyWidth } from '../../shared/dimensions/wardrobe_defaults.js';`
    ),
    []
  );
  assert.notDeepEqual(
    inspect('esm/native/runtime/api.ts', `export { cmToM } from '../../shared/dimensions/units.js';`),
    []
  );
  assert.notDeepEqual(
    inspect(
      'esm/native/features/dimension_bridge.ts',
      `export { DEFAULT_WIDTH } from '../../shared/dimensions/wardrobe_defaults.js';`
    ),
    []
  );
  assert.deepEqual(
    inspect(
      'esm/native/features/narrow_dimension_composition.ts',
      `import { cmToM } from '../../shared/dimensions/units.js';\nexport const toModelWidth = cmToM;`
    ),
    []
  );
});
