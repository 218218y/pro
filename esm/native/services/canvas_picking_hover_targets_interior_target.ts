import { getInternalGridMap } from '../runtime/cache_access.js';
import { getWardrobeGroup } from '../runtime/render_access.js';
import { asRecord } from '../runtime/record.js';
import {
  applySelectorVerticalBoundsFallback,
  resolveSelectorInternalMetrics,
} from './canvas_picking_selector_internal_metrics.js';
import { findModuleSelectorObject } from './canvas_picking_module_selector_hits.js';
import {
  type InteriorHoverTarget,
  readLocalHitY,
  readParent,
  type ResolveInteriorHoverTargetArgs,
} from './canvas_picking_hover_targets_shared.js';
import type { InteriorHoverScanResult } from './canvas_picking_hover_targets_interior_scan.js';

export function buildInteriorHoverTarget(
  args: Pick<
    ResolveInteriorHoverTargetArgs,
    'App' | 'measureObjectLocalBox' | 'projectWorldPointToLocal' | 'toModuleKey'
  > & {
    scan: InteriorHoverScanResult;
  }
): InteriorHoverTarget | null {
  const { App, measureObjectLocalBox, projectWorldPointToLocal, toModuleKey, scan } = args;
  const { intersects, hitModuleKey, hitFallbackObj, hitStack } = scan;
  let { hitSelectorObj, hitPoint, hitY } = scan;

  if (!hitSelectorObj) {
    hitSelectorObj =
      findModuleSelectorObject({
        root: getWardrobeGroup(App),
        moduleKey: hitModuleKey,
        stackKey: hitStack,
        toModuleKey,
      }) ||
      hitFallbackObj ||
      null;
    if (hitSelectorObj && hitPoint) {
      const nextHitY = readLocalHitY({
        App,
        hitPoint,
        parent: readParent(hitSelectorObj),
        projectWorldPointToLocal,
        fallbackY: hitY,
      });
      if (typeof nextHitY === 'number') hitY = nextHitY;
    }
  }

  if (typeof hitY !== 'number') return null;

  const isBottom = hitStack === 'bottom';
  const grid = getInternalGridMap(App, isBottom);
  const infoKey = String(hitModuleKey);
  const infoRaw = asRecord(grid)?.[infoKey];
  const info = asRecord(infoRaw) || {};
  const selectorBox = measureObjectLocalBox(App, hitSelectorObj);

  let bottomY = typeof info.effectiveBottomY === 'number' ? Number(info.effectiveBottomY) : NaN;
  let topY = typeof info.effectiveTopY === 'number' ? Number(info.effectiveTopY) : NaN;
  ({ bottomY, topY } = applySelectorVerticalBoundsFallback({
    bottomY,
    topY,
    selectorEnvelope: selectorBox,
  }));
  if (!Number.isFinite(bottomY) || !Number.isFinite(topY) || !(topY > bottomY)) return null;

  const selectorMetrics = resolveSelectorInternalMetrics({
    info,
    selectorEnvelope: selectorBox,
  });
  const woodThick = selectorMetrics.woodThick;
  const innerW = selectorMetrics.innerW;
  const internalCenterX = selectorMetrics.internalCenterX;
  const internalDepth = selectorMetrics.internalDepth;
  const internalZ = selectorMetrics.internalZ;

  if (
    !Number.isFinite(innerW) ||
    !(innerW > 0) ||
    !Number.isFinite(internalDepth) ||
    !(internalDepth > 0) ||
    !Number.isFinite(internalCenterX) ||
    !Number.isFinite(internalZ)
  ) {
    return null;
  }

  const spanH = topY - bottomY;
  const backZ = internalZ - internalDepth / 2;
  const regularDepth = internalDepth > 0 ? Math.min(internalDepth, 0.45) : 0.45;

  return {
    intersects,
    hitModuleKey,
    hitSelectorObj,
    isBottom,
    hitY,
    info,
    bottomY,
    topY,
    spanH,
    woodThick,
    innerW,
    internalCenterX,
    internalDepth,
    internalZ,
    backZ,
    regularDepth,
  };
}
