import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyConfigNonMapPatch,
  applyConfigNonMapPatchWithReplaceKeys,
  cfgGet,
  cfgRead,
  cfgSetScalar,
  setCfgHandlesMap,
} from '../esm/native/runtime/cfg_access.ts';
import {
  commitConfigMapOwnerPatch,
  commitConfigMapOwnerPatchWithReplaceKeys,
} from '../esm/native/runtime/cfg_access_map_owner.ts';

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

test('[cfg_access] applyConfigNonMapPatch commits via actions.config.patch when available', () => {
  const App = makeAppBase({ width: 100, modulesConfiguration: {} as AnyRecord });
  const out = applyConfigNonMapPatch(App, { width: 120 }, { source: 't:patch' } as any);
  assert.deepEqual(out, { width: 120 });
  assert.equal(cfgRead(App, 'width', 0), 120);

  const calls = (App as AnyRecord).__calls as AnyRecord[];
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].patch, { width: 120 });
  assert.equal((calls[0].meta as AnyRecord).source, 't:patch');
});

test('[cfg_access] cfgSetScalar and semantic map setters operate on store-backed config', () => {
  const App = makeAppBase({ grooveLinesCount: 2, handlesMap: { a: 'bar' } as AnyRecord });

  cfgSetScalar(App, 'grooveLinesCount', (prev: unknown) => Number(prev || 0) + 5, {
    source: 't:scalar',
  } as any);
  assert.equal(cfgRead(App, 'grooveLinesCount', 0), 7);

  const out1 = setCfgHandlesMap(App, { a: 'bar', b: 'knob' }, { source: 't:setHandlesMap' } as any);
  assert.deepEqual(out1, { a: 'bar', b: 'knob' });
  assert.deepEqual(cfgRead(App, 'handlesMap', null), { a: 'bar', b: 'knob' });

  const out2 = setCfgHandlesMap(App, { ...out1, c: 'pull' }, { source: 't:replaceHandlesMap' } as any);
  assert.deepEqual(out2, { a: 'bar', b: 'knob', c: 'pull' });
  assert.deepEqual(cfgRead(App, 'handlesMap', null), { a: 'bar', b: 'knob', c: 'pull' });
});

test('[cfg_access] generic config patch rejects known map branches on store-only writer paths', () => {
  const App = makeStoreOnlyApp({
    boardMaterial: 'oak',
    handlesMap: { d1_full: 'bar' },
    doorStyleMap: { d1_full: 'flat' },
  });

  assert.throws(
    () => applyConfigNonMapPatch(App, { handlesMap: { d1_full: 'rail' } }, { source: 't:map' } as any),
    /applyConfigNonMapPatch cannot write known config map branches \(handlesMap\)/
  );
  assert.throws(
    () =>
      applyConfigNonMapPatch(App, { doorStyleMap: { d1_full: 'profile' } }, {
        source: 't:visual-map',
      } as any),
    /applyConfigNonMapPatch cannot write known config map branches \(doorStyleMap\)/
  );
  assert.deepEqual((App as AnyRecord).__calls, []);
  assert.deepEqual(cfgRead(App, 'handlesMap', null), { d1_full: 'bar' });
  assert.deepEqual(cfgRead(App, 'doorStyleMap', null), { d1_full: 'flat' });

  const scalarOut = applyConfigNonMapPatch(App, { boardMaterial: 'walnut' }, {
    source: 't:scalar',
  } as any);
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
      applyConfigNonMapPatchWithReplaceKeys(
        App,
        { handlesMap: { d1_full: 'rail' } },
        {
          handlesMap: true,
        },
        {
          source: 't:replace-map',
        } as any
      ),
    /applyConfigNonMapPatchWithReplaceKeys cannot write known config map branches \(handlesMap\) and replace keys \(handlesMap\)/
  );
  assert.throws(
    () =>
      applyConfigNonMapPatchWithReplaceKeys(App, { width: 120 }, { handlesMap: true }, {
        source: 't:replace-known-map-key',
      } as any),
    /applyConfigNonMapPatchWithReplaceKeys cannot write known config map replace keys \(handlesMap\)/
  );

  const ownerPatch = commitConfigMapOwnerPatch(App, { handlesMap: { d1_full: 'rail' } }, {
    source: 't:map-owner',
  } as any);
  assert.deepEqual(ownerPatch, { handlesMap: { d1_full: 'rail' } });
  assert.deepEqual(cfgRead(App, 'handlesMap', null), { d1_full: 'rail' });

  const ownerReplacePatch = commitConfigMapOwnerPatchWithReplaceKeys(
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
