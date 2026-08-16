import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { requireAstAdapter } from '../tools/wp_ast_adapter.mjs';
import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const astApi = requireAstAdapter('Runtime Access Seam Topology Contract');

const IMPORT_CONTRACTS = [
  ['esm/native/ui/react/sidebar_shared.ts', '../../services/api.js', ['readRuntimeConfigValueFromApp']],
  [
    'esm/native/runtime/render_access_shared.ts',
    './app_roots_access.js',
    ['ensureRenderRoot', 'getRenderRootMaybe'],
  ],
  [
    'esm/native/platform/runtime_config_defaults.ts',
    '../runtime/app_roots_access.js',
    ['ensureRuntimeConfigRoot', 'getRuntimeConfigRootMaybe'],
  ],
  [
    'esm/native/ui/interactions/viewer_resize.ts',
    '../../services/api.js',
    ['ensureRenderNamespace', 'getRenderNamespace'],
  ],
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
  ['esm/native/ui/react/overlay_top_controls.tsx', '../../services/api.js', ['moveCameraViaService']],
  [
    'esm/native/services/scene_runtime.ts',
    './scene_view_access.js',
    [
      'initSceneLightsViaService',
      'installSceneViewStoreSyncViaService',
      'syncSceneViewViaService',
      'updateSceneLightsViaService',
      'updateSceneModeViaService',
    ],
  ],
  [
    'esm/native/io/project_io_orchestrator_project_load.ts',
    '../services/api.js',
    ['updateSceneLightsViaService'],
  ],
  [
    'esm/native/services/canvas_picking_click_route_layout.ts',
    './canvas_picking_drawer_mode_flow.js',
    ['tryHandleCanvasDrawerModeClick'],
  ],
  [
    'esm/native/services/canvas_picking_drawer_mode_flow_divider.ts',
    '../runtime/doors_access.js',
    ['captureDividerDrawerRebuildMotion', 'setDrawerRebuildIntent'],
  ],
  [
    'esm/native/builder/bootstrap_drawer_meta.ts',
    '../runtime/doors_access.js',
    ['consumeDrawerRebuildIntent', 'restoreDividerDrawerRebuildMotion'],
  ],
  ['esm/native/services/doors_runtime.ts', '../runtime/doors_access.js', ['ensureDoorsService']],
  [
    'esm/native/services/doors_runtime_visuals_drawers.ts',
    '../runtime/doors_access.js',
    [
      'ensureDrawerMetaMap',
      'ensureDrawerService',
      'getDrawerMetaEntry',
      'getDrawerMetaMap',
      'initDrawerRuntime',
      'resetDrawerMetaMap',
      'setDrawerMetaEntry',
    ],
  ],
  [
    'esm/native/services/doors_runtime_visuals_drawers.ts',
    '../runtime/platform_access.js',
    ['setPlatformHasInternalDrawers'],
  ],
];

const EXPORT_CONTRACTS = [
  [
    'esm/native/runtime/app_roots_access.ts',
    ['ensureRenderRoot', 'getRenderRootMaybe', 'ensureRuntimeConfigRoot', 'getRuntimeConfigRootMaybe'],
    ['ensureConfigRoot', 'getConfigRootMaybe'],
  ],
  [
    'esm/native/platform/runtime_config_defaults.ts',
    ['RUNTIME_CONFIG_DEFAULTS', 'applyRuntimeConfigDefaults'],
    ['CONFIG_DEFAULTS', 'applyConfigDefaults'],
  ],
];

const FORBIDDEN_CALLER_CHAINS = [
  [
    ['esm/native/ui/react/overlay_app.tsx', 'esm/native/ui/react/overlay_top_controls.tsx'],
    [
      ['actions', 'moveCamera'],
      ['services', 'camera'],
    ],
  ],
  [
    [
      'esm/native/services/scene_runtime.ts',
      'esm/native/io/project_io_orchestrator.ts',
      'esm/native/io/project_io_orchestrator_load_ops.ts',
      'esm/native/io/project_io_orchestrator_project_load.ts',
    ],
    [['services', 'sceneView']],
  ],
  [
    [
      'esm/native/services/canvas_picking_click_flow.ts',
      'esm/native/services/canvas_picking_click_route.ts',
      'esm/native/services/canvas_picking_click_route_layout.ts',
      'esm/native/services/canvas_picking_drawer_mode_flow.ts',
      'esm/native/services/canvas_picking_drawer_mode_flow_divider.ts',
      'esm/native/builder/bootstrap.ts',
      'esm/native/builder/bootstrap_drawer_meta.ts',
    ],
    [['services', 'drawer', 'runtime']],
  ],
];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function analyze(rel) {
  const analysis = analyzeModuleDependencies(rel, read(rel));
  assert.deepEqual(analysis.unresolvedDynamicImports, [], `${rel} has dynamic import drift`);
  assert.deepEqual(analysis.forbiddenModuleSyntax, [], `${rel} has module syntax drift`);
  return analysis;
}

function propertyChain(node) {
  if (astApi.isIdentifier(node)) return [node.text];
  if (!astApi.isPropertyAccessExpression(node)) return null;
  const base = propertyChain(node.expression);
  return base ? [...base, node.name.text] : null;
}

function findForbiddenChains(rel, suffixes) {
  const sf = astApi.createSourceFile(rel, read(rel), astApi.getScriptKindForFile(rel));
  const found = new Set();
  function visit(node) {
    if (astApi.isPropertyAccessExpression(node)) {
      const chain = propertyChain(node);
      if (chain) {
        for (const suffix of suffixes) {
          const offset = chain.length - suffix.length;
          if (offset >= 0 && suffix.every((part, i) => chain[offset + i] === part)) {
            found.add(chain.join('.'));
          }
        }
      }
    }
    astApi.forEachChild(node, visit);
  }
  visit(sf);
  return [...found].sort();
}

test('runtime access seams route callers through canonical owners', () => {
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

test('runtime access root owners expose only the current config/render APIs', () => {
  for (const [file, required, forbidden] of EXPORT_CONTRACTS) {
    const exported = new Set(collectNamedModuleExports(file, read(file)).map(entry => entry.exportedName));
    for (const symbol of required) assert.equal(exported.has(symbol), true, `${file} must export ${symbol}`);
    for (const symbol of forbidden)
      assert.equal(exported.has(symbol), false, `${file} must not export retired ${symbol}`);
  }
});

test('cleaned camera, scene-view, and drawer callers do not probe legacy bags directly', () => {
  for (const [files, suffixes] of FORBIDDEN_CALLER_CHAINS) {
    for (const file of files) {
      assert.deepEqual(findForbiddenChains(file, suffixes), [], `${file} must use canonical access helpers`);
    }
  }
});
