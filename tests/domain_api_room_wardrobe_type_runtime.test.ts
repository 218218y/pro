import test from 'node:test';
import assert from 'node:assert/strict';

import { installDomainApiRoomSection } from '../esm/native/kernel/domain_api_room_section.ts';

type AnyRec = Record<string, any>;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function mergeSlice(cur: AnyRec | undefined, patch: AnyRec | undefined): AnyRec {
  const base = cur && typeof cur === 'object' ? { ...cur } : {};
  const next = patch && typeof patch === 'object' ? patch : {};
  for (const key of Object.keys(next)) {
    const value = next[key];
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      base[key] &&
      typeof base[key] === 'object' &&
      !Array.isArray(base[key])
    ) {
      base[key] = mergeSlice(base[key], value);
    } else {
      base[key] = value;
    }
  }
  return base;
}

const CONFIG_REPLACE_KEY = '__replace';

function mergeConfigSlice(cur: AnyRec | undefined, patch: AnyRec | undefined): AnyRec {
  const base = cur && typeof cur === 'object' ? { ...cur } : {};
  const input = patch && typeof patch === 'object' ? { ...patch } : {};
  const replace = input[CONFIG_REPLACE_KEY];
  delete input[CONFIG_REPLACE_KEY];

  if (replace && typeof replace === 'object' && !Array.isArray(replace)) {
    for (const key of Object.keys(replace as AnyRec)) {
      if (!(replace as AnyRec)[key] || !Object.prototype.hasOwnProperty.call(input, key)) continue;
      base[key] = input[key];
      delete input[key];
    }
  }

  return mergeSlice(base, input);
}

function createHarness(seed?: {
  ui?: AnyRec;
  config?: AnyRec;
  runtime?: AnyRec;
  recomputeResult?: unknown;
  recomputeImpl?: ((...args: unknown[]) => unknown) | null;
}) {
  const state: AnyRec = {
    ui: mergeSlice(
      {
        raw: { width: 160, height: 240, depth: 55, doors: 4 },
        currentFloorType: 'parquet',
      },
      seed?.ui || {}
    ),
    config: mergeSlice({ wardrobeType: 'hinged' }, seed?.config || {}),
    runtime: mergeSlice({}, seed?.runtime || {}),
  };

  const recomputeCalls: any[] = [];
  const builderCalls: any[] = [];
  const patchCalls: any[] = [];
  const reports: any[] = [];

  const store = {
    getState: () => state,
    patch: (patch: AnyRec) => {
      for (const slice of ['ui', 'config', 'runtime'] as const) {
        if (patch && patch[slice] && typeof patch[slice] === 'object') {
          state[slice] =
            slice === 'config'
              ? mergeConfigSlice(state.config, patch.config)
              : mergeSlice(state[slice], patch[slice]);
        }
      }
      return patch;
    },
    setUi: (patch: AnyRec) => {
      state.ui = mergeSlice(state.ui, patch);
      return patch;
    },
    setConfig: (patch: AnyRec) => {
      const useSnapshot = !!(patch && patch.__snapshot);
      if (useSnapshot) {
        const next = { ...patch };
        delete next.__snapshot;
        state.config = clone(next);
      } else {
        state.config = mergeConfigSlice(state.config, patch);
      }
      return patch;
    },
    setRuntime: (patch: AnyRec) => {
      state.runtime = mergeSlice(state.runtime, patch);
      return patch;
    },
  };

  const actions: AnyRec = {
    patch: (patch: AnyRec, meta?: AnyRec) => {
      patchCalls.push([patch, meta]);
      return store.patch(patch);
    },
    room: {},
    ui: {
      patch: (patch: AnyRec) => {
        state.ui = mergeSlice(state.ui, patch);
        return patch;
      },
      patchSoft: (patch: AnyRec) => {
        state.ui = mergeSlice(state.ui, patch);
        return patch;
      },
    },
    runtime: {
      patch: (patch: AnyRec) => {
        state.runtime = mergeSlice(state.runtime, patch);
        return patch;
      },
      setScalar: (key: string, value: unknown) => {
        state.runtime[key] = value;
        return value;
      },
    },
    setCfgScalar: (key: string, value: unknown) => {
      state.config[key] = value;
      return value;
    },
  };

  const modulesActions = {
    recomputeFromUi: (...args: unknown[]) => {
      recomputeCalls.push(args);
      if (typeof seed?.recomputeImpl === 'function') return seed.recomputeImpl(...args);
      if (Object.prototype.hasOwnProperty.call(seed || {}, 'recomputeResult')) return seed?.recomputeResult;
    },
  };
  actions.modules = modulesActions;

  const App: AnyRec = {
    store,
    actions,
    services: {
      builder: {
        requestBuild(uiOverride: unknown, meta: unknown) {
          builderCalls.push([uiOverride, meta]);
          return true;
        },
      },
    },
  };
  const select: AnyRec = { room: {} };
  const roomActions = actions.room;

  installDomainApiRoomSection({
    App,
    select,
    actions,
    roomActions,
    modulesActions,
    _cfg: () => state.config,
    _ui: () => state.ui,
    _rt: () => state.runtime,
    _captureConfigSnapshot: () => clone(state.config),
    _ensureObj: (x: unknown) => (x && typeof x === 'object' && !Array.isArray(x) ? (x as AnyRec) : {}),
    _meta: (meta: unknown, source: string) => ({ ...((meta as AnyRec) || {}), source }),
    _metaNoBuild: (_actions: unknown, meta: unknown, source: string) => ({
      ...((meta as AnyRec) || {}),
      source,
    }),
    _metaNoBuildNoHistory: (_actions: unknown, meta: unknown, source: string) => ({
      ...((meta as AnyRec) || {}),
      source,
    }),
    _domainApiReportNonFatal: (_App: unknown, label: string, error: unknown) => {
      reports.push([label, error]);
    },
  });

  return { state, actions, select, recomputeCalls, builderCalls, patchCalls, reports };
}

test('room wardrobe type runtime: first switch to sliding uses sliding defaults instead of reusing hinged door count', () => {
  const h = createHarness({
    ui: {
      raw: { width: 160, height: 240, depth: 55, doors: 4 },
    },
    config: { wardrobeType: 'hinged', isManualWidth: true },
  });

  h.actions.room.setWardrobeType('sliding');

  assert.equal(h.state.config.wardrobeType, 'sliding');
  assert.equal(h.state.config.isManualWidth, false);
  assert.equal(h.state.ui.raw.doors, 2);
  assert.equal(h.state.ui.raw.width, 160);
  assert.equal(h.state.ui.raw.depth, 60);
  assert.equal(h.recomputeCalls.length, 1);
  assert.equal((h.recomputeCalls[0]?.[1] as AnyRec)?.source, 'actions:room:setWardrobeType:recompute');
  assert.equal((h.recomputeCalls[0]?.[1] as AnyRec)?.force, true);
  assert.equal((h.recomputeCalls[0]?.[2] as AnyRec)?.structureChanged, true);
  assert.equal((h.recomputeCalls[0]?.[2] as AnyRec)?.preserveTemplate, true);
  assert.equal((h.recomputeCalls[0]?.[2] as AnyRec)?.anchorSide, 'left');
  assert.equal(h.state.runtime.wardrobeTypeProfiles.hinged.ui.raw.doors, 4);
  assert.equal(h.reports.length, 0);
  assert.equal(h.builderCalls.length, 0);
});

test('room wardrobe type runtime: switching a leg-base wardrobe to sliding resets platform mode to plain', () => {
  const h = createHarness({
    ui: {
      raw: { width: 160, height: 240, depth: 55, doors: 4 },
      baseType: 'legs',
      baseLegPlatformMode: 'stage',
    },
    config: { wardrobeType: 'hinged', isManualWidth: true },
  });

  h.actions.room.setWardrobeType('sliding');

  assert.equal(h.state.config.wardrobeType, 'sliding');
  assert.equal(h.state.ui.baseType, 'legs');
  assert.equal(h.state.ui.baseLegPlatformMode, 'plain');
  assert.equal(h.state.ui.raw.doors, 2);
});

test('room wardrobe type runtime: leg platform selection is profiled separately for hinged and sliding wardrobes', () => {
  const h = createHarness({
    ui: {
      raw: { width: 160, height: 240, depth: 55, doors: 4 },
      baseType: 'legs',
      baseLegPlatformMode: 'stage',
      baseLegPlatformSideMode: 'overhang',
    },
    config: { wardrobeType: 'hinged', isManualWidth: true },
  });

  h.actions.room.setWardrobeType('sliding');

  assert.equal(h.state.config.wardrobeType, 'sliding');
  assert.equal(h.state.ui.baseType, 'legs');
  assert.equal(h.state.ui.baseLegPlatformMode, 'plain');
  assert.equal(h.state.runtime.wardrobeTypeProfiles.hinged.ui.baseLegPlatformMode, 'stage');

  h.actions.room.setWardrobeType('hinged');

  assert.equal(h.state.config.wardrobeType, 'hinged');
  assert.equal(h.state.ui.baseType, 'legs');
  assert.equal(h.state.ui.baseLegPlatformMode, 'stage');
  assert.equal(h.state.runtime.wardrobeTypeProfiles.sliding.ui.baseLegPlatformMode, 'plain');

  h.state.ui.baseLegPlatformMode = 'plain';
  h.actions.room.setWardrobeType('sliding');

  assert.equal(h.state.config.wardrobeType, 'sliding');
  assert.equal(h.state.ui.baseLegPlatformMode, 'plain');

  h.actions.room.setWardrobeType('hinged');

  assert.equal(h.state.config.wardrobeType, 'hinged');
  assert.equal(h.state.ui.baseLegPlatformMode, 'plain');
});

test('room wardrobe type runtime: undefined recompute results stay handled and do not force a recovery build', () => {
  const h = createHarness({
    ui: { raw: { width: 160, height: 240, depth: 55, doors: 4 } },
    config: { wardrobeType: 'hinged' },
    recomputeResult: undefined,
  });

  h.actions.room.setWardrobeType('sliding');

  assert.equal(h.recomputeCalls.length, 1);
  assert.equal(h.builderCalls.length, 0);
});

test('room wardrobe type runtime: explicit recompute rejection requests a forced recovery rebuild', () => {
  const h = createHarness({
    ui: { raw: { width: 160, height: 240, depth: 55, doors: 4 } },
    config: { wardrobeType: 'hinged' },
    recomputeResult: false,
  });

  h.actions.room.setWardrobeType('sliding');

  assert.equal(h.recomputeCalls.length, 1);
  assert.deepEqual(h.builderCalls, [
    [
      null,
      {
        source: 'actions:room:setWardrobeType:recomputeRecovery',
        reason: 'wardrobeType:init',
        immediate: true,
        force: true,
      },
    ],
  ]);
});

test('room wardrobe type runtime: explicit recompute failure result requests a forced recovery rebuild', () => {
  const h = createHarness({
    runtime: {
      wardrobeTypeProfiles: {
        sliding: {
          cfg: { isManualWidth: false },
          ui: { raw: { width: 240, height: 240, depth: 60, doors: 3 } },
        },
      },
    },
    recomputeResult: { ok: false, reason: 'writeFailed' },
  });

  h.actions.room.setWardrobeType('sliding');

  assert.equal(h.recomputeCalls.length, 1);
  assert.deepEqual(h.builderCalls, [
    [
      null,
      {
        source: 'actions:room:setWardrobeType:recomputeRecovery',
        reason: 'wardrobeType:restore',
        immediate: true,
        force: true,
      },
    ],
  ]);
});

test('room wardrobe type runtime: restores saved target profile when switching types again', () => {
  const h = createHarness({
    ui: {
      raw: { width: 160, height: 240, depth: 55, doors: 4 },
      currentFloorType: 'tiles',
    },
    config: { wardrobeType: 'hinged' },
    runtime: {
      wardrobeTypeProfiles: {
        sliding: {
          cfg: { isManualWidth: false },
          ui: {
            raw: { width: 240, height: 240, depth: 60, doors: 3 },
            currentFloorType: 'parquet',
          },
        },
      },
    },
  });

  h.actions.room.setWardrobeType('sliding');

  assert.equal(h.state.config.wardrobeType, 'sliding');
  assert.equal(h.state.ui.raw.doors, 3);
  assert.equal(h.state.ui.raw.width, 240);
  assert.equal(h.state.ui.raw.depth, 60);
  assert.equal(h.state.ui.currentFloorType, 'parquet');
  assert.equal(h.recomputeCalls.length, 1);
  assert.equal((h.recomputeCalls[0]?.[1] as AnyRec)?.source, 'actions:room:setWardrobeType:recompute');
  assert.equal((h.recomputeCalls[0]?.[1] as AnyRec)?.force, true);
  assert.equal((h.recomputeCalls[0]?.[2] as AnyRec)?.structureChanged, true);
  assert.equal((h.recomputeCalls[0]?.[2] as AnyRec)?.preserveTemplate, true);
  assert.equal((h.recomputeCalls[0]?.[2] as AnyRec)?.anchorSide, 'left');
  assert.equal(h.state.runtime.wardrobeTypeProfiles.hinged.ui.raw.doors, 4);
  assert.equal(h.reports.length, 0);
});

test('room wardrobe type runtime: saved wardrobe profiles are canonicalized and detached', () => {
  const seededModules = [
    { layout: 'shelves', doors: 2 },
    { layout: 'drawers', extDrawersCount: '3' as any },
  ];
  const seededLower = [null as any, { layout: 'drawers', extDrawersCount: '2' as any }];
  const seededCorner = {
    modulesConfiguration: [null as any, { layout: 'hanging' }],
    stackSplitLower: { modulesConfiguration: [null as any, { layout: 'drawers' }] },
  };

  const h = createHarness({
    ui: {
      raw: { width: 200, height: 240, depth: 55, doors: 5, singleDoorPos: 'right' },
    },
    config: {
      wardrobeType: 'hinged',
      modulesConfiguration: seededModules,
      stackSplitLowerModulesConfiguration: seededLower,
      cornerConfiguration: seededCorner,
    },
  });

  h.actions.room.setWardrobeType('sliding');

  const saved = h.state.runtime.wardrobeTypeProfiles.hinged.cfg;
  const savedTop = Array.isArray(saved.modulesConfiguration) ? saved.modulesConfiguration : [];
  const savedLower = Array.isArray(saved.stackSplitLowerModulesConfiguration)
    ? saved.stackSplitLowerModulesConfiguration
    : [];
  const savedCorner =
    saved.cornerConfiguration && typeof saved.cornerConfiguration === 'object'
      ? (saved.cornerConfiguration as AnyRec)
      : {};
  const savedCornerTop = Array.isArray(savedCorner.modulesConfiguration)
    ? savedCorner.modulesConfiguration
    : [];
  const savedCornerLower =
    savedCorner.stackSplitLower && typeof savedCorner.stackSplitLower === 'object'
      ? (savedCorner.stackSplitLower as AnyRec)
      : {};
  const savedCornerLowerMods = Array.isArray(savedCornerLower.modulesConfiguration)
    ? savedCornerLower.modulesConfiguration
    : [];

  assert.equal(savedTop.length, 3);
  assert.equal(savedTop[0].doors, 2);
  assert.equal(savedTop[1].doors, 2);
  assert.equal(savedTop[2].doors, 1);
  assert.equal(savedTop[1].extDrawersCount, 3);
  assert.equal(savedLower.length, 2);
  assert.equal(savedLower[1].extDrawersCount, 2);
  assert.equal(savedCornerTop.length, 2);
  assert.equal(savedCornerLowerMods.length, 2);

  seededModules[0].layout = 'mutated';
  (seededLower[1] as AnyRec).layout = 'mutated-lower';
  (seededCorner.modulesConfiguration[1] as AnyRec).layout = 'mutated-corner';

  assert.equal(savedTop[0].layout, 'shelves');
  assert.equal(savedLower[1].layout, 'drawers');
  assert.equal(savedCornerTop[1].layout, 'hanging');
  assert.equal(h.reports.length, 0);
});

test('room wardrobe type runtime: first switch to unsaved sliding resets active structural config', () => {
  const h = createHarness({
    ui: { raw: { width: 200, height: 240, depth: 55, doors: 4 } },
    config: {
      wardrobeType: 'hinged',
      modulesConfiguration: [
        {
          layout: 'shelves',
          sketchExtras: {
            extDrawers: [{ id: 'sed-top', yNorm: 0.35, count: 3 }],
            drawers: [{ id: 'sid-top', yNorm: 0.7 }],
            shelves: [{ id: 'shelf-top', yNorm: 0.5 }],
          },
        },
        {
          layout: 'hanging_top2',
          sketchExtras: {
            extDrawers: [{ id: 'sed-box-host', yNorm: 0.3, count: 2 }],
            boxes: [
              {
                id: 'box-with-ext-drawers',
                yNorm: 0.45,
                extDrawers: [{ id: 'box-sed', yNorm: 0.4, count: 2 }],
                drawers: [{ id: 'box-sid', yNorm: 0.7 }],
              },
            ],
          },
        },
      ],
      stackSplitLowerModulesConfiguration: [
        { sketchExtras: { extDrawers: [{ id: 'sed-lower', yNorm: 0.4, count: 1 }] } },
      ],
      cornerConfiguration: {
        modulesConfiguration: [
          { sketchExtras: { extDrawers: [{ id: 'sed-corner-top', yNorm: 0.4, count: 1 }] } },
        ],
        stackSplitLower: {
          modulesConfiguration: [
            { sketchExtras: { extDrawers: [{ id: 'sed-corner-lower', yNorm: 0.4, count: 1 }] } },
          ],
        },
      },
    },
  });

  h.actions.room.setWardrobeType('sliding');

  const savedHinged = h.state.runtime.wardrobeTypeProfiles.hinged.cfg as AnyRec;

  assert.equal(h.state.config.wardrobeType, 'sliding');
  assert.deepEqual(h.state.config.modulesConfiguration, []);
  assert.deepEqual(h.state.config.stackSplitLowerModulesConfiguration, []);
  assert.equal((h.state.config.cornerConfiguration as AnyRec).modulesConfiguration, undefined);
  assert.equal((h.state.config.cornerConfiguration as AnyRec).stackSplitLower, undefined);

  assert.equal(savedHinged.modulesConfiguration[0].sketchExtras.extDrawers.length, 1);
  assert.equal(savedHinged.modulesConfiguration[0].sketchExtras.drawers.length, 1);
  assert.equal(savedHinged.modulesConfiguration[1].sketchExtras.boxes[0].extDrawers.length, 1);
  assert.equal(savedHinged.modulesConfiguration[1].sketchExtras.boxes[0].drawers.length, 1);
  assert.equal(h.reports.length, 0);
});

test('room wardrobe type runtime: saved sliding profile keeps both internal drawer cells across type switches', () => {
  const h = createHarness({
    ui: { raw: { width: 160, height: 240, depth: 60, doors: 2 } },
    config: {
      wardrobeType: 'sliding',
      modulesConfiguration: [
        {
          doors: 1,
          layout: 'shelves',
          sketchExtras: { drawers: [{ id: 'left-internal', yNorm: 0.35 }] },
        },
        {
          doors: 1,
          layout: 'hanging_top2',
          sketchExtras: { drawers: [{ id: 'right-internal', yNorm: 0.65 }] },
        },
      ],
    },
  });

  h.actions.room.setWardrobeType('hinged');

  assert.equal(h.state.config.wardrobeType, 'hinged');
  assert.deepEqual(h.state.config.modulesConfiguration, []);

  h.actions.room.setWardrobeType('sliding');

  const top = h.state.config.modulesConfiguration as AnyRec[];
  assert.equal(h.state.config.wardrobeType, 'sliding');
  assert.equal(top.length, 2);
  assert.deepEqual(
    top.map(entry => entry.doors),
    [1, 1]
  );
  assert.deepEqual(top[0].sketchExtras.drawers, [{ id: 'left-internal', yNorm: 0.35 }]);
  assert.deepEqual(top[1].sketchExtras.drawers, [{ id: 'right-internal', yNorm: 0.65 }]);
  assert.equal(h.reports.length, 0);
});

test('room wardrobe type runtime: restoring a sliding profile strips legacy sketch external drawers', () => {
  const h = createHarness({
    ui: { raw: { width: 160, height: 240, depth: 55, doors: 4 } },
    config: { wardrobeType: 'hinged' },
    runtime: {
      wardrobeTypeProfiles: {
        sliding: {
          cfg: {
            isManualWidth: false,
            modulesConfiguration: [
              {
                layout: 'shelves',
                sketchExtras: {
                  extDrawers: [{ id: 'legacy-sed', yNorm: 0.35, count: 3 }],
                  shelves: [{ id: 'legacy-shelf', yNorm: 0.5 }],
                },
              },
            ],
            stackSplitLowerModulesConfiguration: [
              { sketchExtras: { extDrawers: [{ id: 'legacy-lower-sed', yNorm: 0.5, count: 2 }] } },
            ],
          },
          ui: { raw: { width: 240, height: 240, depth: 60, doors: 2 } },
        },
      },
    },
  });

  h.actions.room.setWardrobeType('sliding');

  const top = h.state.config.modulesConfiguration as AnyRec[];
  const lower = h.state.config.stackSplitLowerModulesConfiguration as AnyRec[];

  assert.equal(h.state.config.wardrobeType, 'sliding');
  assert.equal(top[0].sketchExtras.extDrawers, undefined);
  assert.deepEqual(top[0].sketchExtras.shelves, [{ id: 'legacy-shelf', yNorm: 0.5 }]);
  assert.equal(lower[0].sketchExtras, undefined);
  assert.equal(h.recomputeCalls.length, 1);
  assert.equal(h.reports.length, 0);
});

test('room wardrobe type runtime: saving wardrobe profile keeps valid nested ui branches when stringify fallback is needed', () => {
  const liveFloorStyles = {
    wood: { label: 'oak', nested: { tone: 'warm' } },
    bad: { amount: BigInt(7) },
  } as AnyRec;

  const h = createHarness({
    ui: {
      raw: {
        width: 200,
        height: 240,
        depth: 55,
        doors: 5,
        lastSelectedFloorStyleIdByType: liveFloorStyles,
      },
    },
    config: { wardrobeType: 'hinged' },
  });

  h.actions.room.setWardrobeType('sliding');

  const savedUi = h.state.runtime.wardrobeTypeProfiles.hinged.ui as AnyRec;
  const savedFloorStyles = (savedUi.raw?.lastSelectedFloorStyleIdByType || {}) as AnyRec;

  assert.equal(savedFloorStyles.wood.label, 'oak');
  assert.equal(savedFloorStyles.wood.nested.tone, 'warm');
  assert.equal('bad' in savedFloorStyles, false);

  liveFloorStyles.wood.nested.tone = 'mutated';

  assert.equal(savedFloorStyles.wood.nested.tone, 'warm');
  assert.equal(h.reports.length, 1);
  assert.equal(h.reports[0][0], 'domain_api_room:safeCloneProfileSnapshot');
});

test('room wardrobe type runtime: restoring legacy wardrobe profile rematerializes top/lower/corner config', () => {
  const h = createHarness({
    ui: {
      raw: { width: 160, height: 240, depth: 55, doors: 4, singleDoorPos: 'left' },
    },
    config: { wardrobeType: 'hinged' },
    runtime: {
      wardrobeTypeProfiles: {
        sliding: {
          cfg: {
            isManualWidth: false,
            modulesConfiguration: [{ layout: 'drawers', extDrawersCount: '4' }],
            stackSplitLowerModulesConfiguration: [null, { layout: 'drawers', extDrawersCount: '2' }],
            cornerConfiguration: {
              modulesConfiguration: [null, { layout: 'hanging' }],
              stackSplitLower: { modulesConfiguration: [null, { layout: 'drawers' }] },
            },
          },
          ui: {
            raw: { width: 240, height: 240, depth: 60, doors: 5, singleDoorPos: 'right' },
            currentFloorType: 'parquet',
          },
        },
      },
    },
  });

  h.actions.room.setWardrobeType('sliding');

  const top = Array.isArray(h.state.config.modulesConfiguration) ? h.state.config.modulesConfiguration : [];
  const lower = Array.isArray(h.state.config.stackSplitLowerModulesConfiguration)
    ? h.state.config.stackSplitLowerModulesConfiguration
    : [];
  const corner =
    h.state.config.cornerConfiguration && typeof h.state.config.cornerConfiguration === 'object'
      ? (h.state.config.cornerConfiguration as AnyRec)
      : {};
  const cornerTop = Array.isArray(corner.modulesConfiguration) ? corner.modulesConfiguration : [];
  const cornerLower =
    corner.stackSplitLower && typeof corner.stackSplitLower === 'object'
      ? (corner.stackSplitLower as AnyRec)
      : {};
  const cornerLowerMods = Array.isArray(cornerLower.modulesConfiguration)
    ? cornerLower.modulesConfiguration
    : [];

  assert.equal(h.state.config.wardrobeType, 'sliding');
  assert.equal(top.length, 5);
  assert.deepEqual(
    top.map(entry => entry.doors),
    [1, 1, 1, 1, 1]
  );
  assert.equal(top[0].extDrawersCount, 4);
  assert.equal(lower.length, 2);
  assert.equal(lower[1].extDrawersCount, 2);
  assert.equal(cornerTop.length, 2);
  assert.equal(cornerLowerMods.length, 2);
  assert.equal(h.state.ui.raw.doors, 5);
  assert.equal(h.state.ui.currentFloorType, 'parquet');
  assert.equal(h.recomputeCalls.length, 1);
  assert.equal(h.reports.length, 0);
});

test('room wardrobe type runtime: no-main sketch state blocks direct sliding transition before recompute', () => {
  const h = createHarness({
    ui: { raw: { width: 0, height: 240, depth: 55, doors: 0 } },
    config: { wardrobeType: 'hinged' },
    runtime: {
      wardrobeTypeProfiles: {
        sliding: {
          cfg: { isManualWidth: false },
          ui: { raw: { width: 240, height: 240, depth: 60, doors: 3 } },
        },
      },
    },
  });

  assert.equal(h.actions.room.setWardrobeType('sliding'), 'hinged');

  assert.equal(h.state.config.wardrobeType, 'hinged');
  assert.equal(h.state.ui.raw.doors, 0);
  assert.equal(h.state.ui.raw.width, 0);
  assert.equal(h.recomputeCalls.length, 0);
  assert.equal(h.builderCalls.length, 0);
  assert.equal(h.patchCalls.length, 0);
  assert.equal(h.reports.length, 0);
});

test('room wardrobe type runtime: same-type switches short-circuit without recompute or root patch churn', () => {
  const h = createHarness({
    ui: { raw: { width: 160, height: 240, depth: 55, doors: 4 } },
    config: { wardrobeType: 'hinged' },
  });

  h.actions.room.setWardrobeType('hinged');

  assert.equal(h.recomputeCalls.length, 0);
  assert.equal(h.builderCalls.length, 0);
  assert.equal(h.patchCalls.length, 0);
  assert.equal(h.reports.length, 0);
});

test('room wardrobe type runtime: init path collapses wardrobe type + ui defaults into one canonical root patch', () => {
  const h = createHarness({
    ui: { raw: { width: 160, height: 240, depth: 55, doors: 4 } },
    config: { wardrobeType: 'hinged', isManualWidth: true },
  });

  h.actions.room.setWardrobeType('sliding');

  assert.equal(h.patchCalls.length, 1);
  const [patch, meta] = h.patchCalls[0];
  assert.deepEqual(patch.config, {
    wardrobeType: 'sliding',
    isManualWidth: false,
    modulesConfiguration: [],
    stackSplitLowerModulesConfiguration: [],
    cornerConfiguration: {},
    __replace: {
      modulesConfiguration: true,
      stackSplitLowerModulesConfiguration: true,
      cornerConfiguration: true,
    },
  });
  assert.deepEqual(patch.ui, { raw: { doors: 2, width: 160, depth: 60 } });
  assert.equal(patch.runtime.doorsOpen, false);
  assert.equal(patch.runtime.drawersOpenId, null);
  assert.equal(typeof patch.runtime.doorsLastToggleTime, 'number');
  assert.deepEqual(meta, { source: 'actions:room:setWardrobeType:init' });
});

test('room wardrobe type runtime: restore path collapses wardrobe type profile config + ui into one canonical root patch', () => {
  const h = createHarness({
    ui: {
      raw: { width: 160, height: 240, depth: 55, doors: 4 },
      currentFloorType: 'tiles',
    },
    config: { wardrobeType: 'hinged' },
    runtime: {
      wardrobeTypeProfiles: {
        sliding: {
          cfg: { isManualWidth: false },
          ui: {
            raw: { width: 240, height: 240, depth: 60, doors: 3 },
            currentFloorType: 'parquet',
          },
        },
      },
    },
  });

  h.actions.room.setWardrobeType('sliding');

  assert.equal(h.patchCalls.length, 1);
  const [patch, meta] = h.patchCalls[0];
  assert.equal(meta.source, 'actions:room:setWardrobeType:restore');
  assert.equal(meta.immediate, true);
  assert.equal(patch.config.wardrobeType, 'sliding');
  assert.equal(patch.config.isManualWidth, false);
  assert.equal(patch.ui.raw.width, 240);
  assert.equal(patch.ui.raw.depth, 60);
  assert.equal(patch.ui.raw.doors, 3);
  assert.equal(patch.ui.currentFloorType, 'parquet');
  assert.equal(patch.runtime.doorsOpen, false);
  assert.equal(patch.runtime.drawersOpenId, null);
  assert.equal(typeof patch.runtime.doorsLastToggleTime, 'number');
});

test('room wardrobe type runtime: switching type clears transient door and drawer open runtime', () => {
  const h = createHarness({
    ui: { raw: { width: 160, height: 240, depth: 55, doors: 4 } },
    config: { wardrobeType: 'hinged' },
    runtime: {
      doorsOpen: true,
      drawersOpenId: 'int_4',
      wardrobeTypeProfiles: {
        sliding: {
          cfg: { isManualWidth: false },
          ui: { raw: { width: 240, height: 240, depth: 60, doors: 2 } },
        },
      },
    },
  });

  h.actions.room.setWardrobeType('sliding');

  assert.equal(h.state.config.wardrobeType, 'sliding');
  assert.equal(h.state.runtime.doorsOpen, false);
  assert.equal(h.state.runtime.drawersOpenId, null);
  assert.equal(typeof h.state.runtime.doorsLastToggleTime, 'number');
  assert.ok(h.state.runtime.wardrobeTypeProfiles.hinged);
  assert.ok(h.state.runtime.wardrobeTypeProfiles.sliding);
});
