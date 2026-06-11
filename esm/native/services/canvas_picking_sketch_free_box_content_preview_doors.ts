import { resolveSketchBoxDoorPreview } from './canvas_picking_sketch_box_door_preview.js';
import type {
  SketchFreeBoxContentPreviewResult,
  SketchFreeDoorPreviewArgs,
} from './canvas_picking_sketch_free_box_content_preview_contracts.js';

export function resolveSketchFreeDoorContentPreview(
  args: SketchFreeDoorPreviewArgs
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
  const { boxId, targetBox, targetGeo, targetCenterY, targetHeight, pointerX } = target;
  const doorPreview = resolveSketchBoxDoorPreview({
    host: { tool, moduleKey: host.moduleKey, isBottom: host.isBottom },
    contentKind,
    boxId,
    freePlacement: true,
    targetBox,
    targetGeo,
    targetCenterY,
    targetHeight,
    pointerX,
    woodThick: 0.018,
    readSketchBoxDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
  });
  return doorPreview ? { mode: 'preview', ...doorPreview } : { mode: 'hide' };
}
