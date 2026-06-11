import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(rel) {
  return fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

function stripNoise(input) {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/'[^'\\]*(?:\\.[^'\\]*)*'/g, "''")
    .replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, '""')
    .replace(/`[^`\\]*(?:\\.[^`\\]*)*`/g, '``');
}

const cachePruning = read('esm/native/platform/cache_pruning.ts');
const cachePruningShared = read('esm/native/platform/cache_pruning_shared.ts');
const cachePruningRuntime = read('esm/native/platform/cache_pruning_runtime.ts');
const geometryPatch = read('esm/native/platform/three_geometry_cache_patch.ts');
const geometryContracts = read('esm/native/platform/three_geometry_cache_patch_contracts.ts');
const geometryConstructors = read('esm/native/platform/three_geometry_cache_patch_constructors.ts');
const geometryRuntime = read('esm/native/platform/three_geometry_cache_patch_runtime.ts');
const install = read('esm/native/platform/install.ts');
const strippedGeometryContracts = stripNoise(geometryContracts);

test('platform cache lifecycle stays split across pruning/runtime and geometry-cache seams', () => {
  assert.match(cachePruning, /from '\.\/cache_pruning_shared\.js';/);
  assert.match(cachePruning, /from '\.\/cache_pruning_runtime\.js';/);
  assert.match(cachePruning, /export function installCachePruning\(/);
  assert.doesNotMatch(cachePruning, /function pruneOneCache<.*>\(/);
  assert.doesNotMatch(cachePruning, /function collectUsedSceneResources\(/);
  assert.doesNotMatch(cachePruning, /function pruneCachesSafe\(/);

  assert.match(cachePruningShared, /export function pruneOneCache<.*>\(/);
  assert.match(cachePruningShared, /export function collectUsedSceneResources\(/);
  assert.match(cachePruningRuntime, /export function pruneCachesSafe\(/);
  assert.match(cachePruningRuntime, /meta\.edges/);
  assert.match(cachePruningRuntime, /meta\.geometry/);
});

test('three geometry cache patch keeps split contracts/constructors/runtime seams', () => {
  assert.match(geometryPatch, /from '\.\/three_geometry_cache_patch_contracts\.js';/);
  assert.match(geometryPatch, /from '\.\/three_geometry_cache_patch_runtime\.js';/);

  assert.match(geometryContracts, /assertThreeViaDeps\(app, 'platform\/three_geometry_cache_patch\.THREE'\)/);
  assert.match(geometryContracts, /ensureRenderCacheObject\(app, '__wpGeometryCacheStats'\)/);
  assert.match(
    geometryContracts,
    /export function isGeometryMap\(value: unknown\): value is GeometryCacheMap/
  );
  assert.match(geometryConstructors, /export function createCachedGeometryCtor\(/);
  assert.match(geometryConstructors, /export function installGeometryCtorPatches\(/);
  assert.match(geometryConstructors, /normalizePositiveInt\(/);
  assert.match(geometryConstructors, /const angle = normalizeAngle\(rawArgs\[1\], 1\);/);
  assert.match(geometryRuntime, /export function clearThreeGeometryCacheReferences\(/);
  assert.match(geometryRuntime, /export function readThreeGeometryCacheStats\(/);
  assert.match(geometryRuntime, /export function installThreeGeometryCachePatch\(/);
  assert.match(geometryRuntime, /installGeometryCtorPatches\(/);

  assert.doesNotMatch(strippedGeometryContracts, /app\.deps\.THREE/);
  assert.doesNotMatch(strippedGeometryContracts, /app\.render\.cache/);
});

test('platform install re-exports geometry cache lifecycle helpers from the canonical patch seam', () => {
  assert.match(install, /clearThreeGeometryCacheReferences,/);
  assert.match(install, /readThreeGeometryCacheStats,/);
  assert.match(install, /installThreeGeometryCachePatch,/);
});
