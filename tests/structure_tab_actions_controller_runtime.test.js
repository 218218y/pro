import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const serviceApiDimensionConstants = Object.freeze({
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
  WARDROBE_CELL_WIDTH_MIN: 40,
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
  const source = fs.readFileSync(file, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: file,
  }).outputText;
  const mod = { exports: {} };
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
        setUiBaseType: (...args) => calls.push(['setUiBaseType', ...args]),
        setUiChestDrawersCount: (...args) => calls.push(['setUiChestDrawersCount', ...args]),
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
    if (specifier === '../../../services/api.js') {
      return {
        ...serviceApiDimensionConstants,
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
        runAppStructuralModulesRecompute: (app, uiOverride, meta, defaults, opts, fallbackBuild) => {
          calls.push([
            'runAppStructuralModulesRecompute',
            app,
            uiOverride,
            meta,
            defaults,
            opts,
            fallbackBuild,
          ]);
          return calls.push(['recomputeFromUi:viaApp', app, uiOverride, meta, opts, fallbackBuild || null]);
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
    if (specifier.startsWith('.')) {
      const resolved = path.resolve(path.dirname(file), specifier);
      const candidates = [resolved, resolved.replace(/\.js$/i, '.ts'), `${resolved}.ts`];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          const source = fs.readFileSync(candidate, 'utf8');
          const transpiled = ts.transpileModule(source, {
            compilerOptions: {
              module: ts.ModuleKind.CommonJS,
              target: ts.ScriptTarget.ES2020,
            },
            fileName: candidate,
          }).outputText;
          const childMod = { exports: {} };
          const childSandbox = {
            module: childMod,
            exports: childMod.exports,
            require: localRequire,
            __dirname: path.dirname(candidate),
            __filename: candidate,
            console,
            process,
            setTimeout,
            clearTimeout,
          };
          vm.runInNewContext(transpiled, childSandbox, { filename: candidate });
          return childMod.exports;
        }
      }
    }
    return require(specifier);
  };
  const sandbox = {
    module: mod,
    exports: mod.exports,
    require: localRequire,
    __dirname: path.dirname(file),
    __filename: file,
    console,
    process,
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(transpiled, sandbox, { filename: file });
  return mod.exports;
}

test('[structure-actions-controller] hinge controller restores and clears hinge map through canonical seams', () => {
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
    calls.some(entry => entry[0] === 'setCfgHingeMap' && JSON.stringify(entry[2]) === JSON.stringify({}))
  );

  calls.length = 0;
  hingeMap = {};
  controller.setHingeDirection(true, 'react:hinge:enable');
  assert.equal(hingeDispatchRef.current, true);
  assert.ok(
    calls.some(
      entry => entry[0] === 'setCfgHingeMap' && JSON.stringify(entry[2]) === JSON.stringify({ a: 'left' })
    )
  );
  assert.ok(!calls.some(entry => entry[0] === 'enterStructureEditMode'));
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
            preChestState: { doors: 4, width: 160, height: 240, depth: 55, isManual: true, base: 'plinth' },
          },
          ui: {
            isChestMode: true,
            baseType: 'legs',
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
          ui: { isChestMode: false, baseType: 'legs', raw: { doors: 5, width: 180, height: 230, depth: 60 } },
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
