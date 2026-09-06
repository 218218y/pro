import { applySketchExternalDrawers, applySketchInternalDrawers } from './render_interior_sketch_drawers.js';
import { createSketchBoxLocator } from './render_interior_sketch_support.js';
import {
  resolveSketchBoxDividerPlacement,
  resolveSketchBoxHorizontalDividerPlacement,
  resolveSketchBoxHorizontalDividerScopeSegment,
  resolveSketchBoxVerticalDividerScopeSegment,
} from './render_interior_sketch_layout.js';
import {
  applySketchRods,
  applySketchShelves,
  applySketchStorageBarriers,
} from './render_interior_sketch_support.js';

import type { RenderSketchBoxAbsEntry } from './render_interior_sketch_boxes.js';
import type {
  InteriorSketchExtrasInput,
  InteriorSketchPlacementPlan,
  InteriorSketchResolvedThree,
  RenderInteriorSketchOpsContext,
} from './render_interior_sketch_ops_types.js';

function resolveInteriorSketchModuleDividerMaterial(
  resolved: InteriorSketchExtrasInput,
  owner: RenderInteriorSketchOpsContext,
  partId: string
): unknown {
  if (resolved.getPartMaterial !== undefined && owner.isFn(resolved.getPartMaterial)) {
    const material = resolved.getPartMaterial(partId);
    if (material != null) return material;
  }
  return resolved.bodyMat;
}

export function applyInteriorSketchOwnedDividers(
  resolved: InteriorSketchExtrasInput,
  owner: RenderInteriorSketchOpsContext
): void {
  const verticalDividers = resolved.dividers;
  const horizontalDividers = resolved.horizontalDividers;
  if (!verticalDividers.length && !horizontalDividers.length) return;

  const centerY = (resolved.effectiveBottomY + resolved.effectiveTopY) / 2;
  const dividerDepth = Math.max(0.0001, resolved.internalDepth);
  const centerZ = resolved.internalZ;
  const hostPartPrefix = resolved.moduleKeyStr
    ? `sketch_module_${resolved.moduleKeyStr}`
    : `sketch_module_${resolved.moduleIndex}`;

  for (const [index, divider] of horizontalDividers.entries()) {
    const column =
      divider.xNorm != null
        ? resolveSketchBoxHorizontalDividerScopeSegment({
            divider,
            horizontalDividers,
            verticalDividers,
            boxCenterX: resolved.internalCenterX,
            innerW: resolved.innerW,
            boxCenterY: centerY,
            innerH: resolved.spanH,
            woodThick: resolved.woodThick,
          })
        : null;
    const placement = resolveSketchBoxHorizontalDividerPlacement({
      boxCenterY: centerY,
      innerH: resolved.spanH,
      woodThick: resolved.woodThick,
      dividerYNorm: divider.yNorm,
    });
    const partId = `${hostPartPrefix}_hdivider_${divider.id || index}`;
    resolved.createBoard(
      Math.max(0.0001, column ? column.width : resolved.innerW),
      Math.max(0.0001, resolved.woodThick),
      dividerDepth,
      column ? column.centerX : resolved.internalCenterX,
      placement.centerY,
      centerZ,
      resolveInteriorSketchModuleDividerMaterial(resolved, owner, partId),
      partId
    );
  }

  for (const [index, divider] of verticalDividers.entries()) {
    const placement = resolveSketchBoxDividerPlacement({
      boxCenterX: resolved.internalCenterX,
      innerW: resolved.innerW,
      woodThick: resolved.woodThick,
      dividerXNorm: divider.xNorm,
    });
    const row =
      divider.yNorm != null && horizontalDividers.length
        ? resolveSketchBoxVerticalDividerScopeSegment({
            divider,
            verticalDividers,
            horizontalDividers,
            boxCenterX: resolved.internalCenterX,
            innerW: resolved.innerW,
            boxCenterY: centerY,
            innerH: resolved.spanH,
            woodThick: resolved.woodThick,
          })
        : null;
    const partId = `${hostPartPrefix}_divider_${divider.id || index}`;
    resolved.createBoard(
      Math.max(0.0001, resolved.woodThick),
      Math.max(0.0001, row ? row.height : resolved.spanH),
      dividerDepth,
      placement.centerX,
      row ? row.centerY : centerY,
      centerZ,
      resolveInteriorSketchModuleDividerMaterial(resolved, owner, partId),
      partId
    );
  }
}

export function applyInteriorSketchOwnedStorageBarriers(
  resolved: InteriorSketchExtrasInput,
  owner: RenderInteriorSketchOpsContext
): void {
  applySketchStorageBarriers({
    storageBarriers: resolved.storageBarriers,
    effectiveBottomY: resolved.effectiveBottomY,
    effectiveTopY: resolved.effectiveTopY,
    spanH: resolved.spanH,
    woodThick: resolved.woodThick,
    innerW: resolved.innerW,
    internalCenterX: resolved.internalCenterX,
    internalDepth: resolved.internalDepth,
    internalZ: resolved.internalZ,
    moduleKeyStr: resolved.moduleKeyStr,
    bodyMat: resolved.bodyMat,
    ...(resolved.getPartMaterial !== undefined ? { getPartMaterial: resolved.getPartMaterial } : {}),
    isFn: owner.isFn,
    createBoard: resolved.createBoard,
  });
}

export function applyInteriorSketchOwnedShelves(args: {
  resolved: InteriorSketchExtrasInput;
  resolvedThree: InteriorSketchResolvedThree;
  placementPlan: InteriorSketchPlacementPlan;
  boxAbs: RenderSketchBoxAbsEntry[];
}): void {
  const { resolved, resolvedThree, placementPlan, boxAbs } = args;
  const placementSupport = placementPlan.placementSupport;
  const findBoxAtY = createSketchBoxLocator(boxAbs);

  applySketchShelves({
    shelves: resolved.shelves,
    yFromNorm: placementSupport.yFromNorm,
    findBoxAtY,
    braceCenterX: resolved.braceCenterX,
    braceShelfWidth: resolved.braceShelfWidth,
    regularShelfWidth: resolved.regularShelfWidth,
    internalCenterX: resolved.internalCenterX,
    internalDepth: resolved.internalDepth,
    internalZ: resolved.internalZ,
    regularDepth: resolved.regularDepth,
    backZ: resolved.backZ,
    forceBraceShelves: resolved.forceBraceShelves,
    shelfExposedSide: resolved.shelfExposedSide,
    roundedShelfSide: resolved.roundedShelfSide,
    woodThick: resolved.woodThick,
    shelfThick: resolved.shelfThick,
    effectiveTopY: resolved.effectiveTopY,
    showContentsEnabled: resolved.input.showContentsEnabled === true,
    ...(resolved.input.addFoldedClothes !== undefined
      ? { addFoldedClothes: resolved.input.addFoldedClothes }
      : {}),
    contentsPolicy: {
      showContentsEnabled: resolved.input.showContentsEnabled === true,
      sketchMode: resolved.input.sketchMode === true,
      addOutlines: resolved.input.addOutlines || null,
      cfgSnapshot: resolved.input.cfgSnapshot,
    },
    currentShelfMat: resolved.currentShelfMat,
    currentBraceShelfMat: resolved.currentBraceShelfMat,
    moduleKeyStr: resolved.moduleKeyStr,
    ...(resolved.getPartMaterial !== undefined ? { getPartMaterial: resolved.getPartMaterial } : {}),
    ...(resolved.getPartColorValue !== undefined ? { getPartColorValue: resolved.getPartColorValue } : {}),
    glassMat: placementSupport.glassMat,
    createBoard: resolved.createBoard,
    group: resolved.group,
    THREE: resolvedThree.THREE,
    addBraceDarkSeams: placementSupport.addBraceDarkSeams,
    addShelfPins: placementSupport.addShelfPins,
  });
}

export function applyInteriorSketchOwnedRods(args: {
  owner: RenderInteriorSketchOpsContext;
  resolved: InteriorSketchExtrasInput;
  resolvedThree: InteriorSketchResolvedThree;
  placementPlan: InteriorSketchPlacementPlan;
}): void {
  const { owner, resolved, resolvedThree, placementPlan } = args;

  applySketchRods({
    rods: resolved.rods,
    yFromNorm: placementPlan.placementSupport.yFromNorm,
    ...(resolved.input.createRod !== undefined ? { createRod: resolved.input.createRod } : {}),
    isFn: owner.isFn,
    THREE: resolvedThree.THREE,
    App: resolved.App,
    assertTHREE: owner.assertTHREE,
    asObject: owner.asObject,
    innerW: resolved.innerW,
    internalCenterX: resolved.internalCenterX,
    internalZ: resolved.internalZ,
    group: resolved.group,
    reportSoft(op, error) {
      owner.renderOpsHandleCatch(resolved.App, op, error, undefined, { failFast: false, throttleMs: 5000 });
    },
  });
}

export function applyInteriorSketchOwnedDrawers(args: {
  owner: RenderInteriorSketchOpsContext;
  resolved: InteriorSketchExtrasInput;
  resolvedThree: InteriorSketchResolvedThree;
}): void {
  const { owner, resolved, resolvedThree } = args;

  applySketchExternalDrawers({
    App: resolved.App,
    input: resolved.input,
    drawers: resolved.drawers,
    extDrawers: resolved.extDrawers,
    THREE: resolvedThree.THREE,
    group: resolved.group,
    effectiveBottomY: resolved.effectiveBottomY,
    effectiveTopY: resolved.effectiveTopY,
    spanH: resolved.spanH,
    innerW: resolved.innerW,
    moduleDepth: resolved.moduleDepth,
    internalDepth: resolved.internalDepth,
    internalCenterX: resolved.internalCenterX,
    internalZ: resolved.internalZ,
    moduleIndex: resolved.moduleIndex,
    moduleKeyStr: resolved.moduleKeyStr,
    woodThick: resolved.woodThick,
    shelfThick: resolved.shelfThick,
    bodyMat: resolved.bodyMat,
    currentBraceShelfMat: resolved.currentBraceShelfMat,
    createBoard: resolved.createBoard,
    ...(resolved.getPartMaterial !== undefined ? { getPartMaterial: resolved.getPartMaterial } : {}),
    ...(resolved.getPartColorValue !== undefined ? { getPartColorValue: resolved.getPartColorValue } : {}),
    moduleDoorFaceSpan: resolved.moduleDoorFaceSpan,
    isFn: owner.isFn,
    renderOpsHandleCatch: owner.renderOpsHandleCatch,
  });

  applySketchInternalDrawers({
    App: resolved.App,
    input: resolved.input,
    drawers: resolved.drawers,
    extDrawers: resolved.extDrawers,
    THREE: resolvedThree.THREE,
    group: resolved.group,
    effectiveBottomY: resolved.effectiveBottomY,
    effectiveTopY: resolved.effectiveTopY,
    spanH: resolved.spanH,
    woodThick: resolved.woodThick,
    innerW: resolved.innerW,
    internalDepth: resolved.internalDepth,
    internalCenterX: resolved.internalCenterX,
    internalZ: resolved.internalZ,
    moduleIndex: resolved.moduleIndex,
    moduleKeyStr: resolved.moduleKeyStr,
    bodyMat: resolved.bodyMat,
    currentShelfMat: resolved.currentShelfMat,
    createBoard: resolved.createBoard,
    ...(resolved.getPartMaterial !== undefined ? { getPartMaterial: resolved.getPartMaterial } : {}),
    ...(resolved.getPartColorValue !== undefined ? { getPartColorValue: resolved.getPartColorValue } : {}),
    applyInternalDrawersOps: owner.applyInternalDrawersOps,
    renderOpsHandleCatch: owner.renderOpsHandleCatch,
  });
}
