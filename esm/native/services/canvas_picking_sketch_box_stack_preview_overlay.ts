import type {
  RecordMap,
  SketchBoxFrontOverlay,
} from './canvas_picking_sketch_box_stack_preview_contracts.js';

export function buildSketchBoxFrontOverlayFields(frontOverlay: SketchBoxFrontOverlay | null): RecordMap {
  return {
    frontOverlayX: frontOverlay ? frontOverlay.x : undefined,
    frontOverlayY: frontOverlay ? frontOverlay.y : undefined,
    frontOverlayZ: frontOverlay ? frontOverlay.z : undefined,
    frontOverlayW: frontOverlay ? frontOverlay.w : undefined,
    frontOverlayH: frontOverlay ? frontOverlay.h : undefined,
    frontOverlayThickness: frontOverlay ? frontOverlay.d : undefined,
  };
}
