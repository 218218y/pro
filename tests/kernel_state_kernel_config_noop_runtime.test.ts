import test from 'node:test';
import assert from 'node:assert/strict';

import { installKernelStateKernelConfigSurface } from '../esm/native/kernel/kernel_state_kernel_config.ts';
import { extractConfigPatchWriteMetadata } from '../esm/native/runtime/cfg_access_core.ts';

type AnyRecord = Record<string, unknown>;

type Harness = {
  App: any;
  __sk: any;
  state: { ui: AnyRecord; config: AnyRecord; runtime: AnyRecord; mode: AnyRecord; meta: AnyRecord };
  writes: Array<{ patch: AnyRecord; meta: AnyRecord }>;
  commits: AnyRecord[];
  buildCalls: AnyRecord[];
  autosaveCalls: number;
};

function asRecord(value: unknown, fallback: AnyRecord = {}): AnyRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as AnyRecord) : fallback;
}

function cloneValue<T>(value: T): T {
  try {
    return structuredClone(value);
  } catch {
    return value;
  }
}

function applyConfigPatchToState(target: AnyRecord, patchObj: AnyRecord): void {
  const { clean, replace, snapshot } = extractConfigPatchWriteMetadata(patchObj);
  if (snapshot) {
    for (const key of Object.keys(target)) delete target[key];
  }
  for (const [key, value] of Object.entries(clean)) {
    if (replace?.[key]) target[key] = cloneValue(value);
    else target[key] = value;
  }
}

function createHarness(initialConfig: AnyRecord): Harness {
  const state = {
    ui: {},
    config: cloneValue(initialConfig) || {},
    runtime: {},
    mode: {},
    meta: { dirty: false, version: 1, updatedAt: 0 },
  };
  const writes: Array<{ patch: AnyRecord; meta: AnyRecord }> = [];
  const commits: AnyRecord[] = [];
  const buildCalls: AnyRecord[] = [];
  let autosaveCalls = 0;
  const App: any = {
    store: {
      getState: () => state,
      patch: () => true,
    },
    services: {
      builder: {
        requestBuild(_ui: unknown, meta?: unknown) {
          buildCalls.push(asRecord(meta));
          return true;
        },
      },
      autosave: {
        schedule() {
          autosaveCalls += 1;
          return true;
        },
      },
    },
  };
  const __sk: any = {
    commit(meta?: unknown) {
      commits.push(asRecord(meta));
    },
  };

  installKernelStateKernelConfigSurface({
    App,
    __sk,
    asMeta: meta => asRecord(meta),
    asRecord,
    isRecord: (value): value is AnyRecord => !!value && typeof value === 'object' && !Array.isArray(value),
    isFn: (value): value is (...args: unknown[]) => unknown => typeof value === 'function',
    cloneKernelValue: (_App, value, fallback) => {
      if (typeof value === 'undefined') return fallback;
      return cloneValue(value);
    },
    setStoreConfigPatch: (_App, patch, meta) => {
      writes.push({ patch: asRecord(patch), meta: asRecord(meta) });
      applyConfigPatchToState(state.config, asRecord(patch));
      return true;
    },
    asString: value => String(value ?? ''),
    readCornerCfgFromStoreConfig: cfg => asRecord(asRecord(cfg).cornerConfiguration),
    readLowerCornerCfgFromCornerCfg: cornerCfg => {
      const lower = asRecord(cornerCfg).lower;
      return lower && typeof lower === 'object' && !Array.isArray(lower) ? (lower as AnyRecord) : null;
    },
  });

  return {
    App,
    __sk,
    state,
    writes,
    commits,
    buildCalls,
    get autosaveCalls() {
      return autosaveCalls;
    },
    set autosaveCalls(_value: number) {
      autosaveCalls = _value;
    },
  } as Harness;
}

test('kernel_state_kernel_config maps skip write/commit/build/autosave churn for unchanged canonical patches', () => {
  const h = createHarness({
    groovesMap: { groove_d1: true },
    savedColors: [{ id: 'c1', value: '#111' }],
    colorSwatchesOrder: ['c1'],
  });

  h.__sk.patchConfigMaps(
    {
      groovesMap: { groove_d1: true },
      savedColors: [{ id: 'c1', value: '#111' }],
      colorSwatchesOrder: [' c1 '],
    },
    { source: 'test:no-op-config' }
  );

  assert.equal(h.writes.length, 0);
  assert.equal(h.commits.length, 0);
  assert.equal(h.buildCalls.length, 0);
  assert.equal(h.autosaveCalls, 0);
});

test('kernel_state_kernel_config maps still request force builds for unchanged patches without persisting churn', () => {
  const h = createHarness({ groovesMap: { groove_d1: true } });

  h.__sk.patchConfigMaps({ groovesMap: { groove_d1: true } }, { source: 'test:force-only', force: true });

  assert.equal(h.writes.length, 0);
  assert.equal(h.commits.length, 0);
  assert.equal(h.autosaveCalls, 0);
  assert.equal(h.buildCalls.length, 1);
  assert.equal(h.buildCalls[0].source, 'test:force-only');
  assert.equal(h.buildCalls[0].reason, 'test:force-only');
  assert.equal(h.buildCalls[0].immediate, false);
  assert.equal(h.buildCalls[0].force, true);
});

test('kernel_state_kernel_config maps still write, commit, build, and autosave when canonical config changed', () => {
  const h = createHarness({
    groovesMap: { groove_d1: true },
    savedColors: [{ id: 'c1', value: '#111' }],
    colorSwatchesOrder: ['c1'],
  });

  h.__sk.patchConfigMaps(
    {
      groovesMap: { groove_d2: true },
      savedColors: [{ id: 'c2', value: '#222' }],
      colorSwatchesOrder: ['c2'],
    },
    { source: 'test:changed-config', immediate: true }
  );

  assert.equal(h.writes.length, 1);
  assert.equal(h.commits.length, 1);
  assert.equal(h.buildCalls.length, 1);
  assert.equal(h.autosaveCalls, 1);
  assert.deepEqual({ ...asRecord(h.writes[0].patch.groovesMap) }, { groove_d2: true });
  assert.deepEqual(h.commits[0], {
    source: 'test:changed-config',
    noBuild: undefined,
    noPersist: undefined,
    noAutosave: undefined,
    noHistory: undefined,
    immediate: true,
    force: false,
  });
  assert.equal(h.buildCalls[0].source, 'test:changed-config');
  assert.equal(h.buildCalls[0].reason, 'test:changed-config');
  assert.equal(h.buildCalls[0].immediate, true);
  assert.equal(h.buildCalls[0].force, false);
});

test('kernel_state_kernel_config scalar patch returns the canonical persisted value instead of raw caller input', () => {
  const h = createHarness({ savedColors: [{ id: 'c1', value: '#111' }] });

  const next = h.__sk.patchConfigScalar(
    'savedColors',
    ['oak', { id: ' c2 ', value: '#222' }, { id: '', value: '#333' }],
    { source: 'test:scalar-canonical-return' }
  );

  assert.deepEqual(next, [{ id: 'c2', value: '#222' }]);
  assert.deepEqual(h.state.config.savedColors, [{ id: 'c2', value: '#222' }]);
  assert.deepEqual(h.writes[0]?.patch.savedColors, [{ id: 'c2', value: '#222' }]);
});

test('kernel_state_kernel_config map entry patch returns the canonical persisted entry value instead of raw caller input', () => {
  const h = createHarness({ groovesMap: {} });

  const next = h.__sk.patchConfigEntry('groovesMap', 'groove_d7', '1', {
    source: 'test:entry-canonical-return',
  });

  assert.equal(next, true);
  assert.deepEqual({ ...asRecord(h.state.config.groovesMap) }, { groove_d7: true });
  assert.deepEqual({ ...asRecord(h.writes[0]?.patch.groovesMap) }, { groove_d7: true });
});

test('kernel_state_kernel_config corner-cell patch reuses the previous canonical cell and skips churn for semantic no-op patches', () => {
  const canonicalCell = {
    layout: 'hanging_top2',
    doors: 2,
    extDrawersCount: 0,
    hasShoeDrawer: false,
    intDrawersSlot: 0,
    intDrawersList: [],
    isCustom: false,
    customData: {
      shelves: [false, false, false, false, false, false],
      rods: [false, false, false, false, false, false],
      storage: true,
    },
  };
  const h = createHarness({
    cornerConfiguration: {
      layout: 'shelves',
      extDrawersCount: 0,
      hasShoeDrawer: false,
      intDrawersList: [],
      intDrawersSlot: 0,
      isCustom: false,
      gridDivisions: 6,
      customData: {
        shelves: [false, false, false, false, false, false],
        rods: [false, false, false, false, false, false],
        storage: false,
      },
      modulesConfiguration: [canonicalCell],
    },
  });
  const stateCornerCell = asRecord(asRecord(h.state.config.cornerConfiguration).modulesConfiguration?.[0]);

  const next = h.__sk.patchModuleConfig(
    'corner:0',
    current => ({
      layout: current.layout,
      doors: current.doors,
      extDrawersCount: current.extDrawersCount,
      hasShoeDrawer: current.hasShoeDrawer,
      intDrawersSlot: current.intDrawersSlot,
      intDrawersList: current.intDrawersList,
      isCustom: current.isCustom,
      customData: current.customData,
    }),
    { source: 'test:corner-noop' }
  );

  assert.equal(next, stateCornerCell);
  assert.equal(h.writes.length, 0);
  assert.equal(h.commits.length, 0);
  assert.equal(h.buildCalls.length, 0);
  assert.equal(h.autosaveCalls, 0);
});
