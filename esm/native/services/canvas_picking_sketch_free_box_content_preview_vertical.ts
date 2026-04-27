import { resolveSketchBoxVerticalContentPreview } from './canvas_picking_sketch_box_vertical_content_preview.js';
import type {
  SketchFreeBoxContentPreviewResult,
  SketchFreeVerticalPreviewArgs,
} from './canvas_picking_sketch_free_box_content_preview_contracts.js';
import {
  resolveSketchShelfDepthOverrideM,
  resolveSketchShelfVariant,
  resolveSketchStorageHeight,
} from './canvas_picking_sketch_free_box_content_preview_tooling.js';

export function resolveSketchFreeVerticalContentPreview(
  args: SketchFreeVerticalPreviewArgs
): SketchFreeBoxContentPreviewResult {
  const {
    tool,
    contentKind,
    host,
    target,
    readSketchBoxDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
  } = args;
  const { boxId, targetBox, targetGeo, targetCenterY, targetHeight, pointerX, pointerY } = target;
  const verticalContentPreview = resolveSketchBoxVerticalContentPreview({
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
    woodThick: 0.018,
    shelfVariant: contentKind === 'shelf' ? resolveSketchShelfVariant(tool) : null,
    shelfDepthOverrideM: contentKind === 'shelf' ? resolveSketchShelfDepthOverrideM(tool) : null,
    storageHeight: contentKind === 'storage' ? resolveSketchStorageHeight(tool) : null,
    readSketchBoxDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
  });
  return verticalContentPreview ? { mode: 'preview', ...verticalContentPreview } : { mode: 'hide' };
}
