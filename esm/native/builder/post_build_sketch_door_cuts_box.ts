// Post-build sketch box external-drawer door cuts (Pure ESM)
//
// Owns sketch-box stack-bound collection and segmented door rebuild routing.

import { getDrawersArray } from '../runtime/render_access.js';
import { isSplitEnabledInMap, readSplitPosListFromMap } from '../runtime/maps_access.js';
import { resolveDoorSplitAuthoringBaseKey } from '../features/door_authoring/api.js';
import { DRAWER_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { AppContainer, BuildContextLike, ThreeLike } from '../../../types/index.js';
import { getMirrorMaterial } from './render_ops.js';

import { asRecord, getDrawerEntryGroup, readKey, type ValueRecord } from './post_build_extras_shared.js';
import {
  readGeometryUserDataNumber,
  readGeometryUserDataNumberKey,
  readGeometryUserDataPositiveNumberKey,
} from './geometry_user_data_contracts.js';
import { getSketchBoxDoorPendingStateKey, readStringOrNull } from './post_build_visual_overlay_keys.js';
import {
  applySketchDrawerDoorCuts,
  createSketchDoorCutsRuntime,
  expandSketchDrawerCutBounds,
  groupSketchDrawerStackBounds,
  type SketchDrawerStackBounds,
} from './post_build_sketch_door_cuts_shared.js';

type SketchBoxDrawerStackBounds = SketchDrawerStackBounds & { key: string };

function readSketchBoxDoorManualSplitPosList(cfg: ValueRecord, basePartId: string): number[] {
  if (!basePartId) return [];
  const splitMap = asRecord(readKey(cfg, 'splitDoorsMap'));
  if (!splitMap) return [];
  if (!isSplitEnabledInMap(splitMap, basePartId, false)) return [];
  return readSplitPosListFromMap(splitMap, basePartId);
}

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
    const width = readGeometryUserDataPositiveNumberKey(ud, '__doorWidth') ?? NaN;
    const height = readGeometryUserDataPositiveNumberKey(ud, '__doorHeight') ?? NaN;
    const centerYBase = readGeometryUserDataNumber(g.position?.y) ?? NaN;
    const faceOffsetY = readGeometryUserDataNumberKey(ud, '__wpFaceOffsetY') ?? 0;
    const centerY = centerYBase + faceOffsetY;
    const faceMinY = readGeometryUserDataNumberKey(ud, '__wpFaceMinY') ?? NaN;
    const faceMaxY = readGeometryUserDataNumberKey(ud, '__wpFaceMaxY') ?? NaN;
    const faceMetaValid = Number.isFinite(faceMinY) && Number.isFinite(faceMaxY) && faceMaxY > faceMinY;
    const effectiveHeight = faceMetaValid ? faceMaxY - faceMinY : height;
    const effectiveCenterY = faceMetaValid ? (faceMinY + faceMaxY) / 2 : centerY;
    const faceOffsetX = readGeometryUserDataNumberKey(ud, '__wpFaceOffsetX') ?? 0;
    const centerXBase = readGeometryUserDataNumber(g.position?.x) ?? 0;
    const centerX = centerXBase + faceOffsetX;
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
  collectSuppressedHandlePartIds?: (partIds: string[]) => void;
}): void {
  const { App, THREE, ctx, cfg, bodyMat, globalFrontMat } = args;
  const stackBounds = collectSketchBoxExternalDrawerStackBounds(App);
  const surroundingGap = DRAWER_DIMENSIONS.sketch.externalDoorCutSurroundingGapM;
  const boxStacks = groupSketchDrawerStackBounds(
    stackBounds.map(item => ({ key: item.key, ...expandSketchDrawerCutBounds(item, surroundingGap) }))
  );
  const splitMap = asRecord(readKey(cfg, 'splitDoorsMap'));
  if (!boxStacks.size && !splitMap) return;
  const runtime = createSketchDoorCutsRuntime({
    App,
    THREE,
    ctx,
    cfg,
    bodyMat,
    globalFrontMat,
    getMirrorMaterial: () =>
      getMirrorMaterial({
        App,
        THREE,
        materialSnapshot: { cfgSnapshot: cfg, sketchMode: ctx.flags?.sketchMode === true },
      }),
  });
  applySketchDrawerDoorCuts({
    App,
    runtime,
    collectSuppressedHandlePartIds: args.collectSuppressedHandlePartIds,
    selectDoorCuts: (_entry, _g, ud) => {
      const boxId = readStringOrNull(ud.__wpSketchBoxId);
      if (!boxId) return null;
      const moduleKey = readStringOrNull(ud.__wpSketchModuleKey);
      const boxKey = getSketchBoxDoorPendingStateKey(moduleKey, boxId);
      const stacks = boxStacks.get(boxKey) || [];
      const basePartId = resolveDoorSplitAuthoringBaseKey(
        typeof ud.partId === 'string' ? String(ud.partId) : `${boxKey}_door`
      );
      const splitPosList = readSketchBoxDoorManualSplitPosList(cfg, basePartId);
      if (!stacks.length && !splitPosList.length) return null;
      return { stacks, basePartId, splitPosList };
    },
  });
}
