import test from 'node:test';
import assert from 'node:assert/strict';

import { applyConfigDefaults } from '../esm/native/platform/config_defaults.ts';
import { initRenderState } from '../esm/native/platform/render_state_init.ts';

type AnyRecord = Record<string, unknown>;

test('platform config defaults populate missing keys without overwriting existing config values', () => {
  const App: AnyRecord = {
    config: {
      DOOR_DELAY_MS: 123,
    },
  };

  const config = applyConfigDefaults(App);
  assert.equal(config.DOOR_DELAY_MS, 123);
  assert.equal(config.ACTIVE_STATE_MS, 4000);
  assert.equal(config.NOTES_THROTTLE_MS, 33);
  assert.equal((App.config as AnyRecord).DOOR_DELAY_MS, 123);
});

test('initRenderState seeds canonical render/material/cache/meta containers on one seam', () => {
  const App: AnyRecord = {};
  const render = initRenderState(App);
  assert.ok(render);

  assert.equal(render?.renderer, null);
  assert.equal(render?.scene, null);
  assert.equal(render?.wardrobeGroup, null);
  assert.equal(render?.roomGroup, null);
  assert.equal(render?.mirrorCubeCamera, null);
  assert.equal(render?.mirrorRenderTarget, null);
  assert.equal(render?.animate, null);
  assert.equal(render?.loopRaf, 0);
  assert.equal(render?.__lastFrameTs, 0);
  assert.equal(render?.__rafScheduledAt, 0);
  assert.deepEqual(render?.__mirrorHideScratch, []);
  assert.equal(render?.__wpRendererCompatDefaults, null);
  assert.equal(render?.__mirrorLastUpdateMs, 0);
  assert.equal(render?.__mirrorDirty, false);
  assert.equal(render?.__mirrorPresenceKnown, false);
  assert.equal(render?.__mirrorPresenceHasMirror, false);
  assert.equal(render?.__mirrorPresenceCheckedAtMs, 0);
  assert.equal(render?.__mirrorTrackedPruneAtMs, 0);
  assert.equal(render?.__mirrorBudgetDeferredAtMs, 0);
  assert.equal(render?.__mirrorBudgetDeferredCount, 0);
  assert.equal(render?.__mirrorPresenceBudgetSkipCount, 0);
  assert.equal(render?.__mirrorPruneBudgetSkipCount, 0);
  assert.equal(render?.__mirrorUpdateCount, 0);
  assert.equal(render?.__mirrorMotionActive, false);
  assert.equal(render?.__mirrorMotionUntilMs, 0);
  assert.equal(render?.__mirrorMotionSnap, null);
  assert.equal(render?.__splitHoverPickablesDirty, false);
  assert.equal(render?.__wpAutoHideFloorRef, null);
  assert.equal(render?.__wpAutoHideFloorRoomKey, null);
  assert.equal(render?.__wpAutoHideFloorSceneKey, null);
  assert.equal(render?.__wpAutoHideFloorTick, 0);
  assert.equal(render?.__wpAutoHideFloorVecFloor, null);
  assert.equal(render?.__wpAutoHideFloorVecCam, null);
  assert.deepEqual(render?.doorsArray, []);
  assert.deepEqual(render?.drawersArray, []);
  assert.deepEqual(render?.moduleHitBoxes, []);
  assert.deepEqual(render?._partObjects, []);

  const materials = (render?.materials || {}) as AnyRecord;
  const cache = (render?.cache || {}) as AnyRecord;
  const meta = (render?.meta || {}) as AnyRecord;
  const util = (App.util || {}) as AnyRecord;

  assert.equal(materials.dimLineMaterial, null);
  assert.equal(materials.outlineLineMaterial, null);
  assert.equal(materials.sketchFillMaterial, null);

  assert.equal(cache.materialCache instanceof Map, true);
  assert.equal(cache.textureCache instanceof Map, true);
  assert.equal(cache.geometryCache instanceof Map, true);
  assert.equal(cache.edgesGeometryCache instanceof Map, true);

  assert.equal(meta.material instanceof Map, true);
  assert.equal(meta.texture instanceof Map, true);
  assert.equal(meta.dimLabel instanceof Map, true);
  assert.equal(meta.edges instanceof Map, true);
  assert.equal(meta.geometry instanceof Map, true);
  assert.deepEqual(meta.mirrors, []);

  assert.equal(util.dimLabelCache instanceof Map, true);
});
