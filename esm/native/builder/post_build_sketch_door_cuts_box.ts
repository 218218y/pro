// Post-build sketch box external-drawer door cuts (Pure ESM)
//
// Owns sketch-box stack-bound collection and segmented door rebuild routing.

import { getDrawersArray } from '../runtime/render_access.js';
import type { AppContainer, BuildContextLike, ThreeLike } from '../../../types/index.js';
import { getMirrorMaterial } from './render_ops.js';

import {
  asRecord,
  getDrawerEntryGroup,
  parseNum,
  readKey,
  type ValueRecord,
} from './post_build_extras_shared.js';
import { getSketchBoxDoorPendingStateKey, readStringOrNull } from './post_build_visual_overlay_keys.js';
import {
  applySketchDrawerDoorCuts,
  createSketchDoorCutsRuntime,
  expandSketchDrawerCutBounds,
  groupSketchDrawerStackBounds,
  type SketchDrawerStackBounds,
} from './post_build_sketch_door_cuts_shared.js';

type SketchBoxDrawerStackBounds = SketchDrawerStackBounds & { key: string };

function collectSketchBoxExternalDrawerStackBounds(App: AppContainer): SketchBoxDrawerStackBounds[] {
  const drawersArr = getDrawersArray(App);
  if (!drawersArr.length) return [];
  const stacks = new Map<string, SketchBoxDrawerStackBounds>();
  for (let i = 0; i < drawersArr.length; i++) {
    const entry = drawersArr[i];
    const g = getDrawerEntryGroup(entry);
    const ud = asRecord(g && g.userData);
    if (!g || !ud || ud.__wpSketchExtDrawer !== true) continue;
    const boxId = readStringOrNull(ud.__wpSketchBoxId);
    if (!boxId) continue;
    const drawerId = readStringOrNull(ud.__wpSketchExtDrawerId) || readStringOrNull(ud.partId) || String(i);
    const moduleKey = readStringOrNull(ud.__wpSketchModuleKey);
    const boxKey = getSketchBoxDoorPendingStateKey(moduleKey, boxId);
    const stackKey = `${boxKey}::${drawerId}`;
    const width = parseNum(readKey(ud, '__doorWidth'));
    const height = parseNum(readKey(ud, '__doorHeight'));
    const centerYBase = parseNum(g.position?.y);
    const faceOffsetY = parseNum(readKey(ud, '__wpFaceOffsetY'));
    const centerY =
      (Number.isFinite(centerYBase) ? centerYBase : NaN) + (Number.isFinite(faceOffsetY) ? faceOffsetY : 0);
    const faceMinY = parseNum(readKey(ud, '__wpFaceMinY'));
    const faceMaxY = parseNum(readKey(ud, '__wpFaceMaxY'));
    const faceMetaValid = Number.isFinite(faceMinY) && Number.isFinite(faceMaxY) && faceMaxY > faceMinY;
    const effectiveHeight = faceMetaValid ? faceMaxY - faceMinY : height;
    const effectiveCenterY = faceMetaValid ? (faceMinY + faceMaxY) / 2 : centerY;
    const faceOffsetX = parseNum(readKey(ud, '__wpFaceOffsetX'));
    const centerXBase = parseNum(g.position?.x);
    const centerX =
      (Number.isFinite(centerXBase) ? centerXBase : 0) + (Number.isFinite(faceOffsetX) ? faceOffsetX : 0);
    if (
      !Number.isFinite(width) ||
      width <= 0 ||
      !Number.isFinite(effectiveHeight) ||
      effectiveHeight <= 0 ||
      !Number.isFinite(effectiveCenterY) ||
      !Number.isFinite(centerX)
    )
      continue;
    const xMin = centerX - width / 2;
    const xMax = centerX + width / 2;
    const yMin = effectiveCenterY - effectiveHeight / 2;
    const yMax = effectiveCenterY + effectiveHeight / 2;
    const prev = stacks.get(stackKey);
    if (prev) {
      prev.xMin = Math.min(prev.xMin, xMin);
      prev.xMax = Math.max(prev.xMax, xMax);
      prev.yMin = Math.min(prev.yMin, yMin);
      prev.yMax = Math.max(prev.yMax, yMax);
    } else {
      stacks.set(stackKey, { key: boxKey, xMin, xMax, yMin, yMax });
    }
  }
  return Array.from(stacks.values());
}

export function applySketchBoxExternalDrawerDoorCuts(args: {
  App: AppContainer;
  THREE: ThreeLike;
  ctx: BuildContextLike;
  cfg: ValueRecord;
  bodyMat: unknown;
  globalFrontMat: unknown;
}): void {
  const { App, THREE, ctx, cfg, bodyMat, globalFrontMat } = args;
  const stackBounds = collectSketchBoxExternalDrawerStackBounds(App);
  if (!stackBounds.length) return;
  const surroundingGap = 0.006;
  const boxStacks = groupSketchDrawerStackBounds(
    stackBounds.map(item => ({ key: item.key, ...expandSketchDrawerCutBounds(item, surroundingGap) }))
  );
  if (!boxStacks.size) return;
  const runtime = createSketchDoorCutsRuntime({
    THREE,
    ctx,
    cfg,
    bodyMat,
    globalFrontMat,
    getMirrorMaterial: () => getMirrorMaterial({ App, THREE }),
  });
  applySketchDrawerDoorCuts({
    App,
    runtime,
    selectDoorCuts: (_entry, _g, ud) => {
      const boxId = readStringOrNull(ud.__wpSketchBoxId);
      if (!boxId) return null;
      const moduleKey = readStringOrNull(ud.__wpSketchModuleKey);
      const boxKey = getSketchBoxDoorPendingStateKey(moduleKey, boxId);
      const stacks = boxStacks.get(boxKey);
      if (!stacks || !stacks.length) return null;
      return { stacks, fallbackPartId: typeof ud.partId === 'string' ? String(ud.partId) : `${boxKey}_door` };
    },
  });
}
