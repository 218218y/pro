import test from 'node:test';
import assert from 'node:assert/strict';

import { runCoalescedBuild } from '../esm/native/builder/build_runner.ts';
import { createBuildRunnerRuntimeContext } from '../esm/native/builder/build_app_context.ts';
import type { BuildRunnerRuntimeContext } from '../esm/native/builder/build_runner_runtime.ts';

function createState(signature: string, activeId = '', forceBuild = false) {
  return {
    build: { signature },
    ui: {
      ...(activeId ? { __activeId: activeId } : {}),
      ...(forceBuild ? { forceBuild: true } : {}),
    },
  };
}

async function flushMicrotasks(count = 3) {
  for (let i = 0; i < count; i += 1) {
    await Promise.resolve();
  }
}

function createRuntimeContext(overrides: Partial<BuildRunnerRuntimeContext> = {}): {
  context: BuildRunnerRuntimeContext;
  diagnostics: string[];
} {
  const diagnostics: string[] = [];
  return {
    diagnostics,
    context: {
      readShadowMap: () => null,
      reportSoftError: where => diagnostics.push(where),
      runPostBuildReactions: () => {},
      scheduleMicrotask: fn => queueMicrotask(fn),
      replayBuild: () => {},
      ...overrides,
    },
  };
}

function runBuildWithPendingReplay(args: { context: BuildRunnerRuntimeContext; error?: Error }): unknown {
  let nested = false;
  const buildWardrobe: any = (state: any) =>
    runCoalescedBuild({
      context: args.context,
      bwFn: buildWardrobe,
      args: [state],
      run: () => {
        if (!nested) {
          nested = true;
          buildWardrobe(createState('sig:pending'));
        }
        if (args.error) throw args.error;
        return state;
      },
    });
  return buildWardrobe(createState('sig:current'));
}

function createBuildRunnerHarness(onRun: (state: any, buildWardrobe: (state: any) => unknown) => void) {
  const runs: string[] = [];
  const App: any = {
    services: {
      builder: {},
    },
  };
  const context = createBuildRunnerRuntimeContext(App);

  const buildWardrobe: any = function buildWardrobe(state: any) {
    return runCoalescedBuild({
      context,
      bwFn: buildWardrobe,
      args: [state],
      run: () => {
        runs.push(`${String(state?.build?.signature || '')}|${String(state?.ui?.__activeId || '')}`);
        onRun(state, buildWardrobe);
        return state;
      },
    });
  };

  App.services.builder.buildWardrobe = buildWardrobe;
  return { App, runs, buildWardrobe };
}

test('build runner runtime: repeated same-signature requests during a running build do not schedule a second no-op build', async () => {
  const stateA = createState('sig:a');
  let nested = 0;
  const harness = createBuildRunnerHarness((_state, buildWardrobe) => {
    if (nested > 0) return;
    nested += 1;
    buildWardrobe(createState('sig:a'));
    buildWardrobe(createState('sig:a'));
  });

  harness.buildWardrobe(stateA);
  await flushMicrotasks();

  assert.deepEqual(harness.runs, ['sig:a|']);
});

test('build runner runtime: latest request that matches the running signature clears an older stale pending rerun', async () => {
  const stateA = createState('sig:a');
  const stateB = createState('sig:b');
  let nested = 0;
  const harness = createBuildRunnerHarness((_state, buildWardrobe) => {
    if (nested > 0) return;
    nested += 1;
    buildWardrobe(stateB);
    buildWardrobe(createState('sig:a'));
  });

  harness.buildWardrobe(stateA);
  await flushMicrotasks();

  assert.deepEqual(harness.runs, ['sig:a|']);
});

test('build runner runtime: different pending signature reruns exactly once after the current build finishes', async () => {
  const stateA = createState('sig:a');
  const stateB = createState('sig:b');
  let nested = 0;
  const harness = createBuildRunnerHarness((_state, buildWardrobe) => {
    if (nested > 0) return;
    nested += 1;
    buildWardrobe(stateB);
    buildWardrobe(createState('sig:b'));
  });

  harness.buildWardrobe(stateA);
  await flushMicrotasks();

  assert.deepEqual(harness.runs, ['sig:a|', 'sig:b|']);
});

test('build runner runtime: active element changes still rerun even when build.signature stays the same', async () => {
  const stateA = createState('sig:shared', 'alpha');
  const stateB = createState('sig:shared', 'beta');
  let nested = 0;
  const harness = createBuildRunnerHarness((_state, buildWardrobe) => {
    if (nested > 0) return;
    nested += 1;
    buildWardrobe(stateB);
  });

  harness.buildWardrobe(stateA);
  await flushMicrotasks();

  assert.deepEqual(harness.runs, ['sig:shared|alpha', 'sig:shared|beta']);
});

test('build runner runtime: structural config changes rerun even when build.signature stays the same', async () => {
  const stateA = {
    build: { signature: 'sig:shared-config' },
    ui: {},
    config: { individualColors: { body: '#ffffff' } },
  };
  const stateB = {
    build: { signature: 'sig:shared-config' },
    ui: {},
    config: { individualColors: { body: '#111111' } },
  };
  let nested = 0;
  const harness = createBuildRunnerHarness((_state, buildWardrobe) => {
    if (nested > 0) return;
    nested += 1;
    buildWardrobe(stateB);
  });

  harness.buildWardrobe(stateA);
  await flushMicrotasks();

  assert.deepEqual(harness.runs, ['sig:shared-config|', 'sig:shared-config|']);
});

test('build runner runtime: shadow autoUpdate is restored and post-build reactions still run when the build throws', () => {
  const afterBuild: boolean[] = [];
  const App: any = {
    render: {
      renderer: {
        shadowMap: { autoUpdate: true },
      },
    },
    services: {
      builder: {},
      buildReactions: {
        afterBuild(ok: boolean) {
          afterBuild.push(ok);
        },
      },
    },
  };

  const buildWardrobe: any = function buildWardrobe(state: any) {
    return runCoalescedBuild({
      context: createBuildRunnerRuntimeContext(App),
      bwFn: buildWardrobe,
      args: [state],
      run: () => {
        throw new Error('build failed');
      },
    });
  };

  App.services.builder.buildWardrobe = buildWardrobe;

  assert.throws(() => buildWardrobe(createState('sig:throw')), /build failed/);
  assert.equal(App.render.renderer.shadowMap.autoUpdate, true);
  assert.deepEqual(afterBuild, [false]);
});

test('build runner runtime: a failing reaction observer cannot change a successful build result', () => {
  const App: any = {
    render: { renderer: { shadowMap: { autoUpdate: true } } },
    services: {
      builder: {},
      buildReactions: {
        afterBuild() {
          throw new Error('observer failed');
        },
      },
    },
  };
  const context = createBuildRunnerRuntimeContext(App);
  const expected = { committed: true };
  const buildWardrobe: any = () =>
    runCoalescedBuild({
      context,
      bwFn: buildWardrobe,
      args: [expected],
      run: () => expected,
    });
  App.services.builder.buildWardrobe = buildWardrobe;

  assert.equal(buildWardrobe(), expected);
  assert.equal(App.render.renderer.shadowMap.autoUpdate, true);
});

test('build runner runtime: synchronous replay scheduling failure cannot change a successful build', () => {
  const harness = createRuntimeContext({
    scheduleMicrotask: () => {
      throw new Error('scheduler unavailable');
    },
  });

  assert.deepEqual(runBuildWithPendingReplay({ context: harness.context }), createState('sig:current'));
  assert.deepEqual(harness.diagnostics, ['native/builder/build_runner.replaySchedule']);
});

test('build runner runtime: replay scheduling failure preserves the original build error', () => {
  const original = new Error('original build failure');
  const harness = createRuntimeContext({
    scheduleMicrotask: () => {
      throw new Error('scheduler unavailable');
    },
  });

  assert.throws(
    () => runBuildWithPendingReplay({ context: harness.context, error: original }),
    error => {
      assert.equal(error, original);
      return true;
    }
  );
  assert.deepEqual(harness.diagnostics, ['native/builder/build_runner.replaySchedule']);
});

test('build runner runtime: replay callback failure is contained and reported', () => {
  const scheduled: Array<() => void> = [];
  const harness = createRuntimeContext({
    scheduleMicrotask: fn => scheduled.push(fn),
    replayBuild: () => {
      throw new Error('replay failed');
    },
  });

  assert.deepEqual(runBuildWithPendingReplay({ context: harness.context }), createState('sig:current'));
  assert.equal(scheduled.length, 1);
  assert.doesNotThrow(() => scheduled[0]?.());
  assert.deepEqual(harness.diagnostics, ['native/builder/build_runner.replay']);
});

test('build runner runtime: reaction and replay failures remain secondary to build success', () => {
  const harness = createRuntimeContext({
    runPostBuildReactions: () => {
      throw new Error('reaction failed');
    },
    scheduleMicrotask: () => {
      throw new Error('scheduler failed');
    },
  });

  assert.deepEqual(runBuildWithPendingReplay({ context: harness.context }), createState('sig:current'));
  assert.deepEqual(harness.diagnostics, [
    'native/builder/build_runner.afterBuildReactions',
    'native/builder/build_runner.replaySchedule',
  ]);
});

test('build runner runtime: Promise-returning build callbacks fail the synchronous invariant', async () => {
  const harness = createRuntimeContext();
  const buildWardrobe: any = () =>
    runCoalescedBuild({
      context: harness.context,
      bwFn: buildWardrobe,
      args: [],
      run: async () => ({ committed: true }),
    });

  assert.throws(() => buildWardrobe(), /Build callback must be synchronous/);
  await flushMicrotasks();
});
