import type { SketchBoxDividerState, SketchBoxSegmentState } from './canvas_picking_sketch_box_dividers.js';
import { resolveSketchFreeSurfaceAdornmentPreview } from './canvas_picking_sketch_free_surface_preview_adornment_preview.js';
import { resolveSketchFreeSurfaceDividerPreview } from './canvas_picking_sketch_free_surface_preview_divider.js';
import type {
  SelectorLocalBox,
  SketchFreeBoxTarget,
  SketchFreeHoverHost,
  SketchFreeHoverContentKind,
  SketchFreeSurfacePreviewResult,
} from './canvas_picking_sketch_free_surface_preview_shared.js';

export function resolveSketchFreeSurfaceContentPreview(args: {
  tool: string;
  contentKind: Extract<SketchFreeHoverContentKind, 'divider' | 'cornice' | 'base'>;
  host: SketchFreeHoverHost;
  target: SketchFreeBoxTarget;
  wardrobeBox: SelectorLocalBox;
  readSketchBoxDividers: (box: unknown) => SketchBoxDividerState[];
  resolveSketchBoxSegments: (args: {
    dividers: SketchBoxDividerState[];
    boxCenterX: number;
    innerW: number;
    woodThick: number;
  }) => SketchBoxSegmentState[];
  pickSketchBoxSegment: (args: {
    segments: SketchBoxSegmentState[];
    boxCenterX: number;
    innerW: number;
    cursorX: number;
  }) => SketchBoxSegmentState | null;
  findNearestSketchBoxDivider: (args: {
    dividers: SketchBoxDividerState[];
    boxCenterX: number;
    innerW: number;
    woodThick: number;
    cursorX: number;
  }) => { dividerId: string; xNorm: number; centerX: number; centered: boolean } | null;
  resolveSketchBoxDividerPlacement: (args: {
    boxCenterX: number;
    innerW: number;
    woodThick: number;
    cursorX: number;
    dividerXNorm: number | null;
    enableCenterSnap: boolean;
  }) => { xNorm: number; centerX: number; centered: boolean };
  readSketchBoxDividerXNorm: (box: unknown) => number | null;
}): SketchFreeSurfacePreviewResult | null {
  const {
    tool,
    contentKind,
    host,
    target,
    wardrobeBox,
    readSketchBoxDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    findNearestSketchBoxDivider,
    resolveSketchBoxDividerPlacement,
    readSketchBoxDividerXNorm,
  } = args;

  if (contentKind === 'divider') {
    return resolveSketchFreeSurfaceDividerPreview({
      tool,
      host,
      target,
      readSketchBoxDividers,
      resolveSketchBoxSegments,
      pickSketchBoxSegment,
      findNearestSketchBoxDivider,
      resolveSketchBoxDividerPlacement,
      readSketchBoxDividerXNorm,
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
