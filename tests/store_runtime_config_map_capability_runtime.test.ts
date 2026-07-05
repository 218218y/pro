import test from 'node:test';
import assert from 'node:assert/strict';

import { installStateApi } from '../esm/native/kernel/state_api.ts';
import { applyConfigPatchFromMapOwner } from '../esm/native/runtime/cfg_access_core.ts';
import { applyConfigPatchReplaceKeysFromMapOwner } from '../esm/native/runtime/cfg_access_scalars.ts';
import { AnyRecord, asRec, createStore } from './store_zustand_parity_helpers.ts';

function cloneRecord(value: unknown): AnyRecord {
  return { ...asRec(value) };
}

function createConfigMapStore(config: AnyRecord = {}) {
  return createStore({
    initialState: {
      ui: {},
      config,
      runtime: {},
      mode: { primary: 'none', opts: {} },
      meta: { dirty: false, version: 0, updatedAt: 0 },
    },
  });
}

test('[store-runtime-config-map-capability] direct raw store config writes reject known maps', () => {
  const store = createConfigMapStore({
    width: 100,
    boardMaterial: 'walnut',
    handlesMap: { d1_full: 'bar' },
  });
  const storeAny = store as unknown as {
    patch: (payload: unknown, meta?: unknown, opts?: unknown) => unknown;
    setConfig: (patch: unknown, meta?: unknown, opts?: unknown) => unknown;
  };

  const readConfig = () => asRec(store.getState().config);
  const readHandles = () => cloneRecord(readConfig().handlesMap);

  assert.throws(
    () =>
      storeAny.patch({ config: { handlesMap: { d1_full: 'rail' } } }, { source: 'public-or-unsafe-test' }),
    /store\.patch cannot write known config map branches \(handlesMap\)/
  );
  assert.deepEqual(readHandles(), { d1_full: 'bar' });

  assert.throws(
    () =>
      storeAny.setConfig({ handlesMap: { d1_full: 'knob' } }, { source: 'public-or-unsafe-test:setConfig' }),
    /store\.setConfig cannot write known config map branches \(handlesMap\)/
  );
  assert.deepEqual(readHandles(), { d1_full: 'bar' });

  assert.throws(
    () =>
      storeAny.patch(
        { config: { width: 120, __replace: { handlesMap: true } } },
        { source: 'public-or-unsafe-test:replace' }
      ),
    /store\.patch cannot write known config map replace keys \(handlesMap\)/
  );
  assert.equal(readConfig().width, 100);
  assert.deepEqual(readHandles(), { d1_full: 'bar' });

  assert.throws(
    () =>
      storeAny.patch(
        { config: { handlesMap: { d1_full: 'project-load-rail' } } },
        { source: 'project.load' }
      ),
    /store\.patch cannot write known config map branches \(handlesMap\)/
  );
  assert.deepEqual(readHandles(), { d1_full: 'bar' });

  storeAny.patch({ config: { width: 120 } }, { source: 'test:scalar-patch' });
  storeAny.setConfig({ boardMaterial: 'oak' }, { source: 'test:scalar-setConfig' });
  assert.equal(readConfig().width, 120);
  assert.equal(readConfig().boardMaterial, 'oak');
});

test('[store-runtime-config-map-capability] owner and snapshot paths can commit known maps', () => {
  const store = createConfigMapStore({
    handlesMap: { d1_full: 'bar' },
    individualColors: {},
    curtainMap: {},
    doorSpecialMap: {},
    mirrorLayoutMap: {},
    doorStyleMap: {},
  });
  const App: AnyRecord = { actions: {}, store };

  applyConfigPatchFromMapOwner(App, { handlesMap: { d1_full: 'rail' } }, { source: 'test:map-owner' });
  assert.deepEqual(cloneRecord(asRec(store.getState().config).handlesMap), { d1_full: 'rail' });

  applyConfigPatchReplaceKeysFromMapOwner(
    App,
    { handlesMap: { d2_full: 'knob' } },
    { handlesMap: true },
    { source: 'test:map-owner-replace' }
  );
  assert.deepEqual(cloneRecord(asRec(store.getState().config).handlesMap), { d2_full: 'knob' });

  installStateApi(App as never);
  const configActions = asRec((App.actions as AnyRecord).config);
  const applyProjectSnapshot = configActions.applyProjectSnapshot as
    ((snapshot: unknown, meta?: unknown) => unknown) | undefined;
  const applyPaintSnapshot = configActions.applyPaintSnapshot as
    | ((individualColors: unknown, curtainMap: unknown, meta?: unknown, doorSpecialMap?: unknown) => unknown)
    | undefined;

  assert.equal(typeof applyProjectSnapshot, 'function');
  applyProjectSnapshot?.({ handlesMap: { d3_full: 'edge' } }, { source: 'project.load' });
  assert.deepEqual(cloneRecord(asRec(store.getState().config).handlesMap), { d3_full: 'edge' });

  assert.equal(typeof applyPaintSnapshot, 'function');
  applyPaintSnapshot?.(
    { d1_full: 'oak' },
    { d1_full: 'linen' },
    { source: 'test:paint-snapshot' },
    { drawer_1: 'glass' }
  );

  const config = asRec(store.getState().config);
  assert.deepEqual(cloneRecord(config.individualColors), { d1_full: 'oak' });
  assert.deepEqual(cloneRecord(config.curtainMap), { d1_full: 'linen' });
  assert.deepEqual(cloneRecord(config.doorSpecialMap), { drawer_1: 'glass' });
});
