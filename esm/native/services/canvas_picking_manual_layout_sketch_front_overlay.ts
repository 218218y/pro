import {
  findSketchBoxDoorsForSegment,
  type SketchBoxVerticalSegmentState,
} from './canvas_picking_sketch_box_dividers.js';
import { asRecord } from '../runtime/record.js';
import { MATERIAL_THICKNESS_POLICY } from '../../shared/dimensions/material_thickness_policy.js';
import { SKETCH_BOX_SHELL_GEOMETRY_POLICY } from '../../shared/dimensions/sketch_box_geometry_policy.js';
import {
  SKETCH_BOX_DOOR_PREVIEW_POLICY,
  SKETCH_BOX_DRAWER_PREVIEW_POLICY,
} from '../../shared/dimensions/sketch_box_preview_policy.js';

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

function readRecordNumber(obj: unknown, key: string): number | null {
  const value = readRecordValue(obj, key);
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
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
      : MATERIAL_THICKNESS_POLICY.wood.thicknessM;
  const leftExt =
    Math.abs(segmentLeft - innerLeft) <= SKETCH_BOX_DOOR_PREVIEW_POLICY.doorEdgeEpsilonM
      ? sideThick
      : sideThick / 2;
  const rightExt =
    Math.abs(segmentRight - innerRight) <= SKETCH_BOX_DOOR_PREVIEW_POLICY.doorEdgeEpsilonM
      ? sideThick
      : sideThick / 2;
  return {
    centerX: (segmentLeft - leftExt + (segmentRight + rightExt)) / 2,
    spanW: Math.max(
      SKETCH_BOX_DOOR_PREVIEW_POLICY.doorMinDimensionM,
      segmentRight + rightExt - (segmentLeft - leftExt)
    ),
    innerSpanW: Math.max(SKETCH_BOX_SHELL_GEOMETRY_POLICY.minInnerDimensionM, segmentRight - segmentLeft),
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
  verticalSegments?: SketchBoxVerticalSegmentState[] | null;
  activeVerticalSegment?: SketchBoxVerticalSegmentState | null;
  fullBoxCenterY?: number | null;
  fullBoxInnerH?: number | null;
  fullWidth?: boolean;
}): SketchFrontOverlay | null {
  const woodThick =
    Number.isFinite(args.woodThick) && args.woodThick > 0
      ? args.woodThick
      : MATERIAL_THICKNESS_POLICY.wood.thicknessM;
  const doorDepth = Math.max(
    SKETCH_BOX_DOOR_PREVIEW_POLICY.doorThicknessMinM,
    Math.min(
      SKETCH_BOX_DOOR_PREVIEW_POLICY.doorThicknessMaxM,
      Math.max(woodThick, SKETCH_BOX_DOOR_PREVIEW_POLICY.doorThicknessMinM)
    )
  );
  const doorFrontZ = args.geo.centerZ + args.geo.outerD / 2;
  const doorBackClearanceZ = Math.max(
    SKETCH_BOX_DOOR_PREVIEW_POLICY.doorBackClearanceMinM,
    Math.min(
      SKETCH_BOX_DOOR_PREVIEW_POLICY.doorBackClearanceMaxM,
      doorDepth * SKETCH_BOX_DOOR_PREVIEW_POLICY.doorBackClearanceDepthRatio
    )
  );
  const renderedDoorCenterZ = doorFrontZ + doorDepth / 2 + doorBackClearanceZ;
  const renderedDoorFrontZ = renderedDoorCenterZ + doorDepth / 2;
  const previewDoorZ =
    renderedDoorFrontZ +
    doorDepth / 2 +
    Math.max(
      SKETCH_BOX_DOOR_PREVIEW_POLICY.doorRemoveOffsetMinM,
      woodThick * SKETCH_BOX_DOOR_PREVIEW_POLICY.doorRemoveOffsetWoodRatio
    );
  const drawerDepth = SKETCH_BOX_DRAWER_PREVIEW_POLICY.drawerPreviewThicknessM;
  const drawerPreviewZ =
    args.geo.centerZ +
    args.geo.outerD / 2 +
    drawerDepth / 2 +
    SKETCH_BOX_DRAWER_PREVIEW_POLICY.drawerPreviewZOffsetM;

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
          SKETCH_BOX_DOOR_PREVIEW_POLICY.doorMinDimensionM,
          args.geo.outerW - SKETCH_BOX_DOOR_PREVIEW_POLICY.frontOverlayWidthClearanceM
        )
      : Math.max(
          SKETCH_BOX_DOOR_PREVIEW_POLICY.doorMinDimensionM,
          (faceSpan?.spanW ?? 0) - SKETCH_BOX_DOOR_PREVIEW_POLICY.frontOverlayWidthClearanceM
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
          SKETCH_BOX_DOOR_PREVIEW_POLICY.doorMinDimensionM,
          args.boxHeight - SKETCH_BOX_DOOR_PREVIEW_POLICY.frontOverlayHeightClearanceM
        ),
        d,
      };
    }
  };

  const hasDoor = args.segment
    ? findSketchBoxDoorsForSegment({
        box: args.box,
        segments: args.segments,
        verticalSegments: Array.isArray(args.verticalSegments) ? args.verticalSegments : [],
        boxCenterX: args.geo.centerX,
        innerW: args.geo.innerW,
        boxCenterY: args.fullBoxCenterY ?? args.boxCenterY,
        innerH: args.fullBoxInnerH ?? args.boxHeight,
        xNorm: args.segment.xNorm,
        yNorm: args.activeVerticalSegment?.yNorm ?? null,
      }).length > 0
    : readRecordArray(args.box, 'doors').length > 0;
  if (hasDoor) setBest(previewDoorZ, doorDepth);

  const segmentExtDrawers = readRecordArray(args.box, 'extDrawers').filter(item => {
    if (!args.segment) return true;
    const itemXNorm = readRecordNumber(item, 'xNorm');
    if (itemXNorm == null || !args.segments.length) return false;
    const itemSegment =
      args.segments.find(
        segment => Math.abs(segment.xNorm - itemXNorm) <= SKETCH_BOX_DOOR_PREVIEW_POLICY.doorEdgeEpsilonM
      ) || null;
    return !!itemSegment && itemSegment.index === args.segment.index;
  });
  if (segmentExtDrawers.length) setBest(drawerPreviewZ, drawerDepth);

  return bestOverlay;
}
