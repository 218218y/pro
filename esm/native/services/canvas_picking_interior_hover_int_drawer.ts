import { hasViewportPickingSurface } from '../runtime/render_access.js';
import { getInternalGridMap } from '../runtime/cache_access.js';
import { getModeId } from '../runtime/api.js';
import { asRecord } from '../runtime/record.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import { __wp_toModuleKey, __wp_raycastReuse } from './canvas_picking_core_helpers.js';
import {
  readSelectorEnvelopeFromObject,
  resolveSelectorInternalMetrics,
} from './canvas_picking_selector_internal_metrics.js';
import { __wp_getViewportRoots } from './canvas_picking_local_helpers.js';
import { readModuleSelectorHit } from './canvas_picking_module_selector_hits.js';
import type { CanvasInteriorHoverFlowArgs, ModuleKey } from './canvas_picking_interior_hover_shared.js';
import {
  asGridInfo,
  getSketchPreviewFns,
  hideLayoutPreview,
  previewArgs,
  readGridDivisions,
  readHoverModuleConfig,
  readIntDrawerSlot,
  readIntDrawerSlots,
  setPreview,
} from './canvas_picking_interior_hover_shared.js';

export function tryHandleCanvasIntDrawerHover(args: CanvasInteriorHoverFlowArgs): boolean {
  const {
    App,
    ndcX,
    ndcY,
    primaryMode,
    raycaster,
    mouse,
    previewRo,
    hideLayoutPreview: hideLayoutPreviewFn,
  } = args;
  const __intDrawerMode = getModeId(App, 'INT_DRAWER') || 'int_drawer';
  if (primaryMode !== __intDrawerMode) return false;
  try {
    hideLayoutPreview({ App, hideLayoutPreview: hideLayoutPreviewFn });
    const { hidePreview, setPreview: setSketchPreview } = getSketchPreviewFns(previewRo);
    if (!setSketchPreview) {
      if (hidePreview) hidePreview(previewArgs(App));
      return false;
    }

    if (!hasViewportPickingSurface(App)) {
      if (hidePreview) hidePreview(previewArgs(App));
      return false;
    }
    const { camera, wardrobeGroup } = __wp_getViewportRoots(App);
    if (!camera || !wardrobeGroup) {
      if (hidePreview) hidePreview(previewArgs(App));
      return false;
    }

    const intersects = __wp_raycastReuse({
      App,
      raycaster,
      mouse,
      camera,
      ndcX,
      ndcY,
      objects: [wardrobeGroup],
      recursive: true,
    });

    let hitModuleKey: ModuleKey | null = null;
    let hitSelectorObj: import('./canvas_picking_engine.js').HitObjectLike | null = null;
    let hitStack: 'top' | 'bottom' = 'top';
    let hitY: number | null = null;

    for (let i = 0; i < intersects.length; i++) {
      const selectorHit = readModuleSelectorHit(intersects[i], __wp_toModuleKey);
      if (!selectorHit) continue;
      hitModuleKey = selectorHit.moduleKey;
      hitSelectorObj = selectorHit.object;
      hitStack = selectorHit.stack;
      hitY = selectorHit.hitY;
      break;
    }

    if (hitModuleKey == null || typeof hitY !== 'number') {
      if (hidePreview) hidePreview(previewArgs(App));
      return false;
    }

    const isBottom = hitStack === 'bottom';
    const grid = asRecord(getInternalGridMap(App, isBottom));
    const infoKey = String(hitModuleKey);
    const info = asGridInfo(grid ? grid[infoKey] : null);
    if (!info) {
      if (hidePreview) hidePreview(previewArgs(App));
      return false;
    }

    const bottomY =
      typeof info.effectiveBottomY === 'number' ? info.effectiveBottomY : Number(info.effectiveBottomY);
    const topY = typeof info.effectiveTopY === 'number' ? info.effectiveTopY : Number(info.effectiveTopY);
    if (!Number.isFinite(bottomY) || !Number.isFinite(topY) || !(topY > bottomY)) {
      if (hidePreview) hidePreview(previewArgs(App));
      return false;
    }

    const selectorMetrics = resolveSelectorInternalMetrics({
      info,
      selectorEnvelope: hitSelectorObj ? readSelectorEnvelopeFromObject(hitSelectorObj) : null,
    });

    const woodThick = selectorMetrics.woodThick;
    const innerW = selectorMetrics.innerW;
    const internalCenterX = selectorMetrics.internalCenterX;
    const internalDepth = selectorMetrics.internalDepth;
    const internalZ = selectorMetrics.internalZ;

    const spanH = topY - bottomY;
    const divs = readGridDivisions(info.gridDivisions);
    const relY = hitY - bottomY;
    const localGridStep = divs > 0 ? spanH / divs : spanH / 6;
    let slot = Math.ceil(relY / localGridStep);
    if (slot < 1) slot = 1;
    if (slot > divs) slot = divs;

    const cfgRef = readHoverModuleConfig(App, hitModuleKey, isBottom);

    let hasSlot = false;
    try {
      const lst = readIntDrawerSlots(cfgRef);
      for (let i = 0; i < lst.length; i++) {
        const s = Number(lst[i]);
        if (Number.isFinite(s) && Math.floor(s) === slot) {
          hasSlot = true;
          break;
        }
      }
      const s1 = readIntDrawerSlot(cfgRef);
      if (!hasSlot && s1 != null && Number.isFinite(s1) && Math.floor(s1) === slot) hasSlot = true;
    } catch {
      hasSlot = false;
    }

    const op = hasSlot ? 'remove' : 'add';
    const pad = Math.min(0.006, Math.max(0.001, woodThick * 0.2));
    const drawerSizingGridStep = spanH / 6;
    const targetSingleDrawerH = (Math.min(0.35, drawerSizingGridStep - 0.02) - 0.02) / 2;
    const singleDrawerH =
      Number.isFinite(targetSingleDrawerH) && targetSingleDrawerH > 0 ? targetSingleDrawerH : 0.11;
    const drawerGap = 0.03;
    const stackH = 2 * singleDrawerH + drawerGap;

    const clampCenter = (yCenter: number) => {
      const lo = bottomY + pad + stackH / 2;
      const hi = topY - pad - stackH / 2;
      if (!(hi > lo)) return Math.max(bottomY + pad, Math.min(topY - pad, yCenter));
      return Math.max(lo, Math.min(hi, yCenter));
    };

    const targetSingleDrawerHStd = (Math.min(0.35, localGridStep - 0.02) - 0.02) / 2;
    const hStd =
      Number.isFinite(targetSingleDrawerHStd) && targetSingleDrawerHStd > 0 ? targetSingleDrawerHStd : 0.11;
    const baseGridY = bottomY + (slot - 1) * localGridStep;
    const centerAbs = clampCenter(baseGridY + hStd + 0.02);
    const baseY = centerAbs - stackH / 2;

    return setPreview(setSketchPreview, {
      App,
      THREE: getThreeMaybe(App),
      anchor: hitSelectorObj,
      kind: 'drawers',
      x: internalCenterX,
      y: baseY,
      z: internalZ,
      w: Math.max(0.05, (Number.isFinite(innerW) && innerW > 0 ? innerW : 0.5) - 0.03),
      d: Math.max(0.05, (Number.isFinite(internalDepth) && internalDepth > 0 ? internalDepth : 0.5) - 0.02),
      drawerH: singleDrawerH,
      drawerGap,
      woodThick,
      op,
    });
  } catch {
    return false;
  }
}
