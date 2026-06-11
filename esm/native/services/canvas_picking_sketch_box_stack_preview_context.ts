import { createManualLayoutSketchNormalizedCenterReader } from './canvas_picking_manual_layout_sketch_stack_placement.js';
import { readSketchBoxRegularExternalDrawers } from '../features/sketch_box_regular_external_drawers.js';
import {
  resolveSketchBoxVisibleFrontOverlay,
  type SketchFrontOverlay,
} from './canvas_picking_manual_layout_sketch_front_overlay.js';
import type {
  RecordMap,
  ResolveSketchBoxStackPreviewArgs,
  SketchBoxSegmentLike,
  SketchBoxStackPreviewContext,
  SketchBoxVerticalSegmentLike,
} from './canvas_picking_sketch_box_stack_preview_contracts.js';
import { readRecordArray, readRecordNumber } from './canvas_picking_sketch_box_stack_preview_records.js';

function pickItemVerticalSegment(args: {
  item: RecordMap;
  verticalSegments: SketchBoxVerticalSegmentLike[];
  targetCenterY: number;
  targetHeight: number;
  pickSketchBoxVerticalSegment: ResolveSketchBoxStackPreviewArgs['pickSketchBoxVerticalSegment'];
}): SketchBoxVerticalSegmentLike | null {
  if (!args.verticalSegments.length || !args.pickSketchBoxVerticalSegment) return null;
  const itemYNorm = readRecordNumber(args.item, 'yNormC') ?? readRecordNumber(args.item, 'yNorm');
  if (!Number.isFinite(itemYNorm)) return null;
  return args.pickSketchBoxVerticalSegment({
    segments: args.verticalSegments,
    boxCenterY: args.targetCenterY,
    innerH: args.targetHeight,
    yNorm: itemYNorm,
  });
}

function pickSegmentItems(args: {
  targetBox: unknown;
  key: 'drawers' | 'extDrawers';
  boxSegments: SketchBoxSegmentLike[];
  activeSegment: SketchBoxSegmentLike | null;
  verticalSegments: SketchBoxVerticalSegmentLike[];
  activeVerticalSegment: SketchBoxVerticalSegmentLike | null;
  targetCenterY: number;
  targetHeight: number;
  targetGeo: Pick<ResolveSketchBoxStackPreviewArgs['targetGeo'], 'centerX' | 'innerW'>;
  pickSketchBoxSegment: ResolveSketchBoxStackPreviewArgs['pickSketchBoxSegment'];
  pickSketchBoxVerticalSegment: ResolveSketchBoxStackPreviewArgs['pickSketchBoxVerticalSegment'];
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
    const itemVerticalSegment = pickItemVerticalSegment({
      item,
      verticalSegments: args.verticalSegments,
      targetCenterY: args.targetCenterY,
      targetHeight: args.targetHeight,
      pickSketchBoxVerticalSegment: args.pickSketchBoxVerticalSegment,
    });
    if (
      args.activeVerticalSegment &&
      itemVerticalSegment &&
      itemVerticalSegment.index !== args.activeVerticalSegment.index
    )
      return false;
    if (args.activeVerticalSegment && !itemVerticalSegment) return false;
    return true;
  });
}

export function resolveSketchBoxStackPreviewContext(
  args: ResolveSketchBoxStackPreviewArgs
): SketchBoxStackPreviewContext {
  const {
    targetBox,
    targetGeo,
    targetCenterY,
    targetHeight,
    pointerX,
    pointerY,
    woodThick,
    readSketchBoxDividers,
    readSketchBoxHorizontalDividers,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
  } = args;

  const fullBoxBottomY = targetCenterY - targetHeight / 2;
  const fullBoxTopY = targetCenterY + targetHeight / 2;
  const existingDividers = readSketchBoxDividers(targetBox);
  const horizontalDividers = readSketchBoxHorizontalDividers
    ? readSketchBoxHorizontalDividers(targetBox)
    : [];
  const verticalSegments =
    resolveSketchBoxVerticalSegments && horizontalDividers.length
      ? resolveSketchBoxVerticalSegments({
          dividers: horizontalDividers,
          verticalDividers: existingDividers,
          boxCenterX: targetGeo.centerX,
          innerW: targetGeo.innerW,
          boxCenterY: targetCenterY,
          innerH: targetHeight,
          cursorX: pointerX,
          woodThick,
        })
      : [];
  const activeVerticalSegment =
    verticalSegments.length && pickSketchBoxVerticalSegment
      ? pickSketchBoxVerticalSegment({
          segments: verticalSegments,
          boxCenterY: targetCenterY,
          innerH: targetHeight,
          cursorY: pointerY,
        })
      : null;
  const boxSegments = args.resolveSketchBoxSegments({
    dividers: existingDividers,
    horizontalDividers,
    boxCenterX: targetGeo.centerX,
    innerW: targetGeo.innerW,
    boxCenterY: targetCenterY,
    innerH: targetHeight,
    cursorX: pointerX,
    cursorY: pointerY,
    woodThick,
  });
  const activeSegment = args.pickSketchBoxSegment({
    segments: boxSegments,
    boxCenterX: targetGeo.centerX,
    innerW: targetGeo.innerW,
    cursorX: pointerX,
  });

  const boxBottomY = activeVerticalSegment ? activeVerticalSegment.bottomY : fullBoxBottomY;
  const boxTopY = activeVerticalSegment ? activeVerticalSegment.topY : fullBoxTopY;
  const cellHeight = Math.max(0, boxTopY - boxBottomY);
  const normBottomY =
    targetHeight > 0 ? Math.max(0, Math.min(1, (boxBottomY - fullBoxBottomY) / targetHeight)) : 0;
  const normHeight = targetHeight > 0 ? Math.max(0, Math.min(1, cellHeight / targetHeight)) : 1;
  const readCenterY = createManualLayoutSketchNormalizedCenterReader({
    bottomY: fullBoxBottomY,
    totalHeight: targetHeight,
  });
  const localDrawers = pickSegmentItems({
    targetBox,
    key: 'drawers',
    boxSegments,
    activeSegment,
    verticalSegments,
    activeVerticalSegment,
    targetCenterY,
    targetHeight,
    targetGeo,
    pickSketchBoxSegment: args.pickSketchBoxSegment,
    pickSketchBoxVerticalSegment,
  });
  const localExtDrawers = pickSegmentItems({
    targetBox,
    key: 'extDrawers',
    boxSegments,
    activeSegment,
    verticalSegments,
    activeVerticalSegment,
    targetCenterY,
    targetHeight,
    targetGeo,
    pickSketchBoxSegment: args.pickSketchBoxSegment,
    pickSketchBoxVerticalSegment,
  }).concat(
    readSketchBoxRegularExternalDrawers(targetBox).filter(
      item =>
        pickSegmentItems({
          targetBox: { extDrawers: [item] },
          key: 'extDrawers',
          boxSegments,
          activeSegment,
          verticalSegments,
          activeVerticalSegment,
          targetCenterY,
          targetHeight,
          targetGeo,
          pickSketchBoxSegment: args.pickSketchBoxSegment,
          pickSketchBoxVerticalSegment,
        }).length > 0
    )
  );

  const frontOverlay: SketchFrontOverlay | null = resolveSketchBoxVisibleFrontOverlay({
    box: targetBox,
    boxCenterY: (boxBottomY + boxTopY) / 2,
    boxHeight: cellHeight,
    woodThick,
    geo: targetGeo,
    segments: boxSegments,
    segment: activeSegment,
    verticalSegments,
    activeVerticalSegment,
    fullBoxCenterY: targetCenterY,
    fullBoxInnerH: targetHeight,
  });

  return {
    args,
    fullBoxBottomY,
    fullBoxTopY,
    boxBottomY,
    boxTopY,
    cellHeight,
    normBottomY,
    normHeight,
    readCenterY,
    boxSegments,
    activeSegment,
    verticalSegments,
    activeVerticalSegment,
    localDrawers,
    localExtDrawers,
    frontOverlay,
  };
}
