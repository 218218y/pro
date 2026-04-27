import test from 'node:test';
import assert from 'node:assert/strict';

import { createRenderLoopVisualEffects } from '../esm/native/platform/render_loop_visual_effects.js';

function asRecord(value: unknown, fallback: Record<string, unknown> = {}) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : fallback;
}

test('render loop visual effects keep previous finite mirror snap parts when current sample is junk', () => {
  const slots: Record<string, unknown> = {
    __mirrorMotionSnap: {
      px: 1,
      py: 2,
      pz: 3,
      qx: 0,
      qy: 0,
      qz: 0,
      qw: 1,
      tx: 4,
      ty: 5,
      tz: 6,
    },
    __mirrorMotionUntilMs: 0,
  };
  const app: Record<string, unknown> = { config: {} };
  const effects = createRenderLoopVisualEffects(app as never, {
    report: () => undefined,
    now: () => 1000,
    asRecord,
    frontOverlayState: () => ({}),
    applyOpacityScale: () => undefined,
    collectFrontOverlayNodes: () => [],
    isTaggedMirrorSurface: () => false,
    tryHideMirrorSurface: () => false,
    getCamera: () => ({ position: { x: Number.NaN, y: 2, z: 3 }, quaternion: { x: 0, y: 0, z: 0, w: 1 } }),
    getControls: () => ({ target: { x: 4, y: 5, z: 6 } }),
    getRenderSlot: (_app, key) => (key in slots ? slots[key] : null),
    setRenderSlot: (_app, key, value) => {
      slots[key] = value;
    },
    getRoomGroup: () => null,
    getScene: () => null,
    readAutoHideFloorCache: () => ({}) as never,
    writeAutoHideFloorCache: () => undefined,
    getWardrobeGroup: () => null,
    getDoorsArray: () => [],
    readRuntimeScalarOrDefaultFromApp: (_app, _key, fallback) => fallback,
  });

  effects.updateMirrorMotionState(1000, false);

  assert.deepEqual(slots.__mirrorMotionSnap, {
    px: 1,
    py: 2,
    pz: 3,
    qx: 0,
    qy: 0,
    qz: 0,
    qw: 1,
    tx: 4,
    ty: 5,
    tz: 6,
  });
  assert.equal(slots.__mirrorDirty, undefined);
  assert.equal(slots.__mirrorMotionActive, false);
});

test('render loop visual effects mark mirror dirty when finite sample changes materially', () => {
  const slots: Record<string, unknown> = {
    __mirrorMotionSnap: { px: 1, py: 2, pz: 3, qx: 0, qy: 0, qz: 0, qw: 1, tx: 4, ty: 5, tz: 6 },
    __mirrorMotionUntilMs: 0,
  };
  const app: Record<string, unknown> = { config: { MIRROR_MOTION_HOLD_MS: 120 } };
  const effects = createRenderLoopVisualEffects(app as never, {
    report: () => undefined,
    now: () => 1000,
    asRecord,
    frontOverlayState: () => ({}),
    applyOpacityScale: () => undefined,
    collectFrontOverlayNodes: () => [],
    isTaggedMirrorSurface: () => false,
    tryHideMirrorSurface: () => false,
    getCamera: () => ({ position: { x: 1.01, y: 2, z: 3 }, quaternion: { x: 0, y: 0, z: 0, w: 1 } }),
    getControls: () => ({ target: { x: 4, y: 5, z: 6 } }),
    getRenderSlot: (_app, key) => (key in slots ? slots[key] : null),
    setRenderSlot: (_app, key, value) => {
      slots[key] = value;
    },
    getRoomGroup: () => null,
    getScene: () => null,
    readAutoHideFloorCache: () => ({}) as never,
    writeAutoHideFloorCache: () => undefined,
    getWardrobeGroup: () => null,
    getDoorsArray: () => [],
    readRuntimeScalarOrDefaultFromApp: (_app, _key, fallback) => fallback,
  });

  effects.updateMirrorMotionState(1000, false);

  assert.equal(slots.__mirrorDirty, true);
  assert.equal(slots.__mirrorPresenceKnown, false);
  assert.equal(slots.__mirrorMotionUntilMs, 1120);
  assert.equal(slots.__mirrorMotionActive, true);
  assert.equal((slots.__mirrorMotionSnap as Record<string, unknown>).px, 1.01);
});
