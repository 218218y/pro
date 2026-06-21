import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadHandlesActionsHarness(initial = {}) {
  const srcPath = path.resolve('esm/native/ui/react/actions/handles_actions.ts');
  const src = fs.readFileSync(srcPath, 'utf8');
  const transpiled = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: srcPath,
  }).outputText;

  const store = {
    config: {
      globalHandleType: 'standard',
      handlesMap: {
        __wp_edge_handle_variant_global: 'short',
        __handle_color__: 'nickel',
      },
      ...(initial.config || {}),
    },
    ui: {
      handleControl: true,
      ...(initial.ui || {}),
    },
    mode: {
      primary: 'none',
      opts: {},
      ...(initial.mode || {}),
    },
  };
  const calls = [];
  const app = {};

  const sandbox = {
    module: { exports: {} },
    exports: {},
    require: spec => {
      if (spec === './modes_actions.js') {
        return {
          getPrimaryMode: () => store.mode.primary,
          getModeState: () => store.mode,
          enterPrimaryMode: (_app, modeId, opts = {}) => {
            calls.push(['enterPrimaryMode', modeId, opts]);
            store.mode = { primary: String(modeId), opts: opts.modeOpts || {} };
          },
          exitPrimaryMode: (_app, expectedMode, opts = {}) => {
            calls.push(['exitPrimaryMode', expectedMode, opts]);
            store.mode = { primary: 'none', opts: {} };
          },
        };
      }
      if (spec === '../../../services/api.js') {
        return {
          MODES: { HANDLE: 'handle' },
          getBrowserTimers: () => ({ setTimeout: fn => fn() }),
          refreshBuilderHandles: (...args) => calls.push(['refreshBuilderHandles', ...args]),
          getDoorsActionFn: () => null,
          getMetaActionFn: () => null,
          readStoreStateMaybe: () => store,
        };
      }
      if (spec === './store_actions.js') {
        return {
          patchUiSoft: (_app, patch, meta) => {
            calls.push(['patchUiSoft', patch, meta]);
            Object.assign(store.ui, patch);
          },
          setCfgGlobalHandleType: (_app, value, meta) => {
            calls.push(['setCfgGlobalHandleType', value, meta]);
            store.config.globalHandleType = value;
          },
          setCfgHandlesMap: (_app, value, meta) => {
            calls.push(['setCfgHandlesMap', value, meta]);
            store.config.handlesMap = value;
          },
          setUiFlag: (_app, key, value, meta) => {
            calls.push(['setUiFlag', key, value, meta]);
            store.ui[key] = !!value;
          },
        };
      }
      if (spec === './structural_build_refresh_actions.js') {
        const buildMeta = (source, overrides = {}) => {
          const meta = { ...overrides, source: String(source || '').trim(), immediate: true };
          delete meta.noBuild;
          return meta;
        };
        return {
          createImmediateStructuralMutationMeta: buildMeta,
          applyImmediateStructuralConfigMutation: (_app, source, patch, applyDirectMutation, overrides) => {
            calls.push(['applyImmediateStructuralConfigMutation', source, patch, overrides]);
            applyDirectMutation(buildMeta(source, overrides));
            return { appliedViaActions: false, requestedBuild: false };
          },
          applyImmediateStructuralUiMutation: (_app, source, patch, applyDirectMutation, overrides) => {
            calls.push(['applyImmediateStructuralUiMutation', source, patch, overrides]);
            applyDirectMutation(buildMeta(source, overrides));
            return { appliedViaActions: false, requestedBuild: false };
          },
        };
      }
      if (spec === '../../../features/handle_finish_shared.js') {
        return {
          DEFAULT_HANDLE_FINISH_COLOR: 'nickel',
          HANDLE_COLOR_GLOBAL_KEY: '__handle_color__',
          normalizeHandleFinishColor: value => (typeof value === 'string' && value ? value : 'nickel'),
        };
      }
      if (spec === '../../../features/manual_handle_position.js') {
        return {
          MANUAL_HANDLE_POSITION_MODE: 'manual',
          isManualHandlePositionMode: value => value === 'manual',
        };
      }
      if (spec === '../../../features/door_removal_visibility.js') {
        return {
          resolveRemoveDoorsEnabledFromSnapshots: (ui, mode) =>
            ui?.removeDoorsEnabled === true || mode?.primary === 'remove_door',
        };
      }
      throw new Error(`Unexpected import: ${spec}`);
    },
    console,
  };
  sandbox.exports = sandbox.module.exports;
  vm.runInNewContext(transpiled, sandbox, { filename: srcPath });
  return { api: sandbox.module.exports, store, calls, app };
}

function lastEnter(calls) {
  const entries = calls.filter(entry => entry[0] === 'enterPrimaryMode');
  return entries[entries.length - 1];
}

test('advanced handle type buttons update the active tool instead of exiting handle edit mode', () => {
  const { api, store, calls, app } = loadHandlesActionsHarness({
    mode: { primary: 'handle', opts: { handleType: 'standard', handleColor: 'black' } },
  });

  api.toggleHandleMode(app, 'edge');

  assert.equal(
    calls.some(entry => entry[0] === 'exitPrimaryMode'),
    false
  );
  assert.equal(store.ui.currentHandleToolType, 'edge');
  const enter = lastEnter(calls);
  assert.equal(enter[1], 'handle');
  assert.equal(enter[2].modeOpts.handleType, 'edge');
  assert.equal(enter[2].modeOpts.handleColor, 'black');
  assert.equal(enter[2].toast, 'עריכת ידיות: לחץ על דלת או מגירה כדי לשנות ידית');
});

test('advanced handle color selection re-enters handle edit mode after exit and keeps edit toast active', () => {
  const { api, store, calls, app } = loadHandlesActionsHarness({
    ui: {
      handleControl: true,
      currentHandleToolType: 'edge',
      currentHandleToolEdgeVariant: 'long',
      currentHandleToolColor: 'black',
    },
    mode: { primary: 'none', opts: {} },
  });

  api.setHandleModeColor(app, 'gold');

  assert.equal(store.mode.primary, 'handle');
  assert.equal(store.ui.currentHandleToolColor, 'gold');
  const enter = lastEnter(calls);
  assert.equal(enter[2].modeOpts.handleType, 'edge');
  assert.equal(enter[2].modeOpts.edgeHandleVariant, 'long');
  assert.equal(enter[2].modeOpts.handleColor, 'gold');
  assert.equal(enter[2].toast, 'עריכת ידיות: לחץ על דלת או מגירה כדי לשנות ידית');
});

test('advanced edge variant selection from closed edit mode opens handle edit mode with edge controls', () => {
  const { api, store, calls, app } = loadHandlesActionsHarness({
    ui: {
      handleControl: true,
      currentHandleToolType: 'standard',
      currentHandleToolColor: 'nickel',
    },
    mode: { primary: 'none', opts: {} },
  });

  api.setHandleModeEdgeVariant(app, 'long');

  assert.equal(store.mode.primary, 'handle');
  assert.equal(store.ui.currentHandleToolType, 'edge');
  assert.equal(store.ui.currentHandleToolEdgeVariant, 'long');
  const enter = lastEnter(calls);
  assert.equal(enter[2].modeOpts.handleType, 'edge');
  assert.equal(enter[2].modeOpts.edgeHandleVariant, 'long');
  assert.equal(enter[2].toast, 'עריכת ידיות: לחץ על דלת או מגירה כדי לשנות ידית');
});
test('enabling advanced handle control auto-enters handle edit mode while handle overrides are still clean', () => {
  const { api, store, calls, app } = loadHandlesActionsHarness({
    ui: {
      handleControl: false,
      currentHandleToolType: 'standard',
      currentHandleToolColor: 'nickel',
      currentHandleToolEdgeVariant: 'short',
    },
    mode: { primary: 'none', opts: {} },
  });

  api.setHandleControlEnabled(app, true);

  assert.equal(store.ui.handleControl, true);
  assert.equal(store.mode.primary, 'handle');
  const enter = lastEnter(calls);
  assert.equal(enter[2].modeOpts.handleType, 'standard');
  assert.equal(enter[2].modeOpts.handleColor, 'nickel');
  assert.equal(enter[2].modeOpts.edgeHandleVariant, 'short');
  assert.equal(enter[2].toast, 'עריכת ידיות: לחץ על דלת או מגירה כדי לשנות ידית');
});

test('enabling advanced handle control does not auto-enter after per-part handle changes', () => {
  const { api, store, calls, app } = loadHandlesActionsHarness({
    config: {
      handlesMap: {
        __wp_edge_handle_variant_global: 'short',
        __handle_color__: 'nickel',
        d1: 'edge',
        '__wp_handle_color:d1': 'black',
      },
    },
    ui: { handleControl: false },
    mode: { primary: 'none', opts: {} },
  });

  api.setHandleControlEnabled(app, true);

  assert.equal(store.ui.handleControl, true);
  assert.equal(store.mode.primary, 'none');
  assert.equal(
    calls.some(entry => entry[0] === 'enterPrimaryMode'),
    false
  );
});

test('tool buttons enabling advanced handle control do not create a duplicate default edit entry', () => {
  const { api, calls, app } = loadHandlesActionsHarness({
    ui: { handleControl: false },
    mode: { primary: 'none', opts: {} },
  });

  api.toggleHandleMode(app, 'edge');

  const enterCalls = calls.filter(entry => entry[0] === 'enterPrimaryMode');
  assert.equal(enterCalls.length, 1);
  assert.equal(enterCalls[0][2].modeOpts.handleType, 'edge');
});

test('global handle type uses immediate structural config mutation with force-build fallback', () => {
  const { api, store, calls, app } = loadHandlesActionsHarness();

  api.setGlobalHandleType(app, 'edge');

  assert.equal(store.config.globalHandleType, 'edge');
  assert.ok(
    calls.some(
      entry =>
        entry[0] === 'applyImmediateStructuralConfigMutation' &&
        entry[1] === 'react:handles:globalType' &&
        JSON.stringify(entry[2]) === JSON.stringify({ globalHandleType: 'edge' }) &&
        JSON.stringify(entry[3]) === JSON.stringify({ forceBuild: true })
    )
  );
  assert.ok(
    calls.some(
      entry =>
        entry[0] === 'setCfgGlobalHandleType' &&
        entry[1] === 'edge' &&
        JSON.stringify(entry[2]) ===
          JSON.stringify({ forceBuild: true, source: 'react:handles:globalType', immediate: true })
    )
  );
});

test('global handle color writes reserved handles map key through immediate structural config mutation', () => {
  const { api, store, calls, app } = loadHandlesActionsHarness();

  api.setGlobalHandleColor(app, 'gold');

  assert.equal(store.config.handlesMap.__handle_color__, 'gold');
  assert.ok(
    calls.some(
      entry =>
        entry[0] === 'applyImmediateStructuralConfigMutation' &&
        entry[1] === 'react:handles:globalColor' &&
        entry[2].handlesMap.__handle_color__ === 'gold' &&
        JSON.stringify(entry[3]) === JSON.stringify({ forceBuild: true })
    )
  );
  assert.ok(
    calls.some(
      entry =>
        entry[0] === 'setCfgHandlesMap' &&
        entry[1].__handle_color__ === 'gold' &&
        JSON.stringify(entry[2]) ===
          JSON.stringify({ forceBuild: true, source: 'react:handles:globalColor', immediate: true })
    )
  );
});

test('handle control enablement uses immediate structural ui mutation with no-history force-build meta', () => {
  const { api, store, calls, app } = loadHandlesActionsHarness({
    ui: { handleControl: true },
  });

  api.setHandleControlEnabled(app, false);

  assert.equal(store.ui.handleControl, false);
  assert.ok(
    calls.some(
      entry =>
        entry[0] === 'applyImmediateStructuralUiMutation' &&
        entry[1] === 'react:handles:toggle' &&
        JSON.stringify(entry[2]) === JSON.stringify({ handleControl: false }) &&
        JSON.stringify(entry[3]) ===
          JSON.stringify({ immediate: true, noHistory: true, noCapture: true, forceBuild: true })
    )
  );
  assert.ok(
    calls.some(
      entry =>
        entry[0] === 'setUiFlag' &&
        entry[1] === 'handleControl' &&
        entry[2] === false &&
        JSON.stringify(entry[3]) ===
          JSON.stringify({
            immediate: true,
            noHistory: true,
            noCapture: true,
            forceBuild: true,
            source: 'react:handles:toggle',
          })
    )
  );
});
