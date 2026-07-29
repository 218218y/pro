import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createTsRuntimeModuleLoader } from './_ts_runtime_module_loader.mjs';
import { buildWardrobeDimensionPublicSurfaceSemanticSnapshot } from '../tools/wp_wardrobe_dimension_public_surface_semantic.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestRel = 'tools/wp_wardrobe_dimension_public_surface_manifest.json';
const snapshotRel = 'tools/wp_wardrobe_dimension_public_surface_semantic_snapshot.json';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const manifest = JSON.parse(fs.readFileSync(path.join(root, manifestRel), 'utf8'));
const snapshot = JSON.parse(fs.readFileSync(path.join(root, snapshotRel), 'utf8'));
const sha256 = value => createHash('sha256').update(value).digest('hex');

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
  assert.equal(exactReconstruction.length, 52);
  assert.deepEqual(
    declarationReview.map(entry => entry.name),
    ['CHEST_MODE_DIMENSIONS']
  );
  assert.deepEqual(candidateManifest.runtimeReconstructionInventory, {
    exactDirectOwnerParity: 52,
    identityOnlyDeclarationReview: 1,
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

test('52 Runtime symbols have exact direct-owner declaration parity while CHEST stays adapted', () => {
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
  assert.equal(legacyViews.length, 13);
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
    status: 'identity-parity-declaration-review',
    target: {
      file: 'esm/shared/dimensions/chest_mode_policy.ts',
      symbol: 'CHEST_MODE_DIMENSIONS',
      kind: 'value',
    },
    runtimeIdentity: 'strict',
    declarationParity: 'branded-owner/plain-number-compatibility',
  });
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
