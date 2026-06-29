import test from 'node:test';
import assert from 'node:assert/strict';

import { moveCamera } from '../esm/native/services/camera_motion.ts';

class Vec3 {
  x: number;
  y: number;
  z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  set(x = 0, y = 0, z = 0): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  clone(): Vec3 {
    return new Vec3(this.x, this.y, this.z);
  }

  lerpVectors(a: Vec3, b: Vec3, alpha: number): this {
    this.x = a.x + (b.x - a.x) * alpha;
    this.y = a.y + (b.y - a.y) * alpha;
    this.z = a.z + (b.z - a.z) * alpha;
    return this;
  }
}

function createCameraApp(ui: Record<string, unknown> = {}) {
  let nowTick = 0;
  const updates: string[] = [];
  const App: any = {
    deps: {
      THREE: { Vector3: Vec3 },
      browser: {
        requestAnimationFrame(cb: FrameRequestCallback) {
          cb(16);
          return 1;
        },
        performanceNow() {
          const out = nowTick;
          nowTick += 800;
          return out;
        },
      },
    },
    services: {
      platform: {
        getDimsM() {
          return { w: 2, h: 2, d: 2 };
        },
      },
    },
    store: {
      getState() {
        return { ui, runtime: {}, mode: {}, config: {} };
      },
    },
    render: {
      camera: { position: new Vec3(9, 9, 9) },
      controls: {
        target: new Vec3(9, 9, 9),
        update() {
          updates.push('update');
        },
      },
    },
  };
  return { App, updates };
}

function assertClose(actual: number, expected: number, message: string): void {
  assert.ok(Math.abs(actual - expected) < 0.000001, `${message}: expected ${expected}, got ${actual}`);
}

test('camera motion front preset keeps the existing regular wardrobe full-front angle', () => {
  const { App, updates } = createCameraApp();

  moveCamera(App, 'front');

  assertClose(App.render.camera.position.x, 0, 'regular front camera x');
  assertClose(App.render.camera.position.y, 2.2, 'regular front camera y');
  assertClose(App.render.camera.position.z, 5.5, 'regular front camera z');
  assertClose(App.render.controls.target.x, 0, 'regular front target x');
  assertClose(App.render.controls.target.y, 1.4, 'regular front target y');
  assertClose(App.render.controls.target.z, 0, 'regular front target z');
  assert.deepEqual(updates, ['update']);
});

test('camera motion front preset uses the chest-mode default angle instead of the regular wardrobe angle', () => {
  const { App } = createCameraApp({ isChestMode: true });

  moveCamera(App, 'front');

  assertClose(App.render.camera.position.x, 0, 'chest front camera x');
  assertClose(App.render.camera.position.y, 0.7, 'chest front camera y');
  assertClose(App.render.camera.position.z, 2.5, 'chest front camera z');
  assertClose(App.render.controls.target.x, 0, 'chest front target x');
  assertClose(App.render.controls.target.y, 0.55, 'chest front target y');
  assertClose(App.render.controls.target.z, 0, 'chest front target z');
});

test('camera motion front preset uses the active corner default angle and side', () => {
  const { App } = createCameraApp({ cornerMode: true, cornerSide: 'left', width: 180 });

  moveCamera(App, 'front');

  assertClose(App.render.camera.position.x, 1.218, 'corner front camera x follows left side');
  assertClose(App.render.camera.position.y, 2.25, 'corner front camera y');
  assertClose(App.render.camera.position.z, 5.74, 'corner front camera z follows width-aware preset');
  assertClose(App.render.controls.target.x, -0.41, 'corner front target x follows left side');
  assertClose(App.render.controls.target.y, 1.4, 'corner front target y');
  assertClose(App.render.controls.target.z, 0, 'corner front target z');
});

test('camera motion front preset ignores retired UI mode aliases', () => {
  const { App } = createCameraApp({
    chestMode: true,
    isCornerMode: true,
    cornerConnectorEnabled: true,
    cornerDirection: 'left',
    raw: {
      isChestMode: true,
      cornerMode: true,
      cornerSide: 'left',
    },
  });

  moveCamera(App, 'front');

  assertClose(App.render.camera.position.x, 0, 'alias-only front camera x');
  assertClose(App.render.camera.position.y, 2.2, 'alias-only front camera y');
  assertClose(App.render.camera.position.z, 5.5, 'alias-only front camera z');
  assertClose(App.render.controls.target.x, 0, 'alias-only front target x');
  assertClose(App.render.controls.target.y, 1.4, 'alias-only front target y');
  assertClose(App.render.controls.target.z, 0, 'alias-only front target z');
});
