// Post-build sketch/reveal visual overlays (Pure ESM)
//
// Owns sketch-door pending state restore and post-build visual overlay orchestration.

import { getDoorsArray } from '../runtime/render_access.js';
import type { AppContainer, BuildContextLike, ThreeLike } from '../../../types/index.js';

import { asRecord } from './post_build_extras_shared.js';
import { applyFrontRevealFrames } from './post_build_front_reveal_frames.js';
import {
  SKETCH_BOX_DOOR_PENDING_STATE_KEY,
  getSketchBoxDoorPendingStateKey,
  readStringOrNull,
} from './post_build_visual_overlay_keys.js';
import {
  applySketchBoxExternalDrawerDoorCuts,
  applySketchExternalDrawerDoorCuts,
} from './post_build_sketch_door_cuts.js';

export function applyPendingSketchBoxDoorStateAfterBuild(App: AppContainer): void {
  const appRec = asRecord(App);
  if (!appRec) return;
  const store = asRecord(appRec[SKETCH_BOX_DOOR_PENDING_STATE_KEY]);
  if (!store) return;
  const doorsArray = getDoorsArray(App);
  for (let i = 0; i < doorsArray.length; i++) {
    const door = asRecord(doorsArray[i]);
    if (!door) continue;
    const group = asRecord(door.group);
    const userData = asRecord(group?.userData);
    const boxId = readStringOrNull(userData?.__wpSketchBoxId);
    if (!boxId) continue;
    const moduleKey = readStringOrNull(userData?.__wpSketchModuleKey);
    const key = getSketchBoxDoorPendingStateKey(moduleKey, boxId);
    const pending = asRecord(store[key]);
    if (!pending) continue;
    door.isOpen = pending.open === true;
    door.noGlobalOpen = true;
    if (userData) userData.noGlobalOpen = true;
    delete store[key];
  }
  if (Object.keys(store).length === 0) delete appRec[SKETCH_BOX_DOOR_PENDING_STATE_KEY];
}

export function applyPostBuildSketchVisualOverlays(args: {
  App: AppContainer;
  THREE: ThreeLike;
  ctx: BuildContextLike;
  cfg: unknown;
  bodyMat: unknown;
  globalFrontMat: unknown;
  stackKey: 'top' | 'bottom';
}): void {
  const { App, THREE, ctx, cfg, bodyMat, globalFrontMat, stackKey } = args;
  const moduleCutStackKeys: Array<'top' | 'bottom'> =
    stackKey === 'bottom' ? ['bottom', 'top'] : ['top', 'bottom'];
  for (let i = 0; i < moduleCutStackKeys.length; i++) {
    applySketchExternalDrawerDoorCuts({
      App,
      THREE,
      ctx,
      cfg: asRecord(cfg) || {},
      bodyMat,
      globalFrontMat,
      stackKey: moduleCutStackKeys[i],
      allowConfigFallback: moduleCutStackKeys[i] === stackKey,
    });
  }
  applySketchBoxExternalDrawerDoorCuts({
    App,
    THREE,
    ctx,
    cfg: asRecord(cfg) || {},
    bodyMat,
    globalFrontMat,
  });
  applyFrontRevealFrames(ctx);
}
