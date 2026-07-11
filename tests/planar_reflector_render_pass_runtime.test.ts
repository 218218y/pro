import assert from 'node:assert/strict';
import test from 'node:test';

import { runPlanarReflectorRendererPass } from '../esm/native/runtime/planar_reflector_render_pass.ts';

type AnyRecord = Record<string, unknown>;

function makeAppWithSurface(surface: AnyRecord): AnyRecord {
  return {
    render: {
      meta: {
        mirrors: [
          {
            userData: {
              __wpPlanarReflector: { surfaceObject: surface },
            },
          },
        ],
      },
    },
  };
}

test('planar reflector renderer pass reports incomplete renderer without mutating mirror visibility', () => {
  const mirror: AnyRecord = { visible: true };
  const result = runPlanarReflectorRendererPass({
    App: makeAppWithSurface({ visible: true }),
    mirror,
    renderer: {},
    scene: {},
    camera: {},
    virtualCamera: {},
    renderTarget: {},
  });

  assert.deepEqual(result, { ok: false, reason: 'renderer-surface-incomplete' });
  assert.equal(mirror.visible, true);
});

test('planar reflector renderer pass restores every renderer and surface state after render failure', () => {
  const surface: AnyRecord = { visible: true };
  const mirror: AnyRecord = { visible: true };
  const renderTarget = { id: 'planar-target' };
  const previousTarget = { id: 'previous-target' };
  const targets: unknown[] = [];
  let depthMask: unknown = null;
  const renderer: AnyRecord = {
    shadowMap: { autoUpdate: true },
    xr: { enabled: true },
    state: {
      buffers: {
        depth: {
          setMask(value: unknown) {
            depthMask = value;
          },
        },
      },
    },
    getRenderTarget() {
      return previousTarget;
    },
    setRenderTarget(target: unknown) {
      targets.push(target);
    },
    clear() {},
    render() {
      throw new Error('synthetic render failure');
    },
  };

  const result = runPlanarReflectorRendererPass({
    App: makeAppWithSurface(surface),
    mirror,
    renderer,
    scene: {},
    camera: {},
    virtualCamera: {},
    renderTarget,
  });

  assert.deepEqual(result, { ok: false, reason: 'render-exception' });
  assert.deepEqual(targets, [renderTarget, previousTarget]);
  assert.equal(depthMask, true);
  assert.equal(surface.visible, true);
  assert.equal(mirror.visible, true);
  assert.equal((renderer.shadowMap as AnyRecord).autoUpdate, true);
  assert.equal((renderer.xr as AnyRecord).enabled, true);
});

test('planar reflector renderer pass restores viewport and returns the previous render target on success', () => {
  const surface: AnyRecord = { visible: true };
  const mirror: AnyRecord = { visible: true };
  const renderTarget = { id: 'planar-target' };
  const previousTarget = { id: 'previous-target' };
  const viewport = { x: 1, y: 2, z: 3, w: 4 };
  const targets: unknown[] = [];
  const viewportCalls: unknown[] = [];
  const renderer: AnyRecord = {
    shadowMap: { autoUpdate: true },
    xr: { enabled: true },
    state: {
      buffers: { depth: { setMask() {} } },
      viewport(value: unknown) {
        viewportCalls.push(value);
      },
    },
    getRenderTarget() {
      return previousTarget;
    },
    setRenderTarget(target: unknown) {
      targets.push(target);
    },
    clear() {},
    render() {},
  };

  const result = runPlanarReflectorRendererPass({
    App: makeAppWithSurface(surface),
    mirror,
    renderer,
    scene: {},
    camera: { viewport },
    virtualCamera: {},
    renderTarget,
  });

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(targets, [renderTarget, previousTarget]);
  assert.deepEqual(viewportCalls, [viewport]);
  assert.equal(surface.visible, true);
  assert.equal(mirror.visible, true);
  assert.equal((renderer.shadowMap as AnyRecord).autoUpdate, true);
  assert.equal((renderer.xr as AnyRecord).enabled, true);
});
