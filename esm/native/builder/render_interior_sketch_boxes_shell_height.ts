import { SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { ResolveSketchBoxHeightArgs } from './render_interior_sketch_boxes_shell_types.js';

export function resolveSketchBoxHeight(args: ResolveSketchBoxHeightArgs): number | null {
  let height = Number(args.rawHeight);
  if (!Number.isFinite(height)) height = Number(args.defaultHeight);
  if (!Number.isFinite(height)) return null;
  const minHeight = args.woodThick * 2 + SKETCH_BOX_DIMENSIONS.geometry.minInnerAdditiveClearanceM;
  if (height < minHeight) height = minHeight;
  if (!args.isFreePlacement && height > args.spanH) height = args.spanH;
  return height;
}
