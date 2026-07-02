import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyConfigPatch,
  applyConfigPatchReplaceKeys,
  cfgGet,
  cfgRead,
  cfgSetScalar,
} from '../esm/native/runtime/cfg_access.ts';
import { applyConfigPatchFromMapOwner } from '../esm/native/runtime/cfg_access_core.ts';
import { applyConfigPatchReplaceKeysFromMapOwner } from '../esm/native/runtime/cfg_access_scalars.ts';
import { cfgSetMap, patchConfigMap } from '../esm/native/runtime/cfg_access_maps.ts';

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

function makeStoreOnlyApp(config: AnyRecord) {
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
      patch: (payload: AnyRecord) => {
        if (payload.config && typeof payload.config === 'object') {
          Object.assign(state.config as AnyRecord, payload.config as AnyRecord);
        }
        return payload;
      },
      setConfig: (patch: AnyRecord, meta?: AnyRecord) => {
        calls.push({ patch, meta });
        Object.assign(state.config as AnyRecord, patch as AnyRecord);
        return patch;
      },
    },
    actions: {},
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

test('[cfg_access] generic config patch rejects known map branches on store-only writer paths', () => {
  const App = makeStoreOnlyApp({
    boardMaterial: 'oak',
    handlesMap: { d1_full: 'bar' },
    doorStyleMap: { d1_full: 'flat' },
  });

  assert.throws(
    () => applyConfigPatch(App, { handlesMap: { d1_full: 'rail' } }, { source: 't:map' } as any),
    /applyConfigPatch cannot write known config map branches \(handlesMap\)/
  );
  assert.throws(
    () => applyConfigPatch(App, { doorStyleMap: { d1_full: 'profile' } }, { source: 't:visual-map' } as any),
    /applyConfigPatch cannot write known config map branches \(doorStyleMap\)/
  );
  assert.deepEqual((App as AnyRecord).__calls, []);
  assert.deepEqual(cfgRead(App, 'handlesMap', null), { d1_full: 'bar' });
  assert.deepEqual(cfgRead(App, 'doorStyleMap', null), { d1_full: 'flat' });

  const scalarOut = applyConfigPatch(App, { boardMaterial: 'walnut' }, { source: 't:scalar' } as any);
  assert.deepEqual(scalarOut, { boardMaterial: 'walnut' });
  assert.equal(cfgRead(App, 'boardMaterial', ''), 'walnut');
});

test('[cfg_access] generic replace-key config patch rejects known maps while map owners can commit them', () => {
  const App = makeStoreOnlyApp({
    width: 100,
    handlesMap: { d1_full: 'bar' },
  });

  assert.throws(
    () =>
      applyConfigPatchReplaceKeys(App, { handlesMap: { d1_full: 'rail' } }, { handlesMap: true }, {
        source: 't:replace-map',
      } as any),
    /applyConfigPatchReplaceKeys cannot write known config map branches \(handlesMap\) and replace keys \(handlesMap\)/
  );
  assert.throws(
    () =>
      applyConfigPatchReplaceKeys(App, { width: 120 }, { handlesMap: true }, {
        source: 't:replace-known-map-key',
      } as any),
    /applyConfigPatchReplaceKeys cannot write known config map replace keys \(handlesMap\)/
  );

  const ownerPatch = applyConfigPatchFromMapOwner(App, { handlesMap: { d1_full: 'rail' } }, {
    source: 't:map-owner',
  } as any);
  assert.deepEqual(ownerPatch, { handlesMap: { d1_full: 'rail' } });
  assert.deepEqual(cfgRead(App, 'handlesMap', null), { d1_full: 'rail' });

  const ownerReplacePatch = applyConfigPatchReplaceKeysFromMapOwner(
    App,
    { handlesMap: { d2_full: 'knob' } },
    { handlesMap: true },
    { source: 't:map-owner-replace' } as any
  );
  assert.deepEqual(ownerReplacePatch, {
    handlesMap: { d2_full: 'knob' },
    __replace: { handlesMap: true },
  });
  assert.deepEqual(cfgRead(App, 'handlesMap', null), { d2_full: 'knob' });
});
