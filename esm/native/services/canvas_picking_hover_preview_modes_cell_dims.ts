import { getThreeMaybe } from '../runtime/three_access.js';
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
      w: Math.max(0.03, Number(previewTargetBox.width) - 0.006),
      boxH: Math.max(0.03, Number(previewTargetBox.height) - 0.006),
      d: Math.max(0.024, Number(previewTargetBox.depth)),
      woodThick: Math.max(0.004, Math.min(0.01, Number(target.woodThick) * 0.5)),
      op,
    });
    return true;
  } catch {
    return false;
  }
}
