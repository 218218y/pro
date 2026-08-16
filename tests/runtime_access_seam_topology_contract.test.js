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
  [
    'esm/native/runtime/boot_entry_access.ts',
    './services_root_access.js',
    ['ensureServiceSlot', 'getServiceSlotMaybe'],
  ],
  [
    'esm/native/runtime/commands_access.ts',
    './services_root_access.js',
    ['ensureServiceSlot', 'getServiceSlotMaybe'],
  ],
  ['esm/native/runtime/storage_access.ts', './services_root_access.js', ['getServiceSlotMaybe']],
  [
    'esm/native/runtime/notes_access_services.ts',
    './services_root_access.js',
    ['ensureServiceSlot', 'getServiceSlotMaybe'],
  ],
  ['esm/native/runtime/three_access.ts', './deps_access.js', ['getDepMaybe']],
  [
    'esm/native/builder/build_stack_split_bottom_layout.ts',
    '../runtime/platform_access.js',
    ['cloneViaPlatform'],
  ],
  [
    'esm/native/builder/bootstrap_drawer_meta.ts',
    '../runtime/platform_access.js',
    ['runPlatformWakeupFollowThrough'],
  ],
  [
    'esm/native/platform/render_scheduler.ts',
    '../runtime/platform_access.js',
    ['runPlatformWakeupFollowThrough'],
  ],
  [
    'esm/native/platform/lifecycle_visibility.ts',
    '../runtime/platform_access.js',
    ['runPlatformWakeupFollowThrough'],
  ],
  [
    'esm/native/builder/handles_apply.ts',
    '../runtime/platform_access.js',
    ['runPlatformRenderFollowThrough'],
  ],
  [
    'esm/native/services/canvas_picking_core_runtime.ts',
    '../runtime/platform_access.js',
    ['runPlatformRenderFollowThrough'],
  ],
  ['esm/native/services/canvas_picking_core_raycast.ts', '../runtime/three_access.js', ['getThreeMaybe']],
  [
    'esm/native/services/scene_view_shared_runtime.ts',
    '../runtime/platform_access.js',
    ['runPlatformActivityRenderTouch'],
  ],
  ['esm/native/services/scene_view_shared_runtime.ts', '../runtime/three_access.js', ['getThreeMaybe']],
  ['esm/native/ui/ui_boot_controller_viewport.ts', '../services/api.js', ['assertThreeViaDeps']],
  ['esm/native/ui/export/export_canvas_viewport_shared.ts', '../../services/api.js', ['getThreeMaybe']],
  ['esm/native/platform/smoke_checks_scenario.ts', '../runtime/three_access.js', ['getThreeMaybe']],
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
  [
    'esm/native/runtime/services_root_access.ts',
    ['getServicesRootMaybe', 'ensureServicesRoot', 'getServiceSlotMaybe', 'ensureServiceSlot'],
    [],
  ],
  ['esm/native/runtime/commands_access.ts', ['getCommandsServiceMaybe', 'ensureCommandsService'], []],
  [
    'esm/native/runtime/storage_access.ts',
    [
      'getStorageServiceMaybe',
      'getStorageKey',
      'getStorageString',
      'getStorageJSON',
      'setStorageString',
      'setStorageJSON',
      'removeStorageKey',
    ],
    [],
  ],
  ['esm/native/runtime/three_access.ts', ['getThreeMaybe', 'assertThreeViaDeps'], []],
  [
    'esm/native/runtime/boot_entry_access.ts',
    [
      'getAppStartServiceMaybe',
      'ensureAppStartService',
      'getUiBootServiceMaybe',
      'ensureUiBootService',
      'clearRetiredUiBootStart',
      'getBootStartEntry',
    ],
    [],
  ],
  [
    'esm/native/runtime/platform_access_state.ts',
    [
      'getPlatformComputePerfFlags',
      'computePerfFlagsViaPlatform',
      'getPlatformSetAnimate',
      'installRenderAnimateViaPlatform',
    ],
    [],
  ],
  [
    'esm/native/runtime/platform_access_ops.ts',
    [
      'getPlatformReportError',
      'triggerRenderViaPlatform',
      'runPlatformRenderFollowThrough',
      'runPlatformWakeupFollowThrough',
      'runPlatformActivityRenderTouch',
      'createCanvasViaPlatform',
      'cloneViaPlatform',
      'cleanGroupViaPlatform',
      'getPlatformPruneCachesSafe',
      'ensurePlatformHash32',
    ],
    [],
  ],
  [
    'esm/native/runtime/notes_access_services.ts',
    ['getUiNotesServiceMaybe', 'getNotesServiceMaybe', 'isNotesScreenDrawMode'],
    [],
  ],
  [
    'esm/native/runtime/notes_access_actions.ts',
    ['exitNotesDrawModeViaService', 'persistNotesViaService', 'sanitizeNotesHtmlViaService'],
    [],
  ],
];

const REEXPORT_CONTRACTS = [
  [
    'esm/native/runtime/platform_access.ts',
    [
      './platform_access_shared.js',
      './platform_access_state.js',
      './platform_access_ops.js',
      './platform_access_debug_stats.js',
    ],
  ],
  [
    'esm/native/runtime/notes_access.ts',
    ['./notes_access_shared.js', './notes_access_services.js', './notes_access_actions.js'],
  ],
];

const PUBLIC_API_REQUIRED_EXPORTS = [
  'reportError',
  'triggerRenderViaPlatform',
  'runPlatformRenderFollowThrough',
  'runPlatformWakeupFollowThrough',
  'runPlatformActivityRenderTouch',
  'createCanvasViaPlatform',
  'ensureCommandsService',
  'ensureServicesRoot',
  'getStorageString',
  'getThreeMaybe',
  'assertThreeViaDeps',
  'getUiNotesServiceMaybe',
  'exitNotesDrawModeViaService',
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

function expectStarReExports(file, specifiers) {
  const analysis = analyze(file);
  const starExports = new Set(
    analysis.imports
      .filter(entry => entry.syntax === 'static-re-export' && entry.exportedSymbols.includes('*'))
      .map(entry => entry.specifier)
  );
  for (const specifier of specifiers) {
    assert.equal(starExports.has(specifier), true, `${file} must re-export ${specifier}`);
  }
}

function collectPublicReExports(file) {
  const analysis = analyze(file);
  return new Set(
    analysis.imports
      .filter(entry => entry.syntax === 'static-re-export')
      .flatMap(entry => entry.exportedSymbols)
      .filter(symbol => symbol !== '*')
  );
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

test('runtime access owners expose the canonical config, render, platform, service, and boot APIs', () => {
  for (const [file, required, forbidden] of EXPORT_CONTRACTS) {
    const exported = new Set(collectNamedModuleExports(file, read(file)).map(entry => entry.exportedName));
    for (const symbol of required) assert.equal(exported.has(symbol), true, `${file} must export ${symbol}`);
    for (const symbol of forbidden)
      assert.equal(exported.has(symbol), false, `${file} must not export retired ${symbol}`);
  }

  for (const [file, specifiers] of REEXPORT_CONTRACTS) expectStarReExports(file, specifiers);

  const publicExports = collectPublicReExports('esm/native/services/api.ts');
  for (const symbol of PUBLIC_API_REQUIRED_EXPORTS) {
    assert.equal(publicExports.has(symbol), true, `services/api.ts must publicly re-export ${symbol}`);
  }
});

test('cleaned camera, scene-view, and drawer callers do not probe legacy bags directly', () => {
  for (const [files, suffixes] of FORBIDDEN_CALLER_CHAINS) {
    for (const file of files) {
      assert.deepEqual(findForbiddenChains(file, suffixes), [], `${file} must use canonical access helpers`);
    }
  }
});
