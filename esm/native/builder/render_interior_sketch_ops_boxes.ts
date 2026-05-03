import { renderInteriorSketchBoxes } from './render_interior_sketch_boxes.js';

import type { RenderSketchBoxAbsEntry } from './render_interior_sketch_boxes.js';
import type {
  InteriorSketchExtrasInput,
  InteriorSketchPlacementPlan,
  InteriorSketchResolvedThree,
  RenderInteriorSketchOpsContext,
} from './render_interior_sketch_ops_types.js';

export function renderInteriorSketchOwnedBoxes(args: {
  owner: RenderInteriorSketchOpsContext;
  resolved: InteriorSketchExtrasInput;
  resolvedThree: InteriorSketchResolvedThree;
  placementPlan: InteriorSketchPlacementPlan;
}): RenderSketchBoxAbsEntry[] {
  const { owner, resolved, resolvedThree, placementPlan } = args;
  const placementSupport = placementPlan.placementSupport;

  return renderInteriorSketchBoxes({
    App: resolved.App,
    input: resolved.input,
    boxes: resolved.boxes,
    createBoard: resolved.createBoard,
    group: resolved.group,
    effectiveBottomY: resolved.effectiveBottomY,
    effectiveTopY: resolved.effectiveTopY,
    spanH: resolved.spanH,
    innerW: resolved.innerW,
    woodThick: resolved.woodThick,
    internalDepth: resolved.internalDepth,
    internalCenterX: resolved.internalCenterX,
    internalZ: resolved.internalZ,
    moduleIndex: resolved.moduleIndex,
    moduleKeyStr: resolved.moduleKeyStr,
    currentShelfMat: resolved.currentShelfMat,
    bodyMat: resolved.bodyMat,
    getPartMaterial: resolved.getPartMaterial,
    getPartColorValue: resolved.getPartColorValue,
    createDoorVisual: resolved.createDoorVisual,
    THREE: resolvedThree.THREE,
    addDimensionLine: resolvedThree.addDimensionLine,
    renderFreeBoxDimensionsEnabled: resolvedThree.renderFreeBoxDimensionsEnabled,
    freeBoxDimensionEntries: resolvedThree.freeBoxDimensionEntries,
    measureWardrobeLocalBox: owner.measureWardrobeLocalBox,
    clampY: placementSupport.clampY,
    glassMat: placementSupport.glassMat,
    addBraceDarkSeams: placementSupport.addBraceDarkSeams,
    addShelfPins: placementSupport.addShelfPins,
    isFn: owner.isFn,
    asObject: owner.asObject,
    ops: resolved.renderOps,
    doorsArray: owner.doors(resolved.App),
    markSplitHoverPickablesDirty: owner.markSplitHoverPickablesDirty ?? undefined,
    renderOpsHandleCatch: owner.renderOpsHandleCatch,
    applyInternalDrawersOps: owner.applyInternalDrawersOps,
  });
}
