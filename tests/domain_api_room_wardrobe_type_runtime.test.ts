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
          state[slice] = mergeSlice(state[slice], patch[slice]);
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
        state.config = mergeSlice(state.config, patch);
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
  assert.equal(top.length, 3);
  assert.equal(top[0].doors, 2);
  assert.equal(top[1].doors, 2);
  assert.equal(top[2].doors, 1);
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
  assert.deepEqual(h.patchCalls[0], [
    {
      config: { wardrobeType: 'sliding', isManualWidth: false },
      ui: { raw: { doors: 2, width: 160, depth: 60 } },
    },
    { source: 'actions:room:setWardrobeType:init' },
  ]);
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
});
