import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');

const srcPath = path.resolve('esm/native/ui/react/tabs/structure_tab_view_state_runtime.ts');
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
    if (spec === '../selectors/ui_raw_selectors.js') {
      return {
        readUiRawIntFromSnapshot: (ui, key, fallback) => {
          const value = ui[key];
          return Number.isFinite(Number(value)) ? Math.round(Number(value)) : fallback;
        },
        readUiRawNumberFromSnapshot: (ui, key, fallback) => {
          const value = ui[key];
          return Number.isFinite(Number(value)) ? Number(value) : fallback;
        },
        readUiRawScalarFromSnapshot: (ui, key) => ui[key],
      };
    }
    if (spec === './structure_tab_library_helpers.js') {
      return {
        hasArrayItem: (arr, value) => Array.isArray(arr) && arr.includes(value),
        safeJsonParse: value => {
          try {
            return JSON.parse(String(value));
          } catch {
            return null;
          }
        },
      };
    }
    if (spec === './structure_tab_view_state_contracts.js') {
      return {};
    }
    if (spec === '../../../features/base_leg_support.js') {
      return {
        normalizeBaseLegStyle: value => (value === 'round' || value === 'square' ? value : 'tapered'),
        normalizeBaseLegColor: value => (value === 'nickel' || value === 'gold' ? value : 'black'),
        getDefaultBaseLegWidthCm: style => (style === 'tapered' ? 4 : 3.5),
        normalizeBaseLegHeightCm: value => {
          const n = Number(value);
          return Number.isFinite(n) && n > 0 ? Math.round(n) : 12;
        },
        normalizeBaseLegWidthCm: (value, fallback = 4) => {
          const n = Number(value);
          return Number.isFinite(n) && n > 0 ? Math.round(n * 10) / 10 : fallback;
        },
      };
    }
    if (spec === './structure_tab_saved_models_patterns.js') {
      return {
        STRUCTURE_PATTERNS: {
          3: [{ label: 'Odd default', structure: 'default' }],
          4: [{ label: 'Even default', structure: [1, 1, 1, 1] }],
        },
      };
    }
    if (spec === './structure_tab_shared.js') {
      return {
        asFiniteInt: (v, fallback) => {
          const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
          return Number.isFinite(n) ? n : fallback;
        },
        asFiniteNumber: (v, fallback) => {
          const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
          return Number.isFinite(n) ? n : fallback;
        },
        asOptionalNumber: value => {
          if (value === null || value === undefined || value === '') return '';
          const n = typeof value === 'number' ? value : parseFloat(String(value));
          return Number.isFinite(n) ? n : '';
        },
      };
    }
    throw new Error(`Unexpected import: ${spec}`);
  },
};
sandbox.exports = sandbox.module.exports;
vm.runInNewContext(transpiled, sandbox, { filename: srcPath });

const {
  readStructureTabBaseUiState,
  deriveStructureTabStackSplitState,
  deriveStructureTabSelectionState,
  readStructureTabCellDimsState,
  readStructureTabDefaultCellWidth,
  normalizeStructureTabBaseType,
  normalizeStructureTabSlidingTracksColor,
  normalizeStructureTabCornerSide,
  asStructureTabRecord,
  normalizeStructureTabPreChestState,
  normalizeStructureTabHingeMap,
} = sandbox.module.exports;

test('structure tab view-state runtime normalizes base ui state', () => {
  const state = readStructureTabBaseUiState({
    width: '180',
    height: '245',
    depth: '64',
    doors: '5',
    chestDrawersCount: '7',
    baseType: 'legs',
    baseLegStyle: 'square',
    baseLegColor: 'gold',
    baseLegHeightCm: '18',
    baseLegWidthCm: '5.5',
    slidingTracksColor: 'black',
    structureSelect: '[2,3]',
    singleDoorPos: 'center-left',
    hingeDirection: 1,
    cornerMode: true,
    cornerSide: 'left',
    cornerWidth: '140',
    cornerDoors: '4',
    cornerHeight: '250',
    cornerDepth: '70',
    isChestMode: 1,
  });
  assert.equal(state.width, 180);
  assert.equal(state.depth, 64);
  assert.equal(state.baseType, 'legs');
  assert.equal(state.baseLegStyle, 'square');
  assert.equal(state.baseLegColor, 'gold');
  assert.equal(state.baseLegHeightCm, 18);
  assert.equal(state.baseLegWidthCm, 5.5);
  assert.equal(state.slidingTracksColor, 'black');
  assert.equal(state.cornerSide, 'left');
  assert.equal(state.cornerDoors, 4);
  assert.equal(state.isChestMode, true);
});

test('structure tab view-state runtime derives stack-split fallback/manual flags correctly', () => {
  const auto = deriveStructureTabStackSplitState({
    depth: 60,
    width: 160,
    doors: 4,
    stackSplitLowerDepthRaw: 60,
    stackSplitLowerWidthRaw: 160,
    stackSplitLowerDoorsRaw: 4,
    stackSplitLowerDepthManualRaw: undefined,
    stackSplitLowerWidthManualRaw: undefined,
    stackSplitLowerDoorsManualRaw: undefined,
  });
  assert.equal(auto.stackSplitLowerDepthManual, false);
  assert.equal(auto.stackSplitLowerWidthManual, false);
  assert.equal(auto.stackSplitLowerDoorsManual, false);
  assert.equal(auto.stackSplitLowerDepth, 60);
  const manual = deriveStructureTabStackSplitState({
    depth: 60,
    width: 160,
    doors: 4,
    stackSplitLowerDepthRaw: 55,
    stackSplitLowerWidthRaw: 120,
    stackSplitLowerDoorsRaw: 2,
    stackSplitLowerDepthManualRaw: true,
    stackSplitLowerWidthManualRaw: true,
    stackSplitLowerDoorsManualRaw: true,
  });
  assert.equal(manual.stackSplitLowerDepthManual, true);
  assert.equal(manual.stackSplitLowerWidthManual, true);
  assert.equal(manual.stackSplitLowerDoorsManual, true);
  assert.equal(manual.stackSplitLowerWidth, 120);
  assert.equal(manual.stackSplitLowerDoors, 2);
});

test('structure tab view-state runtime derives structure selection visibility and defaults', () => {
  const even = deriveStructureTabSelectionState({
    doors: 4,
    structureSelectRaw: '',
    wardrobeType: 'hinged',
  });
  assert.equal(even.structureSelect, '[1,1,1,1]');
  assert.deepEqual(Array.from(even.structureArr || []), [1, 1, 1, 1]);
  assert.equal(even.shouldShowStructureButtons, true);
  assert.equal(even.shouldShowSingleDoor, false);
  assert.equal(even.shouldShowHingeBtn, true);

  const oddDefault = deriveStructureTabSelectionState({
    doors: 3,
    structureSelectRaw: '',
    wardrobeType: 'hinged',
  });
  assert.equal(oddDefault.structureIsDefault, true);
  assert.equal(oddDefault.shouldShowSingleDoor, true);
  assert.equal(oddDefault.shouldShowHingeBtn, true);

  const sliding = deriveStructureTabSelectionState({
    doors: 4,
    structureSelectRaw: '[1,1,1,1]',
    wardrobeType: 'sliding',
  });
  assert.equal(sliding.isSliding, true);
  assert.equal(sliding.shouldShowStructureButtons, false);
  assert.equal(sliding.shouldShowHingeBtn, false);
});

test('structure tab view-state runtime derives default cell width from modules count and width snapshot', () => {
  assert.equal(readStructureTabDefaultCellWidth({ modulesCount: 4, width: 160 }), 40);
  assert.equal(readStructureTabDefaultCellWidth({ modulesCount: 0, width: 160 }), 160);
  assert.equal(readStructureTabDefaultCellWidth({ modulesCount: 3, width: 100 }), 33.3);
});

test('structure tab view-state runtime normalizes cell dims and record helpers', () => {
  const cellDims = readStructureTabCellDimsState({
    cellDimsWidth: '45.5',
    cellDimsHeight: '',
    cellDimsDepth: null,
  });
  assert.equal(cellDims.cellDimsWidth, 45.5);
  assert.equal(cellDims.cellDimsHeight, '');
  assert.equal(cellDims.cellDimsDepth, '');
  assert.equal(normalizeStructureTabBaseType('weird'), 'plinth');
  assert.equal(normalizeStructureTabSlidingTracksColor('weird'), 'nickel');
  assert.equal(normalizeStructureTabCornerSide('weird'), 'right');
  assert.deepEqual(asStructureTabRecord({ a: 1 }), { a: 1 });
  assert.equal(asStructureTabRecord(null), null);
});

test('structure tab view-state runtime normalizes pre-chest state and hinge-map snapshots into stable typed clones', () => {
  const preChest = normalizeStructureTabPreChestState({ width: 180, height: 240, isManual: true });
  assert.deepEqual(JSON.parse(JSON.stringify(preChest)), { width: 180, height: 240, isManual: true });
  assert.notEqual(preChest, null);
  assert.notEqual(preChest, normalizeStructureTabPreChestState({ width: 180, height: 240, isManual: true }));
  assert.equal(normalizeStructureTabPreChestState('bad'), null);

  const hingeMap = normalizeStructureTabHingeMap({ a: 'left', b: null, c: { dir: 'right' }, drop: true });
  assert.deepEqual(JSON.parse(JSON.stringify(hingeMap)), { a: 'left', b: null, c: { dir: 'right' } });
  assert.equal('drop' in hingeMap, false);
});
