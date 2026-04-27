import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyConfigPatch,
  cfgGet,
  cfgRead,
  cfgSetScalar,
  cfgSetMap,
  patchConfigMap,
} from '../esm/native/runtime/cfg_access.ts';

type AnyRecord = Record<string, unknown>;

function makeAppBase(config: AnyRecord) {
  const state = {
    ui: {},
    config,
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: { dirty: false, version: 1, updatedAt: 123 },
  };

  const calls: AnyRecord[] = [];

  const App = {
    store: {
      getState: () => state,
      setConfig: (patch: AnyRecord) => {
        Object.assign(state.config as AnyRecord, patch as AnyRecord);
      },
      patch: (payload: AnyRecord) => {
        // Minimal patch support for tests.
        const p = payload as AnyRecord;
        if (p.config && typeof p.config === 'object')
          Object.assign(state.config as AnyRecord, p.config as AnyRecord);
        if (p.ui && typeof p.ui === 'object') Object.assign(state.ui as AnyRecord, p.ui as AnyRecord);
      },
    },
    actions: {
      config: {
        patch: (patch: AnyRecord, meta?: AnyRecord) => {
          calls.push({ patch, meta });
          Object.assign(state.config as AnyRecord, patch);
          return patch;
        },
      },
    },
    __calls: calls,
  } as unknown as AnyRecord;

  return App;
}

test('[cfg_access] cfgGet/cfgRead read store-backed config', () => {
  const App = makeAppBase({ width: 100, modulesConfiguration: { a: 1 } });
  assert.deepEqual(cfgGet(App), { width: 100, modulesConfiguration: { a: 1 } });
  assert.equal(cfgRead(App, 'width', 0), 100);
  assert.equal(cfgRead(App, 'missingKey', 7), 7);
});

test('[cfg_access] applyConfigPatch commits via actions.config.patch when available', () => {
  const App = makeAppBase({ width: 100, modulesConfiguration: {} as AnyRecord });
  const out = applyConfigPatch(App, { width: 120 }, { source: 't:patch' } as any);
  assert.deepEqual(out, { width: 120 });
  assert.equal(cfgRead(App, 'width', 0), 120);

  const calls = (App as AnyRecord).__calls as AnyRecord[];
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].patch, { width: 120 });
  assert.equal((calls[0].meta as AnyRecord).source, 't:patch');
});

test('[cfg_access] cfgSetScalar/cfgSetMap/patchConfigMap operate on store-backed config', () => {
  const App = makeAppBase({ width: 100, modulesConfiguration: { a: 1 } as AnyRecord });

  cfgSetScalar(App, 'width', (prev: unknown) => Number(prev || 0) + 5, { source: 't:scalar' } as any);
  assert.equal(cfgRead(App, 'width', 0), 105);

  const out1 = cfgSetMap(App, 'modulesConfiguration', { a: 1, b: 2 }, { source: 't:setMap' } as any);
  assert.deepEqual(out1, { a: 1, b: 2 });
  assert.deepEqual(cfgRead(App, 'modulesConfiguration', null), { a: 1, b: 2 });

  const out2 = patchConfigMap(App, 'modulesConfiguration', { c: 3 }, { source: 't:patchMap' } as any);
  assert.deepEqual(out2, { a: 1, b: 2, c: 3 });
  assert.deepEqual(cfgRead(App, 'modulesConfiguration', null), { a: 1, b: 2, c: 3 });
});
