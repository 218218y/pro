import test from 'node:test';
import assert from 'node:assert/strict';

import {
  capturePlanarReflectorWarmCache,
  finalizePlanarReflectorWarmCache,
  installPlanarMirrorReflector,
  refreshTrackedPlanarMirrorSurfacesNow,
} from '../esm/native/runtime/planar_reflector_runtime.ts';
import { trackMirrorSurface } from '../esm/native/runtime/render_access_state_runtime.ts';

type AnyRecord = Record<string, unknown>;

class FakeColor {
  value: unknown;
  constructor(value: unknown) {
    this.value = value;
  }
  set(value: unknown) {
    this.value = value;
    return this;
  }
}

class FakeShaderMaterial {
  userData: AnyRecord = {};
  disposed = false;
  constructor(options: AnyRecord) {
    Object.assign(this, options);
  }
  dispose() {
    this.disposed = true;
  }
}

class FakeWebGLRenderTarget {
  texture: AnyRecord = {};
  disposed = false;
  constructor(
    public width: number,
    public height: number,
    public options: AnyRecord
  ) {}
  dispose() {
    this.disposed = true;
  }
}

class FakeVector {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0,
    public w = 0
  ) {}
}

class FakeMatrix4 {
  elements = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  copy(source: { elements?: unknown[] }) {
    if (Array.isArray(source?.elements)) this.elements = source.elements.slice(0, 16) as number[];
    return this;
  }
}

const fakeThree = {
  WebGLRenderTarget: FakeWebGLRenderTarget,
  PerspectiveCamera: class {},
  ShaderMaterial: FakeShaderMaterial,
  Matrix4: FakeMatrix4,
  Vector3: FakeVector,
  Vector4: FakeVector,
  Plane: class {},
  Color: FakeColor,
  LinearFilter: 'LinearFilter',
  RGBAFormat: 'RGBAFormat',
  HalfFloatType: 'HalfFloatType',
  FrontSide: 'FrontSide',
} as never;

function makeApp() {
  return {
    config: {
      MIRROR_REFLECTOR_ENABLED: true,
      MIRROR_REFLECTOR_MAX_COUNT: 8,
    },
    render: {
      meta: { mirrors: [] },
      renderer: {
        renderCalls: 0,
        setRenderTargetCalls: 0,
        getRenderTarget() {
          return null;
        },
        setRenderTarget() {
          this.setRenderTargetCalls += 1;
        },
        render() {
          this.renderCalls += 1;
        },
      },
      scene: { id: 'scene' },
      camera: { id: 'camera' },
    },
  } as AnyRecord;
}

function makeMirror(cacheKey: string) {
  return {
    material: { name: 'cube-material' },
    userData: {
      __wpMirrorSurface: true,
      __wpPlanarReflectorCacheKey: cacheKey,
      __mirrorWidthM: 0.6,
      __mirrorHeightM: 1.2,
    },
  } as AnyRecord;
}

function readPlanarState(mirror: AnyRecord): AnyRecord {
  const state = (mirror.userData as AnyRecord).__wpPlanarReflector as AnyRecord | undefined;
  assert.ok(state, 'expected mirror to have planar reflector state');
  return state;
}

test('unchanged rebuilt mirror reuses its previous planar render target instead of starting black', () => {
  const app = makeApp();
  const previousMirror = makeMirror('door-mirror|d1|surface|0');

  assert.equal(installPlanarMirrorReflector(app, fakeThree, previousMirror as never), true);
  trackMirrorSurface(app, previousMirror);
  const previousState = readPlanarState(previousMirror);
  previousState.updateCount = 4;
  const previousTarget = previousState.renderTarget;
  const previousTextureMatrix = previousState.textureMatrix as { elements: number[] };
  previousTextureMatrix.elements = [2, 0, 0, 0, 0, 3, 0, 0, 0, 0, 4, 0, 5, 6, 7, 1];

  assert.equal(capturePlanarReflectorWarmCache(app), 1);
  (((app.render as AnyRecord).meta as AnyRecord).mirrors as unknown[]).length = 0;

  const rebuiltMirror = makeMirror('door-mirror|d1|surface|0');
  assert.equal(installPlanarMirrorReflector(app, fakeThree, rebuiltMirror as never), true);
  const rebuiltState = readPlanarState(rebuiltMirror);

  assert.equal(rebuiltState.renderTarget, previousTarget);
  assert.deepEqual(
    (rebuiltState.textureMatrix as { elements: number[] }).elements,
    previousTextureMatrix.elements
  );
  assert.equal(rebuiltState.updateCount, 4);
  assert.equal(
    finalizePlanarReflectorWarmCache(app),
    false,
    'the reused target was consumed, not left as stale cache'
  );
});

test('initial-only planar refresh skips warm reused mirrors when only tracking is dirty', () => {
  const app = makeApp();
  const mirror = makeMirror('door-mirror|d1|surface|0');
  (mirror.userData as AnyRecord).__wpPlanarReflector = {
    renderTarget: {},
    virtualCamera: {},
    textureMatrix: {},
    material: {},
    updateCount: 2,
  };
  trackMirrorSurface(app, mirror);

  const result = refreshTrackedPlanarMirrorSurfacesNow(app, { initialOnly: true });
  const renderer = (app.render as AnyRecord).renderer as AnyRecord;

  assert.equal(result.refreshed, false);
  assert.equal(result.skippedReason, 'no-initial-planar-reflector-surfaces');
  assert.equal(renderer.renderCalls, 0);
  assert.equal(renderer.setRenderTargetCalls, 0);
});

function makeBackfaceFailingMirror(onAttempt: () => void): AnyRecord {
  return {
    userData: {
      __wpMirrorSurface: true,
      __wpPlanarReflector: {
        renderTarget: {},
        virtualCamera: {},
        textureMatrix: {},
        material: {},
        surfaceObject: {},
        updateCount: 0,
        reflectorWorldPosition: {},
        cameraWorldPosition: {},
        rotationMatrix: {},
        normal: {},
        view: {
          dot() {
            onAttempt();
            return 1;
          },
        },
        targetVector: {},
        lookAtPosition: {},
        clipPlane: {},
        reflectorPlane: {},
        q: {},
        normalSign: 1,
        faceSign: 1,
        clipBias: 0,
      },
    },
  };
}

test('planar refresh budgets failed attempts instead of running every failing surface', () => {
  const app = makeApp();
  let attempts = 0;
  const mirrors = [
    makeBackfaceFailingMirror(() => attempts++),
    makeBackfaceFailingMirror(() => attempts++),
    makeBackfaceFailingMirror(() => attempts++),
    makeBackfaceFailingMirror(() => attempts++),
  ];
  ((app.render as AnyRecord).meta as AnyRecord).mirrors = mirrors;

  const result = refreshTrackedPlanarMirrorSurfacesNow(app, {
    maxSurfaces: 1,
    maxBudgetMs: 10,
    now: () => 0,
  });

  assert.equal(attempts, 1);
  assert.equal(result.attemptedCount, 1);
  assert.equal(result.refreshedCount, 0);
  assert.equal(result.failedCount, 1);
  assert.equal(result.deferredCount, 3);
  assert.equal(result.completedCycle, false);
  assert.equal(result.firstFailureReason, 'backface-culled');
  assert.deepEqual(result.failureCounts, { 'backface-culled': 1 });
  assert.equal(result.skippedReason, 'planar-reflector-render-failed');
});

test('planar refresh checks elapsed budget after a failed attempt', () => {
  const app = makeApp();
  let attempts = 0;
  ((app.render as AnyRecord).meta as AnyRecord).mirrors = [
    makeBackfaceFailingMirror(() => attempts++),
    makeBackfaceFailingMirror(() => attempts++),
    makeBackfaceFailingMirror(() => attempts++),
  ];
  const nowValues = [0, 0, 2];

  const result = refreshTrackedPlanarMirrorSurfacesNow(app, {
    maxSurfaces: 3,
    maxBudgetMs: 1,
    now: () => nowValues.shift() ?? 2,
  });

  assert.equal(attempts, 1);
  assert.equal(result.attemptedCount, 1);
  assert.equal(result.failedCount, 1);
  assert.equal(result.deferredCount, 2);
  assert.equal(result.completedCycle, false);
});

test('repeated planar failures use bounded retry backoff and preserve the last reason', () => {
  const app = makeApp();
  let attempts = 0;
  const mirror = makeBackfaceFailingMirror(() => attempts++);
  ((app.render as AnyRecord).meta as AnyRecord).mirrors = [mirror];

  const first = refreshTrackedPlanarMirrorSurfacesNow(app, { now: () => 0 });
  const second = refreshTrackedPlanarMirrorSurfacesNow(app, { now: () => 0 });
  const third = refreshTrackedPlanarMirrorSurfacesNow(app, { now: () => 1 });
  const state = readPlanarState(mirror);

  assert.equal(first.failedCount, 1);
  assert.equal(second.failedCount, 1);
  assert.equal(third.attemptedCount, 0);
  assert.equal(third.backoffDeferredCount, 1);
  assert.equal(third.deferredCount, 1);
  assert.equal(third.skippedReason, 'planar-reflector-retry-backoff');
  assert.equal(attempts, 2);
  assert.equal(state.consecutiveFailureCount, 2);
  assert.equal(state.lastFailureReason, 'backface-culled');
  assert.equal(state.retryAfterMs, 16);
});
