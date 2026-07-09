import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { loadTsRuntimeModule } from './_ts_runtime_module_loader.mjs';

const srcPath = path.resolve('esm/native/ui/react/tabs/interior_tab_view_state_core_runtime.ts');
const moduleExports = loadTsRuntimeModule(srcPath, {
  mock: spec => {
    if (spec === '../../../services/api.js') {
      return {
        MODES: {
          NONE: 'none',
          LAYOUT: 'layout',
          MANUAL_LAYOUT: 'manual_layout',
          BRACE_SHELVES: 'brace_shelves',
          EXT_DRAWER: 'ext_drawer',
          DIVIDER: 'divider',
          HANDLE: 'handle',
          DOOR_TRIM: 'door_trim',
        },
      };
    }
    if (spec === './interior_tab_helpers.js') {
      return {
        asStr: (value, fallback = '') => String(value ?? fallback),
      };
    }
    if (spec === './interior_tab_view_state_runtime.js') {
      return {
        deriveInteriorTabModeState: args => ({
          modeOpts: { marker: 'mode', raw: args.modeOptsRaw },
          isLayoutMode: false,
          isManualLayoutMode: true,
          isBraceShelvesMode: false,
          isExtDrawerMode: true,
          isDividerMode: false,
          isIntDrawerMode: false,
          isHandleMode: true,
          isDoorTrimMode: false,
          layoutActive: true,
          layoutType: 'mixed',
          manualTool: 'rod',
          manualToolRaw: 'sketch_shelf_double',
          isSketchToolActive: true,
          isSketchDivisionToolActive: true,
        }),
        deriveInteriorTabUiToolState: args => ({
          currentGridDivisions: 8,
          gridShelfVariant: 'glass',
          extDrawerType: args.isExtDrawerMode ? 'shoe' : 'regular',
          extDrawerCount: 4,
          internalDrawersEnabled: true,
          handleControlEnabled: true,
          globalHandleType: 'edge',
          handleToolType: args.isHandleMode ? 'none' : 'edge',
          globalEdgeHandleVariant: 'long',
          handleToolEdgeVariant: 'short',
        }),
        deriveInteriorTabVisibilityState: args => ({
          showManualRow: args.manualRowOpen || args.isSketchDivisionToolActive,
          activeManualToolForUi: args.manualUiTool,
          showGridControls: args.manualUiTool === 'rod',
          showShelfVariantControls: args.manualUiTool === 'shelf',
        }),
      };
    }
    throw new Error(`Unexpected import: ${spec}`);
  },
});

const {
  readInteriorTabUiSnapshot,
  readInteriorTabHandleCfgSnapshot,
  readInteriorTabModeSnapshot,
  readInteriorTabModeConsts,
  deriveInteriorTabCoreState,
} = moduleExports;

test('interior tab core runtime reads grouped snapshots canonically', () => {
  const ui = JSON.parse(
    JSON.stringify(
      readInteriorTabUiSnapshot({
        currentLayoutType: 'mixed',
        currentGridDivisions: 7,
        currentGridShelfVariant: 'glass',
        currentExtDrawerType: 'regular',
        currentExtDrawerCount: 2,
        internalDrawersEnabled: true,
        handleControl: false,
        ignored: 'nope',
      })
    )
  );
  assert.deepEqual(ui, {
    currentLayoutType: 'mixed',
    currentGridDivisions: 7,
    currentGridShelfVariant: 'glass',
    currentExtDrawerType: 'regular',
    currentExtDrawerCount: 2,
    internalDrawersEnabled: true,
    handleControl: false,
  });

  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        readInteriorTabHandleCfgSnapshot({ globalHandleType: 'edge', handlesMap: { a: 1 }, extra: 2 })
      )
    ),
    {
      globalHandleType: 'edge',
      handlesMap: { a: 1 },
    }
  );
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        readInteriorTabModeSnapshot({ primary: 'manual_layout', opts: { manualTool: 'rod' }, junk: true })
      )
    ),
    {
      primary: 'manual_layout',
      opts: { manualTool: 'rod' },
    }
  );
});

test('interior tab core runtime derives canonical mode consts and merged view state', () => {
  const modeConsts = readInteriorTabModeConsts({});
  assert.equal(modeConsts.modeExtDrawer, 'ext_drawer');
  assert.equal(modeConsts.modeDoorTrim, 'door_trim');

  const state = deriveInteriorTabCoreState({
    ui: {
      currentLayoutType: 'mixed',
      currentGridDivisions: 7,
      currentGridShelfVariant: 'glass',
      currentExtDrawerType: 'regular',
      currentExtDrawerCount: 2,
      internalDrawersEnabled: true,
      handleControl: true,
    },
    handleCfg: {
      globalHandleType: 'edge',
      handlesMap: { edge: 'long' },
    },
    mode: {
      primary: 'manual_layout',
      opts: { manualTool: 'rod' },
    },
    modeConsts,
    manualRowOpen: false,
    manualUiTool: 'rod',
  });

  assert.equal(state.manualTool, 'rod');
  assert.equal(state.isSketchToolActive, true);
  assert.equal(state.isSketchDivisionToolActive, true);
  assert.equal(state.extDrawerType, 'shoe');
  assert.equal(state.handleToolType, 'none');
  assert.equal(state.activeManualToolForUi, 'rod');
  assert.equal(state.showGridControls, true);
  assert.equal(state.showShelfVariantControls, false);
  assert.deepEqual(state.modeOpts, { marker: 'mode', raw: { manualTool: 'rod' } });
});
