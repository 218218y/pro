export type {
  ModuleKey,
  RecordMap,
  ResolveSketchBoxVerticalContentPreviewArgs,
  ResolveSketchBoxVerticalContentPreviewResult,
  SketchBoxSegmentLike,
  SketchBoxVerticalContentGeo,
  SketchBoxVerticalContentHost,
  SketchBoxVerticalContentKind,
} from './canvas_picking_sketch_box_vertical_content_preview_contracts.js';

import type {
  ResolveSketchBoxVerticalContentPreviewArgs,
  ResolveSketchBoxVerticalContentPreviewResult,
} from './canvas_picking_sketch_box_vertical_content_preview_contracts.js';
import { createSketchBoxVerticalPreviewState } from './canvas_picking_sketch_box_vertical_content_preview_state.js';
import { resolveSketchBoxRodPreview } from './canvas_picking_sketch_box_vertical_content_preview_rod.js';
import { resolveSketchBoxShelfPreview } from './canvas_picking_sketch_box_vertical_content_preview_shelf.js';
import { resolveSketchBoxStoragePreview } from './canvas_picking_sketch_box_vertical_content_preview_storage.js';

export function resolveSketchBoxVerticalContentPreview(
  args: ResolveSketchBoxVerticalContentPreviewArgs
): ResolveSketchBoxVerticalContentPreviewResult | null {
  const state = createSketchBoxVerticalPreviewState(args);
  if (args.contentKind === 'shelf') return resolveSketchBoxShelfPreview(args, state);
  if (args.contentKind === 'rod') return resolveSketchBoxRodPreview(args, state);
  if (args.contentKind === 'storage') return resolveSketchBoxStoragePreview(args, state);
  return null;
}
