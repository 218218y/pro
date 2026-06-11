import type { AppContainer } from '../../../types';

import { readConfigNumberLooseFromApp } from '../runtime/config_selectors.js';
import {
  readFiniteNumberOrNull,
  readMotionComponent,
  readMotionNumberPart,
} from '../runtime/render_runtime_primitives.js';

import {
  assignFiniteMirrorMotionPart,
  hasFiniteMirrorMotionSample,
  hasMovedMirrorMotionPart,
  markRenderLoopMirrorDirty,
  type MirrorMotionSnap,
  readCameraWithMotion,
  readControlsWithTarget,
  type VisualDeps,
} from './render_loop_visual_effects_shared.js';

export function updateRenderLoopMirrorMotionState(
  App: AppContainer,
  deps: Pick<VisualDeps, 'getCamera' | 'getControls' | 'getRenderSlot' | 'setRenderSlot'>,
  nowMs: number,
  doorOrDrawerAnimating: boolean
): void {
  const cam = readCameraWithMotion(deps.getCamera(App));
  const ctl = readControlsWithTarget(deps.getControls(App));
  const pos = readMotionComponent(cam?.position);
  const quat = readMotionComponent(cam?.quaternion);
  const target = readMotionComponent(ctl?.target);

  const snap0 = deps.getRenderSlot<MirrorMotionSnap>(App, '__mirrorMotionSnap');
  const snap: MirrorMotionSnap = snap0 && typeof snap0 === 'object' ? snap0 : {};
  if (!snap0) deps.setRenderSlot(App, '__mirrorMotionSnap', snap);

  const px = readMotionNumberPart(pos, 'x');
  const py = readMotionNumberPart(pos, 'y');
  const pz = readMotionNumberPart(pos, 'z');
  const qx = readMotionNumberPart(quat, 'x');
  const qy = readMotionNumberPart(quat, 'y');
  const qz = readMotionNumberPart(quat, 'z');
  const qw = readMotionNumberPart(quat, 'w');
  const tx = readMotionNumberPart(target, 'x');
  const ty = readMotionNumberPart(target, 'y');
  const tz = readMotionNumberPart(target, 'z');

  const hasPrev = hasFiniteMirrorMotionSample(snap);
  const posEps = 0.0002;
  const quatEps = 0.00002;
  const hasCurrent = [px, py, pz, qx, qy, qz, qw, tx, ty, tz].some(v => readFiniteNumberOrNull(v) !== null);
  let moved = hasCurrent && !hasPrev;
  if (hasPrev && hasCurrent) {
    moved =
      hasMovedMirrorMotionPart(snap.px, px, posEps) ||
      hasMovedMirrorMotionPart(snap.py, py, posEps) ||
      hasMovedMirrorMotionPart(snap.pz, pz, posEps) ||
      hasMovedMirrorMotionPart(snap.qx, qx, quatEps) ||
      hasMovedMirrorMotionPart(snap.qy, qy, quatEps) ||
      hasMovedMirrorMotionPart(snap.qz, qz, quatEps) ||
      hasMovedMirrorMotionPart(snap.qw, qw, quatEps) ||
      hasMovedMirrorMotionPart(snap.tx, tx, posEps) ||
      hasMovedMirrorMotionPart(snap.ty, ty, posEps) ||
      hasMovedMirrorMotionPart(snap.tz, tz, posEps);
  }

  assignFiniteMirrorMotionPart(snap, 'px', px);
  assignFiniteMirrorMotionPart(snap, 'py', py);
  assignFiniteMirrorMotionPart(snap, 'pz', pz);
  assignFiniteMirrorMotionPart(snap, 'qx', qx);
  assignFiniteMirrorMotionPart(snap, 'qy', qy);
  assignFiniteMirrorMotionPart(snap, 'qz', qz);
  assignFiniteMirrorMotionPart(snap, 'qw', qw);
  assignFiniteMirrorMotionPart(snap, 'tx', tx);
  assignFiniteMirrorMotionPart(snap, 'ty', ty);
  assignFiniteMirrorMotionPart(snap, 'tz', tz);

  const holdMs = Math.max(0, readConfigNumberLooseFromApp(App, 'MIRROR_MOTION_HOLD_MS', 220));
  if (moved || doorOrDrawerAnimating) {
    deps.setRenderSlot(App, '__mirrorMotionUntilMs', nowMs + holdMs);
    markRenderLoopMirrorDirty(App, deps);
  }

  const until0 = deps.getRenderSlot<number>(App, '__mirrorMotionUntilMs');
  const until = typeof until0 === 'number' && Number.isFinite(until0) ? until0 : 0;
  deps.setRenderSlot(App, '__mirrorMotionActive', !!doorOrDrawerAnimating || nowMs < until);
}
