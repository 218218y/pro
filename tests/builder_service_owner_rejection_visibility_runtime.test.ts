import test from 'node:test';
import assert from 'node:assert/strict';

import {
  runBuilderBuildWardrobe,
  requestBuilderBuild,
  applyBuilderHandles,
  purgeBuilderHandlesForRemovedDoors,
  finalizeBuilderRegistry,
} from '../esm/native/runtime/builder_service_access.ts';

function createAppWithBuilderFailures() {
  const reports: Array<{ error: unknown; ctx: any }> = [];
  const App: any = {
    services: {
      errors: {
        report(error: unknown, ctx?: unknown) {
          reports.push({ error, ctx });
        },
      },
      builder: {
        buildWardrobe() {
          throw new Error('build owner failed');
        },
        requestBuild() {
          throw new Error('request owner failed');
        },
        handles: {
          applyHandles() {
            throw new Error('apply handles owner failed');
          },
          purgeHandlesForRemovedDoors() {
            throw new Error('purge handles owner failed');
          },
        },
        registry: {
          finalize() {
            throw new Error('registry owner failed');
          },
        },
      },
    },
  };
  return { App, reports };
}

test('builder service access reports owner rejection without changing recovery return values', () => {
  const { App, reports } = createAppWithBuilderFailures();

  assert.equal(runBuilderBuildWardrobe(App, { ui: {} }), false);
  assert.equal(requestBuilderBuild(App, { source: 'unit' }), false);
  assert.equal(applyBuilderHandles(App, { triggerRender: false }), false);
  assert.equal(purgeBuilderHandlesForRemovedDoors(App, true), false);
  assert.equal(finalizeBuilderRegistry(App), false);

  assert.deepEqual(
    reports.map(report => report.ctx?.op),
    [
      'builder.buildWardrobe.ownerRejected',
      'builder.requestBuild.ownerRejected',
      'builder.handles.applyHandles.ownerRejected',
      'builder.handles.purgeRemovedDoors.ownerRejected',
      'builder.registry.finalize.ownerRejected',
    ]
  );
  assert.ok(reports.every(report => report.ctx?.where === 'native/runtime/builder_service_access'));
  assert.ok(reports.every(report => report.ctx?.fatal === false));
});
