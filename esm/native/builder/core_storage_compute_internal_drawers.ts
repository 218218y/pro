import { _asObject } from './core_pure_shared.js';
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
  if (!Number.isFinite(localGridStep) || localGridStep <= 0) localGridStep = 0.25;
  if (!Number.isFinite(drawerSizingGridStep) || drawerSizingGridStep <= 0)
    drawerSizingGridStep = localGridStep;
  if (!Number.isFinite(internalCenterX)) internalCenterX = 0;
  if (!Number.isFinite(slotAvailableHeight) || slotAvailableHeight <= 0) slotAvailableHeight = localGridStep;
  if (!Number.isFinite(internalZ)) internalZ = 0;
  if (!Number.isFinite(internalDepth)) internalDepth = 0.5;
  if (!Number.isFinite(innerW)) innerW = 0.6;

  const baseGridY = effectiveBottomY + (slotIndex - 1) * localGridStep;
  const targetSingleDrawerH = (Math.min(0.35, drawerSizingGridStep - 0.02) - 0.02) / 2;
  const maxSlotSingleDrawerH = (Math.min(0.35, slotAvailableHeight - 0.02) - 0.02) / 2;
  let singleDrawerH = Math.min(targetSingleDrawerH, maxSlotSingleDrawerH);
  if (!Number.isFinite(singleDrawerH) || singleDrawerH <= 0) singleDrawerH = 0.01;

  const internalDrawerWidth = innerW - 0.03;
  const drawerDepth = internalDepth - 0.02;
  const divKey = keyPrefix + 'div_int_' + moduleIndex + '_slot_' + slotIndex;
  const ops: InternalDrawerOpLike[] = [];

  for (let j = 0; j < 2; j++) {
    const finalY =
      j === 0 ? baseGridY + singleDrawerH / 2 + 0.01 : baseGridY + singleDrawerH + 0.03 + singleDrawerH / 2;

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
      openZ: internalZ + 0.25,
      hasDivider: hasDivider,
      dividerKey: divKey,
    });
  }

  return ops;
}
