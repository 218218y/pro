// Post-build sketch module external-drawer door cuts (Pure ESM)
//
// Owns runtime/fallback stack-bound collection and segmented module-door rebuild routing.

import { getDrawersArray } from '../runtime/render_access.js';
import { getInternalGridMap } from '../runtime/cache_access.js';
import { getMirrorMaterial } from './render_ops.js';
import { DRAWER_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { AppContainer, BuildContextLike, ThreeLike } from '../../../types/index.js';
import {
  DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M,
  readSketchDrawerHeightMFromItem,
  resolveSketchExternalDrawerMetrics,
} from '../features/sketch_drawer_sizing.js';

import {
  asArray,
  asRecord,
  getDrawerEntryGroup,
  parseNum,
  readCtxLayoutSurface,
  readKey,
  type ValueRecord,
} from './post_build_extras_shared.js';
import { readStringOrNull } from './post_build_visual_overlay_keys.js';
import {
  applySketchDrawerDoorCuts,
  createSketchDoorCutsRuntime,
  expandSketchDrawerCutBounds,
  groupSketchDrawerStackBounds,
  normalizeSketchDrawerCutIntervals,
  type SketchDrawerCutSegment,
  type SketchDrawerStackBounds,
} from './post_build_sketch_door_cuts_shared.js';

type SketchModuleDrawerStackBounds = SketchDrawerStackBounds & { key: string; stackKey: 'top' | 'bottom' };

function normalizeSketchModuleCutKey(value: unknown, stackKey: 'top' | 'bottom'): string | null {
  const key = readStringOrNull(value);
  if (!key) return null;
  if (stackKey === 'bottom') return key.startsWith('lower_') ? key : `lower_${key}`;
  return key.startsWith('lower_') ? key.slice('lower_'.length) : key;
}

function readSketchExternalDrawerCutsForModule(cfg: unknown, gridEntry: unknown): SketchDrawerCutSegment[] {
  const cfgRec = asRecord(cfg);
  const extra = asRecord(readKey(cfgRec, 'sketchExtras'));
  const list = asArray(readKey(extra, 'extDrawers'));
  const gridRec = asRecord(gridEntry);
  const bottomY = parseNum(readKey(gridRec, 'effectiveBottomY'));
  const topY = parseNum(readKey(gridRec, 'effectiveTopY'));
  if (!Number.isFinite(bottomY) || !Number.isFinite(topY) || topY <= bottomY) return [];
  const spanH = topY - bottomY;
  const clampCenter = (yCenter: number, stackH: number) => {
    const lo = bottomY + stackH / 2;
    const hi = topY - stackH / 2;
    if (!(hi > lo)) return Math.max(bottomY, Math.min(topY, yCenter));
    return Math.max(lo, Math.min(hi, yCenter));
  };

  const cuts: SketchDrawerCutSegment[] = [];
  for (let i = 0; i < list.length; i++) {
    const it = asRecord(list[i]);
    if (!it) continue;
    const countRaw = parseNum(readKey(it, 'count'));
    const drawerCount = Number.isFinite(countRaw)
      ? Math.max(
          DRAWER_DIMENSIONS.sketch.externalCountMin,
          Math.min(DRAWER_DIMENSIONS.sketch.externalCountMax, Math.floor(countRaw))
        )
      : DRAWER_DIMENSIONS.sketch.externalCountMin;
    const metrics = resolveSketchExternalDrawerMetrics({
      drawerCount,
      drawerHeightM: readSketchDrawerHeightMFromItem(it, DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M),
      availableHeightM: Math.max(0, topY - bottomY),
    });
    const stackH = metrics.stackH;
    const yNormC = parseNum(readKey(it, 'yNormC'));
    const yNormBase = parseNum(readKey(it, 'yNorm'));
    let centerY = NaN;
    if (Number.isFinite(yNormC))
      centerY = clampCenter(bottomY + Math.max(0, Math.min(1, yNormC)) * spanH, stackH);
    else if (Number.isFinite(yNormBase))
      centerY = clampCenter(bottomY + Math.max(0, Math.min(1, yNormBase)) * spanH + stackH / 2, stackH);
    if (!Number.isFinite(centerY)) continue;
    const baseY = centerY - stackH / 2;
    const frontInset = DRAWER_DIMENSIONS.sketch.externalDoorCutFrontInsetM;
    const surroundingGap = DRAWER_DIMENSIONS.sketch.externalDoorCutSurroundingGapM;
    const faceMinY = baseY + frontInset - surroundingGap;
    const faceMaxY = baseY + stackH - frontInset + surroundingGap;
    cuts.push({ yMin: faceMinY, yMax: faceMaxY });
  }
  return normalizeSketchDrawerCutIntervals(cuts);
}

function collectSketchModuleExternalDrawerStackBounds(App: AppContainer): SketchModuleDrawerStackBounds[] {
  const drawersArr = getDrawersArray(App);
  if (!drawersArr.length) return [];
  const stacks = new Map<string, SketchModuleDrawerStackBounds>();
  for (let i = 0; i < drawersArr.length; i++) {
    const entry = drawersArr[i];
    const g = getDrawerEntryGroup(entry);
    const ud = asRecord(g && g.userData);
    if (!g || !ud || ud.__wpSketchExtDrawer !== true) continue;
    if (readStringOrNull(ud.__wpSketchBoxId)) continue;
    const stackKey = ud.__wpStack === 'bottom' ? 'bottom' : 'top';
    const moduleKeyRaw = readStringOrNull(ud.__wpSketchModuleKey) || readStringOrNull(ud.moduleIndex);
    const moduleKey = normalizeSketchModuleCutKey(moduleKeyRaw, stackKey);
    if (!moduleKey) continue;
    const drawerId = readStringOrNull(ud.__wpSketchExtDrawerId) || readStringOrNull(ud.partId) || String(i);
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
    const stackMapKey = `${stackKey}::${moduleKey}::${drawerId}`;
    const prev = stacks.get(stackMapKey);
    if (prev) {
      prev.xMin = Math.min(prev.xMin, xMin);
      prev.xMax = Math.max(prev.xMax, xMax);
      prev.yMin = Math.min(prev.yMin, yMin);
      prev.yMax = Math.max(prev.yMax, yMax);
    } else {
      stacks.set(stackMapKey, { key: moduleKey, stackKey, xMin, xMax, yMin, yMax });
    }
  }
  return Array.from(stacks.values());
}

export function applySketchExternalDrawerDoorCuts(args: {
  App: AppContainer;
  THREE: ThreeLike;
  ctx: BuildContextLike;
  cfg: ValueRecord;
  bodyMat: unknown;
  globalFrontMat: unknown;
  stackKey: 'top' | 'bottom';
  allowConfigFallback?: boolean;
}): void {
  const { App, THREE, ctx, cfg, bodyMat, globalFrontMat, stackKey } = args;
  const allowConfigFallback = args.allowConfigFallback !== false;
  const surroundingGap = DRAWER_DIMENSIONS.sketch.externalDoorCutSurroundingGapM;
  const runtimeBounds = collectSketchModuleExternalDrawerStackBounds(App)
    .filter(item => item.stackKey === stackKey)
    .map(item => ({ key: item.key, ...expandSketchDrawerCutBounds(item, surroundingGap) }));
  let stacksByModule = groupSketchDrawerStackBounds(runtimeBounds);

  if (!stacksByModule.size && allowConfigFallback) {
    const layoutRec = readCtxLayoutSurface(ctx);
    const moduleCfgList = asArray(readKey(layoutRec, 'moduleCfgList'));
    if (!moduleCfgList.length) return;
    const gridMap = getInternalGridMap(App, stackKey === 'bottom');
    const fallbackBounds: Array<SketchDrawerStackBounds & { key: string }> = [];
    for (let i = 0; i < moduleCfgList.length; i++) {
      const cuts = readSketchExternalDrawerCutsForModule(
        moduleCfgList[i],
        readKey(asRecord(gridMap), String(i))
      );
      for (let j = 0; j < cuts.length; j++) {
        const cut = cuts[j];
        const moduleKey = normalizeSketchModuleCutKey(String(i), stackKey);
        if (!moduleKey) continue;
        fallbackBounds.push({
          key: moduleKey,
          xMin: -Infinity,
          xMax: Infinity,
          yMin: cut.yMin,
          yMax: cut.yMax,
        });
      }
    }
    stacksByModule = groupSketchDrawerStackBounds(fallbackBounds);
    if (!stacksByModule.size) return;
  }

  if (!stacksByModule.size) return;

  const runtime = createSketchDoorCutsRuntime({
    THREE,
    ctx,
    cfg,
    bodyMat,
    globalFrontMat,
    getMirrorMaterial: () => getMirrorMaterial({ App, THREE }),
    stackKey,
  });
  applySketchDrawerDoorCuts({
    App,
    runtime,
    selectDoorCuts: (_entry, _g, ud) => {
      const doorStack = typeof ud.__wpStack === 'string' ? String(ud.__wpStack) : 'top';
      if (doorStack !== stackKey) return null;
      const moduleKey = normalizeSketchModuleCutKey(
        readStringOrNull(ud.__wpSketchModuleKey) || readStringOrNull(ud.moduleIndex),
        stackKey
      );
      if (!moduleKey) return null;
      const stacks = stacksByModule.get(moduleKey);
      if (!stacks || !stacks.length) return null;
      return {
        stacks,
        fallbackPartId: typeof ud.partId === 'string' ? String(ud.partId) : `${moduleKey}_full`,
      };
    },
  });
}
