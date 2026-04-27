import { createManualLayoutSketchNormalizedCenterReader } from './canvas_picking_manual_layout_sketch_stack_placement.js';
import {
  resolveSketchBoxVisibleFrontOverlay,
  type SketchFrontOverlay,
} from './canvas_picking_manual_layout_sketch_front_overlay.js';
import type {
  RecordMap,
  ResolveSketchBoxStackPreviewArgs,
  SketchBoxSegmentLike,
  SketchBoxStackPreviewContext,
} from './canvas_picking_sketch_box_stack_preview_contracts.js';
import { readRecordArray, readRecordNumber } from './canvas_picking_sketch_box_stack_preview_records.js';

function pickSegmentItems(args: {
  targetBox: unknown;
  key: 'drawers' | 'extDrawers';
  boxSegments: SketchBoxSegmentLike[];
  activeSegment: SketchBoxSegmentLike | null;
  targetGeo: Pick<ResolveSketchBoxStackPreviewArgs['targetGeo'], 'centerX' | 'innerW'>;
  pickSketchBoxSegment: ResolveSketchBoxStackPreviewArgs['pickSketchBoxSegment'];
}): RecordMap[] {
  return readRecordArray(args.targetBox, args.key).filter(item => {
    const itemXNorm = readRecordNumber(item, 'xNorm');
    const itemSegment =
      Number.isFinite(itemXNorm) && args.boxSegments.length
        ? args.pickSketchBoxSegment({
            segments: args.boxSegments,
            boxCenterX: args.targetGeo.centerX,
            innerW: args.targetGeo.innerW,
            xNorm: itemXNorm,
          })
        : null;
    if (args.activeSegment && itemSegment && itemSegment.index !== args.activeSegment.index) return false;
    if (args.activeSegment && !itemSegment) return false;
    return true;
  });
}

export function resolveSketchBoxStackPreviewContext(
  args: ResolveSketchBoxStackPreviewArgs
): SketchBoxStackPreviewContext {
  const { targetBox, targetGeo, targetCenterY, targetHeight, pointerX, woodThick, readSketchBoxDividers } =
    args;

  const existingDividers = readSketchBoxDividers(targetBox);
  const boxSegments = args.resolveSketchBoxSegments({
    dividers: existingDividers,
    boxCenterX: targetGeo.centerX,
    innerW: targetGeo.innerW,
    woodThick,
  });
  const activeSegment = args.pickSketchBoxSegment({
    segments: boxSegments,
    boxCenterX: targetGeo.centerX,
    innerW: targetGeo.innerW,
    cursorX: pointerX,
  });

  const boxBottomY = targetCenterY - targetHeight / 2;
  const boxTopY = targetCenterY + targetHeight / 2;
  const readCenterY = createManualLayoutSketchNormalizedCenterReader({
    bottomY: boxBottomY,
    totalHeight: targetHeight,
  });
  const localDrawers = pickSegmentItems({
    targetBox,
    key: 'drawers',
    boxSegments,
    activeSegment,
    targetGeo,
    pickSketchBoxSegment: args.pickSketchBoxSegment,
  });
  const localExtDrawers = pickSegmentItems({
    targetBox,
    key: 'extDrawers',
    boxSegments,
    activeSegment,
    targetGeo,
    pickSketchBoxSegment: args.pickSketchBoxSegment,
  });

  const frontOverlay: SketchFrontOverlay | null = resolveSketchBoxVisibleFrontOverlay({
    box: targetBox,
    boxCenterY: targetCenterY,
    boxHeight: targetHeight,
    woodThick,
    geo: targetGeo,
    segments: boxSegments,
    segment: activeSegment,
  });

  return {
    args,
    boxBottomY,
    boxTopY,
    readCenterY,
    boxSegments,
    activeSegment,
    localDrawers,
    localExtDrawers,
    frontOverlay,
  };
}
