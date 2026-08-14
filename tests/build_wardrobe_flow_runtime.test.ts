import test from 'node:test';
import assert from 'node:assert/strict';

import { runPreparedBuildWardrobeFlow } from '../esm/native/builder/build_wardrobe_flow_runtime.ts';
import { createBuildFlowOrchestrationContext } from '../esm/native/builder/build_app_context.ts';
import { withSuppressedConsole } from './_console_silence.ts';

function captureThrownValue(run: () => unknown): unknown {
  let didThrow = false;
  let thrownValue: unknown;
  try {
    run();
  } catch (error) {
    didThrow = true;
    thrownValue = error;
  }
  assert.equal(didThrow, true, 'expected callback to throw');
  return thrownValue;
}

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
      reportSecondaryFailure: (_label: string, error: unknown, context: { operation: string }) =>
        orchestrationCalls.push(`secondary:${context.operation}:${String((error as Error).message)}`),
      beginConstructionCorrectionFeedback() {},
      completeConstructionCorrectionFeedback(_publish: boolean) {},
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

test('build wardrobe flow runtime batches correction feedback across execute and finalize', () => {
  const prepared = createPrepared();
  const calls: string[] = [];
  prepared.orchestration.beginConstructionCorrectionFeedback = () => calls.push('feedback.begin');
  prepared.orchestration.completeConstructionCorrectionFeedback = (publish: boolean) =>
    calls.push(`feedback.complete:${String(publish)}`);

  runPreparedBuildWardrobeFlow(prepared, {
    execute: () => {
      calls.push('execute');
      return { id: 'ctx' } as any;
    },
    finalizeBuild: () => {
      calls.push('finalize');
    },
  });

  assert.deepEqual(calls, ['feedback.begin', 'execute', 'finalize', 'feedback.complete:true']);
});

test('build wardrobe flow runtime discards batched correction feedback when finalization fails', () => {
  const prepared = createPrepared();
  const calls: string[] = [];
  prepared.orchestration.beginConstructionCorrectionFeedback = () => calls.push('feedback.begin');
  prepared.orchestration.completeConstructionCorrectionFeedback = (publish: boolean) =>
    calls.push(`feedback.complete:${String(publish)}`);

  assert.throws(
    () =>
      runPreparedBuildWardrobeFlow(prepared, {
        execute: () => ({ id: 'ctx' }) as any,
        finalizeBuild: () => {
          throw new Error('finalize failed');
        },
      }),
    /finalize failed/
  );

  assert.deepEqual(calls, ['feedback.begin', 'feedback.complete:false']);
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

test('build wardrobe flow runtime: reporter failure cannot replace the original build error', () => {
  const prepared = createPrepared();
  const originalError = new Error('original-error');

  assert.throws(
    () =>
      runPreparedBuildWardrobeFlow(prepared, {
        execute: () => {
          throw originalError;
        },
        reportBuildFailure: () => {
          throw new Error('reporter-error');
        },
        finalizeBuildBestEffort: () => {},
      }),
    error => {
      assert.equal(error, originalError);
      return true;
    }
  );
  assert.deepEqual(prepared.orchestrationCalls, ['secondary:build-failure-report:reporter-error']);
});

test('build wardrobe flow runtime: falsy build errors survive reporter failure and best-effort finalize', () => {
  for (const thrownValue of [0, '', false, null, undefined]) {
    const prepared = createPrepared();
    const calls: string[] = [];

    const caught = captureThrownValue(() =>
      runPreparedBuildWardrobeFlow(prepared, {
        execute: () => {
          throw thrownValue;
        },
        reportBuildFailure: () => {
          throw new Error('reporter-error');
        },
        finalizeBuildBestEffort: () => {
          calls.push('bestEffort');
        },
      })
    );

    assert.equal(Object.is(caught, thrownValue), true);
    assert.deepEqual(calls, ['bestEffort']);
    assert.deepEqual(prepared.orchestrationCalls, ['secondary:build-failure-report:reporter-error']);
  }
});

test('build wardrobe flow runtime: fail-fast toast failure stays secondary to the build error', () => {
  const reports: Array<{ error: unknown; context: any }> = [];
  const App: any = {
    services: {
      platform: {
        reportError(error: unknown, context: unknown) {
          reports.push({ error, context });
        },
      },
    },
    store: {
      getState: () => ({ runtime: { failFast: true } }),
    },
  };
  const prepared = createPrepared();
  prepared.App = App;
  prepared.orchestration = createBuildFlowOrchestrationContext(App);
  prepared.deps.showToast = () => {
    throw new Error('toast-error');
  };
  const originalError = new Error('original-error');

  assert.throws(
    () =>
      runPreparedBuildWardrobeFlow(prepared, {
        execute: () => {
          throw originalError;
        },
        finalizeBuildBestEffort: () => {},
      }),
    error => {
      assert.equal(error, originalError);
      return true;
    }
  );
  assert.equal(reports[0]?.error, originalError);
  assert.equal((reports[1]?.error as Error)?.message, 'toast-error');
  assert.equal(reports[1]?.context?.operation, 'toast');
  assert.equal(reports[1]?.context?.originalError, originalError);
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

test('build wardrobe flow runtime: finalize reporter failure cannot replace the finalize error', () => {
  const prepared = createPrepared();
  const finalizeError = new Error('finalize-error');
  prepared.orchestration.reportFinalizeFailure = () => {
    throw new Error('finalize-reporter-error');
  };

  assert.throws(
    () =>
      runPreparedBuildWardrobeFlow(prepared, {
        execute: () => ({ id: 'ctx' }) as any,
        finalizeBuild: () => {
          throw finalizeError;
        },
      }),
    error => {
      assert.equal(error, finalizeError);
      return true;
    }
  );
  assert.deepEqual(prepared.orchestrationCalls, [
    'secondary:finalize-failure-report:finalize-reporter-error',
  ]);
});

test('build wardrobe flow runtime: falsy finalize errors remain authoritative when reporting throws', () => {
  for (const thrownValue of [0, '', false, null, undefined]) {
    const prepared = createPrepared();
    prepared.orchestration.reportFinalizeFailure = () => {
      throw new Error('finalize-reporter-error');
    };

    const caught = captureThrownValue(() =>
      runPreparedBuildWardrobeFlow(prepared, {
        execute: () => ({ id: 'ctx' }) as any,
        finalizeBuild: () => {
          throw thrownValue;
        },
      })
    );

    assert.equal(Object.is(caught, thrownValue), true);
    assert.deepEqual(prepared.orchestrationCalls, [
      'secondary:finalize-failure-report:finalize-reporter-error',
    ]);
  }
});
