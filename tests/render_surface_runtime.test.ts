import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createViewportSurface,
  getViewportRenderCore,
  getViewportCameraControls,
  getViewportWardrobeGroup,
  getViewportRoomGroup,
  restoreViewportCameraPose,
  scaleViewportCameraDistance,
  setViewportCameraPose,
  stampMirrorLastUpdate,
} from '../esm/native/services/render_surface_runtime.ts';

type AnyRecord = Record<string, any>;

function makeWindowStub(devicePixelRatio: number): AnyRecord {
  return {
    devicePixelRatio,
    document: {
      createElement: () => ({}),
      querySelector: () => null,
    },
    navigator: { userAgent: 'render-surface-runtime-test' },
    location: {},
  };
}

function makeThreeStub(): AnyRecord {
  class Vec3 {
    x: number;
    y: number;
    z: number;
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    set(x: number, y: number, z: number) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
    copy(source: { x?: number; y?: number; z?: number }) {
      this.x = Number(source?.x ?? 0);
      this.y = Number(source?.y ?? 0);
      this.z = Number(source?.z ?? 0);
      return this;
    }
    clone() {
      return new Vec3(this.x, this.y, this.z);
    }
    sub(v: { x: number; y: number; z: number }) {
      this.x -= v.x;
      this.y -= v.y;
      this.z -= v.z;
      return this;
    }
    add(v: { x: number; y: number; z: number }) {
      this.x += v.x;
      this.y += v.y;
      this.z += v.z;
      return this;
    }
    multiplyScalar(s: number) {
      this.x *= s;
      this.y *= s;
      this.z *= s;
      return this;
    }
    addVectors(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
      this.x = a.x + b.x;
      this.y = a.y + b.y;
      this.z = a.z + b.z;
      return this;
    }
    lerp(v: { x: number; y: number; z: number }, alpha: number) {
      this.x += (v.x - this.x) * alpha;
      this.y += (v.y - this.y) * alpha;
      this.z += (v.z - this.z) * alpha;
      return this;
    }
  }

  class Object3DBase {
    parent: unknown = null;
    children: unknown[] = [];
    position = new Vec3();
    rotation: AnyRecord = {};
    scale = new Vec3(1, 1, 1);
    userData: AnyRecord = {};
    add(node: unknown) {
      this.children.push(node);
      if (node && typeof node === 'object') (node as AnyRecord).parent = this;
      return this;
    }
    remove(node: unknown) {
      this.children = this.children.filter(child => child !== node);
      if (node && typeof node === 'object') (node as AnyRecord).parent = null;
      return this;
    }
  }

  class Scene extends Object3DBase {}

  class WebGLCubeRenderTarget {
    texture = {};
    constructor(
      public size: number,
      public opts: AnyRecord
    ) {}
  }

  class CubeCamera extends Object3DBase {
    constructor(
      public near: number,
      public far: number,
      public rt: unknown
    ) {
      super();
    }
  }

  class PerspectiveCamera extends Object3DBase {
    projectionUpdated = 0;
    constructor(
      public fov: number,
      public aspect: number,
      public near: number,
      public far: number
    ) {
      super();
    }
    updateProjectionMatrix() {
      this.projectionUpdated++;
    }
    updateMatrixWorld(_force?: boolean) {}
  }

  class WebGLRenderer {
    domElement = { nodeName: 'CANVAS' };
    shadowMap: AnyRecord = {};
    clearArgs: unknown[] = [];
    sizeArgs: unknown[] = [];
    pixelRatio = 0;
    constructor(public rendererOpts: AnyRecord = {}) {}
    setClearColor(...args: unknown[]) {
      this.clearArgs = args;
    }
    setSize(...args: unknown[]) {
      this.sizeArgs = args;
    }
    setPixelRatio(v: number) {
      this.pixelRatio = v;
    }
    render(_scene: unknown, _camera: unknown) {}
  }

  class OrbitControls {
    enableDamping = false;
    target = new Vec3();
    updated = 0;
    constructor(
      public camera: unknown,
      public domElement: unknown
    ) {}
    update() {
      this.updated++;
    }
    addEventListener(_name: string, _fn: unknown) {}
    removeEventListener(_name: string, _fn: unknown) {}
    dispatchEvent(_event: unknown) {
      return true;
    }
  }

  class Group extends Object3DBase {}

  return {
    Scene,
    WebGLCubeRenderTarget,
    CubeCamera,
    PerspectiveCamera,
    WebGLRenderer,
    OrbitControls,
    Group,
    LinearFilter: 'linear',
    RGBAFormat: 'rgba',
    PCFShadowMap: 'pcf',
  };
}

test('render surface runtime owns viewport creation and camera pose helpers', () => {
  const appended: unknown[] = [];
  const App: AnyRecord = {
    deps: { THREE: makeThreeStub() },
    config: { MIRROR_CUBE_SIZE: 300, PIXEL_RATIO_MAX: 1.5 },
    browser: { getWindow: () => makeWindowStub(2) },
  };

  const surface = createViewportSurface(App as any, {
    container: {
      clientWidth: 1200,
      clientHeight: 800,
      appendChild: (node: unknown) => appended.push(node),
    },
  });

  assert.ok(surface.scene);
  assert.ok(surface.camera);
  assert.ok(surface.renderer);
  assert.ok(surface.controls);
  assert.ok(surface.wardrobeGroup);
  assert.equal(appended.length, 1);
  assert.equal((App.render as AnyRecord).loopRaf, 0);
  assert.equal((App.render as AnyRecord).__lastFrameTs, 0);
  assert.equal((App.render as AnyRecord).__rafScheduledAt, 0);
  assert.deepEqual((App.render as AnyRecord).__mirrorHideScratch, []);
  assert.ok((App.render as AnyRecord).mirrorCubeCamera);
  assert.ok((App.render as AnyRecord).mirrorRenderTarget);

  const renderer = surface.renderer as AnyRecord;
  assert.equal(renderer.pixelRatio, 1.5);
  assert.equal(renderer.shadowMap.enabled, true);
  assert.equal(renderer.rendererOpts.antialias, true);

  const core = getViewportRenderCore(App as any);
  assert.equal(core?.renderer, surface.renderer);
  assert.equal(core?.scene, surface.scene);
  assert.equal(getViewportWardrobeGroup(App as any), surface.wardrobeGroup);
  assert.equal(getViewportRoomGroup(App as any), null);
  assert.ok(getViewportCameraControls(App as any));

  assert.equal(setViewportCameraPose(App as any, { x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 }), true);
  const cc = getViewportCameraControls(App as any) as AnyRecord;
  assert.equal(cc.camera.position.x, 1);
  assert.equal(cc.camera.position.y, 2);
  assert.equal(cc.camera.position.z, 3);
  assert.equal(cc.controls.target.x, 4);
  assert.equal(cc.controls.target.y, 5);
  assert.equal(cc.controls.target.z, 6);

  assert.equal(scaleViewportCameraDistance(App as any, 2), true);
  assert.equal(cc.camera.position.x, -2);
  assert.equal(cc.camera.position.y, -1);
  assert.equal(cc.camera.position.z, 0);

  assert.equal(
    restoreViewportCameraPose(App as any, {
      position: { x: 7, y: 8, z: 9 },
      target: { x: 1, y: 1, z: 1 },
    }),
    true
  );
  assert.equal(cc.camera.position.x, 7);
  assert.equal(cc.camera.position.y, 8);
  assert.equal(cc.camera.position.z, 9);
  assert.equal(cc.controls.target.x, 1);
  assert.equal(cc.controls.target.y, 1);
  assert.equal(cc.controls.target.z, 1);

  assert.equal(stampMirrorLastUpdate(App as any, 1234), true);
  assert.equal((App.render as AnyRecord).__mirrorLastUpdateMs, 1234);
});

test('render surface runtime defaults preserve the restored high-quality WebGL profile', () => {
  const App: AnyRecord = {
    deps: { THREE: makeThreeStub() },
    browser: { getWindow: () => makeWindowStub(3) },
  };

  const surface = createViewportSurface(App as any, {
    container: {
      clientWidth: 800,
      clientHeight: 600,
      appendChild: () => undefined,
    },
  });

  const renderer = surface.renderer as AnyRecord;
  assert.equal((App.render as AnyRecord).mirrorRenderTarget.size, 256);
  assert.equal(renderer.pixelRatio, 1.5);
  assert.equal(renderer.shadowMap.enabled, true);
  assert.equal(renderer.rendererOpts.antialias, true);
});

test('render surface runtime still allows explicit render-performance overrides', () => {
  const App: AnyRecord = {
    deps: { THREE: makeThreeStub() },
    config: {
      MIRROR_CUBE_SIZE: 128,
      PIXEL_RATIO_MAX: 1,
      RENDER_ANTIALIAS: false,
      RENDER_SHADOWS_ENABLED: false,
    },
    browser: { getWindow: () => makeWindowStub(3) },
  };

  const surface = createViewportSurface(App as any, {
    container: {
      clientWidth: 800,
      clientHeight: 600,
      appendChild: () => undefined,
    },
  });

  const renderer = surface.renderer as AnyRecord;
  assert.equal((App.render as AnyRecord).mirrorRenderTarget.size, 128);
  assert.equal(renderer.pixelRatio, 1);
  assert.equal(renderer.shadowMap.enabled, false);
  assert.equal(renderer.rendererOpts.antialias, false);
});
