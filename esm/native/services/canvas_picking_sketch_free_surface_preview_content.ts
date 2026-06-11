import type {
  SketchFreeSurfacePreviewResolverArgs,
  SketchFreeSurfacePreviewResult,
} from './canvas_picking_sketch_free_box_content_preview_contracts.js';
import { resolveSketchFreeSurfaceAdornmentPreview } from './canvas_picking_sketch_free_surface_preview_adornment_preview.js';
import { resolveSketchFreeSurfaceDividerPreview } from './canvas_picking_sketch_free_surface_preview_divider.js';

export function resolveSketchFreeSurfaceContentPreview(
  args: SketchFreeSurfacePreviewResolverArgs
): SketchFreeSurfacePreviewResult | null {
  const {
    tool,
    contentKind,
    host,
    target,
    wardrobeBox,
    readSketchBoxDividers,
    readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    findNearestSketchBoxDivider,
    resolveSketchBoxDividerPlacement,
    readSketchBoxDividerXNorm,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
    findNearestSketchBoxHorizontalDivider,
    resolveSketchBoxHorizontalDividerPlacement,
  } = args;

  if (contentKind === 'divider') {
    return resolveSketchFreeSurfaceDividerPreview({
      tool,
      host,
      target,
      readSketchBoxDividers,
      readSketchBoxHorizontalDividers,
      resolveSketchBoxSegments,
      pickSketchBoxSegment,
      findNearestSketchBoxDivider,
      resolveSketchBoxDividerPlacement,
      readSketchBoxDividerXNorm,
      resolveSketchBoxVerticalSegments,
      pickSketchBoxVerticalSegment,
      findNearestSketchBoxHorizontalDivider,
      resolveSketchBoxHorizontalDividerPlacement,
    });
  }

  if (contentKind === 'cornice' || contentKind === 'base') {
    return resolveSketchFreeSurfaceAdornmentPreview({
      tool,
      contentKind,
      host,
      target,
      wardrobeBox,
      readSketchBoxDividers,
      resolveSketchBoxSegments,
    });
  }

  return null;
}
