import test from 'node:test';
import assert from 'node:assert/strict';

import {
  updateSceneLightsViaService,
  updateSceneModeViaService,
} from '../esm/native/services/scene_view_access.ts';
import { reportSceneViewNonFatal } from '../esm/native/services/scene_view_shared.ts';

function makeApp(sceneView: Record<string, unknown> = {}) {
  const reports: Array<{ error: unknown; ctx: any }> = [];
  const App = {
    services: Object.assign(Object.create(null), { sceneView }),
    store: {
      getState: () => ({ ui: {}, runtime: {}, config: {}, mode: {}, meta: {} }),
      subscribeSelector: () => () => {},
    },
    render: Object.assign(Object.create(null), {
      scene: Object.assign(Object.create(null), {
        add() {},
        getObjectByName() {
          return null;
        },
      }),
      roomGroup: Object.assign(Object.create(null), {
        getObjectByName() {
          return null;
        },
      }),
      shadowMap: Object.assign(Object.create(null), { needsUpdate: false }),
    }),
    platform: Object.assign(Object.create(null), {
      reportError(error: unknown, ctx: unknown) {
        reports.push({ error, ctx });
      },
      triggerRender() {},
    }),
  } as any;
  return { App, reports };
}

test('scene view nonfatal reporting goes through platform diagnostics before console fallback', () => {
  const { App, reports } = makeApp();
  const err = new Error('scene-view-report-test');

  reportSceneViewNonFatal(App, 'sceneView.test.platformReport', err, 0);

  assert.equal(reports.length, 1);
  assert.equal(reports[0].error, err);
  assert.deepEqual(reports[0].ctx, {
    where: 'native/services/scene_view',
    op: 'sceneView.test.platformReport',
    fatal: false,
  });
});

test('scene view access reports installed owner rejection without swallowing diagnostics', () => {
  const ownerError = new Error('update-lights-owner-rejected');
  const { App, reports } = makeApp(
    Object.assign(Object.create(null), {
      __wpUpdateLights: () => {
        throw ownerError;
      },
    })
  );

  assert.equal(updateSceneLightsViaService(App, true), false);
  assert.equal(reports.length, 1);
  assert.equal(reports[0].error, ownerError);
  assert.equal(reports[0].ctx.where, 'native/services/scene_view');
  assert.equal(reports[0].ctx.op, 'sceneView.access.updateLights.ownerRejected');
  assert.equal(reports[0].ctx.fatal, false);
});

test('scene view access reports updateSceneMode owner rejection through the same diagnostics lane', () => {
  const ownerError = new Error('scene-mode-owner-rejected');
  const { App, reports } = makeApp(
    Object.assign(Object.create(null), {
      __wpUpdateSceneMode: () => {
        throw ownerError;
      },
    })
  );

  assert.equal(updateSceneModeViaService(App), false);
  assert.equal(reports.length, 1);
  assert.equal(reports[0].error, ownerError);
  assert.equal(reports[0].ctx.op, 'sceneView.access.updateSceneMode.ownerRejected');
});
