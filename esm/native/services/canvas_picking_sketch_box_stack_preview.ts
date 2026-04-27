import type {
  ResolveSketchBoxStackPreviewArgs,
  ResolveSketchBoxStackPreviewResult,
} from './canvas_picking_sketch_box_stack_preview_contracts.js';
import { resolveSketchBoxDrawersPreview } from './canvas_picking_sketch_box_stack_preview_drawers.js';
import { resolveSketchBoxExternalDrawersPreview } from './canvas_picking_sketch_box_stack_preview_ext_drawers.js';

export type {
  ModuleKey,
  RecordMap,
  ResolveSketchBoxStackPreviewArgs,
  ResolveSketchBoxStackPreviewResult,
  SketchBoxSegmentLike,
  SketchBoxStackPreviewGeo,
  SketchBoxStackPreviewHost,
} from './canvas_picking_sketch_box_stack_preview_contracts.js';

export function resolveSketchBoxStackPreview(
  args: ResolveSketchBoxStackPreviewArgs
): ResolveSketchBoxStackPreviewResult {
  return args.contentKind === 'drawers'
    ? resolveSketchBoxDrawersPreview(args)
    : resolveSketchBoxExternalDrawersPreview(args);
}
