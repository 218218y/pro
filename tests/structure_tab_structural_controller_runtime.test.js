import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadTsModule(relPath, calls, stubs = {}, cache = new Map()) {
  const file = path.join(process.cwd(), relPath);
  if (cache.has(file)) return cache.get(file).exports;

  const source = fs.readFileSync(file, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: file,
  }).outputText;

  const mod = { exports: {} };
  cache.set(file, mod);

  const localRequire = specifier => {
    if (specifier === '../actions/store_actions.js') {
      return {
        applyUiSoftScalarPatch: (...args) => calls.push(['applyUiSoftScalarPatch', ...args]),
        getUiSnapshot: app => {
          calls.push(['getUiSnapshot', app]);
          return { raw: { cellDimsWidth: 37 } };
        },
        recomputeFromUi: (...args) => calls.push(['recomputeFromUi', ...args]),
        setUiBaseLegColor: (...args) => calls.push(['setUiBaseLegColor', ...args]),
        setUiBaseLegPlatformMode: (...args) => calls.push(['setUiBaseLegPlatformMode', ...args]),
        setUiBaseLegPlatformSideMode: (...args) => calls.push(['setUiBaseLegPlatformSideMode', ...args]),
        setUiBaseLegHeightCm: (...args) => calls.push(['setUiBaseLegHeightCm', ...args]),
        setUiBaseLegWidthCm: (...args) => calls.push(['setUiBaseLegWidthCm', ...args]),
        setUiBaseLegStyle: (...args) => calls.push(['setUiBaseLegStyle', ...args]),
        setUiBasePlinthHeightCm: (...args) => calls.push(['setUiBasePlinthHeightCm', ...args]),
        setUiBaseType: (...args) => calls.push(['setUiBaseType', ...args]),
        setUiSingleDoorPos: (...args) => calls.push(['setUiSingleDoorPos', ...args]),
        setUiSlidingTracksColor: (...args) => calls.push(['setUiSlidingTracksColor', ...args]),
        setUiStructureSelect: (...args) => calls.push(['setUiStructureSelect', ...args]),
      };
    }
    if (specifier === '../actions/structural_build_refresh_actions.js') {
      return {
        applyImmediateStructuralUiMutation: (app, source, patch, applyDirectMutation) => {
          calls.push(['applyImmediateStructuralUiMutation', app, source, patch]);
          applyDirectMutation({ source, immediate: true });
          return { appliedViaActions: false, requestedBuild: false };
        },
      };
    }
    if (specifier === './structure_tab_shared.js') {
      return {
        commitStructureRawValue: args => calls.push(['commitStructureRawValue', args]),
        setStackSplitLowerLinkModeValue: args => calls.push(['setStackSplitLowerLinkModeValue', args]),
        structureTabReportNonFatal: (...args) => calls.push(['structureTabReportNonFatal', ...args]),
        toggleStackSplitState: args => calls.push(['toggleStackSplitState', args]),
      };
    }
    if (specifier === '../../../services/api.js') {
      return {
        getUiFeedback:
          stubs.getUiFeedback ||
          (() => ({
            toast: (...args) => calls.push(['toast', ...args]),
          })),
        readStoreStateMaybe:
          stubs.readStoreStateMaybe ||
          (() => ({
            config: {},
          })),
        patchViaActions:
          stubs.patchViaActions ||
          ((...args) => {
            calls.push(['patchViaActions', ...args]);
            return false;
          }),
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
          return calls.push([
            'recomputeFromUi:viaApp',
            app,
            uiOverride == null ? null : uiOverride,
            { ...(meta || {}), ...(defaults || {}) },
            { structureChanged: true, preserveTemplate: true, ...(opts || {}) },
            recoveryBuild || null,
          ]);
        },
      };
    }
    if (specifier === './structure_tab_core.js') {
      return {
        applyStructureTemplateRecomputeBatch: args => {
          calls.push(['applyStructureTemplateRecomputeBatch', args]);
          if (stubs.applyStructureTemplateRecomputeBatch) {
            return stubs.applyStructureTemplateRecomputeBatch(args);
          }
          if (typeof args.mutate === 'function') {
            args.mutate();
          }
          return calls.push([
            'recomputeFromUi:viaApp',
            args.app,
            args.uiPatch == null ? null : args.uiPatch,
            { ...(args.meta || {}), source: args.source, force: true },
            { structureChanged: true, preserveTemplate: true },
            {},
          ]);
        },
      };
    }
    if (specifier === './structure_tab_library_helpers.js') {
      return {
        normalizeSingleDoorPos: (doors, rawPos) => {
          calls.push(['normalizeSingleDoorPos', doors, rawPos]);
          if (!rawPos) return 'left';
          return doors % 2 === 0 ? '' : rawPos === 'middle' ? 'center' : rawPos;
        },
      };
    }
    if (specifier === './structure_tab_structural_controller_contracts.js') {
      return {};
    }
    if (specifier.startsWith('.')) {
      const target = path.join(path.dirname(file), specifier.replace(/\.js$/, '.ts'));
      const rel = path.relative(process.cwd(), target);
      return loadTsModule(rel, calls, stubs, cache);
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

function loadStructureStructuralControllerModule(calls = [], stubs = {}) {
  return loadTsModule(
    'esm/native/ui/react/tabs/structure_tab_structural_controller_runtime.ts',
    calls,
    stubs
  );
}

function createArgs(overrides = {}) {
  return {
    app: { id: 'app' },
    meta: {
      uiOnlyImmediate: source => ({
        source,
        immediate: true,
        noBuild: true,
        noAutosave: true,
        noPersist: true,
        noHistory: true,
        noCapture: true,
        uiOnly: true,
      }),
      noBuildImmediate: source => ({ source, immediate: true, noBuild: true }),
      noBuild: (meta, source) => ({ ...(meta || {}), source, noBuild: true }),
    },
    wardrobeType: 'hinged',
    isManualWidth: false,
    width: 160,
    height: 240,
    depth: 60,
    doors: 3,
    structureSelectRaw: '',
    singleDoorPosRaw: '',
    shouldShowSingleDoor: true,
    shouldShowHingeBtn: true,
    hingeDirection: false,
    stackSplitEnabled: false,
    stackSplitLowerHeight: 80,
    stackSplitLowerDepth: 45,
    stackSplitLowerWidth: 150,
    stackSplitLowerDoors: 2,
    stackSplitLowerDepthManual: false,
    stackSplitLowerWidthManual: false,
    stackSplitLowerDoorsManual: false,
    onSetHingeDirection: (...args) => overrides.calls?.push(['onSetHingeDirection', ...args]),
    ...overrides,
  };
}

test('[structure-structural-controller] commit + normalization + raw flows run through focused seams', () => {
  const calls = [];
  const mod = loadStructureStructuralControllerModule(calls);
  const controller = mod.createStructureTabStructuralController(createArgs({ calls }));

  assert.equal(mod.readUiRawNumberFromApp({ raw: { cellDimsWidth: 42 } }, 'cellDimsWidth'), 37);

  controller.commitStructural({ structureSelect: 'default', width: 180 }, 'react:structure:commit');
  controller.syncSingleDoorPos();
  controller.setRaw('cellDimsWidth', 55);
  controller.setRaw('doors', 5);
  controller.setStackSplitLowerLinkMode('depth', true);
  controller.toggleStackSplit();
  controller.setBaseType('legs');
  controller.setSlidingTracksColor('black');

  assert.ok(calls.some(entry => entry[0] === 'setUiStructureSelect' && entry[2] === 'default'));
  assert.ok(calls.some(entry => entry[0] === 'applyUiSoftScalarPatch' && entry[2].width === 180));
  assert.ok(
    calls.some(
      entry =>
        entry[0] === 'recomputeFromUi:viaApp' &&
        entry[4].structureChanged === true &&
        entry[4].preserveTemplate === true &&
        JSON.stringify(entry[5]) === JSON.stringify({})
    )
  );
  assert.ok(calls.some(entry => entry[0] === 'setUiSingleDoorPos' && entry[2] === 'left'));
  assert.ok(
    calls.some(
      entry =>
        entry[0] === 'commitStructureRawValue' &&
        entry[1].key === 'cellDimsWidth' &&
        entry[1].nextValue === 55
    )
  );
  assert.ok(
    calls.some(
      entry =>
        entry[0] === 'commitStructureRawValue' &&
        entry[1].key === 'doors' &&
        entry[1].structureSelectRaw === ''
    )
  );
  assert.ok(
    calls.some(entry => entry[0] === 'setStackSplitLowerLinkModeValue' && entry[1].field === 'depth')
  );
  assert.ok(calls.some(entry => entry[0] === 'toggleStackSplitState' && entry[1].height === 240));
  assert.ok(calls.some(entry => entry[0] === 'setUiBaseType' && entry[2] === 'legs'));
  assert.ok(calls.some(entry => entry[0] === 'setUiBaseLegPlatformMode' && entry[2] === 'stage'));
  assert.ok(calls.some(entry => entry[0] === 'setUiBaseLegPlatformSideMode' && entry[2] === 'overhang'));
  assert.ok(calls.some(entry => entry[0] === 'setUiSlidingTracksColor' && entry[2] === 'black'));
});

test('[structure-structural-controller] base and sliding build-visible writes use immediate structural ui mutation', () => {
  const calls = [];
  const mod = loadStructureStructuralControllerModule(calls);
  const controller = mod.createStructureTabStructuralController(createArgs({ calls }));

  controller.setBaseType('legs');
  controller.setBaseLegStyle('round');
  controller.setBaseLegColor('gold');
  controller.setBaseLegPlatformMode('plain');
  controller.setBaseLegPlatformSideMode('flush');
  controller.setBasePlinthHeightCm(12.3);
  controller.setBaseLegHeightCm(14);
  controller.setBaseLegWidthCm(4.5);
  controller.setSlidingTracksColor('black');

  const structuralCalls = calls.filter(entry => entry[0] === 'applyImmediateStructuralUiMutation');
  assert.equal(
    JSON.stringify(structuralCalls.map(entry => [entry[2], entry[3]])),
    JSON.stringify([
      [
        'react:structure:baseType',
        { baseType: 'legs', baseLegPlatformMode: 'stage', baseLegPlatformSideMode: 'overhang' },
      ],
      ['react:structure:baseLegStyle', { baseLegStyle: 'round' }],
      ['react:structure:baseLegColor', { baseLegColor: 'gold' }],
      ['react:structure:baseLegPlatformMode', { baseLegPlatformMode: 'plain' }],
      ['react:structure:baseLegPlatformSideMode', { baseLegPlatformSideMode: 'flush' }],
      ['react:structure:basePlinthHeightCm', { basePlinthHeightCm: 12.3 }],
      ['react:structure:baseLegHeightCm', { baseLegHeightCm: 14 }],
      ['react:structure:baseLegWidthCm', { baseLegWidthCm: 4.5 }],
      ['react:structure:slidingTracksColor', { slidingTracksColor: 'black' }],
    ])
  );

  assert.ok(
    calls.some(
      entry =>
        entry[0] === 'setUiBaseLegStyle' &&
        entry[2] === 'round' &&
        JSON.stringify(entry[3]) ===
          JSON.stringify({ source: 'react:structure:baseLegStyle', immediate: true })
    )
  );
  assert.ok(
    calls.some(
      entry =>
        entry[0] === 'setUiSlidingTracksColor' &&
        entry[2] === 'black' &&
        JSON.stringify(entry[3]) ===
          JSON.stringify({ source: 'react:structure:slidingTracksColor', immediate: true })
    )
  );
});

test('[structure-structural-controller] blocks base type selection when shoe drawers exist', () => {
  const calls = [];
  const mod = loadStructureStructuralControllerModule(calls, {
    readStoreStateMaybe: () => ({
      config: {
        modulesConfiguration: [{ hasShoeDrawer: true }],
      },
    }),
  });
  const controller = mod.createStructureTabStructuralController(createArgs({ calls }));

  controller.setBaseType('plinth');
  controller.setBaseType('legs');
  controller.setBaseType('none');

  assert.equal(calls.filter(entry => entry[0] === 'toast').length, 2);
  assert.ok(calls.every(entry => !(entry[0] === 'setUiBaseType' && entry[2] === 'plinth')));
  assert.ok(calls.every(entry => !(entry[0] === 'setUiBaseType' && entry[2] === 'legs')));
  assert.ok(calls.some(entry => entry[0] === 'setUiBaseType' && entry[2] === 'none'));
});

test('[structure-structural-controller] blocks legs-with-stage when height/depth special cells exist', () => {
  const calls = [];
  const mod = loadStructureStructuralControllerModule(calls, {
    readStoreStateMaybe: () => ({
      config: {
        modulesConfiguration: [{ doors: 1, specialDims: { baseHeightCm: 240, heightCm: 250 } }, { doors: 1 }],
      },
    }),
  });
  const controller = mod.createStructureTabStructuralController(createArgs({ calls }));

  controller.setBaseType('legs');
  controller.setBaseLegPlatformMode('stage');
  controller.setBaseLegPlatformMode('plain');

  const structuralCalls = calls.filter(entry => entry[0] === 'applyImmediateStructuralUiMutation');
  assert.equal(
    JSON.stringify(structuralCalls.map(entry => [entry[2], entry[3]])),
    JSON.stringify([['react:structure:baseLegPlatformMode', { baseLegPlatformMode: 'plain' }]])
  );
  assert.equal(calls.filter(entry => entry[0] === 'toast').length, 2);
  assert.ok(calls.every(entry => !(entry[0] === 'setUiBaseType' && entry[2] === 'legs')));
});

test('[structure-structural-controller] commitStructural collapses to a canonical ui patch when patch actions exist', () => {
  const calls = [];
  const mod = loadStructureStructuralControllerModule(calls, {
    applyStructureTemplateRecomputeBatch: args => {
      calls.push(['patchViaActions:applied', args.app, args.statePatch, args.meta]);
      return calls.push([
        'recomputeFromUi:viaApp',
        args.app,
        args.uiPatch == null ? null : args.uiPatch,
        { ...(args.meta || {}), source: args.source, force: true },
        { structureChanged: true, preserveTemplate: true },
        {},
      ]);
    },
  });
  const controller = mod.createStructureTabStructuralController(createArgs({ calls }));

  controller.commitStructural({ structureSelect: 'default', width: 180 }, 'react:structure:commit');

  assert.ok(
    calls.some(
      entry =>
        entry[0] === 'patchViaActions:applied' &&
        entry[2].ui.structureSelect === 'default' &&
        entry[2].ui.width === 180
    )
  );
  assert.ok(!calls.some(entry => entry[0] === 'setUiStructureSelect'));
  assert.ok(!calls.some(entry => entry[0] === 'applyUiSoftScalarPatch'));
  assert.ok(
    calls.some(
      entry =>
        entry[0] === 'recomputeFromUi:viaApp' &&
        entry[2].structureSelect === 'default' &&
        entry[2].width === 180
    )
  );
});

test('[structure-structural-controller] user structure buttons are historyable while auto sync stays ui-only', () => {
  const calls = [];
  const mod = loadStructureStructuralControllerModule(calls);
  const controller = mod.createStructureTabStructuralController(createArgs({ calls }));

  controller.commitStructural({ structureSelect: 'default' }, 'react:structure:pattern');

  const userBatch = calls.find(
    entry =>
      entry[0] === 'applyStructureTemplateRecomputeBatch' && entry[1].source === 'react:structure:pattern'
  );
  assert.ok(userBatch);
  assert.equal(userBatch[1].meta.noBuild, true);
  assert.equal(userBatch[1].meta.noHistory, undefined);
  assert.equal(userBatch[1].meta.uiOnly, undefined);

  calls.length = 0;
  controller.syncSingleDoorPos();

  const syncBatch = calls.find(
    entry =>
      entry[0] === 'applyStructureTemplateRecomputeBatch' &&
      entry[1].source === 'react:structure:singleDoorPos:init'
  );
  assert.ok(syncBatch);
  assert.equal(syncBatch[1].meta.uiOnly, true);
  assert.equal(syncBatch[1].meta.noHistory, true);
});

test('[structure-structural-controller] hinge visibility and single-door normalization stay canonical', () => {
  const calls = [];
  const mod = loadStructureStructuralControllerModule(calls);
  const controller = mod.createStructureTabStructuralController(
    createArgs({
      calls,
      doors: 4,
      singleDoorPosRaw: 'middle',
      shouldShowHingeBtn: false,
      hingeDirection: true,
    })
  );

  controller.syncSingleDoorPos();
  controller.syncHingeVisibility();

  assert.ok(
    calls.some(entry => entry[0] === 'normalizeSingleDoorPos' && entry[1] === 4 && entry[2] === 'middle')
  );
  assert.ok(calls.some(entry => entry[0] === 'setUiSingleDoorPos' && entry[2] === 'left'));
  assert.ok(
    calls.some(
      entry =>
        entry[0] === 'onSetHingeDirection' &&
        entry[1] === false &&
        entry[2] === 'react:structure:hinge:autoOff'
    )
  );
});
