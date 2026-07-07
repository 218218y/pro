import test from 'node:test';
import assert from 'node:assert/strict';

import { createRenderLoopMirrorDriver } from '../esm/native/platform/render_loop_mirror_driver.ts';

type AnyRecord = Record<string, unknown>;

function makeApp(mirrors: AnyRecord[], config: AnyRecord = { MIRROR_REFLECTOR_ENABLED: false }) {
  return {
    config,
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

test('render loop mirror driver does not run cube updates while realistic mirror mode is enabled', () => {
  const trackedMirror = { isMesh: true, __taggedMirror: true, parent: {}, visible: true };
  const app = makeApp([trackedMirror], { MIRROR_REFLECTOR_ENABLED: true });
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

  const driver = createDriver(app, slots, { now: 105 });

  driver.updateMirrorCube();

  assert.equal(((app.render as AnyRecord).mirrorCubeCamera as AnyRecord).updateCalls, 0);
  assert.equal(slots.__mirrorDirty, false);
  assert.equal(slots.__mirrorWorkPending, false);
});

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
  assert.equal(
    slots.__mirrorWorkPending,
    true,
    'budget-deferred mirror work must keep the render loop alive'
  );
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
  assert.equal(
    slots.__mirrorWorkPending,
    true,
    'presence-budget deferral must stay pending for the next frame'
  );
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
  assert.equal(slots.__mirrorWorkPending, true, 'cube-budget deferral must stay pending for the next frame');
});

test('render loop mirror driver defers cube updates during camera/door motion after a valid capture exists', () => {
  const trackedMirror = { isMesh: true, __taggedMirror: true, parent: {}, visible: true };
  const app = makeApp([trackedMirror]);
  const slots = makeSlots({
    __mirrorLastUpdateMs: 95,
    __mirrorUpdateCount: 1,
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
  assert.equal(slots.__mirrorWorkPending, true, 'deferred mirror work must keep the render loop alive');
  assert.equal(slots.__mirrorMotionDeferredAtMs, 105);
  assert.equal(slots.__mirrorMotionDeferredCount, 1);
});

test('render loop mirror driver captures the first mirror update even while motion is active', () => {
  const trackedMirror = { isMesh: true, __taggedMirror: true, parent: {}, visible: true };
  const app = makeApp([trackedMirror]);
  const slots = makeSlots({
    __mirrorLastUpdateMs: 0,
    __mirrorUpdateCount: 0,
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

  assert.equal(hideAttempts, 1, 'first mirror capture must not be deferred into a black env map');
  assert.equal(((app.render as AnyRecord).mirrorCubeCamera as AnyRecord).updateCalls, 1);
  assert.equal(trackedMirror.visible, true, 'mirror visibility must be restored after first capture');
  assert.equal(slots.__mirrorDirty, false);
  assert.equal(slots.__mirrorWorkPending, false);
  assert.equal(slots.__mirrorUpdateCount, 1);
});

test('render loop mirror driver syncs tracked mirror material envMap before cube update', () => {
  const material = { envMap: null as unknown, needsUpdate: false };
  const trackedMirror = { isMesh: true, __taggedMirror: true, parent: {}, visible: true, material };
  const app = makeApp([trackedMirror]);
  const texture = ((app.render as AnyRecord).mirrorRenderTarget as AnyRecord).texture;
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

  const driver = createDriver(app, slots, { now: 105 });

  driver.updateMirrorCube();

  assert.equal(material.envMap, texture);
  assert.equal(material.needsUpdate, true);
  assert.equal(((app.render as AnyRecord).mirrorCubeCamera as AnyRecord).updateCalls, 1);
  assert.equal(slots.__mirrorDirty, false);
});

test('render loop mirror driver updates dirty newly tracked mirrors without waiting for the throttle interval', () => {
  const trackedMirror = { isMesh: true, __taggedMirror: true, parent: {}, visible: true };
  const app = makeApp([trackedMirror]);
  const slots = makeSlots({
    __mirrorLastUpdateMs: 1000,
    __mirrorMotionActive: false,
    __frameStartMs: 1100,
    __mirrorDirty: true,
    __mirrorPresenceKnown: true,
    __mirrorPresenceHasMirror: true,
    __mirrorPresenceCheckedAtMs: 1000,
    __mirrorTrackedPruneAtMs: 1000,
  });

  const driver = createDriver(app, slots, { now: 1105 });

  driver.updateMirrorCube();

  assert.equal(((app.render as AnyRecord).mirrorCubeCamera as AnyRecord).updateCalls, 1);
  assert.equal(slots.__mirrorDirty, false);
  assert.equal(slots.__mirrorLastUpdateMs, 1105);
});

test('render loop mirror driver refreshes cube fallback surfaces while realistic mirror mode is enabled', () => {
  const material = { envMap: null as unknown, needsUpdate: false };
  const fallbackMirror = {
    isMesh: true,
    __taggedMirror: true,
    parent: {},
    visible: true,
    material,
    userData: { __wpMirrorSurface: true },
  };
  const app = makeApp([fallbackMirror], { MIRROR_REFLECTOR_ENABLED: true });
  const texture = ((app.render as AnyRecord).mirrorRenderTarget as AnyRecord).texture;
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

  const driver = createDriver(app, slots, { now: 105 });

  driver.updateMirrorCube();

  assert.equal(material.envMap, texture);
  assert.equal(material.needsUpdate, true);
  assert.equal(((app.render as AnyRecord).mirrorCubeCamera as AnyRecord).updateCalls, 1);
  assert.equal(fallbackMirror.visible, true);
  assert.equal(slots.__mirrorDirty, false);
});

test('render loop mirror driver switches mixed realistic mirrors to one cube path together', () => {
  const planarMaterial = { envMap: null as unknown, needsUpdate: false };
  const fallbackMaterial = { envMap: null as unknown, needsUpdate: false };
  const planarMirror = {
    isMesh: true,
    __taggedMirror: true,
    parent: {},
    visible: true,
    material: planarMaterial,
    userData: {
      __wpMirrorSurface: true,
      __wpPlanarReflector: {
        renderTarget: {},
        virtualCamera: {},
        textureMatrix: {},
        material: {},
      },
    },
  };
  const fallbackMirror = {
    isMesh: true,
    __taggedMirror: true,
    parent: {},
    visible: true,
    material: fallbackMaterial,
    userData: { __wpMirrorSurface: true },
  };
  const app = makeApp([planarMirror, fallbackMirror], {
    MIRROR_REFLECTOR_ENABLED: true,
    MIRROR_REFLECTOR_UPDATE_MS: 1000,
  });
  const texture = ((app.render as AnyRecord).mirrorRenderTarget as AnyRecord).texture;
  const slots = makeSlots({
    __mirrorLastUpdateMs: -1,
    __mirrorPlanarLastUpdateMs: 100,
    __mirrorMotionActive: false,
    __frameStartMs: 100,
    __mirrorDirty: true,
    __mirrorPresenceKnown: true,
    __mirrorPresenceHasMirror: true,
    __mirrorPresenceCheckedAtMs: 80,
    __mirrorTrackedPruneAtMs: 0,
  });

  const driver = createDriver(app, slots, { now: 105 });

  driver.updateMirrorCube();

  assert.equal(fallbackMaterial.envMap, texture);
  assert.equal(fallbackMaterial.needsUpdate, true);
  assert.equal(planarMaterial.envMap, texture);
  assert.equal(planarMaterial.needsUpdate, true);
  assert.equal((planarMirror.userData as AnyRecord).__wpPlanarReflector, undefined);
  assert.equal((app.render as AnyRecord).__mirrorPlanarCubeMode, true);
  assert.equal(((app.render as AnyRecord).mirrorCubeCamera as AnyRecord).updateCalls, 1);
  assert.equal(planarMirror.visible, true);
  assert.equal(fallbackMirror.visible, true);
});

test('render loop keeps planar door mirrors when adhesive glass needs cube reflections', () => {
  const planarMaterial = { envMap: null as unknown, needsUpdate: false };
  const adhesiveGlassMaterial = { envMap: null as unknown, needsUpdate: false };
  const planarMirrorState = {
    renderTarget: {},
    virtualCamera: {},
    textureMatrix: {},
    material: {},
  };
  const planarMirror = {
    isMesh: true,
    __taggedMirror: true,
    parent: {},
    visible: true,
    material: planarMaterial,
    userData: {
      __wpMirrorSurface: true,
      __wpPlanarReflector: planarMirrorState,
    },
  };
  const adhesiveGlass = {
    isMesh: true,
    __taggedMirror: true,
    parent: {},
    visible: true,
    material: adhesiveGlassMaterial,
    userData: {
      __wpMirrorSurface: true,
      __wpMirrorReflectionMode: 'cube',
      __wpReflectiveAdhesiveGlassSurface: true,
    },
  };
  const app = makeApp([planarMirror, adhesiveGlass], {
    MIRROR_REFLECTOR_ENABLED: true,
    MIRROR_REFLECTOR_UPDATE_MS: 1000,
  });
  const texture = ((app.render as AnyRecord).mirrorRenderTarget as AnyRecord).texture;
  const slots = makeSlots({
    __mirrorLastUpdateMs: -1,
    __mirrorPlanarLastUpdateMs: 100,
    __mirrorMotionActive: false,
    __frameStartMs: 100,
    __mirrorDirty: true,
    __mirrorPresenceKnown: true,
    __mirrorPresenceHasMirror: true,
    __mirrorPresenceCheckedAtMs: 80,
    __mirrorTrackedPruneAtMs: 0,
  });

  const driver = createDriver(app, slots, { now: 105 });

  driver.updateMirrorCube();

  assert.equal(adhesiveGlassMaterial.envMap, texture);
  assert.equal(adhesiveGlassMaterial.needsUpdate, true);
  assert.equal(planarMaterial.envMap, null);
  assert.equal(planarMaterial.needsUpdate, false);
  assert.equal((planarMirror.userData as AnyRecord).__wpPlanarReflector, planarMirrorState);
  assert.notEqual((app.render as AnyRecord).__mirrorPlanarCubeMode, true);
  assert.equal(((app.render as AnyRecord).mirrorCubeCamera as AnyRecord).updateCalls, 1);
  assert.equal(planarMirror.visible, true);
  assert.equal(adhesiveGlass.visible, true);
});

function makeNoopMatrix() {
  return {
    elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, -1, 0, 0, -1, 1],
    extractRotation() {
      return this;
    },
    copy() {
      return this;
    },
    invert() {
      return this;
    },
  } as AnyRecord;
}

function makeNoopVector() {
  return {
    x: 0,
    y: 0,
    z: 0,
    w: 0,
    set() {
      return this;
    },
    setFromMatrixPosition() {
      return this;
    },
    applyMatrix4() {
      return this;
    },
    subVectors() {
      return this;
    },
    dot() {
      return -1;
    },
    reflect() {
      return this;
    },
    negate() {
      return this;
    },
    add() {
      return this;
    },
    copy() {
      return this;
    },
    multiplyScalar() {
      return this;
    },
  } as AnyRecord;
}

function makeNoopPlane() {
  return {
    normal: makeNoopVector(),
    constant: 0,
    setFromNormalAndCoplanarPoint() {
      return this;
    },
    applyMatrix4() {
      return this;
    },
  } as AnyRecord;
}

function makeRenderablePlanarState(updateCount = 1) {
  return {
    renderTarget: { id: 'planar-render-target' },
    virtualCamera: {
      position: makeNoopVector(),
      up: makeNoopVector(),
      matrixWorld: makeNoopMatrix(),
      matrixWorldInverse: makeNoopMatrix(),
      projectionMatrix: makeNoopMatrix(),
      updateProjectionMatrix() {
        return this;
      },
      updateMatrixWorld() {
        return this;
      },
      lookAt() {
        return this;
      },
    },
    textureMatrix: {
      set() {
        return this;
      },
      multiply() {
        return this;
      },
    },
    material: {},
    updateCount,
    surfaceObject: null,
    normalSign: 1,
    clipBias: 0,
    reflectorWorldPosition: makeNoopVector(),
    cameraWorldPosition: makeNoopVector(),
    rotationMatrix: makeNoopMatrix(),
    normal: makeNoopVector(),
    view: makeNoopVector(),
    targetVector: makeNoopVector(),
    lookAtPosition: makeNoopVector(),
    clipPlane: makeNoopVector(),
    reflectorPlane: makeNoopPlane(),
    q: makeNoopVector(),
  } as AnyRecord;
}

function addRenderablePlanarSurfaceRuntime(app: AnyRecord, mirror: AnyRecord): void {
  (app.render as AnyRecord).renderer = {
    renderCalls: 0,
    setRenderTargetCalls: 0,
    shadowMap: { autoUpdate: true },
    state: {
      buffers: { depth: { setMask() {} } },
      viewport() {},
    },
    xr: { enabled: true },
    getRenderTarget() {
      return null;
    },
    setRenderTarget() {
      this.setRenderTargetCalls += 1;
    },
    clear() {},
    render() {
      this.renderCalls += 1;
    },
  };
  (app.render as AnyRecord).camera = {
    far: 1000,
    near: 0.1,
    aspect: 1,
    fov: 50,
    matrixWorld: makeNoopMatrix(),
    matrixWorldInverse: makeNoopMatrix(),
    projectionMatrix: makeNoopMatrix(),
    updateMatrixWorld() {
      return this;
    },
  };
  mirror.matrixWorld = makeNoopMatrix();
  mirror.updateMatrixWorld = function () {
    return this;
  };
}

test('render loop keeps warmed planar reflections live while motion marks mirrors dirty', () => {
  const warmedPlanarMirror = {
    isMesh: true,
    __taggedMirror: true,
    parent: {},
    visible: true,
    userData: {
      __wpMirrorSurface: true,
      __wpPlanarReflector: makeRenderablePlanarState(2),
    },
  };
  const app = makeApp([warmedPlanarMirror], {
    MIRROR_REFLECTOR_ENABLED: true,
    MIRROR_REFLECTOR_MOVE_UPDATE_MS: 0,
    MIRROR_REFLECTOR_MOVE_MAX_UPDATES_PER_FRAME: 1,
  });
  addRenderablePlanarSurfaceRuntime(app, warmedPlanarMirror);
  const slots = makeSlots({
    __mirrorLastUpdateMs: 1000,
    __mirrorPlanarLastUpdateMs: 1000,
    __mirrorMotionActive: true,
    __frameStartMs: 1100,
    __mirrorDirty: true,
    __mirrorPresenceKnown: true,
    __mirrorPresenceHasMirror: true,
    __mirrorPresenceCheckedAtMs: 1000,
    __mirrorTrackedPruneAtMs: 1000,
    __mirrorPlanarInitialBatchPending: false,
  });

  const driver = createDriver(app, slots, { now: 1105 });

  driver.updateMirrorCube();

  const renderer = (app.render as AnyRecord).renderer as AnyRecord;
  assert.equal(renderer.renderCalls, 1);
  assert.equal((warmedPlanarMirror.userData.__wpPlanarReflector as AnyRecord).updateCount, 3);
  assert.equal(slots.__mirrorPlanarUpdateCount, 1);
  assert.equal(slots.__mirrorDirty, false);
  assert.equal(slots.__mirrorWorkPending, false);
});
