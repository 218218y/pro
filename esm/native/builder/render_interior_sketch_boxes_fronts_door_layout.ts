import {
  getSketchBoxDoorPlacementSegmentKey,
  type SketchBoxDoorPlacement,
} from './render_interior_sketch_boxes_fronts_support.js';
import type {
  RenderSketchBoxDoorFrontsArgs,
  ResolvedSketchBoxDoorLayout,
} from './render_interior_sketch_boxes_fronts_door_contracts.js';

import { readSketchBoxDoorId } from './render_interior_sketch_shared.js';
import { SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { readGeometryRuntimePositiveNumber } from './geometry_runtime_contracts.js';
import {
  resolveSketchBoxDoorMountMode,
  resolveSketchBoxDoorThickness,
  resolveSketchBoxInsetReveal,
} from './render_interior_sketch_boxes_door_geometry.js';
import { resolveSketchFreeBoxDoorHandleAbsY } from './render_interior_sketch_boxes_fronts_door_handle_policy.js';

export function resolveSketchBoxDoorLayout(args: {
  renderArgs: RenderSketchBoxDoorFrontsArgs;
  placement: SketchBoxDoorPlacement;
  placementsBySegment: Map<string, SketchBoxDoorPlacement[]>;
  sharedHandleAbsY?: number | null;
}): ResolvedSketchBoxDoorLayout | null {
  const { renderArgs, placement, placementsBySegment } = args;
  const { frontsArgs } = renderArgs;
  const { shell } = frontsArgs;
  const { input, woodThick, moduleKeyStr } = frontsArgs.args;
  const { boxId: bid, boxPid, isFreePlacement, height: hM, geometry: boxGeo } = shell;
  const isInsetDoorMount = resolveSketchBoxDoorMountMode(input) === 'inset';
  const insetReveal = isInsetDoorMount ? resolveSketchBoxInsetReveal(woodThick) : 0;

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
  const segmentKey = getSketchBoxDoorPlacementSegmentKey(placement);
  const segmentDoors = segmentKey ? placementsBySegment.get(segmentKey) || [] : [];
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
  let doorSpanLeft = isInsetDoorMount ? segmentLeft : segmentFrameLeft;
  let doorSpanRight = isInsetDoorMount ? segmentRight : segmentFrameRight;
  if (isFreePlacement && shell.hexGeometry) {
    const halfHexDoorW =
      Math.max(woodThick, readGeometryRuntimePositiveNumber(shell.hexGeometry.doorWidthM) ?? 0) / 2;
    const hexDoorLeft = boxGeo.centerX - halfHexDoorW;
    const hexDoorRight = boxGeo.centerX + halfHexDoorW;
    doorSpanLeft = Math.max(doorSpanLeft, hexDoorLeft);
    doorSpanRight = Math.min(doorSpanRight, hexDoorRight);
    if (!(doorSpanRight > doorSpanLeft)) return null;
  }
  const doorSpanW = Math.max(0, doorSpanRight - doorSpanLeft);
  const doorSideInset = isInsetDoorMount ? Math.min(insetReveal, Math.max(0, doorSpanW / 8)) : doorInset;
  const centerGap = isCenterDoubleDoorPair
    ? Math.max(
        SKETCH_BOX_DIMENSIONS.preview.doorDoublePairGapMinM,
        Math.min(
          SKETCH_BOX_DIMENSIONS.preview.doorDoublePairGapMaxM,
          Math.min(doorSpanW, hM) * SKETCH_BOX_DIMENSIONS.preview.doorDoublePairGapSizeRatio
        )
      )
    : 0;
  const segmentCenterX = (doorSpanLeft + doorSpanRight) / 2;
  const pairOuterInset = isCenterDoubleDoorPair
    ? isInsetDoorMount
      ? doorSideInset
      : Math.max(
          SKETCH_BOX_DIMENSIONS.preview.doorDoublePairOuterInsetMinM,
          Math.min(
            doorSideInset,
            Math.min(doorSpanW, hM) * SKETCH_BOX_DIMENSIONS.preview.doorDoublePairOuterInsetSizeRatio
          )
        )
    : doorSideInset;
  const doorFaceLeft = isCenterDoubleDoorPair
    ? hingeLeft
      ? doorSpanLeft + pairOuterInset
      : segmentCenterX + centerGap / 2
    : doorSpanLeft + doorSideInset;
  const doorFaceRight = isCenterDoubleDoorPair
    ? hingeLeft
      ? segmentCenterX - centerGap / 2
      : doorSpanRight - pairOuterInset
    : doorSpanRight - doorSideInset;
  const doorW = Math.max(SKETCH_BOX_DIMENSIONS.preview.doorMinDimensionM, doorFaceRight - doorFaceLeft);
  const doorVerticalSegment = placement.verticalSegment || null;
  const doorCellHeight = doorVerticalSegment
    ? doorVerticalSegment.height
    : isInsetDoorMount
      ? shell.sideH
      : hM;
  const doorCenterY = doorVerticalSegment ? doorVerticalSegment.centerY : shell.centerY;
  const doorVerticalInset = isInsetDoorMount
    ? Math.min(insetReveal, Math.max(0, doorCellHeight / 8))
    : doorInset;
  const doorH = Math.max(
    SKETCH_BOX_DIMENSIONS.preview.doorMinDimensionM,
    doorCellHeight - doorVerticalInset * 2
  );
  const doorD = resolveSketchBoxDoorThickness(woodThick);
  const doorFrontZ = Number.isFinite(shell.frontZ) ? shell.frontZ : boxGeo.centerZ + boxGeo.outerD / 2;
  const doorBackClearanceZ = Math.max(
    SKETCH_BOX_DIMENSIONS.preview.doorBackClearanceMinM,
    Math.min(
      SKETCH_BOX_DIMENSIONS.preview.doorBackClearanceMaxM,
      doorD * SKETCH_BOX_DIMENSIONS.preview.doorBackClearanceDepthRatio
    )
  );
  const doorZ = isInsetDoorMount
    ? doorFrontZ - doorD / 2 - insetReveal
    : doorFrontZ + doorD / 2 + doorBackClearanceZ;
  const pivotX = hingeLeft ? doorFaceLeft : doorFaceRight;
  const slabLocalX = hingeLeft ? doorW / 2 : -doorW / 2;

  const boxDoorGrooveOn = boxDoor.groove === true;
  const boxDoorGrooveLinesCount = boxDoor.grooveLinesCount ?? null;
  const sharedHandleAbsY =
    typeof args.sharedHandleAbsY === 'number' && Number.isFinite(args.sharedHandleAbsY)
      ? args.sharedHandleAbsY
      : null;
  const handleAbsY = resolveSketchFreeBoxDoorHandleAbsY({
    renderArgs,
    placement,
    sharedHandleAbsY,
  });

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
    doorCenterY,
    pivotX,
    slabLocalX,
    sharedDoorUserData: {
      __wpSketchBoxDoorId: doorId,
      __wpSketchFreePlacement: isFreePlacement === true,
      __wpSketchBoxDoorGroove: boxDoorGrooveOn,
      __wpSketchBoxDoorGrooveLinesCount: boxDoorGrooveLinesCount,
    },
    groupUserData: {
      partId: doorPid,
      __wpSketchBoxId: bid,
      __wpSketchBoxDoorId: doorId,
      __wpSketchModuleKey: moduleKeyStr,
      __wpSketchBoxDoor: true,
      __wpSketchFreePlacement: isFreePlacement === true,
      __wpSketchBoxDoorGroove: boxDoorGrooveOn,
      __wpSketchBoxDoorGrooveLinesCount: boxDoorGrooveLinesCount,
      __wpSketchBoxDoubleDoor: isCenterDoubleDoorPair,
      __doorWidth: doorW,
      __doorHeight: doorH,
      __doorMeshOffsetX: slabLocalX,
      __wpFaceOffsetX: slabLocalX,
      __hingeLeft: hingeLeft,
      __handleZSign: 1,
      ...(handleAbsY != null ? { __handleAbsY: handleAbsY } : {}),
      noGlobalOpen: true,
    },
  };
}
