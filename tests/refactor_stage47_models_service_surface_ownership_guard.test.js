import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.split(/\r\n|\r|\n/).length;
}

test('stage 47 models service surface ownership split is anchored', () => {
  const facade = read('esm/native/services/models.ts');
  const surfaceInstall = read('esm/native/services/models_surface_install.ts');
  const registry = read('esm/native/services/models_registry.ts');
  const applyOps = read('esm/native/services/models_apply_ops.ts');

  assert.ok(
    lineCount(facade) <= 190,
    'models.ts must stay a small public service facade instead of owning install-surface internals'
  );

  for (const modulePath of ['./models_registry.js', './models_apply_ops.js', './models_surface_install.js']) {
    assert.ok(facade.includes(modulePath), `models facade must delegate to ${modulePath}`);
  }
  for (const implementationNeedle of [
    'stable_surface_methods.js',
    'const MODELS_SURFACE_BINDINGS',
    'function installModelsSurfaceMethods',
    'function installFreshModelsSurfaceMethods',
    'const modelsInstallContexts',
  ]) {
    assert.equal(
      facade.includes(implementationNeedle),
      false,
      `models facade must not own install implementation detail ${implementationNeedle}`
    );
  }

  assert.ok(surfaceInstall.includes('export type ModelsServiceOperations'));
  assert.ok(surfaceInstall.includes('const MODELS_SURFACE_BINDINGS: ModelsSurfaceBindingMap = {'));
  assert.ok(surfaceInstall.includes('installStableSurfaceMethod'));
  assert.ok(surfaceInstall.includes('export function installModelsServiceSurface('));
  assert.ok(surfaceInstall.includes('_hydrateFromApp(App);'));
  assert.ok(surfaceInstall.includes('getAppModels(App)'));

  for (const stableKey of [
    '__wpSetNormalizer',
    '__wpSetPresets',
    '__wpEnsureLoaded',
    '__wpApply',
    '__wpMergeImportedModels',
    '__wpOffChange',
  ]) {
    assert.ok(surfaceInstall.includes(stableKey), `surface install owner must retain ${stableKey}`);
  }

  assert.ok(registry.includes('export function ensureModelsLoadedInternal'));
  assert.ok(registry.includes('export function mergeImportedModelsInternal'));
  assert.ok(applyOps.includes('export function applyModelInternal'));
  assert.equal(
    surfaceInstall.includes('ensureModelsLoadedInternalImpl'),
    false,
    'surface install owner must bind public operations, not own registry policy'
  );
  assert.equal(
    surfaceInstall.includes('applyModelInternalImpl'),
    false,
    'surface install owner must bind public operations, not own apply policy'
  );
});
