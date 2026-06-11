import test from 'node:test';
import assert from 'node:assert/strict';

import { patchUi, setUiScalarSoft } from '../esm/native/runtime/ui_write_access.ts';
import { setRuntimeSketchMode } from '../esm/native/runtime/runtime_write_access.ts';
import { setModePrimary } from '../esm/native/runtime/mode_write_access.ts';
import { patchSliceWithStoreFallback } from '../esm/native/runtime/slice_write_access.ts';

function createCallLog() {
  /** @type {Array<Record<string, unknown>>} */
  return [];
}

test('[wave1] ui write seam prefers slice namespace patch and preserves UI-only soft meta defaults', () => {
  const calls = createCallLog();
  const App = {
    actions: {
      ui: {
        patch(patch, meta) {
          calls.push({ op: 'ui.patch', patch, meta });
          return { via: 'ui.patch' };
        },
        setScalar(key, value, meta) {
          calls.push({ op: 'ui.setScalar', key, value, meta });
          return { via: 'ui.setScalar' };
        },
      },
      patch(patch, meta) {
        calls.push({ op: 'actions.patch', patch, meta });
        return { via: 'actions.patch' };
      },
    },
    store: {
      setUi(patch, meta) {
        calls.push({ op: 'store.setUi', patch, meta });
        return { via: 'store.setUi' };
      },
      patch(patch, meta) {
        calls.push({ op: 'store.patch', patch, meta });
        return { via: 'store.patch' };
      },
    },
  };

  assert.deepEqual(patchUi(App, { activeTab: 'design' }, { source: 'ui:patch' }), { via: 'ui.patch' });
  assert.deepEqual(calls, [{ op: 'ui.patch', patch: { activeTab: 'design' }, meta: { source: 'ui:patch' } }]);

  calls.length = 0;
  assert.deepEqual(setUiScalarSoft(App, 'showContents', true, { source: 'ui:soft' }), {
    via: 'ui.setScalar',
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].op, 'ui.setScalar');
  assert.equal(calls[0].key, 'showContents');
  assert.equal(calls[0].value, true);
  assert.equal(calls[0].meta?.source, 'ui:soft');
  assert.equal(calls[0].meta?.uiOnly, true);
  assert.equal(calls[0].meta?.noBuild, true);
  assert.equal(calls[0].meta?.noPersist, true);
  assert.equal(calls[0].meta?.noHistory, true);
  assert.equal(calls[0].meta?.noCapture, true);
  assert.equal(calls[0].meta?.noAutosave, true);
});

test('[wave1] runtime + mode write seams use canonical store-backed routes without touching legacy root aliases', () => {
  const calls = createCallLog();
  const App = {
    modes: { NONE: 'none' },
    actions: {
      setRuntimeScalar(key, value, meta) {
        calls.push({ op: 'actions.setRuntimeScalar', key, value, meta });
        return { via: 'actions.setRuntimeScalar' };
      },
    },
    store: {
      setRuntime(patch, meta) {
        calls.push({ op: 'store.setRuntime', patch, meta });
        return { via: 'store.setRuntime' };
      },
      setModePatch(patch, meta) {
        calls.push({ op: 'store.setModePatch', patch, meta });
        return { via: 'store.setModePatch' };
      },
      patch(patch, meta) {
        calls.push({ op: 'store.patch', patch, meta });
        return { via: 'store.patch' };
      },
    },
  };

  assert.deepEqual(setRuntimeSketchMode(App, 1, { source: 'runtime:sketch' }), { via: 'store.patch' });
  assert.deepEqual(calls[0], {
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
  });
  assert.equal(
    calls.some(call => call.op === 'actions.setRuntimeScalar'),
    false
  );

  calls.length = 0;
  assert.deepEqual(setModePrimary(App, '', { slot: 'left' }, { source: 'mode:set' }), {
    via: 'store.setModePatch',
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

test('[wave1] slice write router no-ops on empty patches and uses the canonical root patch seam for UI/runtime store fallbacks', () => {
  const calls = createCallLog();
  const App = {
    actions: {
      ui: {
        patch(patch, meta) {
          calls.push({ op: 'ui.patch', patch, meta });
          return { via: 'ui.patch' };
        },
      },
      patch(patch, meta) {
        calls.push({ op: 'actions.patch', patch, meta });
        return { via: 'actions.patch' };
      },
    },
    store: {
      setUi(patch, meta) {
        calls.push({ op: 'store.setUi', patch, meta });
        return { via: 'store.setUi' };
      },
      patch(patch, meta) {
        calls.push({ op: 'store.patch', patch, meta });
        return { via: 'store.patch' };
      },
    },
  };

  assert.equal(
    patchSliceWithStoreFallback(
      App,
      'ui',
      {},
      { source: 'empty' },
      {
        storeWriter: 'setUi',
        preferStoreWriter: true,
        allowRootActionPatchFallback: true,
        allowRootStorePatchFallback: true,
      }
    ),
    undefined
  );
  assert.deepEqual(calls, []);

  assert.deepEqual(
    patchSliceWithStoreFallback(
      App,
      'ui',
      { activeTab: 'notes' },
      { source: 'writer:first' },
      {
        storeWriter: 'setUi',
        preferStoreWriter: true,
        allowRootActionPatchFallback: true,
        allowRootStorePatchFallback: true,
      }
    ),
    { via: 'store.patch' }
  );
  assert.deepEqual(calls, [
    { op: 'store.patch', patch: { ui: { activeTab: 'notes' } }, meta: { source: 'writer:first' } },
  ]);
});
