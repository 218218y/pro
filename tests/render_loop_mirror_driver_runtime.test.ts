import test from 'node:test';
import assert from 'node:assert/strict';

import { createRenderLoopMirrorDriver } from '../esm/native/platform/render_loop_mirror_driver.ts';

type AnyRecord = Record<string, unknown>;

function makeApp(mirrors: AnyRecord[]) {
  return {
    render: {
      mirrorCubeCamera: {
        updateCalls: 0,
        update() {
          this.updateCalls += 1;
        },
      },
      mirrorRenderTarget: { texture: { id: 'tex-1' } },
      scene: { id: 'scene-1' },
      renderer: { shadowMap: { autoUpdate: true } },
      __mirrorHideScratch: [],
      meta: {
        mirrors,
      },
    },
  } as AnyRecord;
}

function makeSlots(seed: Record<string, unknown>) {
  return { ...seed } as Record<string, unknown>;
}

function createDriver(
  app: AnyRecord,
  slots: Record<string, unknown>,
  options?: { now?: number | (() => number); onTag?: () => void; onHide?: () => void }
) {
  return createRenderLoopMirrorDriver(app as never, {
    report: () => undefined,
    now: () => (typeof options?.now === 'function' ? options.now() : (options?.now ?? 0)),
    isTaggedMirrorSurface(obj) {
      options?.onTag?.();
      return !!obj?.__taggedMirror;
    },
    tryHideMirrorSurface(obj, _tex, list) {
      options?.onHide?.();
      if (!obj?.__taggedMirror) return false;
      obj.visible = false;
      list.push(obj);
      return true;
    },
    getRenderSlot(_app, key) {
      return Object.prototype.hasOwnProperty.call(slots, key) ? (slots[key] as never) : null;
    },
    setRenderSlot(_app, key, value) {
      slots[key] = value;
      (app.render as AnyRecord)[key] = value;
    },
  });
}

test('render loop mirror driver defers tracked prune and presence scans when the frame is already over budget', () => {
  const trackedMirror = { isMesh: true, __taggedMirror: true, parent: {} };
  const duplicateMirror = trackedMirror;
  const orphanMirror = { isMesh: true, __taggedMirror: true };
  const app = makeApp([trackedMirror, duplicateMirror, orphanMirror]);
  const slots = makeSlots({
    __mirrorLastUpdateMs: -1,
    __mirrorMotionActive: false,
    __frameStartMs: 100,
    __mirrorDirty: true,
    __mirrorPresenceKnown: true,
    __mirrorPresenceHasMirror: true,
    __mirrorPresenceCheckedAtMs: 80,
    __mirrorTrackedPruneAtMs: 0,
  });
  let tagChecks = 0;
  let hideAttempts = 0;

  const driver = createDriver(app, slots, {
    now: 120,
    onTag: () => {
      tagChecks += 1;
    },
    onHide: () => {
      hideAttempts += 1;
    },
  });

  driver.updateMirrorCube();

  assert.equal(tagChecks, 0);
  assert.equal(hideAttempts, 0);
  assert.equal(((app.render as AnyRecord).mirrorCubeCamera as AnyRecord).updateCalls, 0);
  assert.equal(
    (((app.render as AnyRecord).meta as AnyRecord).mirrors as unknown[]).length,
    3,
    'tracked mirrors should stay untouched while budget-deferred'
  );
  assert.equal(slots.__mirrorDirty, true, 'dirty state should stay armed until a real mirror update runs');
  assert.equal(slots.__mirrorBudgetDeferredAtMs, 120);
  assert.equal(slots.__mirrorBudgetDeferredCount, 1);
  assert.equal(slots.__mirrorPresenceBudgetSkipCount, 1);
  assert.equal(slots.__mirrorPruneBudgetSkipCount, 1);
  assert.equal(slots.__mirrorUpdateCount, undefined);
});

test('render loop mirror driver prunes tracked mirrors and updates the cube once budget is available again', () => {
  const trackedMirror = { isMesh: true, __taggedMirror: true, parent: {}, visible: true };
  const duplicateMirror = trackedMirror;
  const orphanMirror = { isMesh: true, __taggedMirror: true, visible: true };
  const app = makeApp([trackedMirror, duplicateMirror, orphanMirror]);
  const slots = makeSlots({
    __mirrorLastUpdateMs: -1,
    __mirrorMotionActive: false,
    __frameStartMs: 100,
    __mirrorDirty: true,
    __mirrorPresenceKnown: true,
    __mirrorPresenceHasMirror: true,
    __mirrorPresenceCheckedAtMs: 80,
    __mirrorTrackedPruneAtMs: 0,
  });
  let tagChecks = 0;
  let hideAttempts = 0;

  const driver = createDriver(app, slots, {
    now: 110,
    onTag: () => {
      tagChecks += 1;
    },
    onHide: () => {
      hideAttempts += 1;
    },
  });

  driver.updateMirrorCube();

  assert.equal(
    (((app.render as AnyRecord).meta as AnyRecord).mirrors as unknown[]).length,
    1,
    'duplicate/orphan tracked mirrors should be compacted once work can run'
  );
  assert.equal(tagChecks, 1);
  assert.equal(hideAttempts, 1);
  assert.equal(((app.render as AnyRecord).mirrorCubeCamera as AnyRecord).updateCalls, 1);
  assert.equal(trackedMirror.visible, true, 'temporarily hidden mirrors should always be restored');
  assert.equal(slots.__mirrorTrackedPruneAtMs, 110);
  assert.equal(slots.__mirrorPresenceKnown, true);
  assert.equal(slots.__mirrorPresenceHasMirror, true);
  assert.equal(slots.__mirrorPresenceCheckedAtMs, 110);
  assert.equal(slots.__mirrorDirty, false);
  assert.equal(slots.__mirrorLastUpdateMs, 110);
  assert.equal(slots.__mirrorUpdateCount, 1);
});

test('render loop mirror driver keeps unknown presence unresolved when a budget-deferred frame cannot afford a tracked scan yet', () => {
  const trackedMirror = { isMesh: true, __taggedMirror: true, parent: {} };
  const app = makeApp([trackedMirror]);
  const slots = makeSlots({
    __mirrorLastUpdateMs: 0,
    __mirrorMotionActive: false,
    __frameStartMs: 100,
    __mirrorDirty: false,
    __mirrorPresenceKnown: false,
    __mirrorPresenceHasMirror: false,
    __mirrorPresenceCheckedAtMs: 50,
    __mirrorTrackedPruneAtMs: 0,
  });
  let tagChecks = 0;

  const driver = createDriver(app, slots, {
    now: 125,
    onTag: () => {
      tagChecks += 1;
    },
  });

  driver.updateMirrorCube();

  assert.equal(tagChecks, 0);
  assert.equal(
    slots.__mirrorPresenceKnown,
    false,
    'unknown presence should stay unresolved until a budget-safe frame performs the scan'
  );
  assert.equal(
    slots.__mirrorPresenceCheckedAtMs,
    50,
    'budget deferral should not stamp a fresh check time for skipped scans'
  );
  assert.equal(slots.__mirrorPresenceBudgetSkipCount, 1);
  assert.equal(slots.__mirrorBudgetDeferredCount, 1);
});

test('render loop mirror driver defers the expensive cube update when mirror prep exhausts the frame budget', () => {
  const trackedMirror = { isMesh: true, __taggedMirror: true, parent: {}, visible: true };
  const app = makeApp([trackedMirror]);
  const slots = makeSlots({
    __mirrorLastUpdateMs: -1,
    __mirrorMotionActive: false,
    __frameStartMs: 100,
    __mirrorDirty: true,
    __mirrorPresenceKnown: true,
    __mirrorPresenceHasMirror: true,
    __mirrorPresenceCheckedAtMs: 80,
    __mirrorTrackedPruneAtMs: 0,
  });
  const nowValues = [105, 130];

  const driver = createDriver(app, slots, {
    now: () => nowValues.shift() ?? 130,
  });

  driver.updateMirrorCube();

  assert.equal(((app.render as AnyRecord).mirrorCubeCamera as AnyRecord).updateCalls, 0);
  assert.equal(
    trackedMirror.visible,
    true,
    'mirror visibility must be restored after a deferred cube update'
  );
  assert.equal(slots.__mirrorDirty, true, 'dirty state should remain armed for the next budget-safe frame');
  assert.equal(slots.__mirrorLastUpdateMs, -1);
  assert.equal(slots.__mirrorBudgetDeferredAtMs, 130);
  assert.equal(slots.__mirrorBudgetDeferredCount, 1);
  assert.equal(slots.__mirrorCubeBudgetSkipCount, 1);
});

test('render loop mirror driver defers cube updates during camera/door motion by default', () => {
  const trackedMirror = { isMesh: true, __taggedMirror: true, parent: {}, visible: true };
  const app = makeApp([trackedMirror]);
  const slots = makeSlots({
    __mirrorLastUpdateMs: -1,
    __mirrorMotionActive: true,
    __frameStartMs: 100,
    __mirrorDirty: true,
    __mirrorPresenceKnown: true,
    __mirrorPresenceHasMirror: true,
    __mirrorPresenceCheckedAtMs: 80,
    __mirrorTrackedPruneAtMs: 0,
  });
  let hideAttempts = 0;

  const driver = createDriver(app, slots, {
    now: 105,
    onHide: () => {
      hideAttempts += 1;
    },
  });

  driver.updateMirrorCube();

  assert.equal(hideAttempts, 0, 'motion-deferred mirror updates should skip the hide/update prep entirely');
  assert.equal(((app.render as AnyRecord).mirrorCubeCamera as AnyRecord).updateCalls, 0);
  assert.equal(slots.__mirrorDirty, true, 'dirty state should remain armed until motion settles');
  assert.equal(slots.__mirrorMotionDeferredAtMs, 105);
  assert.equal(slots.__mirrorMotionDeferredCount, 1);
});
