import test from 'node:test';
import assert from 'node:assert/strict';

import {
  bootProEntryRuntime,
  createEntryBrowserDeps,
  resolveBootEnv,
} from '../esm/entry_pro_main_runtime.ts';

const THREE_NS = {
  Group: class {},
  Mesh: class {},
  Vector3: class {},
  BoxGeometry: class {},
  PlaneGeometry: class {},
  CylinderGeometry: class {},
  EdgesGeometry: class {},
};

test('entry_pro_main_runtime resolves env and creates browser deps deterministically', () => {
  const env = resolveBootEnv({ window: null, document: null });
  assert.equal(env.window, null);
  assert.equal(env.document, null);

  const deps = createEntryBrowserDeps(env, THREE_NS as any);
  assert.equal(deps.THREE, THREE_NS as any);
  assert.ok(deps.browser);
});

test('entry_pro_main_runtime wires boot deps and browser setup through canonical runtime owner', async () => {
  const calls: string[] = [];
  const runtimeConfig = { cacheBudgetMb: 256 };
  const runtimeFlags = { featureA: true };
  const app = { ok: true } as any;

  const out = await bootProEntryRuntime(
    { window: null, document: null },
    {
      bootEsm: async ({ deps }) => {
        calls.push('bootEsm');
        assert.equal(deps.THREE, THREE_NS as any);
        assert.equal((deps.config as any).cacheBudgetMb, 256);
        assert.equal((deps.flags as any).featureA, true);
        return app;
      },
      loadThreeEsm: async () => {
        calls.push('loadThreeEsm');
        return THREE_NS as any;
      },
      loadRuntimeConfigModule: async () => {
        calls.push('loadRuntimeConfigModule');
        return { config: runtimeConfig as any, flags: runtimeFlags as any };
      },
      mergeRuntimeFlags: (deps, flags) => {
        calls.push('mergeRuntimeFlags');
        deps.flags = { ...(deps.flags || {}), ...(flags || {}) };
      },
      buildRuntimeConfig: (_doc, mod) => {
        calls.push('buildRuntimeConfig');
        return (mod.config || {}) as any;
      },
      validateRuntimeDeps: deps => {
        calls.push('validateRuntimeDeps');
        assert.equal((deps.config as any).cacheBudgetMb, 256);
      },
      runBrowserBootSetup: async ({ app: runtimeApp, report }) => {
        calls.push('runBrowserBootSetup');
        assert.equal(runtimeApp, app);
        report(new Error('soft'), { op: 'setup', phase: 'boot' });
      },
      classifyFailure: (err, ctx) => ({
        kind: 'boot',
        message: String((err as Error)?.message || err),
        error: err,
        context: ctx,
      }),
      showFatalOverlayMaybe: async () => true,
      reportOverlayFailurePreservingOriginal: (_win, _overlayErr, _meta, originalErr) => {
        throw originalErr;
      },
      bootReportBestEffort: (_win, _err, meta) => {
        calls.push(`report:${meta.phase}:${meta.op}`);
      },
    }
  );

  assert.equal(out, app);
  assert.deepEqual(calls, [
    'loadThreeEsm',
    'loadRuntimeConfigModule',
    'mergeRuntimeFlags',
    'buildRuntimeConfig',
    'validateRuntimeDeps',
    'bootEsm',
    'runBrowserBootSetup',
    'report:boot:setup',
  ]);
});

test('entry_pro_main_runtime preserves original boot error when overlay reporting fails', async () => {
  const err = new Error('boot crash');
  await assert.rejects(
    () =>
      bootProEntryRuntime(
        { window: null, document: null },
        {
          bootEsm: async () => {
            throw err;
          },
          loadThreeEsm: async () => THREE_NS as any,
          loadRuntimeConfigModule: async () => ({ config: null, flags: null }),
          mergeRuntimeFlags: () => {},
          buildRuntimeConfig: () => ({}) as any,
          validateRuntimeDeps: () => {},
          runBrowserBootSetup: async () => {},
          classifyFailure: (_failure, ctx) => ({ kind: 'boot', message: 'boom', context: ctx }),
          showFatalOverlayMaybe: async () => {
            throw new Error('overlay failed');
          },
          reportOverlayFailurePreservingOriginal: (_win, overlayErr, _meta, originalErr) => {
            assert.match(String((overlayErr as Error).message), /overlay failed/);
            throw originalErr;
          },
          bootReportBestEffort: () => {},
        }
      ),
    /boot crash/
  );
});

test('entry_pro_main_runtime routes runtime config validation failures through the boot overlay', async () => {
  const validationError = new Error('invalid deployment config');
  const calls: string[] = [];

  await assert.rejects(
    () =>
      bootProEntryRuntime(
        { window: null, document: null },
        {
          bootEsm: async () => {
            calls.push('bootEsm');
            return {} as any;
          },
          loadThreeEsm: async () => THREE_NS as any,
          loadRuntimeConfigModule: async () => ({ config: {}, flags: {} }),
          mergeRuntimeFlags: () => {},
          buildRuntimeConfig: () => ({}),
          validateRuntimeDeps: () => {
            throw validationError;
          },
          runBrowserBootSetup: async () => {},
          classifyFailure: (error, context) => ({
            kind: 'boot',
            message: String((error as Error).message),
            error,
            context,
          }),
          showFatalOverlayMaybe: async (_win, _doc, error) => {
            calls.push(`overlay:${String((error as Error).message)}`);
            return true;
          },
          reportOverlayFailurePreservingOriginal: (_win, _overlay, _meta, original) => {
            throw original;
          },
          bootReportBestEffort: () => {},
        }
      ),
    validationError
  );

  assert.deepEqual(calls, ['overlay:invalid deployment config']);
});
