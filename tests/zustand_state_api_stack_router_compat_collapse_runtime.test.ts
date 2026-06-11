import test from 'node:test';
import assert from 'node:assert/strict';

import { installStateApi } from '../esm/native/kernel/state_api.ts';

type AnyRecord = Record<string, unknown>;

function expectedLowerCornerConfig(): AnyRecord {
  return {
    layout: 'shelves',
    extDrawersCount: 0,
    hasShoeDrawer: false,
    intDrawersSlot: 0,
    intDrawersList: [],
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

  const applyConfigPatch = (patchRec: AnyRecord, meta?: AnyRecord) => {
    const baseCfg = state.config && typeof state.config === 'object' ? (state.config as AnyRecord) : {};
    state.config = { ...baseCfg, ...patchRec };
    const ms = state.meta && typeof state.meta === 'object' ? (state.meta as AnyRecord) : ({} as AnyRecord);
    ms.version = (typeof ms.version === 'number' ? ms.version : 0) + 1;
    ms.lastAction = meta || null;
    state.meta = ms;
    return undefined;
  };

  return {
    getState: () => state,
    patch: (payload: AnyRecord, meta?: AnyRecord) => {
      const p = payload && typeof payload === 'object' ? (payload as AnyRecord) : ({} as AnyRecord);
      if (p.config && typeof p.config === 'object') {
        return applyConfigPatch(p.config as AnyRecord, meta);
      }
      return undefined;
    },
    setConfig: (patch: AnyRecord, meta?: AnyRecord) => applyConfigPatch(patch, meta),
    subscribe: () => () => undefined,
  };
}

test('[state-api] stack router compat collapse: state_api ignores stateKernel stack router surfaces and uses canonical/store paths only', () => {
  const calls: Array<{ via: string; args?: unknown[] }> = [];

  const store = createStoreStub();

  const App: AnyRecord = {
    actions: {},
    store,
    stateKernel: {
      // These must be ignored by delete-pass state_api.
      ensureModuleConfigForStack: (stack: 'top' | 'bottom', key: unknown) => {
        calls.push({ via: 'ensureModuleConfigForStack', args: [stack, key] });
        return undefined;
      },
      patchModuleConfigForStack: (stack: 'top' | 'bottom', key: unknown, patch: unknown) => {
        calls.push({ via: 'patchModuleConfigForStack', args: [stack, key, patch] });
        return undefined;
      },

      // Legacy specialized fallbacks that MUST NOT be called either.
      ensureCornerConfig: () => (calls.push({ via: 'ensureCornerConfig' }), 'legacy.ensureCorner'),
      ensureSplitLowerCornerConfig: () => (
        calls.push({ via: 'ensureSplitLowerCornerConfig' }),
        'legacy.ensureLowerCorner'
      ),
      ensureModuleConfig: (_k: unknown) => (calls.push({ via: 'ensureModuleConfig' }), 'legacy.ensureModule'),
      ensureSplitLowerModuleConfig: (_k: unknown) => (
        calls.push({ via: 'ensureSplitLowerModuleConfig' }),
        'legacy.ensureLowerModule'
      ),
      patchCornerConfig: (_p: unknown) => (calls.push({ via: 'patchCornerConfig' }), 'legacy.patchCorner'),
      patchSplitLowerCornerConfig: (_p: unknown) => (
        calls.push({ via: 'patchSplitLowerCornerConfig' }),
        'legacy.patchLowerCorner'
      ),
      patchModuleConfig: (_k: unknown, _p: unknown) => (
        calls.push({ via: 'patchModuleConfig' }),
        'legacy.patchModule'
      ),
      patchSplitLowerModuleConfig: (_k: unknown, _p: unknown) => (
        calls.push({ via: 'patchSplitLowerModuleConfig' }),
        'legacy.patchLowerModule'
      ),
    },
  };

  installStateApi(App as any);

  const modulesNs = (App.actions as AnyRecord).modules as AnyRecord;

  const e1 = modulesNs.ensureForStack('top', 'door');
  const e2 = modulesNs.ensureForStack('bottom', 'corner');
  const p1 = modulesNs.patchForStack('top', 'door', { x: 1 }, { source: 't:stack' });
  modulesNs.patchForStack('bottom', 'corner', { y: 2 }, { source: 't:stack2' });

  // Invalid keys remain fail-soft.
  assert.equal(e1, null);
  assert.equal(p1, null);

  // Corner ensures are store-backed and now materialize the canonical lower-corner config.
  assert.deepEqual(e2, expectedLowerCornerConfig());

  // Root corner patch applies to the lower corner config in store-backed cornerConfiguration.
  const cfg = (store.getState() as AnyRecord).config as AnyRecord;
  const cc = (cfg.cornerConfiguration as AnyRecord) || {};
  const lower = (cc.stackSplitLower as AnyRecord) || {};
  assert.equal(lower.y, 2);

  // No stateKernel calls should happen at all.
  assert.deepEqual(calls, []);
});
