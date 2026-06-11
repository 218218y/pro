import type { UnknownRecord } from '../../../types';
import type {
  ResolveSketchBoxSegmentsArgs,
  PickSketchBoxSegmentArgs,
} from './canvas_picking_manual_layout_sketch_contracts.js';
import type {
  SketchBoxDividerState,
  SketchBoxDoorPlacement,
  SketchBoxSegmentState,
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
  woodThick: number;
  readSketchBoxDividers: (box: unknown) => SketchBoxDividerState[];
  resolveSketchBoxSegments: (args: ResolveSketchBoxSegmentsArgs) => SketchBoxSegmentState[];
  pickSketchBoxSegment: (args: PickSketchBoxSegmentArgs) => SketchBoxSegmentState | null;
};

type ResolveSketchBoxDoorPreviewResult = {
  hoverRecord: RecordMap;
  preview: RecordMap;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function clampWoodThick(value: number): number {
  return isFiniteNumber(value) && value > 0 ? value : 0.018;
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
    woodThick,
    readSketchBoxDividers,
    resolveSketchBoxSegments,
    pickSketchBoxSegment,
  } = args;

  const safeWoodThick = clampWoodThick(woodThick);
  const boxSegments = resolveSketchBoxSegments({
    dividers: readSketchBoxDividers(targetBox),
    boxCenterX: targetGeo.centerX,
    innerW: targetGeo.innerW,
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
    boxCenterX: targetGeo.centerX,
    innerW: targetGeo.innerW,
    cursorX: pointerX,
  });
  const segmentDoors = findSketchBoxDoorsForSegment({
    box: targetBox,
    segments: boxSegments,
    boxCenterX: targetGeo.centerX,
    innerW: targetGeo.innerW,
    cursorX: pointerX,
  });
  const hasDoor = !!existingDoor;
  const hasDoubleDoor = hasSketchBoxDoubleDoorPairForSegment({
    box: targetBox,
    segments: boxSegments,
    boxCenterX: targetGeo.centerX,
    innerW: targetGeo.innerW,
    cursorX: pointerX,
  });
  if (contentKind === 'door_hinge' && !hasDoor) return null;

  const leftDoor = pickDoorPlacementByHinge(segmentDoors, 'left');
  const rightDoor = pickDoorPlacementByHinge(segmentDoors, 'right');
  const hinge = existingDoor?.door?.hinge === 'right' ? 'right' : 'left';
  const doorSegment = existingDoor?.segment || activeSegment;
  const op: 'add' | 'remove' =
    contentKind === 'double_door'
      ? hasDoubleDoor
        ? 'remove'
        : 'add'
      : contentKind === 'door' && hasDoor
        ? 'remove'
        : 'add';
  const contentXNorm = doorSegment ? doorSegment.xNorm : 0.5;
  const doorId = contentKind === 'double_door' ? '' : existingDoor ? String(existingDoor.door.id || '') : '';

  const innerLeft = targetGeo.centerX - targetGeo.innerW / 2;
  const innerRight = targetGeo.centerX + targetGeo.innerW / 2;
  const segmentLeft = doorSegment ? doorSegment.leftX : innerLeft;
  const segmentRight = doorSegment ? doorSegment.rightX : innerRight;
  const leftExt = Math.abs(segmentLeft - innerLeft) <= 0.001 ? safeWoodThick : safeWoodThick / 2;
  const rightExt = Math.abs(segmentRight - innerRight) <= 0.001 ? safeWoodThick : safeWoodThick / 2;
  const doorLeft = segmentLeft - leftExt;
  const doorRight = segmentRight + rightExt;
  const doorDepth = Math.max(0.0001, safeWoodThick);
  const doorFrontZ = targetGeo.centerZ + targetGeo.outerD / 2;
  const doorBackClearanceZ = Math.max(0.0008, Math.min(0.0015, doorDepth * 0.1));
  const renderedDoorCenterZ = doorFrontZ + doorDepth / 2 + doorBackClearanceZ;
  const renderedDoorFrontZ = renderedDoorCenterZ + doorDepth / 2;
  const previewDoorZ =
    op === 'remove' || contentKind === 'door_hinge'
      ? renderedDoorFrontZ + doorDepth / 2 + Math.max(0.002, safeWoodThick * 0.12)
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
      doorId,
      doorLeftId: leftDoor ? String(leftDoor.door.id || '') : '',
      doorRightId: rightDoor ? String(rightDoor.door.id || '') : '',
    }),
    preview: {
      kind: 'storage',
      x: (doorLeft + doorRight) / 2,
      y: targetCenterY,
      z: previewDoorZ,
      w: Math.max(0.05, doorRight - doorLeft - 0.004),
      h: Math.max(0.05, targetHeight - 0.004),
      d: doorDepth,
      woodThick: safeWoodThick,
      op,
    },
  };
}
