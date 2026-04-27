import test from 'node:test';
import assert from 'node:assert/strict';

import { markLocalDoorMotion } from '../esm/native/services/canvas_picking_toggle_flow_shared.ts';
import { triggerSceneViewRender } from '../esm/native/services/scene_view_shared_runtime.ts';

test('platform activity render touch: local door motion timestamps and wakes render loop through canonical platform owner', () => {
  const calls: Array<[string, boolean?]> = [];
  const App: any = {
    services: {
      doors: { runtime: {} },
      platform: {
        triggerRender(updateShadows?: boolean) {
          calls.push(['render', !!updateShadows]);
        },
        ensureRenderLoop() {
          calls.push(['ensure']);
        },
      },
    },
  };

  markLocalDoorMotion(App);

  assert.equal(typeof App.services.doors.runtime.lastToggleTime, 'number');
  assert.equal(typeof App.services.platform.activity.touch, 'function');
  assert.deepEqual(calls, [['render', false], ['ensure']]);
});

test('platform activity render touch: scene view render keeps platform activity untouched while still using canonical render follow-through', () => {
  const calls: Array<[string, boolean?]> = [];
  const App: any = {
    services: {
      platform: {
        triggerRender(updateShadows?: boolean) {
          calls.push(['render', !!updateShadows]);
        },
      },
    },
  };

  triggerSceneViewRender(App);

  assert.equal(App.services.platform.activity, undefined);
  assert.deepEqual(calls, [['render', false]]);
});
