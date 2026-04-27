import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureRenderRuntimeState,
  getMirrorHideScratch,
  readAutoHideFloorCache,
  readRendererCompatDefaults,
} from '../esm/native/runtime/render_access.ts';

type AnyRecord = Record<string, unknown>;

test('ensureRenderRuntimeState repairs canonical loop/mirror/autohide runtime slots in one seam', () => {
  const App: AnyRecord = {
    render: {
      loopRaf: 'bad',
      __lastFrameTs: 'bad',
      __rafScheduledAt: NaN,
      __mirrorHideScratch: { nope: true },
      __wpRendererCompatDefaults: 'bad',
      __mirrorLastUpdateMs: 'bad',
      __mirrorDirty: 'bad',
      __mirrorPresenceKnown: 1,
      __mirrorPresenceHasMirror: 'bad',
      __mirrorPresenceCheckedAtMs: 'bad',
      __mirrorTrackedPruneAtMs: {},
      __mirrorBudgetDeferredAtMs: 'bad',
      __mirrorBudgetDeferredCount: 'bad',
      __mirrorPresenceBudgetSkipCount: 'bad',
      __mirrorPruneBudgetSkipCount: 'bad',
      __mirrorUpdateCount: 'bad',
      __mirrorMotionActive: 'bad',
      __mirrorMotionUntilMs: 'bad',
      __mirrorMotionSnap: 'bad',
      __splitHoverPickablesDirty: 'bad',
      __wpAutoHideFloorTick: 'bad',
      __wpAutoHideFloorVecFloor: 7,
      __wpAutoHideFloorVecCam: 'bad',
      cacheClock: 'bad',
      lastPruneAt: 'bad',
    },
  };

  const state = ensureRenderRuntimeState(App);
  assert.equal(state, App.render);
  assert.equal(state.loopRaf, 0);
  assert.equal(state.__lastFrameTs, 0);
  assert.equal(state.__rafScheduledAt, 0);
  assert.deepEqual(state.__mirrorHideScratch, []);
  assert.equal(state.__wpRendererCompatDefaults, null);
  assert.equal(readRendererCompatDefaults(App), null);
  assert.equal(state.__mirrorLastUpdateMs, 0);
  assert.equal(state.__mirrorDirty, false);
  assert.equal(state.__mirrorPresenceKnown, false);
  assert.equal(state.__mirrorPresenceHasMirror, false);
  assert.equal(state.__mirrorPresenceCheckedAtMs, 0);
  assert.equal(state.__mirrorTrackedPruneAtMs, 0);
  assert.equal(state.__mirrorBudgetDeferredAtMs, 0);
  assert.equal(state.__mirrorBudgetDeferredCount, 0);
  assert.equal(state.__mirrorPresenceBudgetSkipCount, 0);
  assert.equal(state.__mirrorPruneBudgetSkipCount, 0);
  assert.equal(state.__mirrorUpdateCount, 0);
  assert.equal(state.__mirrorMotionActive, false);
  assert.equal(state.__mirrorMotionUntilMs, 0);
  assert.equal(state.__mirrorMotionSnap, null);
  assert.equal(state.__splitHoverPickablesDirty, false);
  assert.equal(state.__wpAutoHideFloorTick, 0);
  assert.equal(state.__wpAutoHideFloorVecFloor, null);
  assert.equal(state.__wpAutoHideFloorVecCam, null);
  assert.equal(state.cacheClock, 1);
  assert.equal(state.lastPruneAt, 0);
  assert.deepEqual(readAutoHideFloorCache(App), { floor: null, roomKey: null, sceneKey: null });

  const scratch = getMirrorHideScratch(App) as unknown[];
  scratch.push({ id: 'mirror-1' });
  assert.equal((getMirrorHideScratch(App) as unknown[]).length, 1);
});
