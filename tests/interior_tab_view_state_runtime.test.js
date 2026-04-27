import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');

const srcPath = path.resolve('esm/native/ui/react/tabs/interior_tab_view_state_runtime.ts');
const src = fs.readFileSync(srcPath, 'utf8');
const transpiled = ts.transpileModule(src, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
  fileName: srcPath,
}).outputText;

const sandbox = {
  module: { exports: {} },
  exports: {},
  require: spec => {
    if (spec === '../actions/handles_actions.js') {
      return { EDGE_HANDLE_VARIANT_GLOBAL_KEY: '__edge_variant__' };
    }
    if (spec === '../../../features/handle_finish_shared.js') {
      return { DEFAULT_HANDLE_FINISH_COLOR: 'nickel', HANDLE_COLOR_GLOBAL_KEY: '__handle_color__' };
    }
    if (spec === './interior_tab_helpers.js') {
      return {
        asNum: (value, fallback) => {
          const n = typeof value === 'number' ? value : Number(value);
          return Number.isFinite(n) ? n : fallback;
        },
      };
    }
    if (spec === './interior_tab_view_state_shared.js') {
      return {
        readRecord: value => (value && typeof value === 'object' && !Array.isArray(value) ? value : null),
        readLayoutTypeId: (value, fallback = 'shelves') => {
          const raw = String(value ?? fallback)
            .trim()
            .toLowerCase();
          return ['shelves', 'hanging', 'hanging_split', 'mixed', 'storage', 'brace_shelves'].includes(raw)
            ? raw
            : fallback;
        },
        readManualToolId: (value, fallback = 'shelf') => {
          const raw = String(value ?? fallback)
            .trim()
            .toLowerCase();
          return ['shelf', 'rod', 'storage'].includes(raw) ? raw : fallback;
        },
        readGridShelfVariant: value => {
          const raw = String(value ?? 'regular')
            .trim()
            .toLowerCase();
          return ['regular', 'double', 'glass', 'brace'].includes(raw) ? raw : 'regular';
        },
        readDoorTrimColor: (value, fallback = 'nickel') => {
          const raw = String(value ?? fallback)
            .trim()
            .toLowerCase();
          return ['nickel', 'silver', 'gold', 'black'].includes(raw) ? raw : fallback;
        },
        readHandleUiColor: (value, fallback = 'nickel') => {
          const raw = String(value ?? fallback)
            .trim()
            .toLowerCase();
          return ['nickel', 'silver', 'gold', 'black', 'pink'].includes(raw) || /^#[0-9a-f]{6}$/.test(raw)
            ? raw
            : fallback;
        },
        readExtDrawerType: (value, fallback = 'regular') => {
          const raw = String(value ?? fallback)
            .trim()
            .toLowerCase();
          return raw === 'shoe' || raw === 'regular' ? raw : fallback;
        },
        readHandleType: (value, fallback = 'standard') => {
          const raw = String(value ?? fallback)
            .trim()
            .toLowerCase();
          return ['standard', 'edge', 'none'].includes(raw) ? raw : fallback;
        },
        readEdgeHandleVariant: (value, fallback = 'short') =>
          String(value ?? fallback)
            .trim()
            .toLowerCase() === 'long'
            ? 'long'
            : 'short',
      };
    }
    throw new Error(`Unexpected import: ${spec}`);
  },
};
sandbox.exports = sandbox.module.exports;
vm.runInNewContext(transpiled, sandbox, { filename: srcPath });

const { deriveInteriorTabModeState, deriveInteriorTabUiToolState, deriveInteriorTabVisibilityState } =
  sandbox.module.exports;

test('interior tab view-state runtime derives primary mode flags and sketch tool state', () => {
  const state = deriveInteriorTabModeState({
    primary: 'manual_layout',
    modeOptsRaw: { manualTool: 'sketch_shelf_double', layoutType: 'mixed' },
    layoutTypeUiRaw: 'hanging',
    modeLayout: 'layout',
    modeManualLayout: 'manual_layout',
    modeBraceShelves: 'brace_shelves',
    modeExtDrawer: 'ext_drawer',
    modeDivider: 'divider',
    modeIntDrawer: 'int_drawer',
    modeHandle: 'handle',
    modeDoorTrim: 'door_trim',
  });
  assert.equal(state.isManualLayoutMode, true);
  assert.equal(state.isSketchToolActive, true);
  assert.equal(state.layoutActive, true);
  assert.equal(state.layoutType, 'hanging');
  assert.equal(state.manualTool, 'shelf');
  assert.equal(state.manualToolRaw, 'sketch_shelf_double');
});

test('interior tab view-state runtime derives ext drawer and handle tool state canonically', () => {
  const state = deriveInteriorTabUiToolState({
    ui: {
      currentGridDivisions: '7',
      currentGridShelfVariant: 'glass',
      currentExtDrawerType: 'regular',
      currentExtDrawerCount: '2',
      internalDrawersEnabled: 1,
      handleControl: true,
    },
    handleCfg: {
      globalHandleType: 'edge',
      handlesMap: { __edge_variant__: 'long', __handle_color__: 'black' },
    },
    modeOpts: {
      extDrawerType: 'shoe',
      extDrawerCount: '4',
      handleType: 'none',
      edgeHandleVariant: 'short',
      handleColor: 'gold',
    },
    isExtDrawerMode: true,
    isHandleMode: true,
  });
  assert.equal(state.currentGridDivisions, 7);
  assert.equal(state.gridShelfVariant, 'glass');
  assert.equal(state.extDrawerType, 'shoe');
  assert.equal(state.extDrawerCount, 4);
  assert.equal(state.internalDrawersEnabled, true);
  assert.equal(state.handleControlEnabled, true);
  assert.equal(state.globalHandleType, 'edge');
  assert.equal(state.handleToolType, 'none');
  assert.equal(state.globalHandleColor, 'black');
  assert.equal(state.handleToolColor, 'gold');
  assert.equal(state.globalEdgeHandleVariant, 'long');
  assert.equal(state.handleToolEdgeVariant, 'short');
});

test('interior tab view-state runtime derives manual row visibility from layout and sketch state', () => {
  const active = deriveInteriorTabVisibilityState({
    manualRowOpen: false,
    isManualLayoutMode: true,
    isSketchToolActive: false,
    manualTool: 'rod',
    manualUiTool: 'storage',
  });
  assert.equal(active.showManualRow, true);
  assert.equal(active.activeManualToolForUi, 'rod');
  assert.equal(active.showGridControls, true);

  const sketch = deriveInteriorTabVisibilityState({
    manualRowOpen: false,
    isManualLayoutMode: true,
    isSketchToolActive: true,
    manualTool: 'rod',
    manualUiTool: 'storage',
  });
  assert.equal(sketch.showManualRow, false);
  assert.equal(sketch.activeManualToolForUi, 'storage');
  assert.equal(sketch.showGridControls, false);
});

test('interior tab view-state runtime preserves custom and pink handle colors canonically', () => {
  const state = deriveInteriorTabUiToolState({
    ui: { handleControl: true },
    handleCfg: {
      globalHandleType: 'standard',
      handlesMap: { __handle_color__: '#f3b6cb' },
    },
    modeOpts: {
      handleType: 'edge',
      handleColor: 'pink',
    },
    isExtDrawerMode: false,
    isHandleMode: true,
  });
  assert.equal(state.globalHandleColor, '#f3b6cb');
  assert.equal(state.handleToolColor, 'pink');
});
