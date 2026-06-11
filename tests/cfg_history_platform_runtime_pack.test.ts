import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyConfigPatch,
  cfgBatch,
  cfgPatchWithReplaceKeys,
  cfgSetMap,
  extractConfigPatchWriteMetadata,
  patchConfigMap,
} from '../esm/native/runtime/cfg_access.ts';

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
        setMap(name: string, next: AnyRecord, meta?: AnyRecord) {
          calls.push(['setMap', name, { ...next }, meta || null]);
          state.config[name] = { ...next };
          return state.config[name];
        },
        patchMap(
          name: string,
          patchOrFn: AnyRecord | ((draft: AnyRecord, cur: AnyRecord) => unknown),
          meta?: AnyRecord
        ) {
          const cur = { ...(state.config[name] || {}) };
          const draft = { ...cur };
          const patch = typeof patchOrFn === 'function' ? patchOrFn(draft, cur) : patchOrFn;
          for (const key of Object.keys(patch || {})) {
            const value = (patch as AnyRecord)[key];
            if (value === undefined || value === null) delete draft[key];
            else draft[key] = value;
          }
          state.config[name] = draft;
          calls.push(['patchMap', name, { ...draft }, meta || null]);
          return draft;
        },
      },
      history: {
        batch(fn: () => unknown, meta?: AnyRecord) {
          calls.push(['batch', meta || null]);
          return fn();
        },
      },
      meta: {
        merge(meta?: AnyRecord, defaults?: AnyRecord, sourceFallback?: string) {
          return {
            ...(defaults || {}),
            ...(meta || {}),
            source: meta?.source || defaults?.source || sourceFallback || 'config',
          };
        },
      },
    },
    store: {
      getState: () => state,
      setConfig(patch: AnyRecord) {
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
    ['setMap', 'handlesMap', { a: 'bar', b: 'knob' }, { source: 'set:map' }],
    ['patchMap', 'handlesMap', { a: 'bar', b: 'knob', c: 'pull' }, { source: 'patch:map' }],
    ['patch', { height: 240 }, { source: 'apply:patch' }],
    ['batch', { source: 'cfg:batch' }],
    ['insideBatch'],
  ]);
});
