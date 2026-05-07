import { findSketchBoxDoorsForSegment } from './canvas_picking_sketch_box_dividers.js';
import { asRecord } from '../runtime/record.js';
import { MATERIAL_DIMENSIONS, SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';

export type SketchBoxSegmentLike = {
  index: number;
  leftX: number;
  rightX: number;
  centerX: number;
  width: number;
  xNorm: number;
};

export type SketchFrontOverlay = {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
};

function readRecordValue(obj: unknown, key: string): unknown {
  const rec = asRecord<Record<string, unknown>>(obj);
  return rec ? rec[key] : undefined;
}

function readRecordNumber(obj: unknown, key: string): number {
  const value = readRecordValue(obj, key);
  return typeof value === 'number' ? value : Number(value);
}

function readRecordArray(obj: unknown, key: string): Record<string, unknown>[] {
  const value = readRecordValue(obj, key);
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is Record<string, unknown> => !!asRecord<Record<string, unknown>>(entry)
  );
}

export function resolveSketchBoxSegmentFaceSpan(args: {
  boxCenterX: number;
  innerW: number;
  woodThick: number;
  segment: Pick<SketchBoxSegmentLike, 'leftX' | 'rightX' | 'centerX' | 'width'> | null;
}): { centerX: number; spanW: number; innerSpanW: number } {
  const innerLeft = args.boxCenterX - args.innerW / 2;
  const innerRight = args.boxCenterX + args.innerW / 2;
  const segmentLeft = args.segment ? args.segment.leftX : innerLeft;
  const segmentRight = args.segment ? args.segment.rightX : innerRight;
  const sideThick =
    Number.isFinite(args.woodThick) && args.woodThick > 0
      ? args.woodThick
      : MATERIAL_DIMENSIONS.wood.thicknessM;
  const leftExt =
    Math.abs(segmentLeft - innerLeft) <= SKETCH_BOX_DIMENSIONS.preview.doorEdgeEpsilonM
      ? sideThick
      : sideThick / 2;
  const rightExt =
    Math.abs(segmentRight - innerRight) <= SKETCH_BOX_DIMENSIONS.preview.doorEdgeEpsilonM
      ? sideThick
      : sideThick / 2;
  return {
    centerX: (segmentLeft - leftExt + (segmentRight + rightExt)) / 2,
    spanW: Math.max(
      SKETCH_BOX_DIMENSIONS.preview.doorMinDimensionM,
      segmentRight + rightExt - (segmentLeft - leftExt)
    ),
    innerSpanW: Math.max(SKETCH_BOX_DIMENSIONS.geometry.minInnerDimensionM, segmentRight - segmentLeft),
  };
}

export function resolveSketchBoxVisibleFrontOverlay(args: {
  box: unknown;
  boxCenterY: number;
  boxHeight: number;
  woodThick: number;
  geo: { centerX: number; innerW: number; outerW: number; centerZ: number; outerD: number };
  segments: SketchBoxSegmentLike[];
  segment?: SketchBoxSegmentLike | null;
  fullWidth?: boolean;
}): SketchFrontOverlay | null {
  const woodThick =
    Number.isFinite(args.woodThick) && args.woodThick > 0
      ? args.woodThick
      : MATERIAL_DIMENSIONS.wood.thicknessM;
  const doorDepth = Math.max(
    SKETCH_BOX_DIMENSIONS.preview.doorThicknessMinM,
    Math.min(
      SKETCH_BOX_DIMENSIONS.preview.doorThicknessMaxM,
      Math.max(woodThick, SKETCH_BOX_DIMENSIONS.preview.doorThicknessMinM)
    )
  );
  const doorFrontZ = args.geo.centerZ + args.geo.outerD / 2;
  const doorBackClearanceZ = Math.max(
    SKETCH_BOX_DIMENSIONS.preview.doorBackClearanceMinM,
    Math.min(
      SKETCH_BOX_DIMENSIONS.preview.doorBackClearanceMaxM,
      doorDepth * SKETCH_BOX_DIMENSIONS.preview.doorBackClearanceDepthRatio
    )
  );
  const renderedDoorCenterZ = doorFrontZ + doorDepth / 2 + doorBackClearanceZ;
  const renderedDoorFrontZ = renderedDoorCenterZ + doorDepth / 2;
  const previewDoorZ =
    renderedDoorFrontZ +
    doorDepth / 2 +
    Math.max(
      SKETCH_BOX_DIMENSIONS.preview.doorRemoveOffsetMinM,
      woodThick * SKETCH_BOX_DIMENSIONS.preview.doorRemoveOffsetWoodRatio
    );
  const drawerDepth = SKETCH_BOX_DIMENSIONS.preview.drawerPreviewThicknessM;
  const drawerPreviewZ =
    args.geo.centerZ +
    args.geo.outerD / 2 +
    drawerDepth / 2 +
    SKETCH_BOX_DIMENSIONS.preview.drawerPreviewZOffsetM;

  const faceSpan =
    args.fullWidth === true
      ? null
      : resolveSketchBoxSegmentFaceSpan({
          boxCenterX: args.geo.centerX,
          innerW: args.geo.innerW,
          woodThick,
          segment: args.segment || null,
        });
  const overlayX = args.fullWidth === true ? args.geo.centerX : (faceSpan?.centerX ?? args.geo.centerX);
  const overlayW =
    args.fullWidth === true
      ? Math.max(
          SKETCH_BOX_DIMENSIONS.preview.doorMinDimensionM,
          args.geo.outerW - SKETCH_BOX_DIMENSIONS.preview.frontOverlayWidthClearanceM
        )
      : Math.max(
          SKETCH_BOX_DIMENSIONS.preview.doorMinDimensionM,
          (faceSpan?.spanW ?? 0) - SKETCH_BOX_DIMENSIONS.preview.frontOverlayWidthClearanceM
        );

  let bestOverlay: SketchFrontOverlay | null = null;
  const setBest = (z: number, d: number) => {
    if (!Number.isFinite(z) || !(d > 0)) return;
    if (!bestOverlay || z > bestOverlay.z) {
      bestOverlay = {
        x: overlayX,
        y: args.boxCenterY,
        z,
        w: overlayW,
        h: Math.max(
          SKETCH_BOX_DIMENSIONS.preview.doorMinDimensionM,
          args.boxHeight - SKETCH_BOX_DIMENSIONS.preview.frontOverlayHeightClearanceM
        ),
        d,
      };
    }
  };

  const hasDoor = args.segment
    ? findSketchBoxDoorsForSegment({
        box: args.box,
        segments: args.segments,
        boxCenterX: args.geo.centerX,
        innerW: args.geo.innerW,
        xNorm: args.segment.xNorm,
      }).length > 0
    : readRecordArray(args.box, 'doors').length > 0;
  if (hasDoor) setBest(previewDoorZ, doorDepth);

  const segmentExtDrawers = readRecordArray(args.box, 'extDrawers').filter(item => {
    if (!args.segment) return true;
    const itemXNorm = readRecordNumber(item, 'xNorm');
    if (!Number.isFinite(itemXNorm) || !args.segments.length) return false;
    const itemSegment =
      args.segments.find(
        segment =>
          Math.abs(segment.xNorm - Number(itemXNorm)) <= SKETCH_BOX_DIMENSIONS.preview.doorEdgeEpsilonM
      ) || null;
    return !!itemSegment && itemSegment.index === args.segment.index;
  });
  if (segmentExtDrawers.length) setBest(drawerPreviewZ, drawerDepth);

  return bestOverlay;
}
