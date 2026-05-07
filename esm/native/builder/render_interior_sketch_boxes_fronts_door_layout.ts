import type { SketchBoxDoorPlacement } from './render_interior_sketch_boxes_fronts_support.js';
import type {
  RenderSketchBoxDoorFrontsArgs,
  ResolvedSketchBoxDoorLayout,
} from './render_interior_sketch_boxes_fronts_door_contracts.js';

import { readSketchBoxDoorId } from './render_interior_sketch_shared.js';
import { SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';

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
  const doorInset = Math.max(
    SKETCH_BOX_DIMENSIONS.preview.doorInsetMinM,
    Math.min(
      SKETCH_BOX_DIMENSIONS.preview.doorInsetMaxM,
      Math.min(boxGeo.outerW, hM) * SKETCH_BOX_DIMENSIONS.preview.doorInsetSizeRatio
    )
  );
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
  const leftExt =
    Math.abs(segmentLeft - innerLeft) <= SKETCH_BOX_DIMENSIONS.preview.doorEdgeEpsilonM
      ? woodThick
      : woodThick / 2;
  const rightExt =
    Math.abs(segmentRight - innerRight) <= SKETCH_BOX_DIMENSIONS.preview.doorEdgeEpsilonM
      ? woodThick
      : woodThick / 2;
  const segmentFrameLeft = segmentLeft - leftExt;
  const segmentFrameRight = segmentRight + rightExt;
  const centerGap = isCenterDoubleDoorPair
    ? Math.max(
        SKETCH_BOX_DIMENSIONS.preview.doorDoublePairGapMinM,
        Math.min(
          SKETCH_BOX_DIMENSIONS.preview.doorDoublePairGapMaxM,
          Math.min(segmentFrameRight - segmentFrameLeft, hM) *
            SKETCH_BOX_DIMENSIONS.preview.doorDoublePairGapSizeRatio
        )
      )
    : 0;
  const segmentCenterX = (segmentFrameLeft + segmentFrameRight) / 2;
  const pairOuterInset = isCenterDoubleDoorPair
    ? Math.max(
        SKETCH_BOX_DIMENSIONS.preview.doorDoublePairOuterInsetMinM,
        Math.min(
          doorInset,
          Math.min(segmentFrameRight - segmentFrameLeft, hM) *
            SKETCH_BOX_DIMENSIONS.preview.doorDoublePairOuterInsetSizeRatio
        )
      )
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
  const doorW = Math.max(SKETCH_BOX_DIMENSIONS.preview.doorMinDimensionM, doorFaceRight - doorFaceLeft);
  const doorH = Math.max(SKETCH_BOX_DIMENSIONS.preview.doorMinDimensionM, hM - doorInset * 2);
  const doorD = Math.max(
    SKETCH_BOX_DIMENSIONS.preview.doorThicknessMinM,
    Math.min(
      SKETCH_BOX_DIMENSIONS.preview.doorThicknessMaxM,
      Math.max(woodThick, SKETCH_BOX_DIMENSIONS.preview.doorThicknessMinM)
    )
  );
  const doorFrontZ = boxGeo.centerZ + boxGeo.outerD / 2;
  const doorBackClearanceZ = Math.max(
    SKETCH_BOX_DIMENSIONS.preview.doorBackClearanceMinM,
    Math.min(
      SKETCH_BOX_DIMENSIONS.preview.doorBackClearanceMaxM,
      doorD * SKETCH_BOX_DIMENSIONS.preview.doorBackClearanceDepthRatio
    )
  );
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
