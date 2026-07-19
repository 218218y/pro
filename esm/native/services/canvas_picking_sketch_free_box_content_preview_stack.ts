import { MATERIAL_THICKNESS_POLICY } from '../../shared/dimensions/material_thickness_policy.js';
import {
  parseSketchExtDrawerCount,
  parseSketchExtDrawerHeightM,
  parseSketchIntDrawerHeightM,
} from './canvas_picking_manual_layout_sketch_vertical_stack.js';
import { resolveSketchBoxStackPreview } from './canvas_picking_sketch_box_stack_preview.js';
import type {
  SketchFreeBoxContentPreviewResult,
  SketchFreeStackPreviewArgs,
} from './canvas_picking_sketch_free_box_content_preview_contracts.js';

export function resolveSketchFreeStackContentPreview(
  args: SketchFreeStackPreviewArgs
): SketchFreeBoxContentPreviewResult {
  const {
    tool,
    contentKind,
    host,
    target,
    readSketchBoxDividers,
    readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
  } = args;
  const { boxId, targetBox, targetGeo, targetCenterY, targetHeight, pointerX, pointerY } = target;
  const boxStackPreview = resolveSketchBoxStackPreview({
    host: { tool, moduleKey: host.moduleKey, isBottom: host.isBottom },
    contentKind,
    boxId,
    freePlacement: true,
    targetBox,
    targetGeo,
    targetCenterY,
    targetHeight,
    pointerX,
    pointerY,
    woodThick: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
    selectedDrawerCount: contentKind === 'ext_drawers' ? parseSketchExtDrawerCount(tool) : null,
    drawerHeightM:
      contentKind === 'ext_drawers' ? parseSketchExtDrawerHeightM(tool) : parseSketchIntDrawerHeightM(tool),
    readSketchBoxDividers,
    readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
  });
  if (!boxStackPreview || !boxStackPreview.preview) return { mode: 'hide' };
  return {
    mode: 'preview',
    hoverRecord: boxStackPreview.hoverRecord,
    preview: boxStackPreview.preview,
  };
}
