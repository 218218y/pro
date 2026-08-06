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
  const reports: Array<{ error: unknown; context: any }> = [];
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
      errors: {
        report(error: unknown, context: any) {
          reports.push({ error, context });
        },
      },
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
  return { App, updates, reports };
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
    cornerConnectorActive: true,
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

class CloneRejectVec extends Vec3 {
  clone(): Vec3 {
    throw new Error('clone unavailable');
  }
}

class NativeLerpRejectVec extends Vec3 {
  lerpVectors(_a: Vec3, _b: Vec3, _alpha: number): this {
    throw new Error('native lerp unavailable');
  }
}

test('camera motion: clone rejection is observable and falls through to a detached vector copy', () => {
  const { App, reports } = createCameraApp();
  App.render.camera.position = new CloneRejectVec(9, 9, 9);

  assert.doesNotThrow(() => moveCamera(App, 'front'));
  assertClose(App.render.camera.position.x, 0, 'clone fallback camera x');
  assertClose(App.render.camera.position.y, 2.2, 'clone fallback camera y');
  assertClose(App.render.camera.position.z, 5.5, 'clone fallback camera z');
  assert.equal(
    reports.some(
      report =>
        report.context?.where === 'native/services/camera_shared' &&
        report.context?.op === 'move.startPosition.clone' &&
        report.context?.fatal === false
    ),
    true
  );
});

test('camera motion: native interpolation rejection is reported once and manual interpolation completes the move', () => {
  const { App, reports } = createCameraApp();
  App.render.camera.position = new NativeLerpRejectVec(9, 9, 9);

  assert.doesNotThrow(() => moveCamera(App, 'front'));
  assertClose(App.render.camera.position.x, 0, 'manual interpolation camera x');
  assertClose(App.render.camera.position.y, 2.2, 'manual interpolation camera y');
  assertClose(App.render.camera.position.z, 5.5, 'manual interpolation camera z');
  assert.equal(
    reports.filter(
      report =>
        report.context?.where === 'native/services/camera_shared' &&
        report.context?.op === 'move.position.nativeLerp'
    ).length,
    1
  );
});

test('camera motion: rejected requestAnimationFrame reports once and continues through the timer fallback', () => {
  const { App, reports } = createCameraApp();
  App.deps.browser.requestAnimationFrame = () => {
    throw new Error('raf unavailable');
  };
  App.deps.browser.setTimeout = (cb: () => void) => {
    cb();
    return 7;
  };

  assert.doesNotThrow(() => moveCamera(App, 'front'));
  assertClose(App.render.camera.position.z, 5.5, 'timer fallback camera z');
  assert.equal(
    reports.filter(
      report =>
        report.context?.where === 'native/services/camera_shared' &&
        report.context?.op === 'frameScheduler.raf'
    ).length,
    1
  );
});

test('camera motion: controls update rejection remains fail-soft, is observable, and clears activity state', () => {
  const { App, reports } = createCameraApp();
  App.render.controls.update = () => {
    throw new Error('controls update rejected');
  };

  assert.doesNotThrow(() => moveCamera(App, 'front'));
  assert.equal(App.render.__wpCameraMoveRenderingUntilMs, null);
  assert.equal(
    reports.some(
      report =>
        report.context?.where === 'native/services/camera_motion' &&
        report.context?.op === 'move.controlsUpdate' &&
        report.context?.fatal === false
    ),
    true
  );
});
