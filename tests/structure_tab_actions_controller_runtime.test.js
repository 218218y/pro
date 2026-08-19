import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';
import { loadTsRuntimeModule } from './_ts_runtime_module_loader.mjs';

const actionControllerRouteContracts = Object.freeze({
  'esm/native/ui/react/tabs/structure_tab_corner_chest_actions_controller_chest.ts': Object.freeze({
    services: Object.freeze(['adjustCameraForChest', 'resetCameraPreset']),
    adapter: Object.freeze([
      'CHEST_MODE_DIMENSIONS',
      'DEFAULT_HEIGHT',
      'DEFAULT_HINGED_DOORS',
      'DEFAULT_WIDTH',
      'HINGED_DEFAULT_DEPTH',
      'WARDROBE_CHEST_DRAWERS_MIN',
    ]),
  }),
  'esm/native/ui/react/tabs/structure_tab_corner_chest_actions_controller_corner.ts': Object.freeze({
    services: Object.freeze(['adjustCameraForCorner', 'resetCameraPreset']),
    adapter: Object.freeze([
      'DEFAULT_CORNER_DOORS',
      'DEFAULT_CORNER_WIDTH',
      'DEFAULT_HEIGHT',
      'HINGED_DEFAULT_DEPTH',
    ]),
  }),
});

function exactDependencyFacts(dependency) {
  return {
    specifier: dependency.specifier,
    kind: dependency.kind,
    syntax: dependency.syntax,
    symbols: [...dependency.importedSymbols].sort(),
    aliases: dependency.bindings.filter(binding => binding.importedName !== binding.localName),
  };
}

const structureTabDimensionDefaults = Object.freeze({
  DEFAULT_CORNER_WIDTH: 120,
  DEFAULT_CORNER_DOORS: 3,
  CHEST_MODE_DIMENSIONS: Object.freeze({
    activeDefaults: Object.freeze({
      doorsCount: 0,
      widthCm: 50,
      heightCm: 50,
      depthCm: 40,
      drawersCount: 2,
      baseType: 'legs',
    }),
    commode: Object.freeze({
      defaultMirrorHeightCm: 70,
      minMirrorHeightCm: 30,
      maxMirrorHeightCm: 180,
      minMirrorWidthCm: 20,
      maxMirrorWidthCm: 560,
    }),
  }),
  WARDROBE_WIDTH_MIN: 40,
  WARDROBE_CHEST_WIDTH_MIN: 20,
  WARDROBE_WIDTH_MAX: 560,
  WARDROBE_HEIGHT_MIN: 100,
  WARDROBE_CHEST_HEIGHT_MIN: 20,
  WARDROBE_HEIGHT_MAX: 300,
  WARDROBE_DEPTH_MIN: 20,
  WARDROBE_DEPTH_MAX: 150,
  WARDROBE_DOORS_MIN: 0,
  WARDROBE_SLIDING_DOORS_MIN: 2,
  WARDROBE_DOORS_MAX: 14,
  WARDROBE_CHEST_DRAWERS_MIN: 2,
  WARDROBE_CHEST_DRAWERS_MAX: 8,
  WARDROBE_CELL_DIM_MIN: 20,
  WARDROBE_CELL_WIDTH_MIN: 20,
  WARDROBE_CELL_WIDTH_MAX: 560,
  WARDROBE_CELL_HEIGHT_MIN: 100,
  WARDROBE_CELL_HEIGHT_MAX: 300,
  WARDROBE_CELL_DEPTH_MIN: 20,
  WARDROBE_CELL_DEPTH_MAX: 150,
  STACK_SPLIT_LOWER_HEIGHT_MIN: 20,
  STACK_SPLIT_MIN_TOP_HEIGHT: 40,
  STACK_SPLIT_LOWER_DEPTH_MIN: 20,
  STACK_SPLIT_LOWER_DEPTH_MAX: 150,
  STACK_SPLIT_LOWER_WIDTH_MIN: 30,
  STACK_SPLIT_LOWER_WIDTH_MAX: 800,
  STACK_SPLIT_LOWER_DOORS_MIN: 0,
  STACK_SPLIT_LOWER_DOORS_MAX: 20,
});

function loadStructureActionsControllerModule(calls, overrides = {}) {
  const file = path.join(
    process.cwd(),
    'esm/native/ui/react/tabs/structure_tab_actions_controller_runtime.ts'
  );
  const localRequire = specifier => {
    if (specifier === '../actions/room_actions.js') {
      return {
        setManualWidth: (...args) => calls.push(['setManualWidth', ...args]),
      };
    }
    if (specifier === '../actions/store_actions.js') {
      return {
        getUiSnapshot: overrides.getUiSnapshot || (() => ({ raw: {} })),
        recomputeFromUi: (...args) => calls.push(['recomputeFromUi', ...args]),
        runHistoryBatch: (app, fn, meta) => {
          calls.push(['runHistoryBatch', app, meta]);
          fn();
        },
        setCfgHingeMap: (...args) => calls.push(['setCfgHingeMap', ...args]),
        setCfgPreChestState: (...args) => calls.push(['setCfgPreChestState', ...args]),
        setUiBaseLegPlatformMode: (...args) => calls.push(['setUiBaseLegPlatformMode', ...args]),
        setUiBaseLegStyle: (...args) => calls.push(['setUiBaseLegStyle', ...args]),
        setUiBaseType: (...args) => calls.push(['setUiBaseType', ...args]),
        setUiChestDrawersCount: (...args) => calls.push(['setUiChestDrawersCount', ...args]),
        setUiChestCommodeEnabled: (...args) => calls.push(['setUiChestCommodeEnabled', ...args]),
        setUiChestCommodeMirrorHeightCm: (...args) =>
          calls.push(['setUiChestCommodeMirrorHeightCm', ...args]),
        setUiChestCommodeMirrorWidthCm: (...args) => calls.push(['setUiChestCommodeMirrorWidthCm', ...args]),
        setUiChestCommodeMirrorWidthManual: (...args) =>
          calls.push(['setUiChestCommodeMirrorWidthManual', ...args]),
        setUiChestMode: (...args) => calls.push(['setUiChestMode', ...args]),
        setUiCornerDepth: (...args) => calls.push(['setUiCornerDepth', ...args]),
        setUiCornerDoors: (...args) => calls.push(['setUiCornerDoors', ...args]),
        setUiCornerHeight: (...args) => calls.push(['setUiCornerHeight', ...args]),
        setUiCornerMode: (...args) => calls.push(['setUiCornerMode', ...args]),
        setUiCornerSide: (...args) => calls.push(['setUiCornerSide', ...args]),
        setUiCornerWidth: (...args) => calls.push(['setUiCornerWidth', ...args]),
        setUiDepth: (...args) => calls.push(['setUiDepth', ...args]),
        setUiDoors: (...args) => calls.push(['setUiDoors', ...args]),
        setUiHeight: (...args) => calls.push(['setUiHeight', ...args]),
        setUiHingeDirection: (...args) => calls.push(['setUiHingeDirection', ...args]),
        setUiWidth: (...args) => calls.push(['setUiWidth', ...args]),
      };
    }
    if (specifier === '../actions/structural_build_refresh_actions.js') {
      return {
        applyImmediateStructuralConfigMutation:
          overrides.applyImmediateStructuralConfigMutation ||
          ((app, source, patch, applyDirectMutation, metaOverrides) => {
            calls.push(['applyImmediateStructuralConfigMutation', app, source, patch, metaOverrides]);
            const meta = { ...(metaOverrides || {}), source, immediate: true };
            delete meta.noBuild;
            applyDirectMutation(meta);
            return { appliedViaActions: false, requestedBuild: false };
          }),
        applyImmediateStructuralUiMutation:
          overrides.applyImmediateStructuralUiMutation ||
          ((app, source, patch, applyDirectMutation, metaOverrides) => {
            calls.push(['applyImmediateStructuralUiMutation', app, source, patch, metaOverrides]);
            const meta = { ...(metaOverrides || {}), source, immediate: true };
            delete meta.noBuild;
            applyDirectMutation(meta);
            return { appliedViaActions: false, requestedBuild: false };
          }),
      };
    }
    if (specifier === '../../../features/base_leg_support.js') {
      return {
        normalizeBaseLegPlatformMode: value => (value === 'plain' ? 'plain' : 'stage'),
        normalizeBaseLegStyle: value =>
          value === 'round' || value === 'square' || value === 'wheels' ? value : 'tapered',
      };
    }
    if (specifier === './structure_tab_dimension_defaults.js') {
      return structureTabDimensionDefaults;
    }
    if (specifier === '../../../services/api.js') {
      return {
        adjustCameraForChest: (...args) => calls.push(['adjustCameraForChest', ...args]),
        adjustCameraForCorner: (...args) => calls.push(['adjustCameraForCorner', ...args]),
        createStructuralModulesRecomputeOpts: () => ({ structureChanged: true, preserveTemplate: true }),
        patchViaActions:
          overrides.patchViaActions ||
          ((...args) => {
            calls.push(['patchViaActions', ...args]);
            return false;
          }),
        resetCameraPreset: (...args) => calls.push(['resetCameraPreset', ...args]),
        runAppStructuralModulesRecompute: (app, uiOverride, meta, defaults, opts, recoveryBuild) => {
          calls.push([
            'runAppStructuralModulesRecompute',
            app,
            uiOverride,
            meta,
            defaults,
            opts,
            recoveryBuild,
          ]);
          return calls.push(['recomputeFromUi:viaApp', app, uiOverride, meta, opts, recoveryBuild || null]);
        },
      };
    }
    if (specifier === './structure_tab_shared.js') {
      return {
        asFiniteInt: (value, fallback) => {
          const num = Number(value);
          return Number.isFinite(num) ? Math.round(num) : fallback;
        },
        asFiniteNumber: (value, fallback) => {
          const num = Number(value);
          return Number.isFinite(num) ? num : fallback;
        },
        enterStructureEditMode: args => calls.push(['enterStructureEditMode', args]),
        exitStructureEditMode: args => calls.push(['exitStructureEditMode', args]),
        structureTabReportNonFatal: (...args) => calls.push(['reportNonFatal', ...args]),
      };
    }
    return undefined;
  };
  return loadTsRuntimeModule(file, {
    mock: specifier => localRequire(specifier),
  });
}

test('[structure-actions-controller] chest and corner dimension routes preserve exact canonical imports', () => {
  for (const [rel, expected] of Object.entries(actionControllerRouteContracts)) {
    const source = fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
    const dependencies = analyzeModuleDependencies(rel, source).imports.filter(
      dependency =>
        dependency.specifier === '../../../services/api.js' ||
        dependency.specifier === './structure_tab_dimension_defaults.js'
    );
    assert.deepEqual(
      dependencies.map(exactDependencyFacts),
      [
        {
          specifier: '../../../services/api.js',
          kind: 'value',
          syntax: 'static-import',
          symbols: [...expected.services].sort(),
          aliases: [],
        },
        {
          specifier: './structure_tab_dimension_defaults.js',
          kind: 'value',
          syntax: 'static-import',
          symbols: [...expected.adapter].sort(),
          aliases: [],
        },
      ],
      rel
    );
  }
});

test('[structure-actions-controller] hinge controller gates build-visible hinge maps through canonical seams', () => {
  const calls = [];
  const mod = loadStructureActionsControllerModule(calls);
  const savedHingeMapRef = { current: null };
  const hingeDispatchRef = { current: null };
  let hingeMap = { a: 'left' };
  const controller = mod.createStructureTabHingeActionsController({
    app: { id: 'app' },
    meta: {
      noBuild: meta => ({ ...meta, noBuild: true }),
      noHistoryImmediate: source => ({ source, immediate: true }),
    },
    fb: { toast() {} },
    hingeModeId: 'hinge',
    getHingeMap: () => hingeMap,
    getPrimaryMode: () => 'hinge',
    savedHingeMapRef,
    hingeDispatchRef,
  });

  controller.setHingeDirection(false, 'react:hinge:disable');
  assert.equal(hingeDispatchRef.current, false);
  assert.equal(JSON.stringify(savedHingeMapRef.current), JSON.stringify({ a: 'left' }));
  assert.ok(calls.some(entry => entry[0] === 'exitStructureEditMode'));
  assert.ok(
    calls.some(
      entry =>
        entry[0] === 'applyImmediateStructuralUiMutation' &&
        entry[2] === 'react:hinge:disable' &&
        JSON.stringify(entry[3]) === JSON.stringify({ hingeDirection: false }) &&
        JSON.stringify(entry[4]) ===
          JSON.stringify({ noHistory: true, noAutosave: true, noPersist: true, noCapture: true })
    )
  );
  assert.ok(
    calls.some(
      entry =>
        entry[0] === 'setUiHingeDirection' &&
        entry[2] === false &&
        JSON.stringify(entry[3]) ===
          JSON.stringify({
            noHistory: true,
            noAutosave: true,
            noPersist: true,
            noCapture: true,
            source: 'react:hinge:disable',
            immediate: true,
          })
    )
  );
  assert.equal(
    calls.some(entry => entry[0] === 'applyImmediateStructuralConfigMutation'),
    false
  );
  assert.equal(
    calls.some(entry => entry[0] === 'setCfgHingeMap'),
    false
  );

  calls.length = 0;
  hingeMap = { a: 'left' };
  controller.setHingeDirection(true, 'react:hinge:enable');
  assert.equal(hingeDispatchRef.current, true);
  assert.ok(
    calls.some(
      entry =>
        entry[0] === 'applyImmediateStructuralUiMutation' &&
        entry[2] === 'react:hinge:enable' &&
        JSON.stringify(entry[3]) === JSON.stringify({ hingeDirection: true })
    )
  );
  assert.equal(
    calls.some(entry => entry[0] === 'applyImmediateStructuralConfigMutation'),
    false
  );
  assert.equal(
    calls.some(entry => entry[0] === 'setCfgHingeMap'),
    false
  );
  assert.ok(!calls.some(entry => entry[0] === 'enterStructureEditMode'));
});

test('[structure-actions-controller] hinge controller restores saved map only when current map is empty', () => {
  const calls = [];
  const mod = loadStructureActionsControllerModule(calls);
  const controller = mod.createStructureTabHingeActionsController({
    app: { id: 'app' },
    meta: {
      noBuild: meta => ({ ...meta, noBuild: true }),
      noHistoryImmediate: source => ({ source, immediate: true }),
    },
    fb: { toast() {} },
    hingeModeId: 'hinge',
    getHingeMap: () => ({}),
    getPrimaryMode: () => 'none',
    savedHingeMapRef: { current: { a: 'left' } },
    hingeDispatchRef: { current: null },
  });

  controller.setHingeDirection(true, 'react:hinge:enable');

  assert.ok(
    calls.some(
      entry =>
        entry[0] === 'applyImmediateStructuralConfigMutation' &&
        entry[2] === 'react:hinge:enable:restore' &&
        JSON.stringify(entry[3]) === JSON.stringify({ hingeMap: { a: 'left' } })
    )
  );
  assert.ok(
    calls.some(
      entry =>
        entry[0] === 'setCfgHingeMap' &&
        JSON.stringify(entry[2]) === JSON.stringify({ a: 'left' }) &&
        JSON.stringify(entry[3]) ===
          JSON.stringify({
            noHistory: true,
            noAutosave: true,
            noPersist: true,
            noCapture: true,
            source: 'react:hinge:enable:restore',
            immediate: true,
          })
    )
  );
  assert.ok(!calls.some(entry => entry[0] === 'enterStructureEditMode'));
});

test('[structure-actions-controller] hinge controller enters edit mode on first enable without saved map', () => {
  const calls = [];
  const mod = loadStructureActionsControllerModule(calls);
  const controller = mod.createStructureTabHingeActionsController({
    app: { id: 'app' },
    meta: {
      noBuild: meta => ({ ...meta, noBuild: true }),
      noHistoryImmediate: source => ({ source, immediate: true }),
    },
    fb: { toast() {} },
    hingeModeId: 'hinge',
    getHingeMap: () => ({}),
    getPrimaryMode: () => 'none',
    savedHingeMapRef: { current: null },
    hingeDispatchRef: { current: null },
  });

  controller.setHingeDirection(true, 'react:hinge:enable');

  assert.ok(
    calls.some(
      entry =>
        entry[0] === 'applyImmediateStructuralUiMutation' &&
        entry[2] === 'react:hinge:enable' &&
        JSON.stringify(entry[3]) === JSON.stringify({ hingeDirection: true })
    )
  );
  assert.ok(
    calls.some(
      entry =>
        entry[0] === 'enterStructureEditMode' &&
        entry[1].modeId === 'hinge' &&
        entry[1].source === 'react:hinge:enable:autoEdit'
    )
  );
  assert.equal(
    calls.some(entry => entry[0] === 'applyImmediateStructuralConfigMutation'),
    false
  );
});

test('[structure-actions-controller] hinge map canonical patch skips direct fallback when applied', () => {
  const calls = [];
  const mod = loadStructureActionsControllerModule(calls, {
    applyImmediateStructuralConfigMutation: (app, source, patch, _applyDirectMutation, metaOverrides) => {
      calls.push(['applyImmediateStructuralConfigMutation', app, source, patch, metaOverrides]);
      return { appliedViaActions: true, requestedBuild: false };
    },
  });
  const controller = mod.createStructureTabHingeActionsController({
    app: { id: 'app' },
    meta: {
      noBuild: meta => ({ ...meta, noBuild: true }),
      noHistoryImmediate: source => ({ source, immediate: true }),
    },
    fb: { toast() {} },
    hingeModeId: 'hinge',
    getHingeMap: () => ({}),
    getPrimaryMode: () => 'hinge',
    savedHingeMapRef: { current: { a: 'left' } },
    hingeDispatchRef: { current: null },
  });

  controller.setHingeDirection(true, 'react:hinge:enable');

  assert.ok(
    calls.some(
      entry =>
        entry[0] === 'applyImmediateStructuralConfigMutation' &&
        entry[2] === 'react:hinge:enable:restore' &&
        JSON.stringify(entry[3]) === JSON.stringify({ hingeMap: { a: 'left' } })
    )
  );
  assert.equal(
    calls.some(entry => entry[0] === 'setCfgHingeMap'),
    false
  );
});

test('[structure-actions-controller] chest and corner controller runs recompute/camera policy through one owner', () => {
  const calls = [];
  const mod = loadStructureActionsControllerModule(calls);
  const controller = mod.createStructureTabCornerChestActionsController({
    app: { id: 'app' },
    meta: {
      uiOnlyImmediate: source => ({ source, uiOnly: true, immediate: true }),
      noBuild: (meta, source) => ({ ...meta, source, noBuild: true }),
      noHistory: (_meta, source) => ({ source, noHistory: true }),
    },
    cornerSide: 'left',
    cornerWidth: 120,
    cornerDoors: 3,
    cornerHeight: 240,
    cornerDepth: 55,
    depth: 55,
    doors: 4,
    width: 160,
    height: 240,
    isManualWidth: true,
    baseType: 'plinth',
    baseLegPlatformMode: 'stage',
    preChestState: { doors: 5, width: 180, height: 230, depth: 60, isManual: false, base: 'legs' },
  });

  controller.toggleCornerMode(true);
  controller.commitCornerDoors(4);
  controller.toggleChestMode(true);
  controller.toggleChestMode(false);
  controller.setChestDrawersCount(1);

  assert.ok(calls.some(entry => entry[0] === 'setUiCornerMode' && entry[2] === true));
  assert.ok(calls.some(entry => entry[0] === 'setUiCornerWidth' && entry[2] === 160));
  assert.ok(calls.some(entry => entry[0] === 'adjustCameraForCorner'));
  assert.ok(calls.some(entry => entry[0] === 'setCfgPreChestState' && entry[2] && entry[2].doors === 4));
  assert.ok(calls.some(entry => entry[0] === 'setUiChestMode' && entry[2] === true));
  assert.ok(calls.some(entry => entry[0] === 'setUiChestMode' && entry[2] === false));
  assert.ok(calls.some(entry => entry[0] === 'adjustCameraForChest'));
  assert.ok(calls.some(entry => entry[0] === 'resetCameraPreset'));
  assert.ok(calls.some(entry => entry[0] === 'setManualWidth'));
  assert.ok(calls.some(entry => entry[0] === 'patchViaActions'));
  assert.ok(calls.some(entry => entry[0] === 'runAppStructuralModulesRecompute'));
  assert.ok(
    calls.some(
      entry =>
        entry[0] === 'recomputeFromUi:viaApp' &&
        JSON.stringify(entry[2]) === JSON.stringify({ raw: { chestDrawersCount: 2 } }) &&
        JSON.stringify(entry[5]) === JSON.stringify({})
    )
  );
});

test('[structure-actions-controller] corner/chest canonical patches collapse ui/config writes when patch route exists', () => {
  const calls = [];
  const mod = loadStructureActionsControllerModule(calls, {
    patchViaActions: (...args) => {
      calls.push(['patchViaActions', ...args]);
      return true;
    },
    getUiSnapshot: () => ({ raw: {}, cornerMode: false, isChestMode: false, baseType: 'plinth' }),
  });
  const controller = mod.createStructureTabCornerChestActionsController({
    app: { id: 'app' },
    meta: {
      uiOnlyImmediate: source => ({ source, uiOnly: true, immediate: true }),
      noBuild: (meta, source) => ({ ...meta, source, noBuild: true }),
      noHistory: (_meta, source) => ({ source, noHistory: true }),
    },
    cornerSide: 'left',
    cornerWidth: 120,
    cornerDoors: 3,
    cornerHeight: 240,
    cornerDepth: 55,
    depth: 55,
    doors: 4,
    width: 160,
    height: 240,
    isManualWidth: true,
    baseType: 'plinth',
    baseLegPlatformMode: 'stage',
    preChestState: { doors: 5, width: 180, height: 230, depth: 60, isManual: false, base: 'legs' },
  });

  controller.toggleCornerMode(true);
  controller.toggleChestMode(true);
  controller.toggleChestMode(false);

  const patchCalls = calls.filter(entry => entry[0] === 'patchViaActions');
  assert.ok(
    patchCalls.some(
      entry =>
        JSON.stringify(entry[2]) ===
        JSON.stringify({
          ui: {
            cornerMode: true,
            cornerSide: 'left',
            cornerWidth: 120,
            cornerDoors: 3,
            cornerHeight: 240,
            cornerDepth: 55,
          },
        })
    ),
    'corner mode should collapse to a canonical ui patch'
  );
  assert.ok(
    patchCalls.some(
      entry =>
        JSON.stringify(entry[2]) ===
        JSON.stringify({
          config: {
            preChestState: {
              doors: 4,
              width: 160,
              height: 240,
              depth: 55,
              isManual: true,
              base: 'plinth',
              baseLegStyle: 'tapered',
              baseLegPlatformMode: 'stage',
            },
          },
          ui: {
            isChestMode: true,
            baseType: 'legs',
            baseLegPlatformMode: 'plain',
            raw: { doors: 0, width: 50, height: 50, depth: 40, chestDrawersCount: 2 },
          },
        })
    ),
    'chest enable should collapse config+ui to one canonical patch'
  );
  assert.ok(
    patchCalls.some(
      entry =>
        JSON.stringify(entry[2]) ===
        JSON.stringify({
          config: { preChestState: null, isManualWidth: false },
          ui: {
            isChestMode: false,
            baseType: 'legs',
            baseLegStyle: 'tapered',
            baseLegPlatformMode: 'stage',
            raw: { doors: 5, width: 180, height: 230, depth: 60 },
          },
        })
    ),
    'chest disable should collapse restore config+ui to one canonical patch'
  );
  assert.equal(
    calls.some(entry => entry[0] === 'setUiChestMode'),
    false
  );
  assert.equal(
    calls.some(entry => entry[0] === 'setCfgPreChestState'),
    false
  );
  assert.ok(calls.some(entry => entry[0] === 'runAppStructuralModulesRecompute'));
});
