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
} from '../features/sketch_drawer_sizing.js';

export function buildSketchInternalDrawerRuntimeArgs(
  args: ApplySketchInternalDrawersOwnerArgs
): ApplySketchInternalDrawersRuntimeArgs | null {
  const {
    App,
    input,
    drawers,
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
    drawers,
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
    getPartMaterial: input.getPartMaterial,
    bodyMat,
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
  drawers: ApplySketchInternalDrawersOwnerArgs['drawers'];
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

  for (let i = 0; i < drawers.length; i++) {
    const item = drawers[i] || null;
    if (!item) continue;
    const metrics = resolveSketchInternalDrawerMetrics({
      drawerHeightM: readSketchDrawerHeightMFromItem(item, DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_M),
      availableHeightM: Math.max(0, effectiveTopY - effectiveBottomY - padDrawer * 2),
    });
    const singleDrawerH = metrics.drawerH;
    const drawerGap = metrics.drawerGap;
    const stackH = metrics.stackH;
    const clampBaseY = (y: number) => {
      const lo = effectiveBottomY + padDrawer;
      const hi = effectiveTopY - padDrawer - stackH;
      return Math.max(lo, Math.min(hi, y));
    };
    const clampCenterY = (yCenter: number) => {
      const lo = effectiveBottomY + padDrawer + stackH / 2;
      const hi = effectiveTopY - padDrawer - stackH / 2;
      if (!(hi > lo))
        return Math.max(effectiveBottomY + padDrawer, Math.min(effectiveTopY - padDrawer, yCenter));
      return Math.max(lo, Math.min(hi, yCenter));
    };

    const nC = typeof item.yNormC === 'number' ? item.yNormC : Number(item.yNormC);
    const nBase = typeof item.yNorm === 'number' ? item.yNorm : Number(item.yNorm);

    let baseY0: number | null = null;
    if (Number.isFinite(nC)) {
      const center0 = effectiveBottomY + Math.max(0, Math.min(1, nC)) * spanH;
      const center = clampCenterY(center0);
      baseY0 = center - stackH / 2;
    } else if (Number.isFinite(nBase)) {
      baseY0 = effectiveBottomY + Math.max(0, Math.min(1, nBase)) * spanH;
    }
    if (baseY0 == null) continue;

    const baseY = clampBaseY(baseY0);
    const drawerId = item.id != null ? String(item.id) : String(i);
    const partId = moduleKeyStr ? `div_int_sketch_${moduleKeyStr}_${drawerId}` : `div_int_sketch_${drawerId}`;
    const drawerBottomLift = Math.min(
      DRAWER_DIMENSIONS.sketch.internalBottomLiftMaxM,
      woodThick * DRAWER_DIMENSIONS.sketch.internalBottomLiftWoodRatio
    );

    for (let j = 0; j < 2; j++) {
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
        hasDivider: false,
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
