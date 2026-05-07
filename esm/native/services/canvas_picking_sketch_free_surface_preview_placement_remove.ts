import { MATERIAL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { resolveSketchBoxVisibleFrontOverlay } from './canvas_picking_manual_layout_sketch_front_overlay.js';
import type {
  ResolveSketchBoxSegmentsArgs,
  SketchFreeBoxGeometry,
  SketchFreeBoxGeometryArgs,
} from './canvas_picking_manual_layout_sketch_contracts.js';
import type { SketchBoxDividerState, SketchBoxSegmentState } from './canvas_picking_sketch_box_dividers.js';
import { readRecordNumber, type RecordMap } from './canvas_picking_sketch_free_surface_preview_shared.js';
import type { SketchFreePlacementPreviewOp } from './canvas_picking_sketch_free_surface_preview_placement_record.js';

export type SketchFreePlacementRemoveOverlay = {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
} | null;

export function resolveSketchFreePlacementRemoveOverlay(args: {
  hoverPlacement: SketchFreePlacementPreviewOp;
  removeBox: RecordMap | null;
  wardrobeWidth: number;
  wardrobeDepth: number;
  wardrobeBackZ: number;
  resolveSketchFreeBoxGeometry: (args: SketchFreeBoxGeometryArgs) => SketchFreeBoxGeometry;
  readSketchBoxDividers: (box: unknown) => SketchBoxDividerState[];
  resolveSketchBoxSegments: (args: ResolveSketchBoxSegmentsArgs) => SketchBoxSegmentState[];
}): SketchFreePlacementRemoveOverlay {
  const {
    hoverPlacement,
    removeBox,
    wardrobeWidth,
    wardrobeDepth,
    wardrobeBackZ,
    resolveSketchFreeBoxGeometry,
    readSketchBoxDividers,
    resolveSketchBoxSegments,
  } = args;
  if (!removeBox || hoverPlacement.op !== 'remove') return null;
  const removeBoxGeo = resolveSketchFreeBoxGeometry({
    wardrobeWidth,
    wardrobeDepth,
    backZ: wardrobeBackZ,
    centerX: readRecordNumber(removeBox, 'absX') ?? hoverPlacement.previewX,
    woodThick: MATERIAL_DIMENSIONS.wood.thicknessM,
    widthM: readRecordNumber(removeBox, 'widthM'),
    depthM: readRecordNumber(removeBox, 'depthM'),
  });
  const removeBoxSegments = resolveSketchBoxSegments({
    dividers: readSketchBoxDividers(removeBox),
    boxCenterX: removeBoxGeo.centerX,
    innerW: removeBoxGeo.innerW,
    woodThick: MATERIAL_DIMENSIONS.wood.thicknessM,
  });
  const frontOverlay = resolveSketchBoxVisibleFrontOverlay({
    box: removeBox,
    boxCenterY: hoverPlacement.previewY,
    boxHeight: hoverPlacement.previewH,
    woodThick: MATERIAL_DIMENSIONS.wood.thicknessM,
    geo: removeBoxGeo,
    segments: removeBoxSegments,
    fullWidth: true,
  });
  return frontOverlay
    ? {
        x: frontOverlay.x,
        y: frontOverlay.y,
        z: frontOverlay.z,
        w: frontOverlay.w,
        h: frontOverlay.h,
        d: frontOverlay.d,
      }
    : null;
}
