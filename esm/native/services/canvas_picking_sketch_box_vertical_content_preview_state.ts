import type {
  ResolveSketchBoxVerticalContentPreviewArgs,
  SketchBoxSegmentLike,
} from './canvas_picking_sketch_box_vertical_content_preview_contracts.js';
import { clampUnit } from './canvas_picking_sketch_box_vertical_content_preview_records.js';
import {
  findSketchBoxRegularExternalDrawerInCell,
  getSketchBoxRegularExternalDrawerStackHeight,
} from '../features/sketch_box_regular_external_drawers.js';

export type SketchBoxVerticalPreviewState = {
  targetCenterY: number;
  targetHeight: number;
  targetGeo: ResolveSketchBoxVerticalContentPreviewArgs['targetGeo'];
  activeSegment: SketchBoxSegmentLike | null;
  boxSegments: SketchBoxSegmentLike[];
  verticalSegments: ReturnType<
    NonNullable<ResolveSketchBoxVerticalContentPreviewArgs['resolveSketchBoxVerticalSegments']>
  >;
  activeVerticalSegment: ReturnType<
    NonNullable<ResolveSketchBoxVerticalContentPreviewArgs['pickSketchBoxVerticalSegment']>
  > | null;
  cellBottomY: number;
  cellTopY: number;
  cellHeight: number;
  cellCenterY: number;
  hasVerticalRoomFor: (itemHeight: number) => boolean;
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
    readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
  } = args;

  const halfH = targetHeight / 2;
  const innerBottomY = targetCenterY - halfH + woodThick;
  const innerTopY = targetCenterY + halfH - woodThick;
  const boxYNormFromCenter = (centerY: number) =>
    clampUnit((centerY - (targetCenterY - halfH)) / targetHeight);

  const existingDividers = readSketchBoxDividers(targetBox);
  const horizontalDividers = readSketchBoxHorizontalDividers
    ? readSketchBoxHorizontalDividers(targetBox)
    : [];
  const boxSegments = resolveSketchBoxSegments({
    dividers: existingDividers,
    horizontalDividers,
    boxCenterX: targetGeo.centerX,
    innerW: targetGeo.innerW,
    boxCenterY: targetCenterY,
    innerH: targetHeight,
    cursorY: args.pointerY,
    cursorX: pointerX,
    woodThick,
  });
  const activeSegment = pickSketchBoxSegment({
    segments: boxSegments,
    boxCenterX: targetGeo.centerX,
    innerW: targetGeo.innerW,
    cursorX: pointerX,
  });
  const verticalSegments =
    horizontalDividers.length && resolveSketchBoxVerticalSegments
      ? resolveSketchBoxVerticalSegments({
          dividers: horizontalDividers,
          verticalDividers: existingDividers,
          boxCenterY: targetCenterY,
          innerH: targetHeight,
          woodThick,
          boxCenterX: targetGeo.centerX,
          innerW: targetGeo.innerW,
          cursorX: pointerX,
        })
      : [];
  const activeVerticalSegment =
    verticalSegments.length && pickSketchBoxVerticalSegment
      ? pickSketchBoxVerticalSegment({
          segments: verticalSegments,
          boxCenterY: targetCenterY,
          innerH: targetHeight,
          cursorY: args.pointerY,
        })
      : null;
  const rawCellBottomY = Math.max(innerBottomY, activeVerticalSegment?.bottomY ?? innerBottomY);
  const cellTopY = Math.min(innerTopY, activeVerticalSegment?.topY ?? innerTopY);
  const regularExternalDrawer = findSketchBoxRegularExternalDrawerInCell(targetBox, {
    xNorm: activeSegment ? activeSegment.xNorm : 0.5,
    yNormC: activeVerticalSegment ? activeVerticalSegment.yNorm : 0.5,
  });
  const regularDrawerReservedHeight = regularExternalDrawer
    ? getSketchBoxRegularExternalDrawerStackHeight(regularExternalDrawer)
    : 0;
  const cellBottomY = Math.min(cellTopY, rawCellBottomY + regularDrawerReservedHeight);
  const cellHeight = Math.max(0, cellTopY - cellBottomY);
  const cellCenterY = cellHeight > 0 ? (cellBottomY + cellTopY) / 2 : targetCenterY;
  const hasVerticalRoomFor = (itemHeight: number) =>
    Number.isFinite(itemHeight) && itemHeight > 0 && cellHeight >= itemHeight;
  const clampBoxCenterY = (centerY: number, itemHalfH: number) => {
    const lo = cellBottomY + itemHalfH;
    const hi = cellTopY - itemHalfH;
    if (!(hi > lo)) return cellCenterY;
    return Math.max(lo, Math.min(hi, centerY));
  };

  return {
    targetCenterY,
    targetHeight,
    targetGeo,
    activeSegment,
    boxSegments,
    verticalSegments,
    activeVerticalSegment,
    cellBottomY,
    cellTopY,
    cellHeight,
    cellCenterY,
    hasVerticalRoomFor,
    clampBoxCenterY,
    boxYNormFromCenter,
  };
}
