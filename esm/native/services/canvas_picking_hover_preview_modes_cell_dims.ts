import { getThreeMaybe } from '../runtime/three_access.js';
import { CELL_DIMENSION_PREVIEW_POLICY } from '../../shared/dimensions/cell_dimension_policy.js';
import {
  __callMaybe,
  __readPreviewSetSketchPlacementPreview,
  __withAppThree,
  type CellDimsHoverPreviewArgs,
} from './canvas_picking_hover_preview_modes_shared.js';
import { resolveCellDimsTargetBox } from './canvas_picking_hover_preview_modes_cell_dims_target.js';
import { resolveCellDimsPostClickHoverTarget } from './canvas_picking_cell_dims_post_click_hover.js';
import { resolveCellDimsFreeBoxHoverTarget } from './canvas_picking_cell_dims_free_box_hover.js';

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
    const freeBoxTarget = resolveCellDimsFreeBoxHoverTarget({ App, ndcX, ndcY, raycaster, mouse });
    const target =
      freeBoxTarget?.target ||
      resolveCellDimsPostClickHoverTarget({ App, ndcX, ndcY, measureObjectLocalBox }) ||
      resolveInteriorHoverTarget(App, raycaster, mouse, ndcX, ndcY);
    if (!target || !setPreview) {
      __callMaybe(hideSketchPreview, __withAppThree(App, THREE));
      __callMaybe(hideLayoutPreview, __withAppThree(App, THREE));
      return false;
    }

    const draft = readCellDimsDraft(App);
    const { applyW, applyD } = draft;
    const applyH = target.isBottom ? null : draft.applyH;
    const hexCellMode = draft.hexCellMode === true;
    if (!hexCellMode && applyW == null && applyH == null && applyD == null) {
      __callMaybe(hideSketchPreview, __withAppThree(App, THREE));
      __callMaybe(hideLayoutPreview, __withAppThree(App, THREE));
      return false;
    }

    __callMaybe(hideLayoutPreview, __withAppThree(App, THREE));

    const selectorBox =
      freeBoxTarget?.selectorBox ||
      (target.hitSelectorObj ? measureObjectLocalBox(App, target.hitSelectorObj) : null);
    if (!selectorBox || !(selectorBox.width > 0) || !(selectorBox.height > 0) || !(selectorBox.depth > 0)) {
      __callMaybe(hideSketchPreview, __withAppThree(App, THREE));
      return false;
    }

    const previewTargetBox = resolveCellDimsTargetBox(App, target, selectorBox, applyW, applyH, applyD);
    const op = getCellDimsHoverOp(App, target, selectorBox);

    setPreview({
      App,
      THREE,
      anchor: target.hitSelectorObj,
      ...(freeBoxTarget?.anchorParent ? { anchorParent: freeBoxTarget.anchorParent } : {}),
      kind: 'box',
      fillFront: true,
      overlayThroughScene: true,
      x: Number(previewTargetBox.centerX),
      y: Number(previewTargetBox.centerY),
      z: Number(previewTargetBox.centerZ),
      w: Math.max(
        CELL_DIMENSION_PREVIEW_POLICY.minWidthM,
        Number(previewTargetBox.width) - CELL_DIMENSION_PREVIEW_POLICY.widthClearanceM
      ),
      boxH: Math.max(
        CELL_DIMENSION_PREVIEW_POLICY.minHeightM,
        Number(previewTargetBox.height) - CELL_DIMENSION_PREVIEW_POLICY.heightClearanceM
      ),
      d: Math.max(CELL_DIMENSION_PREVIEW_POLICY.minDepthM, Number(previewTargetBox.depth)),
      woodThick: Math.max(
        CELL_DIMENSION_PREVIEW_POLICY.woodThicknessMinM,
        Math.min(
          CELL_DIMENSION_PREVIEW_POLICY.woodThicknessMaxM,
          Number(target.woodThick) * CELL_DIMENSION_PREVIEW_POLICY.woodThicknessScale
        )
      ),
      op,
    });
    return true;
  } catch {
    return false;
  }
}
