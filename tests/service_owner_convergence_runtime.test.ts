import test from 'node:test';
import assert from 'node:assert/strict';

import { installAppStartService } from '../esm/native/services/app_start.ts';
import { installCameraService } from '../esm/native/services/camera_runtime.ts';
import { installViewportRuntimeService } from '../esm/native/services/viewport_runtime.ts';
import { installConfigCompoundsService } from '../esm/native/services/config_compounds_runtime.ts';
import { installBootFinalizers } from '../esm/native/services/boot_finalizers.ts';
import { installDoorsRuntimeService } from '../esm/native/services/doors_runtime.ts';
import { getBootFlags } from '../esm/native/runtime/internal_state.ts';

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

function createCameraApp(label: string, sharedService?: Record<string, unknown>) {
  const updates: string[] = [];
  let nowTick = 0;
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
      camera: sharedService || {},
      platform: {
        getDimsM() {
          return { w: 2, h: 2, d: 2 };
        },
      },
    },
    render: {
      camera: { position: new Vec3() },
      controls: {
        target: new Vec3(),
        enabled: true,
        update() {
          updates.push(`${label}:update`);
        },
      },
    },
  };

  return { App, updates };
}

test('service owner convergence: appStart held start ref retargets to latest App owner on shared service reinstall', () => {
  const sharedStartService: Record<string, unknown> = {};
  const calls: string[] = [];

  const appA: any = {
    services: {
      appStart: sharedStartService,
      uiBoot: {
        bootMain() {
          calls.push('A');
        },
      },
    },
  };

  const serviceA = installAppStartService(appA);
  const heldStart = serviceA.start;
  assert.equal(typeof heldStart, 'function');

  const appB: any = {
    services: {
      appStart: sharedStartService,
      uiBoot: {
        bootMain() {
          calls.push('B');
        },
      },
    },
  };

  const serviceB = installAppStartService(appB);
  assert.equal(serviceB, serviceA);

  heldStart?.();
  assert.deepEqual(calls, ['B']);
});

test('service owner convergence: camera held moveTo ref retargets to latest App owner on shared service reinstall', () => {
  const sharedCameraService: Record<string, unknown> = {};
  const a = createCameraApp('A', sharedCameraService);
  const cameraA = installCameraService(a.App);
  const heldMoveTo = cameraA.moveTo;
  assert.equal(typeof heldMoveTo, 'function');

  const b = createCameraApp('B', sharedCameraService);
  const cameraB = installCameraService(b.App);
  assert.equal(cameraB, cameraA);

  heldMoveTo?.('front');

  assert.deepEqual(a.updates, []);
  assert.deepEqual(b.updates, ['B:update']);
  assert.equal(a.App.render.camera.position.z, 0);
  assert.equal(b.App.render.camera.position.z, 5.5);
});

test('service owner convergence: viewport held setOrbitControlsEnabled ref retargets to latest App owner on shared service reinstall', () => {
  const sharedViewportService: Record<string, unknown> = {};
  const appA: any = {
    services: { viewport: sharedViewportService },
    render: { controls: { enabled: true, target: {}, update() {} } },
  };
  const viewportA = installViewportRuntimeService(appA);
  const heldSetOrbitControlsEnabled = viewportA.setOrbitControlsEnabled;
  assert.equal(typeof heldSetOrbitControlsEnabled, 'function');

  const appB: any = {
    services: { viewport: sharedViewportService },
    render: { controls: { enabled: true, target: {}, update() {} } },
  };
  const viewportB = installViewportRuntimeService(appB);
  assert.equal(viewportB, viewportA);

  const changed = heldSetOrbitControlsEnabled?.(false);
  assert.equal(changed, true);
  assert.equal(appA.render.controls.enabled, true);
  assert.equal(appB.render.controls.enabled, false);
});

test('service owner convergence: config compounds held isSeeded ref retargets to latest App owner on shared service reinstall', () => {
  const sharedConfigCompoundsService: Record<string, unknown> = {};
  const appA: any = { services: { configCompounds: sharedConfigCompoundsService } };
  const serviceA = installConfigCompoundsService(appA, { maxAttempts: 1, retryDelayMs: 0 });
  const heldIsSeeded = serviceA.isSeeded;
  assert.equal(typeof heldIsSeeded, 'function');

  const appB: any = { services: { configCompounds: sharedConfigCompoundsService } };
  const serviceB = installConfigCompoundsService(appB, { maxAttempts: 1, retryDelayMs: 0 });
  assert.equal(serviceB, serviceA);

  getBootFlags(appA).configCompoundsSeeded = false;
  getBootFlags(appB).configCompoundsSeeded = true;

  assert.equal(heldIsSeeded?.(), true);
});

test('service owner convergence: boot finalizers held rebuildWardrobe ref retargets to latest App owner on shared commands reinstall', () => {
  const sharedCommandsService: Record<string, unknown> = {};
  const calls: string[] = [];

  const appA: any = {
    services: {
      commands: sharedCommandsService,
      builder: {
        requestBuild(_ui: unknown, meta: { reason?: string }) {
          calls.push(`A:${meta?.reason ?? 'none'}`);
        },
      },
    },
  };

  const commandsA = installBootFinalizers(appA);
  const heldRebuildWardrobe = commandsA?.rebuildWardrobe;
  assert.equal(typeof heldRebuildWardrobe, 'function');

  const appB: any = {
    services: {
      commands: sharedCommandsService,
      builder: {
        requestBuild(_ui: unknown, meta: { reason?: string }) {
          calls.push(`B:${meta?.reason ?? 'none'}`);
        },
      },
    },
  };

  const commandsB = installBootFinalizers(appB);
  assert.equal(commandsB, commandsA);

  heldRebuildWardrobe?.();
  assert.deepEqual(calls, ['B:wardrobe.rebuild']);
});

test('service owner convergence: doors held setOpen ref retargets to latest App owner on shared service reinstall', () => {
  const sharedDoorsService: Record<string, unknown> = {};
  const cssCalls: string[] = [];

  const createDoorsApp = (label: string) => ({
    services: {
      doors: sharedDoorsService,
    },
    platform: {
      triggerRender() {},
      ensureRenderLoop() {},
    },
    browser: {
      setDoorStatusCss(open: boolean) {
        cssCalls.push(`${label}:${open ? 'open' : 'closed'}`);
      },
    },
    runtime: {},
    render: { doors: [] },
  });

  const appA: any = createDoorsApp('A');
  const doorsA: any = installDoorsRuntimeService(appA);
  const heldSetOpen = doorsA.setOpen;
  assert.equal(typeof heldSetOpen, 'function');

  const appB: any = createDoorsApp('B');
  const doorsB: any = installDoorsRuntimeService(appB);
  assert.equal(doorsB, doorsA);

  heldSetOpen?.(true);

  assert.ok(cssCalls.includes('B:open'));
  assert.ok(!cssCalls.includes('A:open'));
});
