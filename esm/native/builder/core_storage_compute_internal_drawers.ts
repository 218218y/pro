import { _asObject } from './core_pure_shared.js';
import { DRAWER_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { InternalDrawerOpLike } from './core_pure_shared.js';

export function computeInternalDrawersOpsForSlot(args: unknown): InternalDrawerOpLike[] {
  const a = _asObject(args) || {};
  let moduleIndex = Number(a.moduleIndex);
  const slotIndex = Number(a.slotIndex);
  if (!Number.isFinite(moduleIndex) || moduleIndex < 0) moduleIndex = 0;
  if (!Number.isFinite(slotIndex) || slotIndex < 1) return [];
  const keyPrefix = typeof a.keyPrefix === 'string' ? String(a.keyPrefix) : '';

  let effectiveBottomY = Number(a.effectiveBottomY);
  let localGridStep = Number(a.localGridStep);
  let drawerSizingGridStep = Number(a.drawerSizingGridStep);
  let internalCenterX = Number(a.internalCenterX);
  let slotAvailableHeight = Number(a.slotAvailableHeight);
  let internalZ = Number(a.internalZ);
  let internalDepth = Number(a.internalDepth);
  let innerW = Number(a.innerW);
  const hasDivider = !!a.hasDivider;

  if (!Number.isFinite(effectiveBottomY)) effectiveBottomY = 0;
  if (!Number.isFinite(localGridStep) || localGridStep <= 0)
    localGridStep = DRAWER_DIMENSIONS.internal.defaultGridStepM;
  if (!Number.isFinite(drawerSizingGridStep) || drawerSizingGridStep <= 0)
    drawerSizingGridStep = localGridStep;
  if (!Number.isFinite(internalCenterX)) internalCenterX = 0;
  if (!Number.isFinite(slotAvailableHeight) || slotAvailableHeight <= 0) slotAvailableHeight = localGridStep;
  if (!Number.isFinite(internalZ)) internalZ = 0;
  if (!Number.isFinite(internalDepth)) internalDepth = DRAWER_DIMENSIONS.internal.defaultDepthM;
  if (!Number.isFinite(innerW)) innerW = DRAWER_DIMENSIONS.internal.defaultInnerWidthM;

  const baseGridY = effectiveBottomY + (slotIndex - 1) * localGridStep;
  const targetSingleDrawerH =
    (Math.min(
      DRAWER_DIMENSIONS.internal.maxSingleDrawerHeightM,
      drawerSizingGridStep - DRAWER_DIMENSIONS.internal.verticalInsetM
    ) -
      DRAWER_DIMENSIONS.internal.verticalInsetM) /
    2;
  const maxSlotSingleDrawerH =
    (Math.min(
      DRAWER_DIMENSIONS.internal.maxSingleDrawerHeightM,
      slotAvailableHeight - DRAWER_DIMENSIONS.internal.verticalInsetM
    ) -
      DRAWER_DIMENSIONS.internal.verticalInsetM) /
    2;
  let singleDrawerH = Math.min(targetSingleDrawerH, maxSlotSingleDrawerH);
  if (!Number.isFinite(singleDrawerH) || singleDrawerH <= 0)
    singleDrawerH = DRAWER_DIMENSIONS.internal.minDrawerHeightM;

  const internalDrawerWidth = innerW - DRAWER_DIMENSIONS.internal.widthClearanceM;
  const drawerDepth = internalDepth - DRAWER_DIMENSIONS.internal.depthClearanceM;
  const divKey = keyPrefix + 'div_int_' + moduleIndex + '_slot_' + slotIndex;
  const ops: InternalDrawerOpLike[] = [];

  for (let j = 0; j < DRAWER_DIMENSIONS.internal.stackCount; j++) {
    const finalY =
      j === 0
        ? baseGridY + singleDrawerH / 2 + DRAWER_DIMENSIONS.internal.firstDrawerBottomGapM
        : baseGridY + singleDrawerH + DRAWER_DIMENSIONS.internal.betweenDrawersGapM + singleDrawerH / 2;

    ops.push({
      kind: 'internal_drawer',
      partId: divKey,
      drawerIndex: j,
      moduleIndex: moduleIndex,
      slotIndex: slotIndex,
      width: internalDrawerWidth,
      height: singleDrawerH,
      depth: drawerDepth,
      x: internalCenterX,
      y: finalY,
      z: internalZ,
      openZ: internalZ + DRAWER_DIMENSIONS.internal.openOffsetZM,
      hasDivider: hasDivider,
      dividerKey: divKey,
    });
  }

  return ops;
}
