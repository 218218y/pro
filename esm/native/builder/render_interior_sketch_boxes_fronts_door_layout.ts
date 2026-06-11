import type { SketchBoxDoorPlacement } from './render_interior_sketch_boxes_fronts_support.js';
import type {
  RenderSketchBoxDoorFrontsArgs,
  ResolvedSketchBoxDoorLayout,
} from './render_interior_sketch_boxes_fronts_door_contracts.js';

import { readSketchBoxDoorId } from './render_interior_sketch_shared.js';

export function resolveSketchBoxDoorLayout(args: {
  renderArgs: RenderSketchBoxDoorFrontsArgs;
  placement: SketchBoxDoorPlacement;
  placementsBySegment: Map<number, SketchBoxDoorPlacement[]>;
}): ResolvedSketchBoxDoorLayout | null {
  const { renderArgs, placement, placementsBySegment } = args;
  const { frontsArgs } = renderArgs;
  const { shell } = frontsArgs;
  const { woodThick, moduleKeyStr } = frontsArgs.args;
  const { boxId: bid, boxPid, isFreePlacement, height: hM, geometry: boxGeo } = shell;

  const boxDoor = placement?.door || null;
  if (!(boxDoor && boxDoor.enabled !== false)) return null;

  const doorId = readSketchBoxDoorId(boxDoor, `sbdr_${placement.index}`);
  const doorPid = `${boxPid}_door_${doorId}`;
  const hingeSide =
    typeof boxDoor.hinge === 'string' && String(boxDoor.hinge).toLowerCase() === 'right' ? 'right' : 'left';
  const hingeLeft = hingeSide === 'left';
  const doorOpen = boxDoor.open === true;
  const doorInset = Math.max(0.002, Math.min(0.006, Math.min(boxGeo.outerW, hM) * 0.012));
  const doorSegment = placement.segment || null;
  const segmentDoors = doorSegment ? placementsBySegment.get(doorSegment.index) || [] : [];
  const isCenterDoubleDoorPair =
    segmentDoors.length >= 2 &&
    segmentDoors.some(segmentPlacement => segmentPlacement?.door?.hinge === 'left') &&
    segmentDoors.some(segmentPlacement => segmentPlacement?.door?.hinge === 'right');
  const innerLeft = boxGeo.centerX - boxGeo.innerW / 2;
  const innerRight = boxGeo.centerX + boxGeo.innerW / 2;
  const segmentLeft = doorSegment ? doorSegment.leftX : innerLeft;
  const segmentRight = doorSegment ? doorSegment.rightX : innerRight;
  const leftExt = Math.abs(segmentLeft - innerLeft) <= 0.001 ? woodThick : woodThick / 2;
  const rightExt = Math.abs(segmentRight - innerRight) <= 0.001 ? woodThick : woodThick / 2;
  const segmentFrameLeft = segmentLeft - leftExt;
  const segmentFrameRight = segmentRight + rightExt;
  const centerGap = isCenterDoubleDoorPair
    ? Math.max(0.0008, Math.min(0.0018, Math.min(segmentFrameRight - segmentFrameLeft, hM) * 0.0045))
    : 0;
  const segmentCenterX = (segmentFrameLeft + segmentFrameRight) / 2;
  const pairOuterInset = isCenterDoubleDoorPair
    ? Math.max(0.0012, Math.min(doorInset, Math.min(segmentFrameRight - segmentFrameLeft, hM) * 0.0075))
    : doorInset;
  const doorFaceLeft = isCenterDoubleDoorPair
    ? hingeLeft
      ? segmentFrameLeft + pairOuterInset
      : segmentCenterX + centerGap / 2
    : segmentFrameLeft + doorInset;
  const doorFaceRight = isCenterDoubleDoorPair
    ? hingeLeft
      ? segmentCenterX - centerGap / 2
      : segmentFrameRight - pairOuterInset
    : segmentFrameRight - doorInset;
  const doorW = Math.max(0.05, doorFaceRight - doorFaceLeft);
  const doorH = Math.max(0.05, hM - doorInset * 2);
  const doorD = Math.max(0.016, Math.min(0.018, Math.max(woodThick, 0.016)));
  const doorFrontZ = boxGeo.centerZ + boxGeo.outerD / 2;
  const doorBackClearanceZ = Math.max(0.0008, Math.min(0.0015, doorD * 0.1));
  const doorZ = doorFrontZ + doorD / 2 + doorBackClearanceZ;
  const pivotX = hingeLeft ? doorFaceLeft : doorFaceRight;
  const slabLocalX = hingeLeft ? doorW / 2 : -doorW / 2;

  return {
    placement,
    doorId,
    doorPid,
    hingeSide,
    hingeLeft,
    doorOpen,
    isCenterDoubleDoorPair,
    doorW,
    doorH,
    doorD,
    doorZ,
    pivotX,
    slabLocalX,
    sharedDoorUserData: {
      __wpSketchBoxDoorId: doorId,
      __wpSketchFreePlacement: isFreePlacement === true,
    },
    groupUserData: {
      partId: doorPid,
      __wpSketchBoxId: bid,
      __wpSketchBoxDoorId: doorId,
      __wpSketchModuleKey: moduleKeyStr,
      __wpSketchBoxDoor: true,
      __wpSketchFreePlacement: isFreePlacement === true,
      __wpSketchBoxDoubleDoor: isCenterDoubleDoorPair,
      __doorWidth: doorW,
      __doorHeight: doorH,
      __doorMeshOffsetX: slabLocalX,
      __wpFaceOffsetX: slabLocalX,
      __hingeLeft: hingeLeft,
      __handleZSign: 1,
      noGlobalOpen: true,
    },
  };
}
