import test from 'node:test';
import assert from 'node:assert/strict';

import { runPreparedBuildWardrobeFlow } from '../esm/native/builder/build_wardrobe_flow_runtime.ts';
import { withSuppressedConsole } from './_console_silence.ts';

function createPrepared() {
  const App: any = {};
  const orchestrationCalls: string[] = [];
  return {
    App,
    orchestrationCalls,
    orchestration: {
      reportBuildFailure: (_label: string, error: unknown) =>
        orchestrationCalls.push(`report:${String((error as Error).message)}`),
      reportFinalizeFailure: (_label: string, error: unknown) =>
        orchestrationCalls.push(`finalize-report:${String((error as Error).message)}`),
      finalizeBestEffort: () => orchestrationCalls.push('bestEffort'),
    },
    label: 'native/builder/test',
    deps: {
      pruneCachesSafe() {},
      rebuildDrawerMeta(_snapshot: unknown) {},
      showToast() {},
    },
    buildState: {
      drawerRebuildSnapshot: {
        primaryMode: 'divider',
        forcedOpenDrawerId: 'int_4',
        intent: { targetId: 'int_4', version: 1 },
      },
    },
  } as any;
}

test('build wardrobe flow runtime uses orchestration ports without reading App', () => {
  const prepared = createPrepared();
  const boom = new Error('port-owned failure');

  assert.throws(
    () =>
      runPreparedBuildWardrobeFlow(prepared, {
        execute: () => {
          throw boom;
        },
      }),
    error => {
      assert.equal(error, boom);
      return true;
    }
  );
  assert.deepEqual(prepared.orchestrationCalls, ['report:port-owned failure', 'bestEffort']);
});

test('build wardrobe flow runtime: successful execute finalizes canonical build context path', () => {
  const prepared = createPrepared();
  const calls: string[] = [];
  const buildCtx = { id: 'ctx' } as any;

  const result = runPreparedBuildWardrobeFlow(prepared, {
    execute: () => buildCtx,
    finalizeBuild: ctx => {
      calls.push(`finalize:${String((ctx as any).id || '')}`);
    },
    finalizeBuildBestEffort: () => {
      calls.push('bestEffort');
    },
  });

  assert.equal(result, buildCtx);
  assert.deepEqual(calls, ['finalize:ctx']);
});

test('build wardrobe flow runtime: build failure still runs best-effort finalize and rethrows original error', () => {
  const prepared = createPrepared();
  const calls: string[] = [];
  const boom = new Error('boom');

  assert.throws(
    () =>
      runPreparedBuildWardrobeFlow(prepared, {
        execute: () => {
          throw boom;
        },
        reportBuildFailure: (_prepared, error) => {
          calls.push(`report:${String((error as Error).message)}`);
        },
        finalizeBuild: () => {
          calls.push('finalize');
        },
        finalizeBuildBestEffort: () => {
          calls.push('bestEffort');
        },
      }),
    /boom/
  );

  assert.deepEqual(calls, ['report:boom', 'bestEffort']);
});

test('build wardrobe flow runtime: finalize failure is surfaced after a successful execute', async () => {
  const prepared = createPrepared();
  const buildCtx = { id: 'ctx' } as any;
  const finalizeBoom = new Error('finalize failed');

  await withSuppressedConsole(async () => {
    assert.throws(
      () =>
        runPreparedBuildWardrobeFlow(prepared, {
          execute: () => buildCtx,
          finalizeBuild: () => {
            throw finalizeBoom;
          },
        }),
      /finalize failed/
    );
  });
});
