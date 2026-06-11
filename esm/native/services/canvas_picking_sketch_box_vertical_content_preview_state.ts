import type {
  ResolveSketchBoxVerticalContentPreviewArgs,
  SketchBoxSegmentLike,
} from './canvas_picking_sketch_box_vertical_content_preview_contracts.js';
import { clampUnit } from './canvas_picking_sketch_box_vertical_content_preview_records.js';

export type SketchBoxVerticalPreviewState = {
  targetCenterY: number;
  targetHeight: number;
  targetGeo: ResolveSketchBoxVerticalContentPreviewArgs['targetGeo'];
  activeSegment: SketchBoxSegmentLike | null;
  boxSegments: SketchBoxSegmentLike[];
  clampBoxCenterY: (centerY: number, itemHalfH: number) => number;
  boxYNormFromCenter: (centerY: number) => number;
};

export function createSketchBoxVerticalPreviewState(
  args: ResolveSketchBoxVerticalContentPreviewArgs
): SketchBoxVerticalPreviewState {
  const {
    targetBox,
    targetGeo,
    targetCenterY,
    targetHeight,
    pointerX,
    woodThick,
    readSketchBoxDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
  } = args;

  const halfH = targetHeight / 2;
  const innerBottomY = targetCenterY - halfH + woodThick;
  const innerTopY = targetCenterY + halfH - woodThick;
  const clampBoxCenterY = (centerY: number, itemHalfH: number) => {
    const lo = innerBottomY + itemHalfH;
    const hi = innerTopY - itemHalfH;
    if (!(hi > lo)) return targetCenterY;
    return Math.max(lo, Math.min(hi, centerY));
  };
  const boxYNormFromCenter = (centerY: number) =>
    clampUnit((centerY - (targetCenterY - halfH)) / targetHeight);

  const existingDividers = readSketchBoxDividers(targetBox);
  const boxSegments = resolveSketchBoxSegments({
    dividers: existingDividers,
    boxCenterX: targetGeo.centerX,
    innerW: targetGeo.innerW,
    woodThick,
  });
  const activeSegment = pickSketchBoxSegment({
    segments: boxSegments,
    boxCenterX: targetGeo.centerX,
    innerW: targetGeo.innerW,
    cursorX: pointerX,
  });

  return {
    targetCenterY,
    targetHeight,
    targetGeo,
    activeSegment,
    boxSegments,
    clampBoxCenterY,
    boxYNormFromCenter,
  };
}
