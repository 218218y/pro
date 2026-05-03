import type { ResolveSketchBoxHeightArgs } from './render_interior_sketch_boxes_shell_types.js';

export function resolveSketchBoxHeight(args: ResolveSketchBoxHeightArgs): number | null {
  let height = Number(args.rawHeight);
  if (!Number.isFinite(height)) height = Number(args.fallbackHeight);
  if (!Number.isFinite(height)) return null;
  if (height < args.woodThick * 2 + 0.02) height = args.woodThick * 2 + 0.02;
  if (!args.isFreePlacement && height > args.spanH) height = args.spanH;
  return height;
}
