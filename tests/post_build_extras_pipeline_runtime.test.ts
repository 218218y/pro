import test from 'node:test';
import assert from 'node:assert/strict';

import { createBuildContext } from '../esm/native/builder/build_context.ts';
import { applyPostBuildExtras } from '../esm/native/builder/post_build_extras_pipeline.ts';

function createPostBuildContext(App: any, overrides: Record<string, unknown> = {}) {
  return createBuildContext({
    App,
    cfg: {},
    runtime: { doorsOpen: true },
    flags: { globalClickMode: true },
    dims: { doorsCount: 2 },
    materials: {},
    fns: {},
    ...overrides,
  });
}

test('post-build extras: global click mode syncs door visuals when the canonical owner is installed', () => {
  const calls: any[] = [];
  const App: any = {
    services: {
      doors: {
        syncVisualsNow(opts?: unknown) {
          calls.push({ op: 'syncVisualsNow', opts });
        },
        snapDrawersToTargets() {
          calls.push({ op: 'snapDrawersToTargets' });
        },
      },
    },
  };

  applyPostBuildExtras(createPostBuildContext(App));

  assert.deepEqual(calls, [{ op: 'syncVisualsNow', opts: { open: true } }]);
});

test('post-build extras: global click mode uses drawer snap only as a narrow missing-door-sync recovery', () => {
  const calls: any[] = [];
  const App: any = {
    services: {
      doors: {
        snapDrawersToTargets() {
          calls.push({ op: 'snapDrawersToTargets' });
        },
      },
    },
  };

  applyPostBuildExtras(createPostBuildContext(App));

  assert.deepEqual(calls, [{ op: 'snapDrawersToTargets' }]);
});

test('post-build extras: local click mode applies local state before edit-hold restoration', () => {
  const calls: any[] = [];
  const App: any = {
    services: {
      doors: {
        applyLocalOpenStateAfterBuild() {
          calls.push({ op: 'applyLocalOpenStateAfterBuild' });
        },
        syncVisualsNow() {
          calls.push({ op: 'syncVisualsNow' });
        },
        applyEditHoldAfterBuild() {
          calls.push({ op: 'applyEditHoldAfterBuild' });
        },
      },
    },
  };

  applyPostBuildExtras(
    createPostBuildContext(App, {
      flags: { globalClickMode: false, hadEditHold: true },
      runtime: { doorsOpen: false },
    })
  );

  assert.deepEqual(calls, [
    { op: 'applyLocalOpenStateAfterBuild' },
    { op: 'syncVisualsNow' },
    { op: 'applyEditHoldAfterBuild' },
  ]);
});
