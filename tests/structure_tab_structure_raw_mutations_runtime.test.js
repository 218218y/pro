import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { loadTsRuntimeModule } from './_ts_runtime_module_loader.mjs';
function loadTsModule(relPath, calls, cache = new Map()) {
  const file = path.join(process.cwd(), relPath);
  const localRequire = specifier => {
    if (specifier === 'react') {
      return {
        useEffect: () => undefined,
        useId: () => 'test-id',
        useMemo: fn => fn(),
        useRef: value => ({ current: value }),
        useState: value => [typeof value === 'function' ? value() : value, () => undefined],
      };
    }
    if (specifier === '../actions/room_actions.js') {
      return {
        setManualWidth: (...args) => calls.push(['setManualWidth', ...args]),
      };
    }
    if (specifier === '../../../services/api.js') {
      return {
        runPerfAction: (app, name, fn, meta) => {
          calls.push(['runPerfAction', app, name, meta]);
          return fn();
        },
      };
    }
    if (specifier === './structure_tab_dimension_defaults.js') {
      return {
        resolveAutoWidthForDoors: (wardrobeType, doors) => {
          const n = Math.max(0, Math.round(Number(doors) || 0));
          return n * (wardrobeType === 'sliding' ? 80 : 40);
        },
        isAutoWidthForDoors: (wardrobeType, width, doors) => {
          const n = Math.max(0, Math.round(Number(doors) || 0));
          const expected = n * (wardrobeType === 'sliding' ? 80 : 40);
          const current = Number(width) || 0;
          return !(current > 0) || Math.abs(current - expected) < 0.51;
        },
        CHEST_MODE_DIMENSIONS: {
          commode: {
            maxMirrorHeightCm: 180,
            maxMirrorWidthCm: 560,
            minMirrorHeightCm: 30,
            minMirrorWidthCm: 20,
          },
        },
        DEFAULT_STACK_SPLIT_LOWER_HEIGHT: 80,
        STACK_SPLIT_LOWER_DEPTH_MAX: 150,
        STACK_SPLIT_LOWER_DEPTH_MIN: 20,
        STACK_SPLIT_LOWER_DOORS_MAX: 20,
        STACK_SPLIT_LOWER_DOORS_MIN: 0,
        STACK_SPLIT_LOWER_HEIGHT_MIN: 20,
        STACK_SPLIT_LOWER_WIDTH_MAX: 800,
        STACK_SPLIT_LOWER_WIDTH_MIN: 30,
        STACK_SPLIT_MIN_TOP_HEIGHT: 40,
        WARDROBE_CELL_DEPTH_MAX: 150,
        WARDROBE_CELL_DEPTH_MIN: 20,
        WARDROBE_CELL_HEIGHT_MAX: 300,
        WARDROBE_CELL_HEIGHT_MIN: 100,
        WARDROBE_CELL_WIDTH_MAX: 560,
        WARDROBE_CELL_WIDTH_MIN: 20,
        WARDROBE_CHEST_DRAWERS_MAX: 8,
        WARDROBE_CHEST_DRAWERS_MIN: 2,
        WARDROBE_CHEST_HEIGHT_MIN: 20,
        WARDROBE_CHEST_WIDTH_MIN: 20,
        WARDROBE_DEPTH_MAX: 150,
        WARDROBE_DEPTH_MIN: 20,
        WARDROBE_DOORS_MAX: 14,
        WARDROBE_HEIGHT_MAX: 300,
        WARDROBE_HEIGHT_MIN: 100,
        WARDROBE_HINGED_SINGLE_DOOR_WIDTH_MIN: 20,
        WARDROBE_SLIDING_DOORS_MIN: 2,
        WARDROBE_WIDTH_MAX: 560,
        WARDROBE_WIDTH_MIN: 40,
      };
    }
    if (specifier === '../actions/store_actions.js') {
      return {
        applyUiRawScalarPatch: (...args) => calls.push(['applyUiRawScalarPatch', ...args]),
        setUiCellDimsDepth: (...args) => calls.push(['setUiCellDimsDepth', ...args]),
        setUiCellDimsHeight: (...args) => calls.push(['setUiCellDimsHeight', ...args]),
        setUiCellDimsWidth: (...args) => calls.push(['setUiCellDimsWidth', ...args]),
        setUiSingleDoorPos: (...args) => calls.push(['setUiSingleDoorPos', ...args]),
        setUiStackSplitLowerDoors: (...args) => calls.push(['setUiStackSplitLowerDoors', ...args]),
        setUiStackSplitLowerDoorsManual: (...args) =>
          calls.push(['setUiStackSplitLowerDoorsManual', ...args]),
        setUiStructureSelect: (...args) => calls.push(['setUiStructureSelect', ...args]),
      };
    }
    if (specifier === './structure_tab_library_helpers.js') {
      return {
        normalizeSingleDoorPos: (doors, rawPos) => {
          calls.push(['normalizeSingleDoorPos', doors, rawPos]);
          if (!rawPos) return 'left';
          return rawPos === 'middle' ? 'center' : rawPos;
        },
        safeJsonParse: value => {
          calls.push(['safeJsonParse', value]);
          try {
            return JSON.parse(value);
          } catch {
            return null;
          }
        },
        sumDoorsFromStructure: value => {
          calls.push(['sumDoorsFromStructure', value]);
          return Array.isArray(value) ? value.reduce((sum, entry) => sum + (Number(entry) || 0), 0) : null;
        },
      };
    }
    if (specifier === './structure_tab_core.js') {
      return {
        applyStructureTemplateRecomputeBatch: args =>
          calls.push(['applyStructureTemplateRecomputeBatch', args]),
        structureTabReportNonFatal: (...args) => calls.push(['structureTabReportNonFatal', ...args]),
      };
    }
    if (specifier === './structure_tab_structure_mutations_shared.js') {
      return {
        buildRawUiPatch: raw => ({ raw }),
        normalizeDoorsValue: (wardrobeType, value) =>
          Math.max(wardrobeType === 'sliding' ? 2 : 0, Math.min(14, Math.round(Number(value) || 0))),
        readRawPatch: patch => (patch && patch.raw) || {},
        readSingleDoorPosOr: (value, fallback) => (value ? value : fallback),
      };
    }
    if (specifier.startsWith('.')) {
      const target = path.join(path.dirname(file), specifier.replace(/\.js$/, '.ts'));
      const rel = path.relative(process.cwd(), target);
      return loadTsModule(rel, calls, cache);
    }
    return undefined;
  };

  return loadTsRuntimeModule(file, {
    cache,
    mock: specifier => localRequire(specifier),
  });
}

function createMeta() {
  return {
    uiOnlyImmediate: source => ({ source, immediate: true, uiOnly: true }),
    noBuildImmediate: source => ({ source, immediate: true, noBuild: true }),
    noBuild: (meta, source) => ({ ...(meta || {}), source, noBuild: true }),
    noHistory: (meta, source) => ({ ...(meta || {}), source, noHistory: true }),
  };
}

function baseArgs(overrides = {}) {
  return {
    app: { id: 'app' },
    meta: createMeta(),
    getDisplayedRawValue: key =>
      ({ width: 160, height: 240, depth: 60, doors: 4, stackSplitLowerDoors: 2 })[key] || 0,
    wardrobeType: 'hinged',
    isChestMode: false,
    isManualWidth: false,
    width: 160,
    height: 240,
    depth: 55,
    doors: 4,
    structureSelectRaw: '',
    singleDoorPosRaw: '',
    ...overrides,
  };
}

test('[structure-raw-mutations] width commit batches manual-width config with ui raw patch', () => {
  const calls = [];
  const mod = loadTsModule('esm/native/ui/react/tabs/structure_tab_structure_raw_mutations.ts', calls);

  mod.commitStructureRawValue({
    ...baseArgs(),
    key: 'width',
    nextValue: 220,
  });

  const batchCall = calls.find(entry => entry[0] === 'applyStructureTemplateRecomputeBatch');
  assert.ok(batchCall);
  const args = batchCall[1];
  assert.equal(args.source, 'react:structure:width');
  assert.equal(args.buildTiming, 'coalesced');
  assert.equal(args.forceBuild, false);
  assert.equal(JSON.stringify(args.uiPatch), JSON.stringify({ raw: { width: 220 } }));
  assert.equal(
    JSON.stringify(args.statePatch),
    JSON.stringify({ ui: { raw: { width: 220 } }, config: { isManualWidth: true } })
  );
  assert.equal(typeof args.mutate, 'function');
  assert.ok(
    calls.some(entry => entry[0] === 'runPerfAction' && entry[2] === 'structure.dimensions.width.commit')
  );
  assert.ok(!calls.some(entry => entry[0] === 'setManualWidth'));
});

test('[structure-raw-mutations] doors commit collapses auto-width fix into the same canonical state patch', () => {
  const calls = [];
  const mod = loadTsModule('esm/native/ui/react/tabs/structure_tab_structure_raw_mutations.ts', calls);

  mod.commitStructureRawValue({
    ...baseArgs({ isManualWidth: true, width: 160, doors: 4 }),
    key: 'doors',
    nextValue: 5,
  });

  const batchCall = calls.find(entry => entry[0] === 'applyStructureTemplateRecomputeBatch');
  assert.ok(batchCall);
  const args = batchCall[1];
  assert.equal(args.source, 'react:structure:doors');
  assert.equal(args.buildTiming, undefined);
  assert.equal(
    JSON.stringify(args.statePatch),
    JSON.stringify({
      ui: { raw: { doors: 5, width: 200 }, singleDoorPos: 'left' },
      config: { isManualWidth: false },
    })
  );
  assert.ok(!calls.some(entry => entry[0] === 'setManualWidth'));
});

test('[structure-raw-mutations] regular hinged doors cannot be reduced to zero from Structure tab', () => {
  const calls = [];
  const mod = loadTsModule('esm/native/ui/react/tabs/structure_tab_structure_raw_mutations.ts', calls);

  mod.commitStructureRawValue({
    ...baseArgs({ getDisplayedRawValue: key => ({ doors: 4, width: 160 })[key] || 0 }),
    key: 'doors',
    nextValue: 0,
  });

  const batchCall = calls.find(entry => entry[0] === 'applyStructureTemplateRecomputeBatch');
  assert.ok(batchCall);
  assert.equal(
    JSON.stringify(batchCall[1].statePatch),
    JSON.stringify({
      ui: { raw: { doors: 1, width: 40 }, singleDoorPos: 'left' },
    })
  );
});

test('[structure-raw-mutations] corner mode may intentionally reduce main hinged doors to zero', () => {
  const calls = [];
  const mod = loadTsModule('esm/native/ui/react/tabs/structure_tab_structure_raw_mutations.ts', calls);

  mod.commitStructureRawValue({
    ...baseArgs({
      allowNoMainWardrobe: true,
      getDisplayedRawValue: key => ({ doors: 4, width: 160 })[key] || 0,
    }),
    key: 'doors',
    nextValue: 0,
  });

  const batchCall = calls.find(entry => entry[0] === 'applyStructureTemplateRecomputeBatch');
  assert.ok(batchCall);
  assert.equal(
    JSON.stringify(batchCall[1].statePatch),
    JSON.stringify({
      ui: { raw: { doors: 0, width: 0 } },
    })
  );
});

test('[structure-dimension-constraints] Structure tab door minimum is one except for sliding and corner-only-capable mode', () => {
  const calls = [];
  const mod = loadTsModule('esm/native/ui/react/tabs/structure_tab_dimension_constraints.ts', calls);

  assert.equal(
    JSON.stringify(mod.readStructureDimensionBounds({ key: 'doors', wardrobeType: 'hinged' })),
    JSON.stringify({ min: 1, max: 14, integer: true })
  );
  assert.equal(
    JSON.stringify(
      mod.readStructureDimensionBounds({
        key: 'doors',
        wardrobeType: 'hinged',
        allowNoMainWardrobe: true,
      })
    ),
    JSON.stringify({ min: 0, max: 14, integer: true })
  );
  assert.equal(
    JSON.stringify(mod.readStructureDimensionBounds({ key: 'doors', wardrobeType: 'sliding' })),
    JSON.stringify({ min: 2, max: 14, integer: true })
  );
});

test('[structure-dimension-constraints] one-door hinged width minimum is 20cm without weakening other wardrobes', () => {
  const calls = [];
  const mod = loadTsModule('esm/native/ui/react/tabs/structure_tab_dimension_constraints.ts', calls);

  assert.equal(
    JSON.stringify(mod.readStructureDimensionBounds({ key: 'width', wardrobeType: 'hinged', doors: 1 })),
    JSON.stringify({ min: 20, max: 560, allowZero: false })
  );
  assert.equal(
    JSON.stringify(mod.readStructureDimensionBounds({ key: 'width', wardrobeType: 'hinged', doors: 2 })),
    JSON.stringify({ min: 40, max: 560, allowZero: false })
  );
  assert.equal(
    JSON.stringify(mod.readStructureDimensionBounds({ key: 'width', wardrobeType: 'sliding', doors: 2 })),
    JSON.stringify({ min: 40, max: 560, allowZero: false })
  );
  assert.equal(
    JSON.stringify(
      mod.readStructureDimensionBounds({
        key: 'width',
        wardrobeType: 'hinged',
        doors: 0,
        allowNoMainWardrobe: true,
      })
    ),
    JSON.stringify({ min: 40, max: 560, allowZero: true })
  );
});

test('[structure-raw-mutations] one-door hinged width accepts 20cm as a manual width', () => {
  const calls = [];
  const mod = loadTsModule('esm/native/ui/react/tabs/structure_tab_structure_raw_mutations.ts', calls);

  mod.commitStructureRawValue({
    ...baseArgs({
      doors: 1,
      width: 40,
      getDisplayedRawValue: key => ({ width: 40 })[key] || 0,
    }),
    key: 'width',
    nextValue: 20,
  });

  const batchCall = calls.find(entry => entry[0] === 'applyStructureTemplateRecomputeBatch');
  assert.ok(batchCall);
  assert.equal(JSON.stringify(batchCall[1].uiPatch), JSON.stringify({ raw: { width: 20 } }));
  assert.equal(
    JSON.stringify(batchCall[1].statePatch),
    JSON.stringify({ ui: { raw: { width: 20 } }, config: { isManualWidth: true } })
  );
});

test('[structure-raw-mutations] height and depth commits request coalesced build timing', () => {
  for (const [key, nextValue] of [
    ['height', 260],
    ['depth', 70],
  ]) {
    const calls = [];
    const mod = loadTsModule('esm/native/ui/react/tabs/structure_tab_structure_raw_mutations.ts', calls);

    mod.commitStructureRawValue({
      ...baseArgs({ getDisplayedRawValue: field => ({ [key]: 1 })[field] || 0 }),
      key,
      nextValue,
    });

    const batchCall = calls.find(entry => entry[0] === 'applyStructureTemplateRecomputeBatch');
    assert.ok(batchCall);
    assert.equal(batchCall[1].source, `react:structure:${key}`);
    assert.equal(batchCall[1].buildTiming, 'coalesced');
    assert.equal(batchCall[1].forceBuild, false);
  }
});

test('[structure-raw-mutations] stack-split lower doors commit uses one ui patch instead of split writes', () => {
  const calls = [];
  const mod = loadTsModule('esm/native/ui/react/tabs/structure_tab_structure_raw_mutations.ts', calls);

  mod.commitStructureRawValue({
    ...baseArgs({ getDisplayedRawValue: key => ({ stackSplitLowerDoors: 2 })[key] || 0 }),
    key: 'stackSplitLowerDoors',
    nextValue: 3,
  });

  const batchCall = calls.find(entry => entry[0] === 'applyStructureTemplateRecomputeBatch');
  assert.ok(batchCall);
  const args = batchCall[1];
  assert.equal(args.source, 'react:structure:stackSplitLowerDoors');
  assert.equal(args.forceBuild, undefined);
  assert.equal(
    JSON.stringify(args.statePatch),
    JSON.stringify({
      ui: { raw: { stackSplitLowerDoors: 3, stackSplitLowerDoorsManual: true } },
    })
  );
});

test('[structure-raw-mutations] scalar commits clamp to the dimension contract before raw patches', () => {
  const calls = [];
  const mod = loadTsModule('esm/native/ui/react/tabs/structure_tab_structure_raw_mutations.ts', calls);

  mod.commitStructureRawValue({
    ...baseArgs({ getDisplayedRawValue: key => ({ width: 160 })[key] || 0 }),
    key: 'width',
    nextValue: 999,
  });

  const batchCall = calls.find(entry => entry[0] === 'applyStructureTemplateRecomputeBatch');
  assert.ok(batchCall);
  assert.equal(JSON.stringify(batchCall[1].uiPatch), JSON.stringify({ raw: { width: 560 } }));
  assert.equal(
    JSON.stringify(batchCall[1].statePatch),
    JSON.stringify({ ui: { raw: { width: 560 } }, config: { isManualWidth: true } })
  );
});

test('[structure-raw-mutations] doors commits cannot push invalid auto-width into raw state', () => {
  const calls = [];
  const mod = loadTsModule('esm/native/ui/react/tabs/structure_tab_structure_raw_mutations.ts', calls);

  mod.commitStructureRawValue({
    ...baseArgs({ getDisplayedRawValue: key => ({ doors: 4, width: 160 })[key] || 0 }),
    key: 'doors',
    nextValue: 99,
  });

  const batchCall = calls.find(entry => entry[0] === 'applyStructureTemplateRecomputeBatch');
  assert.ok(batchCall);
  assert.equal(
    JSON.stringify(batchCall[1].statePatch),
    JSON.stringify({
      ui: { raw: { doors: 14, width: 560 } },
    })
  );
});

test('[structure-dimension-constraints] per-cell bounds use canonical dimension limits, not current cabinet values', () => {
  const calls = [];
  const mod = loadTsModule('esm/native/ui/react/tabs/structure_tab_dimension_constraints.ts', calls);

  assert.equal(
    JSON.stringify(mod.readStructureDimensionBounds({ key: 'cellDimsWidth', width: 240 })),
    JSON.stringify({ min: 20, max: 560 })
  );
  assert.equal(
    JSON.stringify(mod.readStructureDimensionBounds({ key: 'cellDimsHeight', height: 240 })),
    JSON.stringify({ min: 100, max: 300 })
  );
  assert.equal(
    JSON.stringify(mod.readStructureDimensionBounds({ key: 'cellDimsDepth', depth: 55 })),
    JSON.stringify({ min: 20, max: 150 })
  );
});

test('[structure-raw-mutations] per-cell commits clamp to cell dimension contract instead of current cabinet values', () => {
  const calls = [];
  const mod = loadTsModule('esm/native/ui/react/tabs/structure_tab_structure_raw_mutations.ts', calls);

  mod.commitStructureRawValue({
    ...baseArgs({ getDisplayedRawValue: key => ({ cellDimsDepth: 55 })[key] || 0, depth: 55 }),
    key: 'cellDimsDepth',
    nextValue: 150,
  });

  assert.ok(calls.some(entry => entry[0] === 'setUiCellDimsDepth' && entry[2] === 150));

  const highCalls = [];
  const mod2 = loadTsModule('esm/native/ui/react/tabs/structure_tab_structure_raw_mutations.ts', highCalls);
  mod2.commitStructureRawValue({
    ...baseArgs({ getDisplayedRawValue: key => ({ cellDimsHeight: 240 })[key] || 0, height: 240 }),
    key: 'cellDimsHeight',
    nextValue: 999,
  });

  assert.ok(highCalls.some(entry => entry[0] === 'setUiCellDimsHeight' && entry[2] === 300));
});

test('[structure-dimension-constraints] zero-door wardrobes allow the exact zero-width sentinel only', () => {
  const calls = [];
  const constraints = loadTsModule('esm/native/ui/react/tabs/structure_tab_dimension_constraints.ts', calls);
  const field = loadTsModule('esm/native/ui/react/tabs/structure_tab_dimension_field_shared.ts', calls);

  const regularZeroDoorBounds = constraints.readStructureDimensionBounds({
    key: 'width',
    wardrobeType: 'hinged',
    doors: 0,
    allowNoMainWardrobe: true,
  });
  assert.equal(regularZeroDoorBounds.allowZero, true);
  assert.equal(field.readStructureDimensionValidationMessage('0', regularZeroDoorBounds), null);
  assert.match(field.readStructureDimensionValidationMessage('1', regularZeroDoorBounds), /40–560/);

  const regularPositiveDoorBounds = constraints.readStructureDimensionBounds({
    key: 'width',
    wardrobeType: 'hinged',
    doors: 4,
  });
  assert.equal(regularPositiveDoorBounds.allowZero, false);
  assert.match(field.readStructureDimensionValidationMessage('0', regularPositiveDoorBounds), /40–560/);

  const cornerZeroDoorBounds = constraints.readStructureCornerDimensionBounds('cornerWidth', {
    cornerDoors: 0,
  });
  assert.equal(cornerZeroDoorBounds.allowZero, true);
  assert.equal(field.readStructureDimensionValidationMessage('0', cornerZeroDoorBounds), null);
});

test('[structure-raw-mutations] stack-split lower doors preserves 0 as a real manual value', () => {
  const calls = [];
  const mod = loadTsModule('esm/native/ui/react/tabs/structure_tab_structure_raw_mutations.ts', calls);

  mod.commitStructureRawValue({
    ...baseArgs({
      wardrobeType: 'sliding',
      getDisplayedRawValue: key => ({ stackSplitLowerDoors: 2 })[key] || 0,
    }),
    key: 'stackSplitLowerDoors',
    nextValue: 0,
  });

  const batchCall = calls.find(entry => entry[0] === 'applyStructureTemplateRecomputeBatch');
  assert.ok(batchCall);
  assert.equal(
    JSON.stringify(batchCall[1].statePatch),
    JSON.stringify({
      ui: { raw: { stackSplitLowerDoors: 0, stackSplitLowerDoorsManual: true } },
    })
  );
});

test('[stack-split] enabling with no authored lower height seeds the canonical 80cm default', () => {
  const calls = [];
  const mod = loadTsModule(
    'esm/native/ui/react/tabs/structure_tab_structure_stack_split_mutations.ts',
    calls
  );

  mod.toggleStackSplitState({
    app: { id: 'app' },
    meta: createMeta(),
    stackSplitEnabled: false,
    height: 240,
    depth: 55,
    width: 160,
    doors: 4,
    wardrobeType: 'hinged',
    stackSplitLowerHeight: 0,
    stackSplitLowerDepth: 0,
    stackSplitLowerWidth: 0,
    stackSplitLowerDoors: -1,
    stackSplitLowerDepthManual: false,
    stackSplitLowerWidthManual: false,
    stackSplitLowerDoorsManual: false,
  });

  const batchCall = calls.find(entry => entry[0] === 'applyStructureTemplateRecomputeBatch');
  assert.ok(batchCall);
  assert.equal(batchCall[1].source, 'react:structure:stackSplit:on');
  assert.equal(batchCall[1].uiPatch.stackSplitEnabled, true);
  assert.equal(batchCall[1].uiPatch.raw.stackSplitLowerHeight, 80);
  assert.equal(batchCall[1].uiPatch.raw.stackSplitLowerDepth, 50);
  assert.equal(batchCall[1].uiPatch.raw.stackSplitLowerWidth, 160);
  assert.equal(batchCall[1].uiPatch.raw.stackSplitLowerDoors, 4);
});

test('[stack-split] flags reader preserves lowerDoorsCount 0', () => {
  const calls = [];
  const mod = loadTsModule('esm/native/features/stack_split/stack_split.ts', calls);

  const split = mod.getStackSplitFromFlags({
    stackSplitActive: true,
    stackSplitLowerHeightCm: 80,
    stackSplitLowerDepthCm: 55,
    stackSplitLowerWidthCm: 160,
    stackSplitLowerDoorsCount: 0,
  });

  assert.equal(split.lowerDoorsCount, 0);
});

test('[structure-raw-mutations] chest commode mirror width follows chest width while linked automatically', () => {
  const calls = [];
  const mod = loadTsModule('esm/native/ui/react/tabs/structure_tab_structure_raw_mutations.ts', calls);

  mod.commitStructureRawValue({
    ...baseArgs({
      isChestMode: true,
      chestCommodeEnabled: true,
      chestCommodeMirrorWidthManual: false,
      getDisplayedRawValue: key => ({ width: 50 })[key] || 0,
    }),
    key: 'width',
    nextValue: 90,
  });

  const batchCall = calls.find(entry => entry[0] === 'applyStructureTemplateRecomputeBatch');
  assert.ok(batchCall);
  assert.equal(
    JSON.stringify(batchCall[1].uiPatch),
    JSON.stringify({ raw: { width: 90, chestCommodeMirrorWidthCm: 90 } })
  );
});

test('[structure-raw-mutations] chest commode mirror width stays manual when manually unlinked', () => {
  const calls = [];
  const mod = loadTsModule('esm/native/ui/react/tabs/structure_tab_structure_raw_mutations.ts', calls);

  mod.commitStructureRawValue({
    ...baseArgs({
      isChestMode: true,
      chestCommodeEnabled: true,
      chestCommodeMirrorWidthManual: true,
      getDisplayedRawValue: key => ({ width: 50 })[key] || 0,
    }),
    key: 'width',
    nextValue: 90,
  });

  const batchCall = calls.find(entry => entry[0] === 'applyStructureTemplateRecomputeBatch');
  assert.ok(batchCall);
  assert.equal(JSON.stringify(batchCall[1].uiPatch), JSON.stringify({ raw: { width: 90 } }));
});
