import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createTsRuntimeModuleLoader } from './_ts_runtime_module_loader.mjs';
import { buildWardrobeDimensionPublicSurfaceSemanticSnapshot } from '../tools/wp_wardrobe_dimension_public_surface_semantic.mjs';
import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestRel = 'tools/wp_wardrobe_dimension_public_surface_manifest.json';
const snapshotRel = 'tools/wp_wardrobe_dimension_public_surface_semantic_snapshot.json';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const runtimeRel = 'esm/native/runtime/api.ts';
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'tools/wp_layer_baseline.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, manifestRel), 'utf8'));
const snapshot = JSON.parse(fs.readFileSync(path.join(root, snapshotRel), 'utf8'));
const sha256 = value => createHash('sha256').update(value).digest('hex');
const runtimeOwnerGroups = Object.freeze([
  Object.freeze({
    family: 'Product Limits',
    file: 'esm/shared/dimensions/product_limits.ts',
    symbols: Object.freeze([
      'WARDROBE_WIDTH_MIN',
      'WARDROBE_CHEST_WIDTH_MIN',
      'WARDROBE_WIDTH_MAX',
      'WARDROBE_HEIGHT_MIN',
      'WARDROBE_CHEST_HEIGHT_MIN',
      'WARDROBE_HEIGHT_MAX',
      'WARDROBE_DEPTH_MIN',
      'WARDROBE_DEPTH_MAX',
      'WARDROBE_DOORS_MIN',
      'WARDROBE_SLIDING_DOORS_MIN',
      'WARDROBE_DOORS_MAX',
      'WARDROBE_CHEST_DRAWERS_MIN',
      'WARDROBE_CHEST_DRAWERS_MAX',
      'WARDROBE_CELL_DIM_MIN',
      'WARDROBE_CELL_WIDTH_MIN',
      'WARDROBE_CELL_WIDTH_MAX',
      'WARDROBE_CELL_HEIGHT_MIN',
      'WARDROBE_CELL_HEIGHT_MAX',
      'WARDROBE_CELL_DEPTH_MIN',
      'WARDROBE_CELL_DEPTH_MAX',
    ]),
  }),
  Object.freeze({
    family: 'Wardrobe Defaults',
    file: 'esm/shared/dimensions/wardrobe_defaults.ts',
    symbols: Object.freeze([
      'DEFAULT_WIDTH',
      'DEFAULT_HEIGHT',
      'DEFAULT_CHEST_DRAWERS_COUNT',
      'HINGED_DEFAULT_DEPTH',
      'SLIDING_DEFAULT_DEPTH',
      'DEFAULT_HINGED_DOORS',
      'DEFAULT_SLIDING_DOORS',
      'HINGED_DEFAULT_PER_DOOR_WIDTH',
      'SLIDING_DEFAULT_PER_DOOR_WIDTH',
      'DEFAULT_CORNER_WIDTH',
      'DEFAULT_CORNER_DOORS',
    ]),
  }),
  Object.freeze({
    family: 'Stack Split',
    file: 'esm/shared/dimensions/stack_split_policy.ts',
    symbols: Object.freeze([
      'DEFAULT_STACK_SPLIT_LOWER_HEIGHT',
      'STACK_SPLIT_SEAM_GAP_M',
      'STACK_SPLIT_LOWER_HEIGHT_MIN',
      'STACK_SPLIT_MIN_TOP_HEIGHT',
      'STACK_SPLIT_LOWER_DEPTH_MIN',
      'STACK_SPLIT_LOWER_DEPTH_MAX',
      'STACK_SPLIT_LOWER_WIDTH_MIN',
      'STACK_SPLIT_LOWER_WIDTH_MAX',
      'STACK_SPLIT_LOWER_DOORS_MIN',
      'STACK_SPLIT_LOWER_DOORS_MAX',
    ]),
  }),
  Object.freeze({
    family: 'Wardrobe Default Resolution',
    file: 'esm/shared/dimensions/wardrobe_default_resolution_policy.ts',
    symbols: Object.freeze([
      'normalizeWardrobeDimensionDefaultType',
      'getDefaultDepthForWardrobeType',
      'getDefaultDoorsForWardrobeType',
      'getDefaultPerDoorWidthForWardrobeType',
      'getDefaultWidthForWardrobeType',
      'getDefaultHeightForWardrobeType',
      'getDefaultChestDrawersCount',
      'resolveDefaultWardrobeDimensions',
      'resolveAutoWidthForDoors',
      'isAutoWidthForDoors',
    ]),
  }),
]);
const runtimeCompatibilityOwner = 'wardrobe-dimension-runtime-public-compatibility';
const runtimePublicSurface =
  'esm/native/runtime/api.ts → esm/native/services/api_runtime_base_surface.ts → esm/native/services/api.ts';
const runtimeCompatibilityIds = Object.freeze([
  'runtime-product-limits-public-compatibility',
  'runtime-wardrobe-defaults-public-compatibility',
  'runtime-stack-split-public-compatibility',
  'runtime-default-resolution-public-compatibility',
]);
const ledgerPrefixes = Object.freeze({
  174: 'efd3490f378700da25a431705d0b9e3ce4e66827273b90c51ed534bada7d9549',
  175: '8f40cca696d6f9f8b7152abbb925f8313c09b258ffcd62536be4af8e6881a63d',
  176: 'b48dbe603d55ffd97713f34ae5c3fdd65a4c1ac9b5c64ea2d5e48221153e6852',
  177: '8c0e1984abcc8daa48b698d01d9ad8bb2fcb2610551402c1147e67076437ae74',
  178: '4f2439c0d05c724a812661c16fe408ea53c434a97f62368eb91e34b9aa1e7d67',
});

const compositionShapes = Object.freeze({
  CARCASS_BASE_DIMENSIONS: Object.freeze({
    sha256: '330ae72d61492180280bad8eb505f46c4c3add6501991abff3a6d412fb10f370',
    keys: Object.freeze(['plinth', 'legs', 'chest']),
  }),
  CONTENT_VISUAL_DIMENSIONS: Object.freeze({
    sha256: 'f74d61ab53f92bc59788752f4311d94b630ecb75736dcac577b7d03f8efefc5a',
    keys: Object.freeze(['books', 'foldedClothes', 'hanger', 'hangingClothes', 'sketchBoxClassic']),
  }),
  DRAWER_DIMENSIONS: Object.freeze({
    sha256: 'b2c81a0c02f6aca0170c8e48bea734ad47d212e83f235ea951204492170cbbf8',
    keys: Object.freeze(['sketch', 'external', 'internal']),
  }),
  SKETCH_BOX_DIMENSIONS: Object.freeze({
    sha256: '0b41463fc17980eb068ddf7884e7a5a1807c0aafaa447d84fbef440adc1e371a',
    keys: Object.freeze(['geometry', 'dividers', 'dimensionOverlay', 'preview', 'freePlacement']),
  }),
  WARDROBE_DEFAULTS: Object.freeze({
    sha256: '7412eb7a17c2cf557c1071601f3365b2e6b49edb9e28626c24dd876c9e5ca2ee',
    keys: Object.freeze(['widthCm', 'heightCm', 'chestDrawersCount', 'byType', 'corner', 'stackSplit']),
  }),
  WARDROBE_LAYOUT_DIMENSIONS: Object.freeze({
    sha256: 'f5756862628ebb8d4ba1b8496d0a180141c75a8612549833318c1b558188a0a3',
    keys: Object.freeze([
      'minSegmentWidthCm',
      'boundaryFullThicknessMultiplier',
      'boundarySharedThicknessMultiplier',
      'autoWidthMatchToleranceCm',
      'valueEqualityToleranceCm',
      'cellDimsMatchToleranceCm',
      'cellDimsPreview',
    ]),
  }),
});

function runtimeShape(value) {
  if (Array.isArray(value)) {
    return { frozen: Object.isFrozen(value), items: value.map(runtimeShape) };
  }
  if (value && typeof value === 'object') {
    return {
      frozen: Object.isFrozen(value),
      entries: Object.keys(value).map(key => [key, runtimeShape(value[key])]),
    };
  }
  if (typeof value === 'function') return { type: 'function', length: value.length };
  return { type: typeof value, value };
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function expectedRuntimeLedgerEntries() {
  const reasonSubject = [
    'Product Limits symbol inventory',
    'Wardrobe Defaults value inventory',
    'Stack Split symbol inventory',
    'Wardrobe Default Resolution symbol inventory',
  ];
  const removalSubject = [
    'Product Limits statement',
    'Wardrobe Defaults value statement',
    'Stack Split statement',
    'Default Resolution statement',
  ];
  return runtimeOwnerGroups.map((group, index) => {
    const companion = runtimeOwnerGroups[(index + 1) % runtimeOwnerGroups.length];
    return {
      from: 'runtime',
      to: 'shared',
      additionalStatements: 1,
      owner: 'dimension-public-surface-transition',
      reviewedAt: '2026-07-29',
      reviewBy: '2026-10-18',
      fromFile: runtimeRel,
      companionImport: {
        toFile: companion.file,
        kind: 'value',
        importedSymbols: [...companion.symbols],
        syntax: 'static-re-export',
      },
      removedImport: {
        toFile: facadeRel,
        kind: 'value',
        importedSymbols: [...group.symbols],
        syntax: 'static-re-export',
      },
      addedImport: {
        toFile: group.file,
        kind: 'value',
        importedSymbols: [...group.symbols],
        syntax: 'static-re-export',
      },
      reason: `Runtime public API preserves the ${reasonSubject[index]} while routing it directly from the canonical focused owner instead of the legacy dimension facade.`,
      removalCondition: `Remove this entry when an explicit public-surface decision retires this Runtime ${removalSubject[index]} or a reviewed compatibility ownership schema supersedes this temporary route migration debt.`,
    };
  });
}

function expectedRuntimeCompatibilityOwnership() {
  return runtimeOwnerGroups.map((group, index) => ({
    retirement: {
      entryNumber: 175 + index,
      retiredAt: '2026-07-29',
      mode: 'ownership-transferred',
      replacementCompatibilityBudgetId: runtimeCompatibilityIds[index],
    },
    budget: {
      id: runtimeCompatibilityIds[index],
      from: 'runtime',
      to: 'shared',
      fromFile: runtimeRel,
      statement: {
        toFile: group.file,
        kind: 'value',
        importedSymbols: [...group.symbols],
        syntax: 'static-re-export',
      },
      owner: runtimeCompatibilityOwner,
      reviewedAt: '2026-07-29',
      nextReviewBy: '2027-07-29',
      publicSurface: runtimePublicSurface,
    },
  }));
}

function validateSemanticSnapshot(candidate, candidateManifest = manifest) {
  assert.equal(candidateManifest.version, 2);
  assert.equal(candidateManifest.symbols.length, 99);
  assert.equal(
    candidateManifest.symbols.every(
      entry =>
        entry.classification === 'undetermined — blocks removal' &&
        entry.plannedAction === 'retain-until-external-evidence-or-explicit-public-surface-decision'
    ),
    true
  );
  const exactReconstruction = candidateManifest.symbols.filter(
    entry => entry.runtimeReconstruction?.status === 'exact-direct-owner-parity'
  );
  const declarationReview = candidateManifest.symbols.filter(
    entry => entry.runtimeReconstruction?.status === 'identity-parity-declaration-review'
  );
  const compatibilityOwner = candidateManifest.symbols.filter(
    entry => entry.runtimeReconstruction?.status === 'explicit-compatibility-owner'
  );
  assert.equal(exactReconstruction.length, 52);
  assert.deepEqual(declarationReview, []);
  assert.deepEqual(
    compatibilityOwner.map(entry => entry.name),
    ['CHEST_MODE_DIMENSIONS']
  );
  assert.deepEqual(candidateManifest.runtimeReconstructionInventory, {
    exactDirectOwnerParity: 52,
    identityOnlyDeclarationReview: 0,
    explicitCompatibilityOwner: 1,
    specialSymbols: ['CHEST_MODE_DIMENSIONS'],
  });
  assert.equal(candidate.version, 1);
  assert.equal(candidate.typescriptVersion, '7.0.2');
  assert.equal(candidate.capturedProductionHead, candidateManifest.capturedProductionHead);
  assert.deepEqual(candidate.surfaceTopology, candidateManifest.surfaceTopology);
  assert.equal(candidate.symbolCount, 99);
  assert.equal(candidate.symbols.length, 99);
  const keys = candidate.symbols.map(entry => `${entry.kind}:${entry.name}`);
  assert.equal(new Set(keys).size, 99);
  for (const entry of candidate.symbols) {
    const manifestEntry = candidateManifest.symbols.find(
      candidateEntry => candidateEntry.name === entry.name && candidateEntry.kind === entry.kind
    );
    assert.ok(manifestEntry, entry.name);
    assert.equal(entry.facadeDeclarationForm, manifestEntry.facadeDeclaration.form, entry.name);
    assert.equal(entry.runtimeIdentityMode, manifestEntry.facadeDeclaration.identity, entry.name);
    if (manifestEntry.runtimeApiRoute) {
      assert.deepEqual(
        Object.keys(manifestEntry.runtimeApiRoute),
        ['routeFile', 'sourceFile', 'sourceSymbol', 'kind', 'form', 'identity', 'declarationMode'],
        entry.name
      );
      assert.equal(manifestEntry.runtimeApiRoute.routeFile, 'esm/native/runtime/api.ts', entry.name);
      assert.equal(manifestEntry.runtimeApiRoute.sourceSymbol, entry.name, entry.name);
    }
    assert.ok(entry.canonicalOwner.length > 0, entry.name);
    for (const owner of entry.canonicalOwner) {
      assert.match(owner.declarationTypeFingerprint, /^[a-f0-9]{64}$/u, entry.name);
    }
    for (const surface of ['facade', 'featureBarrel']) {
      assert.equal(entry.surfaces[surface].publicExportedName, entry.name, `${entry.name}:${surface}`);
      assert.match(
        entry.surfaces[surface].declarationTypeFingerprint,
        /^[a-f0-9]{64}$/u,
        `${entry.name}:${surface}`
      );
    }
    assert.equal(entry.surfaces.runtime !== null, manifestEntry.runtimeApiRoute !== null, entry.name);
    assert.equal(entry.surfaces.servicesBase !== null, manifestEntry.servicesApiRoute !== null, entry.name);
    assert.equal(entry.surfaces.servicesEntry !== null, manifestEntry.servicesApiRoute !== null, entry.name);
    assert.equal(
      entry.surfaces.featureBarrel.declarationTypeFingerprint,
      entry.surfaces.facade.declarationTypeFingerprint,
      entry.name
    );
    if (entry.surfaces.runtime) {
      assert.equal(
        entry.surfaces.runtime.declarationTypeFingerprint,
        entry.surfaces.facade.declarationTypeFingerprint,
        entry.name
      );
      assert.equal(
        entry.surfaces.servicesBase.declarationTypeFingerprint,
        entry.surfaces.runtime.declarationTypeFingerprint,
        entry.name
      );
      assert.equal(
        entry.surfaces.servicesEntry.declarationTypeFingerprint,
        entry.surfaces.runtime.declarationTypeFingerprint,
        entry.name
      );
    }
  }
}

test('declaration emission snapshot locks all 99 symbols across five public surfaces', () => {
  const actual = buildWardrobeDimensionPublicSurfaceSemanticSnapshot(root);
  assert.deepEqual(actual, snapshot);
  validateSemanticSnapshot(snapshot);
});

test('52 Runtime symbols have direct-owner parity while CHEST uses its explicit compatibility owner', () => {
  const direct = manifest.symbols.filter(
    entry => entry.runtimeReconstruction?.status === 'exact-direct-owner-parity'
  );
  assert.equal(direct.length, 52);
  for (const manifestEntry of direct) {
    const entry = snapshot.symbols.find(candidate => candidate.name === manifestEntry.name);
    assert.equal(entry.canonicalOwner.length, 1, entry.name);
    assert.equal(
      entry.surfaces.facade.declarationTypeFingerprint,
      entry.canonicalOwner[0].declarationTypeFingerprint,
      entry.name
    );
  }

  const legacyViews = snapshot.symbols.filter(
    entry => entry.facadeDeclarationForm === 'legacy-number-view-local-export'
  );
  assert.equal(legacyViews.length, 12);
  assert.equal(
    legacyViews.every(
      entry =>
        entry.canonicalOwner.length === 1 &&
        entry.canonicalOwner[0].declarationTypeFingerprint !==
          entry.surfaces.facade.declarationTypeFingerprint
    ),
    true
  );
  const chestManifest = manifest.symbols.find(entry => entry.name === 'CHEST_MODE_DIMENSIONS');
  assert.deepEqual(chestManifest.runtimeReconstruction, {
    status: 'explicit-compatibility-owner',
    target: {
      file: 'esm/shared/dimensions/chest_mode_policy.ts',
      symbol: 'CHEST_MODE_DIMENSIONS',
      kind: 'value',
    },
    runtimeIdentity: 'strict',
    declarationParity: 'exact-legacy-number-view',
  });
});

test('Runtime routes, historical Entries 175-178, and compatibility ownership are exact and append-safe', () => {
  const analysis = analyzeModuleDependencies(
    runtimeRel,
    fs.readFileSync(path.join(root, runtimeRel), 'utf8')
  );
  for (const group of runtimeOwnerGroups) {
    const specifier = `../../shared/${group.file.slice('esm/shared/'.length).replace(/\.ts$/u, '.js')}`;
    const matches = analysis.imports.filter(
      dependency => dependency.specifier === specifier && dependency.kind === 'value'
    );
    assert.equal(matches.length, 1, group.family);
    assert.equal(matches[0].syntax, 'static-re-export', group.family);
    assert.deepEqual(matches[0].importedSymbols, [...group.symbols], group.family);
    assert.equal(
      matches[0].bindings.every(
        binding => binding.localName === null && binding.importedName === binding.exportedName
      ),
      true,
      group.family
    );
  }
  const facadeRoutes = analysis.imports.filter(
    dependency => dependency.specifier === '../../shared/wardrobe_dimension_tokens_shared.js'
  );
  assert.deepEqual(facadeRoutes, []);
  const compatibilityRoute = analysis.imports.find(
    dependency =>
      dependency.specifier === '../../shared/dimensions/compatibility/chest_mode_dimensions_compatibility.js'
  );
  assert.deepEqual(compatibilityRoute?.importedSymbols, ['CHEST_MODE_DIMENSIONS']);
  assert.equal(compatibilityRoute?.syntax, 'static-re-export');
  const defaultsTypeRoute = analysis.imports.find(
    dependency =>
      dependency.specifier === '../../shared/dimensions/wardrobe_defaults.js' && dependency.kind === 'type'
  );
  assert.deepEqual(defaultsTypeRoute?.importedSymbols, ['WardrobeDimensionDefaultType']);
  assert.equal(defaultsTypeRoute?.syntax, 'type-re-export');

  assert.equal(baseline.version, '2.7');
  assert.equal(baseline.migrationBudgets.length, 178);
  assert.deepEqual(baseline.migrationBudgets.slice(174, 178), expectedRuntimeLedgerEntries());
  const expectedOwnership = expectedRuntimeCompatibilityOwnership();
  assert.deepEqual(
    baseline.migrationRetirements
      .filter(retirement => retirement.mode === 'ownership-transferred')
      .map(retirement => ({
        entryNumber: retirement.entryNumber,
        retiredAt: retirement.retiredAt,
        mode: retirement.mode,
        replacementCompatibilityBudgetId: retirement.replacementCompatibilityBudgetId,
      })),
    expectedOwnership.map(entry => entry.retirement)
  );
  assert.deepEqual(
    baseline.compatibilityBudgets.map(budget => ({
      id: budget.id,
      from: budget.from,
      to: budget.to,
      fromFile: budget.fromFile,
      statement: budget.statement,
      owner: budget.owner,
      reviewedAt: budget.reviewedAt,
      nextReviewBy: budget.nextReviewBy,
      publicSurface: budget.publicSurface,
    })),
    expectedOwnership.map(entry => entry.budget)
  );
  const retiredEntries = new Set(baseline.migrationRetirements.map(retirement => retirement.entryNumber));
  const activeEntries = baseline.migrationBudgets.filter((_, index) => !retiredEntries.has(index + 1));
  assert.equal(activeEntries.length, 0);
  assert.equal(baseline.migrationRetirements.length, 178);
  assert.equal(baseline.compatibilityBudgets.length, 4);
  assert.equal(baseline.reviewedOwnershipBudgets.length, 108);
  assert.deepEqual(
    baseline.migrationConsolidations.map(group => group.id),
    [
      'runtime-default-state-dimension-consolidation',
      'platform-door-motion-dimension-consolidation',
      'interior-sketch-tools-dimension-consolidation',
      'structure-tab-dimension-consolidation',
      'interior-tab-defaults-dimension-consolidation',
      'order-pdf-dimension-consolidation',
      'corner-cells-ui-defaults-dimension-consolidation',
      'sketch-drawer-sizing-dimension-consolidation',
      'sketch-internal-drawer-cassette-dimension-consolidation',
      'interior-layout-presets-dimension-consolidation',
      'modules-configuration-defaults-dimension-consolidation',
      'stack-split-module-config-dimension-consolidation',
      'library-preset-flow-dimension-consolidation',
      'library-preset-module-defaults-dimension-consolidation',
      'split-hover-preview-line-dimension-consolidation',
      'interior-rod-clearance-dimension-consolidation',
      'chest-mode-build-dimension-consolidation',
      'interior-hover-manual-mode-dimension-consolidation',
      'core-carcass-dimension-consolidation',
      'stack-split-lower-setup-dimension-consolidation',
      'manual-layout-free-box-plans-dimension-consolidation',
      'sketch-box-vertical-content-occupancy-dimension-consolidation',
      'preview-interior-hover-apply-dimension-consolidation',
      'chest-mode-inputs-dimension-consolidation',
    ]
  );
  assert.equal(new Set(baseline.migrationBudgets.map(entry => entry.fromFile)).size, 108);
  assert.equal(new Set(activeEntries.map(entry => entry.fromFile)).size, 0);
  for (const [count, expected] of Object.entries(ledgerPrefixes)) {
    assert.equal(
      sha256(stableJson(baseline.migrationBudgets.slice(0, Number(count)))),
      expected,
      `Prefix ${count}`
    );
  }
  const futureEntry179 = {
    ...baseline.migrationBudgets[177],
    fromFile: 'esm/native/runtime/future_dimension_public_route.ts',
  };
  const appended = [...baseline.migrationBudgets, futureEntry179];
  assert.deepEqual(appended.slice(174, 178), expectedRuntimeLedgerEntries());
  assert.equal(
    sha256(stableJson(appended.slice(0, 178))),
    ledgerPrefixes[178],
    'Entry 179 must not change historical Prefix 178'
  );

  const mutated = structuredClone(baseline.migrationBudgets);
  mutated[174].addedImport.importedSymbols[0] += '_MUTATED';
  assert.notDeepEqual(mutated.slice(174, 178), expectedRuntimeLedgerEntries());
});

test('83 identity exports and six compositions preserve runtime identity, freeze, shape, and key order', () => {
  const loader = createTsRuntimeModuleLoader();
  const facade = loader.load(path.join(root, facadeRel));
  let identities = 0;
  for (const entry of manifest.symbols.filter(entry => entry.kind === 'value')) {
    if (entry.facadeDeclaration.identity === 'new-aggregate') continue;
    assert.equal(entry.canonicalOwner.exports.length, 1, entry.name);
    const owner = entry.canonicalOwner.exports[0];
    assert.equal(owner.symbols.length, 1, entry.name);
    const ownerRuntime = loader.load(path.join(root, owner.file));
    assert.strictEqual(facade[entry.name], ownerRuntime[owner.symbols[0]], entry.name);
    identities += 1;
  }
  assert.equal(identities, 83);

  for (const [name, expected] of Object.entries(compositionShapes)) {
    const value = facade[name];
    assert.equal(Object.isFrozen(value), true, name);
    assert.deepEqual(Object.keys(value), [...expected.keys], name);
    assert.equal(sha256(JSON.stringify(runtimeShape(value))), expected.sha256, name);
  }
});

test('semantic snapshot mutation probes reject declaration, route, identity, and CHEST adaptation drift', () => {
  const declarationDrift = structuredClone(snapshot);
  declarationDrift.symbols[0].surfaces.facade.declarationTypeFingerprint = '0'.repeat(64);
  assert.notDeepEqual(declarationDrift, buildWardrobeDimensionPublicSurfaceSemanticSnapshot(root));

  const routeDrift = structuredClone(snapshot);
  routeDrift.symbols.find(entry => entry.name === 'DEFAULT_WIDTH').surfaces.runtime.sourceFile =
    'esm/shared/dimensions/wrong_owner.ts';
  assert.notDeepEqual(routeDrift, snapshot);

  const identityDrift = structuredClone(snapshot);
  identityDrift.symbols.find(entry => entry.name === 'DEFAULT_WIDTH').runtimeIdentityMode = 'new-aggregate';
  assert.throws(() => validateSemanticSnapshot(identityDrift));

  const chestDrift = structuredClone(manifest);
  chestDrift.symbols.find(entry => entry.name === 'CHEST_MODE_DIMENSIONS').runtimeReconstruction = {
    status: 'exact-direct-owner-parity',
    target: {
      file: 'esm/shared/dimensions/chest_mode_policy.ts',
      symbol: 'CHEST_MODE_DIMENSIONS',
      kind: 'value',
    },
    runtimeIdentity: 'strict',
    declarationParity: 'exact',
  };
  const chestSnapshot = snapshot.symbols.find(entry => entry.name === 'CHEST_MODE_DIMENSIONS');
  assert.notEqual(
    chestSnapshot.surfaces.facade.declarationTypeFingerprint,
    chestSnapshot.canonicalOwner[0].declarationTypeFingerprint
  );
  assert.throws(() => validateSemanticSnapshot(snapshot, chestDrift));
});
