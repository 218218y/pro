import {
  CELL_DIMENSION_MATCH_POLICY,
  CELL_DIMENSION_PREVIEW_POLICY,
} from '../../shared/dimensions/cell_dimension_policy.js';
import { WARDROBE_DEFAULTS } from '../../shared/dimensions/wardrobe_defaults.js';
import { type CellDimsHoverPreviewArgs } from './canvas_picking_hover_preview_modes_shared.js';
import { createPartHoverPreviewRuntime } from './canvas_picking_part_hover_preview_runtime.js';
import type { PartHoverPreviewCommand } from './canvas_picking_part_hover_preview_protocol.js';
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
    const previewRuntime = createPartHoverPreviewRuntime({
      App,
      hideLayoutPreview,
      hideSketchPreview,
      previewRo,
    });
    const freeBoxTarget = resolveCellDimsFreeBoxHoverTarget({ App, ndcX, ndcY, raycaster, mouse });
    const target =
      freeBoxTarget?.target ||
      resolveCellDimsPostClickHoverTarget({ App, ndcX, ndcY, measureObjectLocalBox }) ||
      resolveInteriorHoverTarget(App, raycaster, mouse, ndcX, ndcY);
    if (!target || !previewRuntime.canShow) {
      return previewRuntime.apply({
        type: 'clear',
        clearScope: 'layout-and-sketch',
        reason: !target ? 'cell-dims-target-not-resolved' : 'cell-dims-preview-unavailable',
      });
    }

    const draft = readCellDimsDraft(App);
    const { applyW, applyD } = draft;
    const applyH = target.isBottom ? null : draft.applyH;
    const hexCellMode = draft.hexCellMode === true;
    if (!hexCellMode && applyW == null && applyH == null && applyD == null) {
      return previewRuntime.apply({
        type: 'clear',
        clearScope: 'layout-and-sketch',
        reason: 'cell-dims-draft-empty',
      });
    }

    const selectorBox =
      freeBoxTarget?.selectorBox ||
      (target.hitSelectorObj ? measureObjectLocalBox(App, target.hitSelectorObj) : null);
    if (!selectorBox || !(selectorBox.width > 0) || !(selectorBox.height > 0) || !(selectorBox.depth > 0)) {
      return previewRuntime.apply({
        type: 'clear',
        clearScope: 'layout-and-sketch',
        reason: 'cell-dims-selector-box-invalid',
      });
    }

    const previewTargetBox = resolveCellDimsTargetBox(
      App,
      target,
      selectorBox,
      applyW,
      applyH,
      applyD,
      CELL_DIMENSION_MATCH_POLICY.toleranceCm,
      CELL_DIMENSION_PREVIEW_POLICY.minWidthM,
      CELL_DIMENSION_PREVIEW_POLICY.minHeightM,
      CELL_DIMENSION_PREVIEW_POLICY.minDepthM
    );
    const op = getCellDimsHoverOp(
      App,
      target,
      selectorBox,
      {
        matchToleranceCm: CELL_DIMENSION_MATCH_POLICY.toleranceCm,
        defaultHingedDepthCm: WARDROBE_DEFAULTS.byType.hinged.depthCm,
      },
      previewTargetBox
    );

    const command: PartHoverPreviewCommand = {
      kind: 'box',
      anchor: target.hitSelectorObj,
      anchorParent: freeBoxTarget?.anchorParent || null,
      fillFront: true,
      fillBack: false,
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
    };
    return previewRuntime.apply({
      type: 'show',
      clearScope: 'layout',
      reason: 'cell-dims-target-resolved',
      command,
    });
  } catch {
    return false;
  }
}
