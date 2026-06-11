import { applySketchExternalDrawers, applySketchInternalDrawers } from './render_interior_sketch_drawers.js';
import { createSketchBoxLocator } from './render_interior_sketch_support.js';
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
    getPartMaterial: resolved.getPartMaterial,
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
    woodThick: resolved.woodThick,
    currentShelfMat: resolved.currentShelfMat,
    glassMat: placementSupport.glassMat,
    createBoard: resolved.createBoard,
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
    createRod: resolved.input.createRod,
    isFn: owner.isFn,
    THREE: resolvedThree.THREE,
    App: resolved.App,
    assertTHREE: owner.assertTHREE,
    asObject: owner.asObject,
    innerW: resolved.innerW,
    internalCenterX: resolved.internalCenterX,
    internalZ: resolved.internalZ,
    group: resolved.group,
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
    moduleIndex: resolved.moduleIndex,
    moduleKeyStr: resolved.moduleKeyStr,
    woodThick: resolved.woodThick,
    bodyMat: resolved.bodyMat,
    getPartMaterial: resolved.getPartMaterial,
    moduleDoorFaceSpan: resolved.moduleDoorFaceSpan,
    isFn: owner.isFn,
    renderOpsHandleCatch: owner.renderOpsHandleCatch,
  });

  applySketchInternalDrawers({
    App: resolved.App,
    input: resolved.input,
    drawers: resolved.drawers,
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
    applyInternalDrawersOps: owner.applyInternalDrawersOps,
    renderOpsHandleCatch: owner.renderOpsHandleCatch,
  });
}
