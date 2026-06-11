import { MATERIAL_DIMENSIONS, SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { UnknownRecord } from '../../../types';
import type {
  ResolveSketchBoxSegmentsArgs,
  PickSketchBoxSegmentArgs,
} from './canvas_picking_manual_layout_sketch_contracts.js';
import type {
  SketchBoxDividerState,
  SketchBoxDoorPlacement,
  SketchBoxHorizontalDividerState,
  SketchBoxSegmentState,
  SketchBoxVerticalSegmentState,
} from './canvas_picking_sketch_box_dividers.js';
import {
  findSketchBoxDoorForSegment,
  findSketchBoxDoorsForSegment,
  hasSketchBoxDoubleDoorPairForSegment,
} from './canvas_picking_sketch_box_dividers.js';
import { createManualLayoutSketchBoxContentHoverRecord } from './canvas_picking_manual_layout_sketch_hover_state.js';

type RecordMap = UnknownRecord;
type ModuleKey = number | 'corner' | `corner:${number}` | null;

type SketchBoxDoorPreviewHost = {
  tool: string;
  moduleKey: ModuleKey;
  isBottom: boolean;
  ts?: number;
};

type SketchBoxDoorPreviewKind = 'door' | 'double_door' | 'door_hinge';

type SketchBoxDoorPreviewGeo = {
  centerX: number;
  centerZ: number;
  innerW: number;
  outerD: number;
};

type ResolveSketchBoxDoorPreviewArgs = {
  host: SketchBoxDoorPreviewHost;
  contentKind: SketchBoxDoorPreviewKind;
  boxId: string;
  freePlacement: boolean;
  targetBox: unknown;
  targetGeo: SketchBoxDoorPreviewGeo;
  targetCenterY: number;
  targetHeight: number;
  pointerX: number;
  pointerY?: number | null;
  woodThick: number;
  readSketchBoxDividers: (box: unknown) => SketchBoxDividerState[];
  readSketchBoxHorizontalDividers?: (box: unknown) => SketchBoxHorizontalDividerState[];
  resolveSketchBoxSegments: (args: ResolveSketchBoxSegmentsArgs) => SketchBoxSegmentState[];
  pickSketchBoxSegment: (args: PickSketchBoxSegmentArgs) => SketchBoxSegmentState | null;
  resolveSketchBoxVerticalSegments?: (args: {
    dividers: SketchBoxHorizontalDividerState[];
    boxCenterY: number;
    innerH: number;
    woodThick: number;
    verticalDividers?: SketchBoxDividerState[];
    boxCenterX?: number | null;
    innerW?: number | null;
    cursorX?: number | null;
    xNorm?: number | null;
  }) => SketchBoxVerticalSegmentState[];
  pickSketchBoxVerticalSegment?: (args: {
    segments: SketchBoxVerticalSegmentState[];
    boxCenterY: number;
    innerH: number;
    cursorY?: number | null;
    yNorm?: number | null;
  }) => SketchBoxVerticalSegmentState | null;
};

type ResolveSketchBoxDoorPreviewResult = {
  hoverRecord: RecordMap;
  preview: RecordMap;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function clampWoodThick(value: number): number {
  return isFiniteNumber(value) && value > 0 ? value : MATERIAL_DIMENSIONS.wood.thicknessM;
}

function pickDoorPlacementByHinge(
  placements: SketchBoxDoorPlacement[],
  hinge: 'left' | 'right'
): SketchBoxDoorPlacement | null {
  for (let i = 0; i < placements.length; i++) {
    const placement = placements[i];
    if (placement?.door?.hinge === hinge) return placement;
  }
  return null;
}

export function resolveSketchBoxDoorPreview(
  args: ResolveSketchBoxDoorPreviewArgs
): ResolveSketchBoxDoorPreviewResult | null {
  const {
    host,
    contentKind,
    boxId,
    freePlacement,
    targetBox,
    targetGeo,
    targetCenterY,
    targetHeight,
    pointerX,
    pointerY,
    woodThick,
    readSketchBoxDividers,
    readSketchBoxHorizontalDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
    resolveSketchBoxVerticalSegments,
    pickSketchBoxVerticalSegment,
  } = args;

  const safeWoodThick = clampWoodThick(woodThick);
  const dividers = readSketchBoxDividers(targetBox);
  const horizontalDividers = readSketchBoxHorizontalDividers
    ? readSketchBoxHorizontalDividers(targetBox)
    : [];
  const verticalSegments =
    horizontalDividers.length && resolveSketchBoxVerticalSegments
      ? resolveSketchBoxVerticalSegments({
          dividers: horizontalDividers,
          boxCenterY: targetCenterY,
          innerH: targetHeight,
          woodThick: safeWoodThick,
          verticalDividers: dividers,
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
          cursorY: pointerY,
        })
      : null;
  const boxSegments = resolveSketchBoxSegments({
    dividers,
    horizontalDividers,
    boxCenterX: targetGeo.centerX,
    innerW: targetGeo.innerW,
    boxCenterY: targetCenterY,
    innerH: targetHeight,
    cursorX: pointerX,
    cursorY: pointerY,
    woodThick: safeWoodThick,
  });
  const activeSegment = pickSketchBoxSegment({
    segments: boxSegments,
    boxCenterX: targetGeo.centerX,
    innerW: targetGeo.innerW,
    cursorX: pointerX,
  });
  const existingDoor = findSketchBoxDoorForSegment({
    box: targetBox,
    segments: boxSegments,
    verticalSegments,
    boxCenterX: targetGeo.centerX,
    innerW: targetGeo.innerW,
    boxCenterY: targetCenterY,
    innerH: targetHeight,
    cursorX: pointerX,
    cursorY: pointerY,
  });
  const segmentDoors = findSketchBoxDoorsForSegment({
    box: targetBox,
    segments: boxSegments,
    verticalSegments,
    boxCenterX: targetGeo.centerX,
    innerW: targetGeo.innerW,
    boxCenterY: targetCenterY,
    innerH: targetHeight,
    cursorX: pointerX,
    cursorY: pointerY,
  });
  const hasDoor = !!existingDoor;
  const hasDoubleDoor = hasSketchBoxDoubleDoorPairForSegment({
    box: targetBox,
    segments: boxSegments,
    verticalSegments,
    boxCenterX: targetGeo.centerX,
    innerW: targetGeo.innerW,
    boxCenterY: targetCenterY,
    innerH: targetHeight,
    cursorX: pointerX,
    cursorY: pointerY,
  });
  if (contentKind === 'door_hinge' && !hasDoor) return null;

  const leftDoor = pickDoorPlacementByHinge(segmentDoors, 'left');
  const rightDoor = pickDoorPlacementByHinge(segmentDoors, 'right');
  const hinge = existingDoor?.door?.hinge === 'right' ? 'right' : 'left';
  const doorSegment = existingDoor?.segment || activeSegment;
  const doorVerticalSegment = existingDoor?.verticalSegment || activeVerticalSegment;
  const op: 'add' | 'remove' =
    contentKind === 'double_door'
      ? hasDoubleDoor
        ? 'remove'
        : 'add'
      : contentKind === 'door' && hasDoor
        ? 'remove'
        : 'add';
  const previewDims = SKETCH_BOX_DIMENSIONS.preview;
  const contentXNorm = doorSegment ? doorSegment.xNorm : 0.5;
  const boxYNorm = doorVerticalSegment ? doorVerticalSegment.yNorm : null;
  const doorId = contentKind === 'double_door' ? '' : existingDoor ? String(existingDoor.door.id || '') : '';

  const innerLeft = targetGeo.centerX - targetGeo.innerW / 2;
  const innerRight = targetGeo.centerX + targetGeo.innerW / 2;
  const segmentLeft = doorSegment ? doorSegment.leftX : innerLeft;
  const segmentRight = doorSegment ? doorSegment.rightX : innerRight;
  const leftExt =
    Math.abs(segmentLeft - innerLeft) <= previewDims.doorEdgeEpsilonM ? safeWoodThick : safeWoodThick / 2;
  const rightExt =
    Math.abs(segmentRight - innerRight) <= previewDims.doorEdgeEpsilonM ? safeWoodThick : safeWoodThick / 2;
  const doorLeft = segmentLeft - leftExt;
  const doorRight = segmentRight + rightExt;
  const doorDepth = Math.max(previewDims.doorMinDepthM, safeWoodThick);
  const doorFrontZ = targetGeo.centerZ + targetGeo.outerD / 2;
  const doorBackClearanceZ = Math.max(
    previewDims.doorBackClearanceMinM,
    Math.min(previewDims.doorBackClearanceMaxM, doorDepth * previewDims.doorBackClearanceDepthRatio)
  );
  const renderedDoorCenterZ = doorFrontZ + doorDepth / 2 + doorBackClearanceZ;
  const renderedDoorFrontZ = renderedDoorCenterZ + doorDepth / 2;
  const doorCellH = doorVerticalSegment ? doorVerticalSegment.height : targetHeight;
  const doorCenterY = doorVerticalSegment ? doorVerticalSegment.centerY : targetCenterY;
  const previewDoorZ =
    op === 'remove' || contentKind === 'door_hinge'
      ? renderedDoorFrontZ +
        doorDepth / 2 +
        Math.max(previewDims.doorRemoveOffsetMinM, safeWoodThick * previewDims.doorRemoveOffsetWoodRatio)
      : renderedDoorCenterZ;

  return {
    hoverRecord: createManualLayoutSketchBoxContentHoverRecord({
      host,
      contentKind,
      boxId,
      freePlacement,
      op,
      hinge,
      contentXNorm,
      boxYNorm,
      doorId,
      doorLeftId: leftDoor ? String(leftDoor.door.id || '') : '',
      doorRightId: rightDoor ? String(rightDoor.door.id || '') : '',
    }),
    preview: {
      kind: 'storage',
      x: (doorLeft + doorRight) / 2,
      y: doorCenterY,
      z: previewDoorZ,
      w: Math.max(previewDims.doorMinDimensionM, doorRight - doorLeft - previewDims.doorPreviewClearanceM),
      h: Math.max(previewDims.doorMinDimensionM, doorCellH - previewDims.doorPreviewClearanceM),
      d: doorDepth,
      woodThick: safeWoodThick,
      op,
    },
  };
}
