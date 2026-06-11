import test from 'node:test';
import assert from 'node:assert/strict';

import { runPreparedBuildWardrobeFlow } from '../esm/native/builder/build_wardrobe_flow_runtime.ts';
import { withSuppressedConsole } from './_console_silence.ts';

function createPrepared() {
  const App: any = {};
  return {
    App,
    label: 'native/builder/test',
    deps: {
      pruneCachesSafe() {},
      triggerRender() {},
      rebuildDrawerMeta() {},
      showToast() {},
    },
  } as any;
}

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
