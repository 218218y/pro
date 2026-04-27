import test from 'node:test';
import assert from 'node:assert/strict';

import { readKernelSnapshotBuildState } from '../esm/native/kernel/kernel_snapshot_store_build_state.ts';
import { handleNoMainModulesRecompute } from '../esm/native/kernel/domain_api_modules_corner_recompute_no_main.ts';

type AnyRecord = Record<string, any>;

function asRecord(value: unknown, seed: AnyRecord = {}): AnyRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...seed, ...(value as AnyRecord) }
    : { ...seed };
}

function asRecordOrNull(value: unknown): AnyRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as AnyRecord) : null;
}

test('no-main modules runtime: kernel snapshot preserves detached top modules when overall doors are zero', () => {
  const sourceModules = [
    {
      id: 'top-1',
      layout: 'drawers',
      sketchExtras: {
        boxes: [{ id: 'free-a', freePlacement: true, absX: 0, widthM: 0.4 }],
      },
    },
  ];

  const App: AnyRecord = {
    store: {
      patch: () => undefined,
      getState: () => ({
        ui: {
          width: 240,
          height: 220,
          depth: 60,
          doors: 0,
          raw: { width: 240, height: 220, depth: 60, doors: 0 },
        },
        config: {
          wardrobeType: 'hinged',
          modulesConfiguration: sourceModules,
        },
        runtime: {},
        mode: { primary: 'none', opts: {} },
        meta: { dirty: false },
      }),
    },
  };

  const snapshot = readKernelSnapshotBuildState(
    {
      App: App as any,
      asRecord,
      asRecordOrNull,
      isRecord: value => !!(value && typeof value === 'object' && !Array.isArray(value)),
      reportNonFatal: () => undefined,
      captureConfig: () => ({
        wardrobeType: 'hinged',
        modulesConfiguration: [{ id: 'captured-top', doors: '9', layout: 'hanging_top2' }],
      }),
    },
    {
      ui: {
        width: 240,
        height: 220,
        depth: 60,
        doors: 0,
        raw: { width: 240, height: 220, depth: 60, doors: 0 },
      },
      config: {
        modulesConfiguration: sourceModules,
      },
    }
  );

  const top = snapshot.config.modulesConfiguration[0] as AnyRecord;
  assert.equal(top.id, 'top-1');
  assert.equal(top.layout, 'drawers');
  assert.deepEqual(top.sketchExtras, {
    boxes: [{ id: 'free-a', freePlacement: true, absX: 0, widthM: 0.4 }],
  });
  assert.notEqual(snapshot.config.modulesConfiguration, sourceModules);

  (sourceModules[0] as AnyRecord).layout = 'mutated';
  ((sourceModules[0] as AnyRecord).sketchExtras.boxes[0] as AnyRecord).id = 'changed';
  assert.equal((snapshot.config.modulesConfiguration[0] as AnyRecord).layout, 'drawers');
  assert.equal(
    (
      (
        (snapshot.config.modulesConfiguration[0] as AnyRecord).sketchExtras.boxes as AnyRecord[]
      )[0] as AnyRecord
    ).id,
    'free-a'
  );
});

test('no-main modules runtime: recompute cleans module content but still requests a builder rebuild with the incoming ui override', () => {
  const setModulesCalls: AnyRecord[] = [];
  const requestBuildCalls: AnyRecord[] = [];
  const reports: AnyRecord[] = [];
  const uiOverride = { width: 222, doors: 0 };

  const App: AnyRecord = {
    actions: {
      config: {
        setModulesConfiguration(next: unknown, meta: unknown) {
          setModulesCalls.push({ next, meta });
          return next;
        },
      },
    },
    services: {
      builder: {
        requestBuild(ui: unknown, meta: unknown) {
          requestBuildCalls.push({ ui, meta, self: this });
          return true;
        },
      },
    },
  };

  const result = handleNoMainModulesRecompute({
    App: App as any,
    runtime: {
      currentModules: [
        {
          layout: 'drawers',
          extDrawersCount: 4,
          sketchExtras: {
            boxes: [
              { id: 'free-a', freePlacement: true, absX: -0.4, widthM: 0.6 },
              { id: 'module-box', absX: 0.2, widthM: 0.5 },
            ],
            shelves: [{ id: 'shelf-1' }],
          },
        },
      ],
      meta: {
        source: 'ui:noMainRecompute',
        forceBuild: true,
      },
    } as any,
    uiOverride,
    reportNonFatal(AppArg: unknown, where: string, error: unknown, meta: unknown) {
      reports.push({ AppArg, where, error, meta });
    },
  });

  assert.equal(reports.length, 0);
  assert.equal(setModulesCalls.length, 1);
  assert.deepEqual(setModulesCalls[0].meta, {
    source: 'ui:noMainRecompute',
    forceBuild: true,
    immediate: true,
    noBuild: true,
  });
  const nextModule = (setModulesCalls[0].next as AnyRecord[])[0] as AnyRecord;
  assert.equal(nextModule.layout, 'drawers');
  assert.equal(nextModule.extDrawersCount, 4);
  assert.deepEqual(nextModule.sketchExtras, {
    boxes: [{ id: 'free-a', freePlacement: true, absX: -0.4, widthM: 0.6 }],
    shelves: [],
    storageBarriers: [],
    rods: [],
    drawers: [],
  });

  assert.equal(requestBuildCalls.length, 1);
  assert.equal(requestBuildCalls[0].ui, uiOverride);
  assert.deepEqual(requestBuildCalls[0].meta, {
    source: 'ui:noMainRecompute',
    reason: 'ui:noMainRecompute',
    immediate: true,
    force: true,
  });
  assert.equal(result.ok, true);
  assert.equal(result.updated, true);
  assert.deepEqual(result.modules, setModulesCalls[0].next);
});

test('no-main modules runtime: key-order-only module differences do not trigger a cleanup write', () => {
  const setModulesCalls: AnyRecord[] = [];
  const requestBuildCalls: AnyRecord[] = [];
  const reports: AnyRecord[] = [];
  const uiOverride = { width: 222, doors: 0 };

  const App: AnyRecord = {
    actions: {
      config: {
        setModulesConfiguration(next: unknown, meta: unknown) {
          setModulesCalls.push({ next, meta });
          return next;
        },
      },
    },
    services: {
      builder: {
        requestBuild(ui: unknown, meta: unknown) {
          requestBuildCalls.push({ ui, meta, self: this });
          return true;
        },
      },
    },
  };

  const currentModules = [
    {
      sketchExtras: {
        storageBarriers: [],
        rods: [],
        shelves: [],
        boxes: [{ widthM: 0.6, absX: -0.4, freePlacement: true, id: 'free-a' }],
        drawers: [],
      },
      extDrawersCount: 4,
      layout: 'drawers',
    },
  ];

  const result = handleNoMainModulesRecompute({
    App: App as any,
    runtime: {
      currentModules,
      meta: {
        source: 'ui:noMainRecompute',
        forceBuild: true,
      },
    } as any,
    uiOverride,
    reportNonFatal(AppArg: unknown, where: string, error: unknown, meta: unknown) {
      reports.push({ AppArg, where, error, meta });
    },
  });

  assert.equal(reports.length, 0);
  assert.equal(setModulesCalls.length, 0);
  assert.equal(requestBuildCalls.length, 1);
  assert.equal(requestBuildCalls[0].ui, uiOverride);
  assert.deepEqual(requestBuildCalls[0].meta, {
    source: 'ui:noMainRecompute',
    reason: 'ui:noMainRecompute',
    immediate: true,
    force: true,
  });
  assert.equal(result.ok, true);
  assert.equal(result.updated, false);
  assert.deepEqual(result.modules, [
    {
      layout: 'drawers',
      extDrawersCount: 4,
      sketchExtras: {
        boxes: [{ id: 'free-a', freePlacement: true, absX: -0.4, widthM: 0.6 }],
        shelves: [],
        storageBarriers: [],
        rods: [],
        drawers: [],
      },
    },
  ]);
});

test('no-main modules runtime: canonical ui-override build policy keeps fallback source and defaults force to false', () => {
  const requestBuildCalls: AnyRecord[] = [];

  const App: AnyRecord = {
    services: {
      builder: {
        requestBuild(ui: unknown, meta: unknown) {
          requestBuildCalls.push({ ui, meta, self: this });
          return true;
        },
      },
    },
  };

  const uiOverride = { width: 144, doors: 0 };

  const result = handleNoMainModulesRecompute({
    App: App as any,
    runtime: {
      currentModules: [],
      meta: {},
    } as any,
    uiOverride,
    reportNonFatal() {
      return undefined;
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.updated, false);
  assert.equal(requestBuildCalls.length, 1);
  assert.equal(requestBuildCalls[0].ui, uiOverride);
  assert.deepEqual(requestBuildCalls[0].meta, {
    source: 'modules:recompute:noMain',
    reason: 'modules:recompute:noMain',
    immediate: true,
    force: false,
  });
});

test('no-main modules runtime: toxic sketch extras do not leak live aliases into the sanitized cleanup write', () => {
  const setModulesCalls: AnyRecord[] = [];
  const requestBuildCalls: AnyRecord[] = [];
  const reports: AnyRecord[] = [];
  const uiOverride = { width: 222, doors: 0 };

  const sharedCycle: AnyRecord = { id: 'cycle-a' };
  sharedCycle.self = sharedCycle;

  const sourceModule: AnyRecord = {
    layout: 'drawers',
    extDrawersCount: 4,
    sketchExtras: {
      boxes: [
        {
          id: 'free-a',
          freePlacement: true,
          absX: -0.4,
          widthM: 0.6,
          meta: {
            label: 'keep-me',
            dirtyBigInt: BigInt(9),
            cycle: sharedCycle,
          },
        },
      ],
      shelves: [{ id: 'shelf-1' }],
    },
  };

  const App: AnyRecord = {
    actions: {
      config: {
        setModulesConfiguration(next: unknown, meta: unknown) {
          setModulesCalls.push({ next, meta });
          return next;
        },
      },
    },
    services: {
      builder: {
        requestBuild(ui: unknown, meta: unknown) {
          requestBuildCalls.push({ ui, meta, self: this });
          return true;
        },
      },
    },
  };

  const result = handleNoMainModulesRecompute({
    App: App as any,
    runtime: {
      currentModules: [sourceModule],
      meta: {
        source: 'ui:noMainRecompute',
        forceBuild: true,
      },
    } as any,
    uiOverride,
    reportNonFatal(AppArg: unknown, where: string, error: unknown, meta: unknown) {
      reports.push({ AppArg, where, error, meta });
    },
  });

  assert.equal(reports.length, 0);
  assert.equal(requestBuildCalls.length, 1);
  assert.equal(setModulesCalls.length, 1);
  assert.equal(result.updated, true);

  const nextModule = (setModulesCalls[0].next as AnyRecord[])[0] as AnyRecord;
  const nextBox = (nextModule.sketchExtras.boxes as AnyRecord[])[0] as AnyRecord;

  assert.equal(nextModule.layout, 'drawers');
  assert.equal(nextBox.id, 'free-a');
  assert.notEqual(nextBox, sourceModule.sketchExtras.boxes[0]);
  assert.notEqual(nextBox.meta, sourceModule.sketchExtras.boxes[0].meta);
  assert.deepEqual(nextBox.meta, {
    label: 'keep-me',
    cycle: { id: 'cycle-a' },
  });

  sourceModule.sketchExtras.boxes[0].meta.label = 'mutated';
  assert.equal(nextBox.meta.label, 'keep-me');
  assert.notEqual(nextBox.meta.cycle, sharedCycle);
  assert.equal('dirtyBigInt' in nextBox.meta, false);
  assert.equal('self' in nextBox.meta.cycle, false);
});

test('no-main modules runtime: cleanup prefers modulesActions.setAll when the domain modules surface is installed', () => {
  const setAllCalls: AnyRecord[] = [];
  const cfgCalls: AnyRecord[] = [];
  const requestBuildCalls: AnyRecord[] = [];

  const App: AnyRecord = {
    actions: {
      config: {
        setModulesConfiguration(next: unknown, meta: unknown) {
          cfgCalls.push({ next, meta });
          return next;
        },
      },
    },
    services: {
      builder: {
        requestBuild(ui: unknown, meta: unknown) {
          requestBuildCalls.push({ ui, meta });
          return true;
        },
      },
    },
  };

  const result = handleNoMainModulesRecompute({
    App: App as any,
    runtime: {
      currentModules: [
        { layout: 'drawers', extDrawersCount: 3, sketchExtras: { shelves: [{ id: 'shelf-1' }] } },
      ],
      meta: { source: 'ui:noMainRecompute' },
    } as any,
    uiOverride: { doors: 0 },
    modulesActions: {
      setAll(next: unknown, meta: unknown) {
        setAllCalls.push({ next, meta });
        return next;
      },
    },
    reportNonFatal() {
      return undefined;
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.updated, true);
  assert.equal(setAllCalls.length, 1);
  assert.equal(cfgCalls.length, 0);
  assert.equal(requestBuildCalls.length, 1);
  assert.deepEqual(setAllCalls[0].meta, {
    source: 'ui:noMainRecompute',
    immediate: true,
    noBuild: true,
  });
});

test('no-main modules runtime: failed cleanup write aborts follow-through and skips builder rebuild', () => {
  const reports: AnyRecord[] = [];
  const requestBuildCalls: AnyRecord[] = [];

  const App: AnyRecord = {
    actions: {
      config: {
        setModulesConfiguration() {
          throw new Error('cfg exploded');
        },
      },
    },
    services: {
      builder: {
        requestBuild(ui: unknown, meta: unknown) {
          requestBuildCalls.push({ ui, meta });
          return true;
        },
      },
    },
  };

  const result = handleNoMainModulesRecompute({
    App: App as any,
    runtime: {
      currentModules: [
        { layout: 'drawers', extDrawersCount: 3, sketchExtras: { shelves: [{ id: 'shelf-1' }] } },
      ],
      meta: { source: 'ui:noMainRecompute' },
    } as any,
    uiOverride: { doors: 0 },
    reportNonFatal(AppArg: unknown, where: string, error: unknown, meta: unknown) {
      reports.push({ AppArg, where, error, meta });
    },
  });

  assert.deepEqual(result, { ok: false, reason: 'writeFailed' });
  assert.equal(requestBuildCalls.length, 0);
  assert.equal(reports.length, 1);
  assert.equal(reports[0].where, 'actions.modules.recomputeFromUi.noMainCleanup');
  assert.deepEqual(reports[0].meta, { throttleMs: 6000 });
});

test('no-main modules runtime: skipBuild suppresses rebuild follow-through while still writing sanitized modules', () => {
  const setModulesCalls: AnyRecord[] = [];
  const requestBuildCalls: AnyRecord[] = [];
  const reports: AnyRecord[] = [];
  const uiOverride = { width: 222, doors: 0 };

  const App: AnyRecord = {
    actions: {
      config: {
        setModulesConfiguration(next: unknown, meta: unknown) {
          setModulesCalls.push({ next, meta });
          return next;
        },
      },
    },
    services: {
      builder: {
        requestBuild(ui: unknown, meta: unknown) {
          requestBuildCalls.push({ ui, meta, self: this });
          return true;
        },
      },
    },
  };

  const result = handleNoMainModulesRecompute({
    App: App as any,
    runtime: {
      currentModules: [
        {
          layout: 'drawers',
          extDrawersCount: 4,
          sketchExtras: {
            boxes: [{ id: 'free-a', freePlacement: true, absX: -0.4, widthM: 0.6 }],
            shelves: [{ id: 'shelf-1' }],
          },
        },
      ],
      meta: {
        source: 'ui:noMainRecompute',
        forceBuild: true,
      },
      options: {
        skipBuild: true,
      },
    } as any,
    uiOverride,
    reportNonFatal(AppArg: unknown, where: string, error: unknown, meta: unknown) {
      reports.push({ AppArg, where, error, meta });
    },
  });

  assert.equal(reports.length, 0);
  assert.equal(setModulesCalls.length, 1);
  assert.equal(requestBuildCalls.length, 0);
  assert.equal(result.ok, true);
  assert.equal(result.updated, true);
});

test('no-main modules runtime: meta noBuild suppresses follow-through rebuilds unless forceBuild is present', () => {
  const requestBuildCalls: AnyRecord[] = [];

  const App: AnyRecord = {
    actions: {
      config: {
        setModulesConfiguration() {
          return undefined;
        },
      },
    },
    services: {
      builder: {
        requestBuild(ui: unknown, meta: unknown) {
          requestBuildCalls.push({ ui, meta, self: this });
          return true;
        },
      },
    },
  };

  const suppressed = handleNoMainModulesRecompute({
    App: App as any,
    runtime: {
      currentModules: [],
      meta: {
        source: 'ui:noMainRecompute',
        noBuild: true,
      },
    } as any,
    uiOverride: { doors: 0 },
    reportNonFatal() {
      return undefined;
    },
  });

  assert.equal(suppressed.ok, true);
  assert.equal(requestBuildCalls.length, 0);

  const forced = handleNoMainModulesRecompute({
    App: App as any,
    runtime: {
      currentModules: [],
      meta: {
        source: 'ui:noMainRecompute',
        noBuild: true,
        forceBuild: true,
      },
    } as any,
    uiOverride: { doors: 0 },
    reportNonFatal() {
      return undefined;
    },
  });

  assert.equal(forced.ok, true);
  assert.equal(requestBuildCalls.length, 1);
  assert.deepEqual(requestBuildCalls[0].meta, {
    source: 'ui:noMainRecompute',
    reason: 'ui:noMainRecompute',
    noBuild: true,
    immediate: true,
    force: true,
  });
});

test('no-main modules runtime: forceRebuild upgrades follow-through build requests even when upstream meta force is false', () => {
  const requestBuildCalls: AnyRecord[] = [];
  const reports: AnyRecord[] = [];
  const uiOverride = { width: 222, doors: 0 };

  const App: AnyRecord = {
    actions: {
      config: {
        setModulesConfiguration() {
          return undefined;
        },
      },
    },
    services: {
      builder: {
        requestBuild(ui: unknown, meta: unknown) {
          requestBuildCalls.push({ ui, meta, self: this });
          return true;
        },
      },
    },
  };

  const result = handleNoMainModulesRecompute({
    App: App as any,
    runtime: {
      currentModules: [],
      meta: {
        source: 'ui:noMainRecompute',
        force: false,
      },
      options: {
        forceRebuild: true,
      },
    } as any,
    uiOverride,
    reportNonFatal(AppArg: unknown, where: string, error: unknown, meta: unknown) {
      reports.push({ AppArg, where, error, meta });
    },
  });

  assert.equal(reports.length, 0);
  assert.equal(requestBuildCalls.length, 1);
  assert.deepEqual(requestBuildCalls[0].meta, {
    source: 'ui:noMainRecompute',
    reason: 'ui:noMainRecompute',
    immediate: true,
    force: true,
  });
  assert.equal(result.ok, true);
});
