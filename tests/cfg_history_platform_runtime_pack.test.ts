import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyConfigPatch,
  cfgBatch,
  cfgPatchWithReplaceKeys,
  extractConfigPatchWriteMetadata,
} from '../esm/native/runtime/cfg_access.ts';
import { cfgSetMap, patchConfigMap } from '../esm/native/runtime/cfg_access_maps.ts';

type AnyRecord = Record<string, any>;

test('cfg access runtime pack: canonical config/history namespaces own map writes, replace-key metadata, and batching', () => {
  const calls: Array<[string, ...any[]]> = [];
  const state: AnyRecord = {
    config: {
      handlesMap: { a: 'bar' },
    },
    ui: {},
    runtime: {},
    mode: {},
    meta: {},
  };

  const App: AnyRecord = {
    actions: {
      config: {
        patch(patch: AnyRecord, meta?: AnyRecord) {
          calls.push(['patch', patch, meta || null]);
          Object.assign(state.config, patch);
          return patch;
        },
      },
      history: {
        batch(fn: () => unknown, meta?: AnyRecord) {
          calls.push(['batch', meta || null]);
          return fn();
        },
      },
      meta: {
        merge(meta?: AnyRecord, defaults?: AnyRecord, defaultSource?: string) {
          return {
            ...(defaults || {}),
            ...(meta || {}),
            source: meta?.source || defaults?.source || defaultSource || 'config',
          };
        },
      },
    },
    store: {
      getState: () => state,
      setConfig(patch: AnyRecord, meta?: AnyRecord) {
        calls.push(['setConfig', patch, meta || null]);
        Object.assign(state.config, patch);
      },
      patch(payload: AnyRecord) {
        if (payload?.config && typeof payload.config === 'object') {
          Object.assign(state.config, payload.config);
        }
      },
    },
  };

  const setMapOut = cfgSetMap(App, 'handlesMap', { a: 'bar', b: 'knob' }, { source: 'set:map' } as any);
  assert.deepEqual(setMapOut, { a: 'bar', b: 'knob' });

  const patchMapOut = patchConfigMap(
    App,
    'handlesMap',
    (draft: AnyRecord) => {
      draft.c = 'pull';
      return draft;
    },
    { source: 'patch:map' } as any
  );
  assert.deepEqual(patchMapOut, { a: 'bar', b: 'knob', c: 'pull' });

  const patch = cfgPatchWithReplaceKeys({ width: 120, __capturedAt: 1 }, ['handlesMap', 'mirrorLayoutMap']);
  assert.deepEqual((patch as AnyRecord).__replace, { handlesMap: true, mirrorLayoutMap: true });
  const metaInfo = extractConfigPatchWriteMetadata({ ...patch, __snapshot: true } as AnyRecord);
  assert.equal(metaInfo.snapshot, true);
  assert.deepEqual(metaInfo.clean, { width: 120 });
  assert.deepEqual(metaInfo.replace, { handlesMap: true, mirrorLayoutMap: true });

  const patchOut = applyConfigPatch(App, { height: 240 }, { source: 'apply:patch' } as any);
  assert.deepEqual(patchOut, { height: 240 });
  assert.equal(state.config.height, 240);

  const batchOut = cfgBatch(
    App,
    () => {
      calls.push(['insideBatch']);
      return 42;
    },
    { source: 'cfg:batch' } as any
  );
  assert.equal(batchOut, 42);

  assert.deepEqual(calls, [
    [
      'setConfig',
      { handlesMap: { a: 'bar', b: 'knob' }, __replace: { handlesMap: true } },
      { source: 'set:map' },
    ],
    [
      'setConfig',
      { handlesMap: { a: 'bar', b: 'knob', c: 'pull' }, __replace: { handlesMap: true } },
      { source: 'patch:map' },
    ],
    ['patch', { height: 240 }, { source: 'apply:patch' }],
    ['batch', { source: 'cfg:batch' }],
    ['insideBatch'],
  ]);
});
