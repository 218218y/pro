import test from 'node:test';
import assert from 'node:assert/strict';

import { runCoalescedBuild } from '../esm/native/builder/build_runner.ts';

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

function createBuildRunnerHarness(onRun: (state: any, buildWardrobe: (state: any) => unknown) => void) {
  const runs: string[] = [];
  const App: any = {
    services: {
      builder: {},
    },
  };

  const buildWardrobe: any = function buildWardrobe(state: any) {
    return runCoalescedBuild({
      App,
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
      App,
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
