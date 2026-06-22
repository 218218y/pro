import test from 'node:test';
import assert from 'node:assert/strict';

import { setRuntimeSketchMode } from '../esm/native/runtime/runtime_write_access.ts';
import { setModePrimary } from '../esm/native/runtime/mode_write_access.ts';
import { applyPlatformBootFlagsToRuntime } from '../esm/native/platform/platform_boot.ts';
import { assertCanonicalKernelActions } from '../esm/boot/boot_manifest_shared.ts';

type AnyRecord = Record<string, unknown>;

test('[runtime-write-access] setRuntimeSketchMode requires the canonical runtime scalar action', () => {
  const calls: Array<{ op: string; key?: string; value?: unknown; meta?: AnyRecord }> = [];
  const App = {
    actions: {
      runtime: {
        setScalar(key: string, value: unknown, meta?: AnyRecord) {
          calls.push({ op: 'runtime.setScalar', key, value, meta });
          return { via: 'runtime.setScalar', key, value, meta };
        },
      },
    },
  } satisfies AnyRecord;

  const out = setRuntimeSketchMode(App, 1, { source: 'runtime:sketch' });

  assert.deepEqual(out, {
    via: 'runtime.setScalar',
    key: 'sketchMode',
    value: true,
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
      op: 'runtime.setScalar',
      key: 'sketchMode',
      value: true,
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

test('[mode-write-access] setModePrimary normalizes NONE and requires the canonical mode action', () => {
  const calls: Array<{ op: string; primary?: string; opts?: AnyRecord; meta?: AnyRecord }> = [];
  const App = {
    modes: { NONE: 'none' },
    actions: {
      mode: {
        set(primary: string, opts?: AnyRecord, meta?: AnyRecord) {
          calls.push({ op: 'mode.set', primary, opts, meta });
          return { via: 'mode.set', primary, opts, meta };
        },
      },
    },
  } satisfies AnyRecord;

  const out = setModePrimary(App, '', { slot: 'left' }, { source: 'mode:set' });

  assert.deepEqual(out, {
    via: 'mode.set',
    primary: 'none',
    opts: { slot: 'left' },
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
      op: 'mode.set',
      primary: 'none',
      opts: { slot: 'left' },
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

test('[write-access] runtime and mode writes reject incomplete action surfaces', () => {
  assert.throws(
    () => setRuntimeSketchMode({ actions: { runtime: {} } }, true),
    /Missing canonical action.*actions\.runtime\.setScalar/
  );
  assert.throws(
    () => setModePrimary({ actions: { mode: {} } }, 'paint'),
    /Missing canonical action.*actions\.mode\.set/
  );
});

test('[platform-boot] runtime flags are applied only through the installed runtime action', () => {
  const calls: Array<{ patch: AnyRecord; meta?: AnyRecord }> = [];
  const App = {
    deps: {
      flags: { debug: true, verboseConsoleErrors: false, verboseConsoleErrorsDedupeMs: 250 },
      browser: { window: { location: { search: '' } } },
    },
    platform: {},
    actions: {
      runtime: {
        patch(patch: AnyRecord, meta?: AnyRecord) {
          calls.push({ patch, meta });
        },
      },
    },
  } satisfies AnyRecord;

  applyPlatformBootFlagsToRuntime(App as never);

  assert.deepEqual(calls[0]?.patch, {
    verboseConsoleErrors: false,
    verboseConsoleErrorsDedupeMs: 250,
    debug: true,
  });
  assert.equal(calls[0]?.meta?.source, 'platform:bootFlags');
});

test('[boot-actions] canonical action assertion rejects incomplete write namespaces', () => {
  const completeActions = {
    ui: {
      patch() {},
      patchSoft() {},
      setScalar() {},
      setScalarSoft() {},
      setRawScalar() {},
    },
    runtime: { patch() {}, setScalar() {} },
    config: { patch() {} },
    mode: { patch() {}, set() {} },
    modules: { patchForStack() {} },
  };

  assert.doesNotThrow(() => assertCanonicalKernelActions({ actions: completeActions } as never));
  assert.throws(
    () =>
      assertCanonicalKernelActions({
        actions: { ...completeActions, ui: { ...completeActions.ui, setRawScalar: undefined } },
      } as never),
    /Missing canonical kernel action ui\.setRawScalar/
  );
});
