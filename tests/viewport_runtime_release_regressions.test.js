import test from 'node:test';
import assert from 'node:assert/strict';

import { applyViewportSketchMode } from '../dist/esm/native/services/viewport_runtime.js';
import { reportViewportRuntimeNonFatal } from '../dist/esm/native/services/viewport_runtime_support.js';

test('viewport sketch-mode apply does not sync or rebuild when the runtime write fails', () => {
  const reports = [];
  const syncCalls = [];
  const buildCalls = [];
  const App = {
    __runtime: { sketchMode: false },
    store: {
      getState: () => ({ runtime: { ...App.__runtime } }),
      patch: () => {
        throw new Error('store patch exploded');
      },
    },
    actions: {
      runtime: {
        patch: () => {
          throw new Error('runtime patch exploded');
        },
      },
    },
    services: {
      sceneView: {
        syncFromStore: opts => {
          syncCalls.push(opts);
        },
      },
      builder: {
        buildWardrobe: () => {
          buildCalls.push('build');
        },
      },
    },
    platform: {
      reportError: (error, ctx) => {
        reports.push({ error, ctx });
      },
    },
  };

  const changed = applyViewportSketchMode(App, true, {
    source: 'unit-test',
    rebuild: true,
    reason: 'write-failed',
  });

  assert.equal(changed, false);
  assert.equal(App.__runtime.sketchMode, false);
  assert.deepEqual(syncCalls, []);
  assert.deepEqual(buildCalls, []);
  assert.equal(reports.length, 1);
  assert.equal(reports[0]?.ctx?.op, 'applyViewportSketchMode.write');
});

test('viewport sketch-mode forceSync still syncs/rebuilds even when the runtime write fails', () => {
  const syncCalls = [];
  const buildCalls = [];
  const App = {
    __runtime: { sketchMode: false },
    store: {
      getState: () => ({ runtime: { ...App.__runtime } }),
      patch: () => {
        throw new Error('store patch exploded');
      },
    },
    actions: {
      runtime: {
        patch: () => {
          throw new Error('runtime patch exploded');
        },
      },
    },
    services: {
      sceneView: {
        syncFromStore: opts => {
          syncCalls.push(opts);
        },
      },
      builder: {
        buildWardrobe: () => {
          buildCalls.push('build');
        },
      },
    },
    platform: {
      reportError: () => undefined,
    },
  };

  const changed = applyViewportSketchMode(App, true, {
    source: 'unit-test',
    rebuild: true,
    reason: 'force-sync',
    forceSync: true,
  });

  assert.equal(changed, false);
  assert.equal(syncCalls.length, 1);
  assert.equal(syncCalls[0]?.reason, 'force-sync');
  assert.equal(buildCalls.length, 1);
});

test('viewport runtime non-fatal reporting dedupes repeated failures and prefers platform reporting', () => {
  const reports = [];
  const prevConsoleError = console.error;
  console.error = () => {
    throw new Error('console.error should stay unused when platform reporting exists');
  };

  try {
    const App = {
      platform: {
        reportError: (error, ctx) => {
          reports.push({ error, ctx });
        },
      },
    };
    const err = new Error('viewport exploded');

    reportViewportRuntimeNonFatal(App, 'unit.viewport', err, 10000);
    reportViewportRuntimeNonFatal(App, 'unit.viewport', err, 10000);

    assert.equal(reports.length, 1);
    assert.equal(reports[0]?.ctx?.where, 'native/services/viewport_runtime');
    assert.equal(reports[0]?.ctx?.op, 'unit.viewport');
  } finally {
    console.error = prevConsoleError;
  }
});
