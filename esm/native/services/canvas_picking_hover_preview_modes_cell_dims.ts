import { getThreeMaybe } from '../runtime/three_access.js';
import { WARDROBE_LAYOUT_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  __callMaybe,
  __readPreviewSetSketchPlacementPreview,
  __withAppThree,
  type CellDimsHoverPreviewArgs,
} from './canvas_picking_hover_preview_modes_shared.js';
import { resolveCellDimsTargetBox } from './canvas_picking_hover_preview_modes_cell_dims_target.js';

export function tryHandleCellDimsHoverPreview(args: CellDimsHoverPreviewArgs): boolean {
  if (!args.isCellDimsMode) return false;
  try {
    const {
      App,
      ndcX,
      ndcY,
      raycaster,
      mouse,
      hideLayoutPreview,
      hideSketchPreview,
      previewRo,
      resolveInteriorHoverTarget,
      readCellDimsDraft,
      measureObjectLocalBox,
      getCellDimsHoverOp,
    } = args;
    const THREE = getThreeMaybe(App);
    const setPreview = __readPreviewSetSketchPlacementPreview(previewRo);
    const target = resolveInteriorHoverTarget(App, raycaster, mouse, ndcX, ndcY);
    if (!target || target.isBottom || !setPreview) {
      __callMaybe(hideSketchPreview, __withAppThree(App, THREE));
      __callMaybe(hideLayoutPreview, __withAppThree(App, THREE));
      return false;
    }

    const { applyW, applyH, applyD } = readCellDimsDraft(App);
    if (applyW == null && applyH == null && applyD == null) {
      __callMaybe(hideSketchPreview, __withAppThree(App, THREE));
      __callMaybe(hideLayoutPreview, __withAppThree(App, THREE));
      return false;
    }

    __callMaybe(hideLayoutPreview, __withAppThree(App, THREE));

    const selectorBox = target.hitSelectorObj ? measureObjectLocalBox(App, target.hitSelectorObj) : null;
    if (!selectorBox || !(selectorBox.width > 0) || !(selectorBox.height > 0) || !(selectorBox.depth > 0)) {
      __callMaybe(hideSketchPreview, __withAppThree(App, THREE));
      return false;
    }

    const previewTargetBox = resolveCellDimsTargetBox(App, target, selectorBox, applyW, applyH, applyD);
    const op = getCellDimsHoverOp(App, target, selectorBox);
    const previewDims = WARDROBE_LAYOUT_DIMENSIONS.cellDimsPreview;

    setPreview({
      App,
      THREE,
      anchor: target.hitSelectorObj,
      kind: 'box',
      fillFront: true,
      overlayThroughScene: true,
      x: Number(previewTargetBox.centerX),
      y: Number(previewTargetBox.centerY),
      z: Number(previewTargetBox.centerZ),
      w: Math.max(previewDims.minWidthM, Number(previewTargetBox.width) - previewDims.widthClearanceM),
      boxH: Math.max(previewDims.minHeightM, Number(previewTargetBox.height) - previewDims.heightClearanceM),
      d: Math.max(previewDims.minDepthM, Number(previewTargetBox.depth)),
      woodThick: Math.max(
        previewDims.woodThicknessMinM,
        Math.min(previewDims.woodThicknessMaxM, Number(target.woodThick) * previewDims.woodThicknessScale)
      ),
      op,
    });
    return true;
  } catch {
    return false;
  }
}
