import test from 'node:test';
import assert from 'node:assert/strict';

import {
  installPlanarMirrorReflector,
  isPlanarMirrorSurface,
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
  constructor(options: AnyRecord) {
    Object.assign(this, options);
  }
}

class FakeWebGLRenderTarget {
  texture: AnyRecord = {};
  width: number;
  height: number;
  options: AnyRecord;
  disposed = false;
  constructor(width: number, height: number, options: AnyRecord) {
    this.width = width;
    this.height = height;
    this.options = options;
  }
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
  set(x = 0, y = 0, z = 0, w = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }
  copy(source: Partial<FakeVector>) {
    this.x = source.x ?? 0;
    this.y = source.y ?? 0;
    this.z = source.z ?? 0;
    this.w = source.w ?? 0;
    return this;
  }
}

const fakeThree = {
  WebGLRenderTarget: FakeWebGLRenderTarget,
  PerspectiveCamera: class {},
  ShaderMaterial: FakeShaderMaterial,
  Matrix4: class {},
  Vector3: FakeVector,
  Vector4: FakeVector,
  Plane: class {},
  Color: FakeColor,
  LinearFilter: 'LinearFilter',
  RGBAFormat: 'RGBAFormat',
  HalfFloatType: 'HalfFloatType',
  FrontSide: 'FrontSide',
} as never;

function makeApp(maxCount = 2) {
  const toasts: string[] = [];
  return {
    config: {
      MIRROR_REFLECTOR_ENABLED: true,
      MIRROR_REFLECTOR_MAX_COUNT: maxCount,
    },
    render: {
      __mirrorPlanarCubeMode: true,
      meta: { mirrors: [] },
    },
    services: {
      uiFeedback: {
        toast(message: string) {
          toasts.push(message);
        },
      },
    },
    toasts,
  } as AnyRecord & { toasts: string[] };
}

function makeMirror() {
  return {
    material: { name: 'cube-material' },
    userData: { __wpMirrorSurface: true },
  } as AnyRecord;
}

test('stale performance cube fallback is cleared when the rebuilt mirror count is affordable', () => {
  const app = makeApp(2);
  const mirror = makeMirror();

  const installed = installPlanarMirrorReflector(app, fakeThree, mirror as never);

  assert.equal(installed, true);
  assert.equal(isPlanarMirrorSurface(mirror), true);
  assert.notEqual((app.render as AnyRecord).__mirrorPlanarCubeMode, true);
  assert.equal(
    app.toasts.length,
    0,
    'recovery is silent until the rebuild proves whether fallback is still needed'
  );
});

test('performance cube fallback stays active while the tracked mirror count is still over the limit', () => {
  const app = makeApp(1);
  const trackedA = makeMirror();
  const trackedB = makeMirror();
  trackMirrorSurface(app, trackedA);
  trackMirrorSurface(app, trackedB);
  const nextMirror = makeMirror();

  const installed = installPlanarMirrorReflector(app, fakeThree, nextMirror as never);

  assert.equal(installed, false);
  assert.equal(isPlanarMirrorSurface(nextMirror), false);
  assert.equal((app.render as AnyRecord).__mirrorPlanarCubeMode, true);
  assert.equal(app.toasts.length, 0);
});
