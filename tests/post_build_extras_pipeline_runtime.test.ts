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

test('post-build extras: pending drawer rebuild intent defers drawer snapping to render-loop animation', () => {
  const calls: any[] = [];
  const App: any = {
    services: {
      drawer: { runtime: { snapAfterBuildId: 'int_4', openAfterBuildId: 'int_4' } },
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

  assert.deepEqual(calls, [{ op: 'syncVisualsNow', opts: { open: true, includeDrawers: false } }]);
});

test('post-build extras: pending drawer rebuild intent suppresses fallback drawer snap when door sync is missing', () => {
  const calls: any[] = [];
  const App: any = {
    services: {
      drawer: { runtime: { snapAfterBuildId: 'int_4', openAfterBuildId: 'int_4' } },
      doors: {
        snapDrawersToTargets() {
          calls.push({ op: 'snapDrawersToTargets' });
        },
      },
    },
  };

  applyPostBuildExtras(createPostBuildContext(App));

  assert.deepEqual(calls, []);
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

test('post-build extras: missing required corner-wing builder is reported before throwing', () => {
  const reports: Array<{ error: unknown; ctx: any }> = [];
  const App: any = {
    services: {
      platform: {
        reportError(error: unknown, ctx: any) {
          reports.push({ error, ctx });
        },
      },
    },
  };

  assert.throws(() => {
    applyPostBuildExtras(
      createPostBuildContext(App, {
        cfg: { showDimensions: false },
        flags: { isCornerMode: true, globalClickMode: false },
        dims: { doorsCount: 2, totalW: 100, cabinetBodyHeight: 200, D: 60, woodThick: 1.7, startY: 0 },
        materials: {},
        fns: {},
      })
    );
  }, /buildCornerWing is missing/);

  assert.equal(reports.length, 1);
  assert.equal(reports[0].ctx?.where, 'builder/post_build_extras');
  assert.equal(reports[0].ctx?.op, 'cornerWing.missingBuilder');
  assert.equal(reports[0].ctx?.fatal, true);
});

test('post-build extras: corner builds reject a missing config snapshot before invoking the builder', () => {
  let buildCalls = 0;
  const App: any = {};

  assert.throws(
    () =>
      applyPostBuildExtras(
        createPostBuildContext(App, {
          cfg: undefined,
          flags: { isCornerMode: true, globalClickMode: false },
          dims: {
            doorsCount: 2,
            totalW: 100,
            cabinetBodyHeight: 200,
            D: 60,
            woodThick: 1.7,
            startY: 0,
          },
          materials: {},
          fns: {
            buildCornerWing() {
              buildCalls += 1;
            },
          },
        })
      ),
    /cfgSnapshot is required/
  );

  assert.equal(buildCalls, 0);
});

test('post-build extras: corner builder rejects string-encoded BuildContext runtime dimensions', () => {
  let buildCalls = 0;
  const App: any = {};

  assert.throws(
    () =>
      applyPostBuildExtras(
        createPostBuildContext(App, {
          cfg: { showDimensions: false, cornerConfiguration: { layout: 'shelves' } },
          flags: { isCornerMode: true, globalClickMode: false },
          dims: {
            doorsCount: 2,
            totalW: '1.8',
            cabinetBodyHeight: 2.1,
            D: 0.6,
            woodThick: 0.018,
            shelfThick: 0.018,
            startY: 0,
          },
          materials: {},
          fns: {
            buildCornerWing() {
              buildCalls += 1;
            },
          },
        })
      ),
    /corner\.totalW must be a finite runtime number/
  );

  assert.equal(buildCalls, 0);
});

test('post-build extras: corner builder receives one canonical UI/config/mode/render snapshot', () => {
  let receivedMeta: any = null;
  const ui = { cornerWidth: 175, cornerSide: 'left' };
  const cfg = { showDimensions: false, cornerConfiguration: { layout: 'shelves' } };

  applyPostBuildExtras(
    createPostBuildContext(
      {},
      {
        state: { mode: { primary: 'remove_door' } },
        ui,
        cfg,
        flags: { isCornerMode: true, globalClickMode: false, sketchMode: true },
        dims: {
          doorsCount: 2,
          totalW: 1.8,
          cabinetBodyHeight: 2.1,
          D: 0.6,
          woodThick: 0.018,
          shelfThick: 0.018,
          startY: 0,
        },
        materials: {},
        fns: {
          addOutlines: () => undefined,
          buildCornerWing(...args: any[]) {
            receivedMeta = args[6];
          },
        },
      }
    )
  );

  assert.equal(receivedMeta.snapshot.ui, ui);
  assert.equal(receivedMeta.snapshot.cfg, cfg);
  assert.equal(receivedMeta.snapshot.primaryMode, 'remove_door');
  assert.equal(receivedMeta.snapshot.renderPolicy.sketchMode, true);
  assert.equal(typeof receivedMeta.snapshot.renderPolicy.addOutlines, 'function');
  assert.equal('cfgSnapshot' in receivedMeta, false);
  assert.equal('renderPolicy' in receivedMeta, false);
});

test('post-build extras: missing required notes restore owner is reported before throwing', () => {
  const reports: Array<{ error: unknown; ctx: any }> = [];
  const App: any = {
    services: {
      platform: {
        reportError(error: unknown, ctx: any) {
          reports.push({ error, ctx });
        },
      },
    },
  };

  assert.throws(() => {
    applyPostBuildExtras(
      createPostBuildContext(App, {
        flags: { globalClickMode: false },
        notesToPreserve: [{ text: 'note' }],
        fns: {},
      })
    );
  }, /restoreNotesFromSave is missing/);

  assert.equal(reports.length, 1);
  assert.equal(reports[0].ctx?.where, 'builder/post_build_extras');
  assert.equal(reports[0].ctx?.op, 'notesRestore.missingRestoreFn');
  assert.equal(reports[0].ctx?.fatal, true);
});
