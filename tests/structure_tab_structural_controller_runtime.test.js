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
        setUiBaseType: (...args) => calls.push(['setUiBaseType', ...args]),
        setUiSingleDoorPos: (...args) => calls.push(['setUiSingleDoorPos', ...args]),
        setUiSlidingTracksColor: (...args) => calls.push(['setUiSlidingTracksColor', ...args]),
        setUiStructureSelect: (...args) => calls.push(['setUiStructureSelect', ...args]),
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
        patchViaActions:
          stubs.patchViaActions ||
          ((...args) => {
            calls.push(['patchViaActions', ...args]);
            return false;
          }),
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
          return calls.push([
            'recomputeFromUi:viaApp',
            app,
            uiOverride == null ? null : uiOverride,
            { ...(meta || {}), ...(defaults || {}) },
            { structureChanged: true, preserveTemplate: true, ...(opts || {}) },
            fallbackBuild || null,
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
    if (specifier.startsWith('./')) {
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
  assert.ok(calls.some(entry => entry[0] === 'setUiSlidingTracksColor' && entry[2] === 'black'));
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
