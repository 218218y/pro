import type { InteriorValueRecord } from './render_interior_ops_contracts.js';
import { DRAWER_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type {
  ApplySketchInternalDrawersOwnerArgs,
  ApplySketchInternalDrawersRuntimeArgs,
} from './render_interior_sketch_drawers_shared.js';
import type {
  ApplyInternalSketchDrawersArgs,
  SketchInternalDrawerOp,
} from './render_interior_sketch_shared.js';
import {
  DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_M,
  readSketchDrawerHeightMFromItem,
  resolveSketchInternalDrawerMetrics,
  sketchStackFitsAvailableHeight,
} from '../features/sketch_drawer_sizing.js';
import { resolveSketchStackCenterYFromNormalizedItem } from '../features/sketch_stack_positioning.js';
import { hasSketchDrawerDivider } from './render_interior_sketch_drawer_dividers.js';
import {
  buildSketchExternalDrawerCollisionRanges,
  sketchStackRangeOverlaps,
} from './render_interior_sketch_stack_collision.js';

export function buildSketchInternalDrawerRuntimeArgs(
  args: ApplySketchInternalDrawersOwnerArgs
): ApplySketchInternalDrawersRuntimeArgs | null {
  const {
    App,
    input,
    drawers,
    extDrawers,
    THREE,
    group,
    effectiveBottomY,
    effectiveTopY,
    spanH,
    woodThick,
    innerW,
    internalDepth,
    internalCenterX,
    internalZ,
    moduleIndex,
    moduleKeyStr,
    bodyMat,
  } = args;

  const createInternalDrawerBox = input.createInternalDrawerBox;
  const addOutlines = input.addOutlines;
  const showContentsEnabled = !!input.showContentsEnabled;
  const addFoldedClothes = input.addFoldedClothes;

  if (!THREE || !createInternalDrawerBox || !drawers.length) return null;

  const ops = buildSketchInternalDrawerOps({
    App,
    drawers,
    extDrawers,
    input,
    moduleIndex,
    moduleKeyStr,
    effectiveBottomY,
    effectiveTopY,
    spanH,
    woodThick,
    innerW,
    internalDepth,
    internalCenterX,
    internalZ,
  });
  if (!ops.length) return null;

  const drawerArgs: ApplyInternalSketchDrawersArgs = {
    App,
    THREE,
    ops,
    wardrobeGroup: group,
    createInternalDrawerBox,
    addOutlines,
    sketchMode: input.sketchMode === true,
    getPartMaterial: input.getPartMaterial,
    bodyMat,
    cfg: input.cfgSnapshot,
    showContentsEnabled,
    addFoldedClothes,
  };

  return {
    ...drawerArgs,
    input,
    moduleIndex,
    moduleKeyStr,
    effectiveBottomY,
    effectiveTopY,
    spanH,
    woodThick,
    innerW,
    internalDepth,
    internalCenterX,
    internalZ,
    drawers,
  };
}

export function buildSketchInternalDrawerOps(args: {
  App?: ApplySketchInternalDrawersOwnerArgs['App'] | null;
  drawers: ApplySketchInternalDrawersOwnerArgs['drawers'];
  extDrawers?: ApplySketchInternalDrawersOwnerArgs['extDrawers'];
  input: ApplySketchInternalDrawersOwnerArgs['input'];
  moduleIndex: number;
  moduleKeyStr: string;
  effectiveBottomY: number;
  effectiveTopY: number;
  spanH: number;
  woodThick: number;
  innerW: number;
  internalDepth: number;
  internalCenterX: number;
  internalZ: number;
}): SketchInternalDrawerOp[] {
  const {
    drawers,
    extDrawers = [],
    input,
    moduleIndex,
    moduleKeyStr,
    effectiveBottomY,
    effectiveTopY,
    spanH,
    woodThick,
    innerW,
    internalDepth,
    internalCenterX,
    internalZ,
  } = args;

  const padDrawer = Math.min(
    DRAWER_DIMENSIONS.sketch.internalClampPadMaxM,
    Math.max(
      DRAWER_DIMENSIONS.sketch.internalClampPadMinM,
      woodThick * DRAWER_DIMENSIONS.sketch.internalClampPadWoodRatio
    )
  );

  const ops: SketchInternalDrawerOp[] = [];
  const moduleKeyForUd: string | number = input.moduleKey != null ? String(input.moduleKey) : moduleIndex;
  const width = Math.max(
    DRAWER_DIMENSIONS.sketch.internalWidthMinM,
    innerW - DRAWER_DIMENSIONS.sketch.internalWidthClearanceM
  );
  const depth = Math.max(
    DRAWER_DIMENSIONS.sketch.internalDepthMinM,
    internalDepth - DRAWER_DIMENSIONS.sketch.internalDepthClearanceM
  );
  const availableStackHeightM = Math.max(0, effectiveTopY - effectiveBottomY - padDrawer * 2);
  const externalBlockers = buildSketchExternalDrawerCollisionRanges({
    extDrawers,
    bottomY: effectiveBottomY,
    topY: effectiveTopY,
    totalHeight: spanH,
  });

  for (let i = 0; i < drawers.length; i++) {
    const item = drawers[i] || null;
    if (!item) continue;
    const metrics = resolveSketchInternalDrawerMetrics({
      drawerHeightM: readSketchDrawerHeightMFromItem(item, DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_M),
    });
    const singleDrawerH = metrics.drawerH;
    const drawerGap = metrics.drawerGap;
    const stackH = metrics.stackH;
    if (!sketchStackFitsAvailableHeight(stackH, availableStackHeightM)) continue;
    const clampBaseY = (y: number) => {
      const lo = effectiveBottomY + padDrawer;
      const hi = effectiveTopY - padDrawer - stackH;
      return Math.max(lo, Math.min(hi, y));
    };
    const centerY = resolveSketchStackCenterYFromNormalizedItem({
      item,
      bottomY: effectiveBottomY,
      topY: effectiveTopY,
      totalHeight: spanH,
      stackH,
      pad: padDrawer,
    });
    const baseY0: number | null = centerY == null ? null : centerY - stackH / 2;
    if (baseY0 == null) continue;

    const baseY = clampBaseY(baseY0);
    if (
      sketchStackRangeOverlaps(
        { id: item.id != null ? String(item.id) : String(i), minY: baseY, maxY: baseY + stackH },
        externalBlockers
      )
    ) {
      continue;
    }
    const drawerId = item.id != null ? String(item.id) : String(i);
    const stackPartId = moduleKeyStr
      ? `div_int_sketch_${moduleKeyStr}_${drawerId}`
      : `div_int_sketch_${drawerId}`;
    const drawerBottomLift = Math.min(
      DRAWER_DIMENSIONS.sketch.internalBottomLiftMaxM,
      woodThick * DRAWER_DIMENSIONS.sketch.internalBottomLiftWoodRatio
    );

    for (let j = 0; j < 2; j++) {
      const drawerSlot = j === 0 ? 'lower' : 'upper';
      const partId = `${stackPartId}_${drawerSlot}`;
      const hasDivider = hasSketchDrawerDivider({ input, partId });
      const yFinal =
        j === 0
          ? baseY + singleDrawerH / 2 + drawerBottomLift
          : baseY + singleDrawerH + drawerGap + singleDrawerH / 2;
      ops.push({
        kind: 'internal_drawer',
        partId,
        drawerIndex: j,
        moduleIndex: moduleKeyForUd,
        slotIndex: 0,
        width,
        height: singleDrawerH,
        depth,
        x: internalCenterX,
        y: yFinal,
        z: internalZ,
        openZ: internalZ + DRAWER_DIMENSIONS.sketch.internalOpenOffsetZM,
        hasDivider,
        dividerKey: partId,
      });
    }
  }

  return ops;
}

export function applySketchInternalDrawers(args: ApplySketchInternalDrawersOwnerArgs): void {
  const { App, applyInternalDrawersOps, renderOpsHandleCatch } = args;
  if (!args.drawers.length || !args.THREE) return;

  try {
    const runtimeArgs = buildSketchInternalDrawerRuntimeArgs(args);
    if (!runtimeArgs) return;
    const runtimePayload: InteriorValueRecord = { ...runtimeArgs };
    applyInternalDrawersOps(runtimePayload);
  } catch (error) {
    renderOpsHandleCatch(App, 'applyInteriorSketchExtras.drawers', error, undefined, {
      failFast: false,
      throttleMs: 5000,
    });
  }
}
