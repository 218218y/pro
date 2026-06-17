import test from 'node:test';
import assert from 'node:assert/strict';

import { installStateApi } from '../esm/native/kernel/state_api.ts';

type AnyRecord = Record<string, unknown>;

function expectedLowerModuleConfig(): AnyRecord {
  return {
    layout: 'shelves',
    extDrawersCount: 0,
    hasShoeDrawer: false,
    isCustom: true,
    gridDivisions: 6,
    customData: {
      shelves: [false, true, false, true, false, false],
      rods: [false, false, false, false, false, false],
      storage: false,
    },
  };
}

function expectedLowerCornerConfig(): AnyRecord {
  return {
    layout: 'shelves',
    extDrawersCount: 0,
    hasShoeDrawer: false,
    isCustom: true,
    gridDivisions: 6,
    customData: {
      shelves: [false, true, false, true, false, false],
      rods: [false, false, false, false, false, false],
      storage: false,
    },
    modulesConfiguration: [],
  };
}

type StoreStub = {
  getState: () => AnyRecord;
  patch: (payload: AnyRecord, meta?: AnyRecord) => AnyRecord | void;
  setConfig: (patch: AnyRecord, meta?: AnyRecord) => AnyRecord | void;
  setUi: (patch: AnyRecord, meta?: AnyRecord) => AnyRecord | void;
  setRuntime: (patch: AnyRecord, meta?: AnyRecord) => AnyRecord | void;
  setModePatch: (patch: AnyRecord, meta?: AnyRecord) => AnyRecord | void;
  setMeta: (patch: AnyRecord, meta?: AnyRecord) => AnyRecord | void;
  subscribe: () => () => void;
};

function createStoreStub(): StoreStub {
  let state: AnyRecord = {
    ui: {},
    config: {},
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: { dirty: false, version: 0, updatedAt: 0 },
  };
  const bumpMeta = (meta?: AnyRecord) => {
    const ms = state.meta && typeof state.meta === 'object' ? (state.meta as AnyRecord) : ({} as AnyRecord);
    const v0 = typeof ms.version === 'number' ? ms.version : parseInt(String(ms.version ?? '0'), 10);
    ms.version = Number.isFinite(v0) ? (v0 as number) + 1 : 1;
    ms.lastAction = meta || null;
    state.meta = ms;
  };

  const applySlice = (sliceName: 'ui' | 'runtime' | 'mode', next: unknown, meta?: AnyRecord) => {
    if (!next || typeof next !== 'object') return undefined;
    const base =
      state[sliceName] && typeof state[sliceName] === 'object' ? (state[sliceName] as AnyRecord) : {};
    state[sliceName] = { ...base, ...(next as AnyRecord) };
    bumpMeta(meta);
    return undefined;
  };

  const applyConfig = (cfgPatch: unknown, meta?: AnyRecord) => {
    if (!cfgPatch || typeof cfgPatch !== 'object') return undefined;

    const patchRec = cfgPatch as AnyRecord;
    const baseCfg =
      state.config && typeof state.config === 'object'
        ? ({ ...(state.config as AnyRecord) } as AnyRecord)
        : {};

    if (patchRec.__snapshot) {
      const nextCfg = { ...patchRec } as AnyRecord;
      delete nextCfg.__snapshot;
      delete nextCfg.__replace;
      state.config = nextCfg;
      bumpMeta(meta);
      return undefined;
    }

    const nextCfg = { ...baseCfg } as AnyRecord;
    for (const k of Object.keys(patchRec)) {
      if (k === '__replace' || k === '__snapshot') continue;
      const v = patchRec[k];
      if (v === undefined) {
        delete nextCfg[k];
        continue;
      }
      nextCfg[k] = v;
    }
    state.config = nextCfg;
    bumpMeta(meta);
    return undefined;
  };

  return {
    getState: () => state,
    patch: (payload: AnyRecord, meta?: AnyRecord) => {
      const p = payload && typeof payload === 'object' ? (payload as AnyRecord) : ({} as AnyRecord);
      if (p.config && typeof p.config === 'object') applyConfig(p.config, meta);
      if (p.ui && typeof p.ui === 'object') applySlice('ui', p.ui, meta);
      if (p.runtime && typeof p.runtime === 'object') applySlice('runtime', p.runtime, meta);
      if (p.mode && typeof p.mode === 'object') applySlice('mode', p.mode, meta);
      if (p.meta && typeof p.meta === 'object') {
        const base = state.meta && typeof state.meta === 'object' ? (state.meta as AnyRecord) : {};
        state.meta = { ...base, ...(p.meta as AnyRecord) };
        bumpMeta(meta);
      }
      return undefined;
    },
    setConfig: (patch: AnyRecord, meta?: AnyRecord) => applyConfig(patch, meta),
    setUi: (patch: AnyRecord, meta?: AnyRecord) => applySlice('ui', patch, meta),
    setRuntime: (patch: AnyRecord, meta?: AnyRecord) => applySlice('runtime', patch, meta),
    setModePatch: (patch: AnyRecord, meta?: AnyRecord) => applySlice('mode', patch, meta),
    setMeta: (patch: AnyRecord, meta?: AnyRecord) => {
      const base = state.meta && typeof state.meta === 'object' ? (state.meta as AnyRecord) : {};
      state.meta = { ...base, ...(patch as AnyRecord) };
      bumpMeta(meta);
      return undefined;
    },
    subscribe: () => () => undefined,
  };
}

test('modules stack surface: store-backed ensure/patch work when canonical stack surfaces are absent (no kernel probing)', () => {
  const kernelCalls: AnyRecord[] = [];
  const patchFn = (cfg: AnyRecord) => {
    cfg.layout = 'shelves';
  };

  const store = createStoreStub();

  const App: AnyRecord = {
    actions: {},
    store,
    stateKernel: {
      // These exist in some legacy setups, but delete-pass state_api must ignore them.
      ensureModuleConfigForStack(stack: string, key: unknown) {
        kernelCalls.push({ op: 'ensureModuleConfigForStack', stack, key });
        return { via: 'kernel.ensureModuleConfigForStack' };
      },
      patchModuleConfigForStack(stack: string, key: unknown, patch: unknown) {
        kernelCalls.push({ op: 'patchModuleConfigForStack', stack, key, patch });
        return { via: 'kernel.patchModuleConfigForStack' };
      },
    },
  };

  installStateApi(App as any);

  const mods = App.actions.modules as AnyRecord;

  // Bottom numeric module: store-backed ensure now materializes the canonical lower config shape.
  const ensured = mods.ensureForStack('BOTTOM', 2);
  assert.deepEqual(ensured, expectedLowerModuleConfig());
  const cfg1 = (store.getState() as AnyRecord).config as AnyRecord;
  assert.ok(Array.isArray(cfg1.stackSplitLowerModulesConfiguration));
  assert.deepEqual((cfg1.stackSplitLowerModulesConfiguration as unknown[])[2], expectedLowerModuleConfig());

  const ensuredTopCorner = mods.ensureForStack('top', 'corner:1') as AnyRecord;
  assert.equal(ensuredTopCorner.layout, 'shelves');

  // Top corner cell patch: commits to cornerConfiguration.modulesConfiguration via store.
  mods.patchForStack('top', 'corner:3', patchFn, { immediate: true });
  const cfg2 = (store.getState() as AnyRecord).config as AnyRecord;
  const cc = (cfg2.cornerConfiguration as AnyRecord) || {};
  const cells = (cc.modulesConfiguration as unknown[]) || [];
  assert.equal((cells[3] as AnyRecord).layout, 'shelves');

  // No kernel compat calls should happen.
  assert.deepEqual(kernelCalls, []);
});

test('modules stack surface: store-backed top-corner ensure/patch keep left-corner hanging defaults aligned with runtime ui', () => {
  const store = createStoreStub();
  store.setUi({ cornerSide: 'left', cornerDoors: 4 });

  const App: AnyRecord = {
    actions: {},
    store,
    stateKernel: {},
  };

  installStateApi(App as any);

  const mods = App.actions.modules as AnyRecord;
  const ensured = mods.ensureForStack('top', 'corner:1') as AnyRecord;
  assert.equal(ensured.layout, 'hanging_top2');

  mods.patchForStack('top', 'corner:1', { customData: { storage: true } }, { source: 'left:corner' });

  const cfg = (store.getState() as AnyRecord).config as AnyRecord;
  const cornerCfg = (cfg.cornerConfiguration as AnyRecord) || {};
  const cells = (cornerCfg.modulesConfiguration as unknown[]) || [];
  assert.equal((cells[1] as AnyRecord).layout, 'hanging_top2');
  assert.equal((((cells[1] as AnyRecord).customData as AnyRecord) || {}).storage, true);
});

test('modules stack surface: preinstalled module/corner aliases cannot override canonical stack routing', () => {
  const calls: AnyRecord[] = [];
  const store = createStoreStub();
  const App: AnyRecord = {
    actions: {
      modules: {
        ensureLowerAt(index: unknown) {
          calls.push({ op: 'ensureLowerAt', index });
          return { via: 'ensureLowerAt', index };
        },
        patchLowerAt(index: unknown, patch: unknown, meta: AnyRecord) {
          calls.push({ op: 'patchLowerAt', index, patch, meta });
          return { via: 'patchLowerAt' };
        },
      },
      corner: {
        ensureCellAt(index: number) {
          calls.push({ op: 'ensureCellAt', index });
          return { via: 'ensureCellAt', index };
        },
        patch(patch: unknown, meta: AnyRecord) {
          calls.push({ op: 'corner.patch', patch, meta });
          return { via: 'corner.patch' };
        },
      },
    },
    store,
    stateKernel: {
      ensureModuleConfigForStack(stack: string, key: unknown) {
        calls.push({ op: 'ensureModuleConfigForStack', stack, key });
        return { via: 'kernel.ensureModuleConfigForStack' };
      },
      patchModuleConfigForStack(stack: string, key: unknown, patch: unknown, meta: AnyRecord) {
        calls.push({ op: 'patchModuleConfigForStack', stack, key, patch, meta });
        return { via: 'kernel.patchModuleConfigForStack' };
      },
    },
  };

  installStateApi(App as any);

  const mods = App.actions.modules as AnyRecord;
  assert.deepEqual(mods.ensureForStack('bottom', 3), expectedLowerModuleConfig());
  assert.equal((mods.ensureForStack('top', 'corner:2') as AnyRecord).layout, 'shelves');
  mods.patchForStack('bottom', 3, { width: 55 }, { source: 'm1' });
  mods.patchForStack('top', 'corner', { depth: 9 }, { source: 'm2' });

  const cfg = (store.getState() as AnyRecord).config as AnyRecord;
  const lowerModules = cfg.stackSplitLowerModulesConfiguration as AnyRecord[];
  assert.equal(lowerModules[3]?.width, 55);
  assert.equal((cfg.cornerConfiguration as AnyRecord).depth, 9);
  assert.deepEqual(calls, []);
});

test('modules stack surface: patchForStack owns numeric writes and ignores preinstalled patchAt aliases', () => {
  const calls: AnyRecord[] = [];
  const store = createStoreStub();
  const App: AnyRecord = {
    actions: {
      modules: {
        patchAt(index: unknown, patch: unknown, meta: AnyRecord) {
          calls.push({ op: 'patchAt', index, patch, meta });
          return { via: 'patchAt' };
        },
        patchLowerAt(index: unknown, patch: unknown, meta: AnyRecord) {
          calls.push({ op: 'patchLowerAt', index, patch, meta });
          return { via: 'patchLowerAt' };
        },
      },
      corner: {
        patchCellAt(index: number, patch: unknown, meta: AnyRecord) {
          calls.push({ op: 'patchCellAt', index, patch, meta });
          return { via: 'patchCellAt' };
        },
        patch(patch: unknown, meta: AnyRecord) {
          calls.push({ op: 'corner.patch', patch, meta });
          return { via: 'corner.patch' };
        },
      },
    },
    store,
    stateKernel: {
      patchModuleConfig(_key: unknown, _patch: unknown, _meta: AnyRecord) {
        calls.push({ op: 'kernel.patchModuleConfig' });
        return { via: 'kernel.patchModuleConfig' };
      },
    },
  };

  installStateApi(App as any);

  const mods = App.actions.modules as AnyRecord;

  mods.patchForStack('bottom', 5, { width: 60 }, { source: 't1' });
  mods.patchForStack('top', 6, { width: 70 }, { source: 't2' });
  mods.patchForStack('top', 'corner:1', { width: 20 }, { source: 't3' });
  const cfgAfterCellPatch = (store.getState() as AnyRecord).config as AnyRecord;
  assert.equal(
    Array.isArray((cfgAfterCellPatch.cornerConfiguration as AnyRecord)?.modulesConfiguration),
    true,
    `top corner cell patch did not persist ${JSON.stringify(cfgAfterCellPatch.cornerConfiguration)}`
  );
  mods.patchForStack('top', 'corner', { x: 1 }, { source: 't4' });

  const ops = calls.map(c => c.op);
  assert.equal(ops.includes('patchLowerAt'), false);
  assert.equal(ops.includes('patchAt'), false);
  assert.equal(ops.includes('patchCellAt'), false);
  assert.equal(ops.includes('corner.patch'), false);

  const cfg = (store.getState() as AnyRecord).config as AnyRecord;
  assert.equal((cfg.stackSplitLowerModulesConfiguration as AnyRecord[])[5]?.width, 60);
  assert.equal((cfg.modulesConfiguration as AnyRecord[])[6]?.width, 70);
  const cornerCfg = cfg.cornerConfiguration as AnyRecord;
  assert.equal(
    Array.isArray(cornerCfg.modulesConfiguration),
    true,
    `top corner cells missing from ${JSON.stringify(cornerCfg)}`
  );
  assert.equal((cornerCfg.modulesConfiguration as AnyRecord[])[1]?.width, 20);
  assert.equal(cornerCfg.x, 1);

  // Delete-pass: no kernel patch fallbacks.
  assert.equal(ops.includes('kernel.patchModuleConfig'), false);
});

test('modules stack surface: bottom-corner routing ignores preinstalled lower aliases', () => {
  const calls: AnyRecord[] = [];
  const store = createStoreStub();
  const App: AnyRecord = {
    actions: {
      modules: {},
      corner: {
        ensureLowerConfig() {
          calls.push({ op: 'ensureLowerConfig' });
          return { kind: 'canonLowerCorner' };
        },
        patchLower(patch: unknown, meta: AnyRecord) {
          calls.push({ op: 'patchLower', patch, meta });
          return { via: 'patchLower' };
        },
      },
    },
    store,
    stateKernel: {},
  };

  installStateApi(App as any);

  const mods = App.actions.modules as AnyRecord;

  assert.deepEqual(mods.ensureForStack('bottom', 'corner'), expectedLowerCornerConfig());
  mods.patchForStack('bottom', 'corner', { x: 9 }, { source: 'lc' });

  const cfg = (store.getState() as AnyRecord).config as AnyRecord;
  const lower = (cfg.cornerConfiguration as AnyRecord).stackSplitLower as AnyRecord;
  assert.equal(lower.x, 9);
  assert.deepEqual(calls, []);
});

test('modules stack surface: bottom-corner ensure and patch always use the store-backed router', () => {
  const calls: AnyRecord[] = [];
  const store = createStoreStub();

  const App: AnyRecord = {
    actions: {
      modules: {},
      corner: {
        patchLowerCellAt(index: number, patch: unknown, meta: AnyRecord) {
          calls.push({ op: 'patchLowerCellAt', index, patch, meta });
          return { via: 'patchLowerCellAt', index };
        },
      },
    },
    store,
    stateKernel: {
      // Legacy surfaces must not be used by delete-pass state_api.
      ensureSplitLowerCornerCellConfig(index: number) {
        calls.push({ op: 'ensureSplitLowerCornerCellConfig', index });
        return { kind: 'lowerCornerCell', index };
      },
      ensureSplitLowerCornerConfig() {
        calls.push({ op: 'ensureSplitLowerCornerConfig' });
        return { kind: 'lowerCorner' };
      },
      patchSplitLowerCornerConfig(patch: unknown, meta: AnyRecord) {
        calls.push({ op: 'patchSplitLowerCornerConfig', patch, meta });
        return { via: 'patchSplitLowerCornerConfig' };
      },
    },
  };

  installStateApi(App as any);

  const mods = App.actions.modules as AnyRecord;

  // Canonical lower-corner ensure surfaces stay stack-aware and now materialize the lower snapshot
  // directly on the store-backed config seam.
  assert.deepEqual(mods.ensureForStack('bottom', 'corner:2'), expectedLowerModuleConfig());
  const lowerEnsured = mods.ensureForStack('bottom', 'corner') as AnyRecord;
  assert.equal(lowerEnsured.layout, expectedLowerCornerConfig().layout);
  assert.equal(lowerEnsured.gridDivisions, expectedLowerCornerConfig().gridDivisions);
  assert.deepEqual(lowerEnsured.customData, expectedLowerCornerConfig().customData);
  assert.equal(Array.isArray(lowerEnsured.modulesConfiguration), true);

  const cfg = (store.getState() as AnyRecord).config as AnyRecord;
  const cc = (cfg.cornerConfiguration as AnyRecord) || {};
  const lower = (cc.stackSplitLower as AnyRecord) || {};
  const cells = (lower.modulesConfiguration as unknown[]) || [];
  assert.deepEqual(cells[2], expectedLowerModuleConfig());

  mods.patchForStack('bottom', 'corner:2', { w: 1 }, { source: 'c1' });
  const cfgAfterCellPatch = (store.getState() as AnyRecord).config as AnyRecord;
  const lowerAfterCellPatch = (cfgAfterCellPatch.cornerConfiguration as AnyRecord)
    .stackSplitLower as AnyRecord;
  assert.equal(
    Array.isArray(lowerAfterCellPatch.modulesConfiguration),
    true,
    `lower corner cell patch did not persist ${JSON.stringify(lowerAfterCellPatch)}`
  );

  // Root patches fall back to store-backed cornerConfiguration.stackSplitLower when no canonical lower patch exists.
  mods.patchForStack('bottom', 'corner', { x: 1 }, { source: 'c2' });

  const cfg2 = (store.getState() as AnyRecord).config as AnyRecord;
  const cc2 = (cfg2.cornerConfiguration as AnyRecord) || {};
  const lower2 = (cc2.stackSplitLower as AnyRecord) || {};
  assert.equal(lower2.x, 1);
  assert.equal(
    Array.isArray(lower2.modulesConfiguration),
    true,
    `lower corner cells missing from ${JSON.stringify(lower2)}`
  );
  assert.equal((lower2.modulesConfiguration as AnyRecord[])[2]?.w, 1);

  // Delete-pass: no kernel calls.
  assert.equal(
    calls.some(c => c.op === 'ensureSplitLowerCornerCellConfig'),
    false
  );
  assert.equal(
    calls.some(c => c.op === 'ensureSplitLowerCornerConfig'),
    false
  );
  assert.equal(
    calls.some(c => c.op === 'patchSplitLowerCornerConfig'),
    false
  );

  assert.equal(
    calls.some(c => c.op === 'patchLowerCellAt'),
    false
  );
});

test('modules stack surface: top-corner routing ignores action aliases and kernel compatibility surfaces', () => {
  const calls: AnyRecord[] = [];
  const store = createStoreStub();
  const App: AnyRecord = {
    actions: {
      modules: {},
      corner: {
        ensureCellAt(index: number) {
          calls.push({ op: 'ensureCellAt', index });
          return { via: 'ensureCellAt', index };
        },
        patch(patch: unknown, meta: AnyRecord) {
          calls.push({ op: 'corner.patch', patch, meta });
          return { via: 'corner.patch' };
        },
      },
    },
    store,
    stateKernel: {
      ensureCornerCellConfig(index: number) {
        calls.push({ op: 'ensureCornerCellConfig', index });
        return { via: 'ensureCornerCellConfig', index };
      },
      patchModuleConfig(key: unknown, patch: unknown, meta: AnyRecord) {
        calls.push({ op: 'patchModuleConfig', key, patch, meta });
        return { via: 'patchModuleConfig' };
      },
    },
  };

  installStateApi(App as any);

  const mods = App.actions.modules as AnyRecord;
  assert.equal((mods.ensureForStack('top', 'corner:4') as AnyRecord).layout, 'shelves');
  mods.patchForStack('top', 'corner', { depth: 7 }, { source: 'tp' });

  assert.equal(
    calls.some(c => c.op === 'ensureCornerCellConfig'),
    false
  );
  assert.equal(
    calls.some(c => c.op === 'patchModuleConfig'),
    false
  );
  assert.equal(
    calls.some(c => c.op === 'corner.patch'),
    false
  );
  const cfg = (store.getState() as AnyRecord).config as AnyRecord;
  assert.equal((cfg.cornerConfiguration as AnyRecord).depth, 7);
});
