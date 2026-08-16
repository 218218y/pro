import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const IMPORT_CONTRACTS = [
  ['esm/native/ui/react/sidebar_shared.ts', '../../services/api.js', ['readRuntimeConfigValueFromApp']],
  [
    'esm/native/platform/render_loop_motion_frame_state.ts',
    '../runtime/runtime_config_selectors.js',
    ['readRuntimeConfigNumberFromApp'],
  ],
  [
    'esm/native/platform/render_loop_motion_drawers.ts',
    '../runtime/render_access.js',
    ['getRenderSlot', 'setRenderSlot'],
  ],
  [
    'esm/native/platform/cache_pruning.ts',
    './cache_pruning_shared.js',
    ['ensureCachePruningSlots', 'readPlatformUtil'],
  ],
  ['esm/native/platform/cache_pruning.ts', './cache_pruning_runtime.js', ['pruneCachesSafe']],
  [
    'esm/native/platform/cache_pruning_shared.ts',
    '../runtime/runtime_config_selectors.js',
    ['readRuntimeConfigNumberFromApp'],
  ],
  [
    'esm/native/platform/cache_pruning_shared.ts',
    '../runtime/render_access.js',
    ['ensureRenderNamespace', 'getRenderSlot', 'setRenderSlot'],
  ],
  [
    'esm/native/platform/cache_pruning_runtime.ts',
    '../runtime/render_access.js',
    ['ensureRenderNamespace', 'getRenderSlot', 'getScene', 'setRenderSlot'],
  ],
  [
    'esm/native/services/camera_shared.ts',
    '../runtime/render_access.js',
    ['getCamera', 'getControls', 'setRenderSlot'],
  ],
  [
    'esm/native/services/camera_runtime.ts',
    '../runtime/services_root_access.js',
    ['ensureServiceSlot', 'getServiceSlotMaybe'],
  ],
  [
    'esm/native/platform/three_geometry_cache_patch_contracts.ts',
    '../runtime/deps_access.js',
    ['getDepsNamespaceMaybe'],
  ],
];

function analyze(rel) {
  const source = fs.readFileSync(path.join(root, rel), 'utf8');
  const analysis = analyzeModuleDependencies(rel, source);
  assert.deepEqual(analysis.unresolvedDynamicImports, [], `${rel} has dynamic import drift`);
  assert.deepEqual(analysis.forbiddenModuleSyntax, [], `${rel} has module syntax drift`);
  return analysis;
}

test('config/render seams route through canonical runtime owners', () => {
  const cache = new Map();
  for (const [file, specifier, symbols] of IMPORT_CONTRACTS) {
    const analysis = cache.get(file) || analyze(file);
    cache.set(file, analysis);
    const imports = analysis.imports.filter(entry => entry.specifier === specifier);
    assert.ok(imports.length > 0, `${file} must import ${specifier}`);
    const imported = new Set(imports.flatMap(entry => entry.importedSymbols));
    for (const symbol of symbols) {
      assert.equal(imported.has(symbol), true, `${file} must import ${symbol} from ${specifier}`);
    }
  }
});
