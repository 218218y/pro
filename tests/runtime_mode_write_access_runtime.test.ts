import test from 'node:test';
import assert from 'node:assert/strict';

import { setRuntimeSketchMode } from '../esm/native/runtime/runtime_write_access.ts';
import { setModePrimary } from '../esm/native/runtime/mode_write_access.ts';

type AnyRecord = Record<string, unknown>;

test('[runtime-write-access] setRuntimeSketchMode falls back to canonical runtime patch semantics with transient meta', () => {
  const calls: Array<{ op: string; patch?: AnyRecord; meta?: AnyRecord }> = [];
  const App = {
    actions: {},
    store: {
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'store.patch', patch, meta });
        return { via: 'store.patch', patch, meta };
      },
    },
  } satisfies AnyRecord;

  const out = setRuntimeSketchMode(App, 1, { source: 'runtime:sketch' });

  assert.deepEqual(out, {
    via: 'store.patch',
    patch: { runtime: { sketchMode: true } },
    meta: {
      source: 'runtime:sketch',
      noBuild: true,
      noAutosave: true,
      noPersist: true,
      noHistory: true,
      noCapture: true,
    },
  });
  assert.deepEqual(calls, [
    {
      op: 'store.patch',
      patch: { runtime: { sketchMode: true } },
      meta: {
        source: 'runtime:sketch',
        noBuild: true,
        noAutosave: true,
        noPersist: true,
        noHistory: true,
        noCapture: true,
      },
    },
  ]);
});

test('[mode-write-access] setModePrimary normalizes NONE and prefers canonical store mode patches', () => {
  const calls: Array<{ op: string; patch?: AnyRecord; meta?: AnyRecord }> = [];
  const App = {
    modes: { NONE: 'none' },
    actions: {},
    store: {
      setModePatch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'store.setModePatch', patch, meta });
        return { via: 'store.setModePatch', patch, meta };
      },
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'store.patch', patch, meta });
        return { via: 'store.patch', patch, meta };
      },
    },
  } satisfies AnyRecord;

  const out = setModePrimary(App, '', { slot: 'left' }, { source: 'mode:set' });

  assert.deepEqual(out, {
    via: 'store.setModePatch',
    patch: { primary: 'none', opts: { slot: 'left' } },
    meta: {
      source: 'mode:set',
      noBuild: true,
      noAutosave: true,
      noPersist: true,
      noHistory: true,
      noCapture: true,
    },
  });
  assert.deepEqual(calls, [
    {
      op: 'store.setModePatch',
      patch: { primary: 'none', opts: { slot: 'left' } },
      meta: {
        source: 'mode:set',
        noBuild: true,
        noAutosave: true,
        noPersist: true,
        noHistory: true,
        noCapture: true,
      },
    },
  ]);
});
