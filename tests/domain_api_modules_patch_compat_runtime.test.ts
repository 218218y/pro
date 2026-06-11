import test from 'node:test';
import assert from 'node:assert/strict';

import { installStateApi } from '../esm/native/kernel/state_api.ts';
import { installDomainApi } from '../esm/native/kernel/domain_api.ts';

type AnyRecord = Record<string, unknown>;

type StoreStub = {
  getState: () => AnyRecord;
  patch: (payload: AnyRecord, meta?: AnyRecord) => AnyRecord | void;
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

  return {
    getState: () => state,
    patch: (payload: AnyRecord, meta?: AnyRecord) => {
      const p = payload && typeof payload === 'object' ? (payload as AnyRecord) : ({} as AnyRecord);
      if (p.config && typeof p.config === 'object') {
        const patchRec = p.config as AnyRecord;
        const baseCfg = state.config && typeof state.config === 'object' ? (state.config as AnyRecord) : {};
        state.config = { ...baseCfg, ...patchRec };
      }
      const ms = state.meta && typeof state.meta === 'object' ? (state.meta as AnyRecord) : ({} as AnyRecord);
      ms.version = (typeof ms.version === 'number' ? ms.version : 0) + 1;
      ms.lastAction = meta || null;
      state.meta = ms;
      return undefined;
    },
    subscribe: () => () => undefined,
  };
}

test('[domain-api] modules.patch compat descriptors route stack-aware writes through patchForStack', () => {
  const calls: AnyRecord[] = [];
  const App: AnyRecord = {
    actions: {
      modules: {
        patchForStack(stack: 'top' | 'bottom', moduleKey: string | number, patch: unknown, meta?: AnyRecord) {
          calls.push({ op: 'patchForStack', stack, moduleKey, patch, meta });
          return { via: 'patchForStack', stack, moduleKey };
        },
      },
    },
    store: createStoreStub(),
  };

  installStateApi(App as any);
  installDomainApi(App as any);

  const mods = App.actions.modules as AnyRecord;

  assert.deepEqual(mods.patch({ stack: 'bottom', index: 3, patch: { width: 55 } }, { source: 'm:bottom' }), {
    via: 'patchForStack',
    stack: 'bottom',
    moduleKey: 3,
  });

  assert.deepEqual(
    mods.patch({ stack: 'top', moduleKey: 'corner:2', patch: { depth: 7 } }, { source: 'm:corner' }),
    {
      via: 'patchForStack',
      stack: 'top',
      moduleKey: 'corner:2',
    }
  );

  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], {
    op: 'patchForStack',
    stack: 'bottom',
    moduleKey: 3,
    patch: { width: 55 },
    meta: { source: 'm:bottom' },
  });
  assert.deepEqual(calls[1], {
    op: 'patchForStack',
    stack: 'top',
    moduleKey: 'corner:2',
    patch: { depth: 7 },
    meta: { source: 'm:corner' },
  });
});
