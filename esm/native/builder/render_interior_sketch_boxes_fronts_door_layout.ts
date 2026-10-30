import { resolveWinterBraceDoorPlan } from './winter_brace_shelf_geometry.js';
import { resolveSketchDoorSegmentPartId } from './post_build_sketch_door_cuts_rebuild_shared.js';
import {
  getSketchBoxDoorPlacementSegmentKey,
  type SketchBoxDoorPlacement,
} from './render_interior_sketch_boxes_fronts_support.js';
import type {
  RenderSketchBoxDoorFrontsArgs,
  ResolvedSketchBoxDoorLayout,
} from './render_interior_sketch_boxes_fronts_door_contracts.js';

import {
  readSketchBoxDoorId,
  asRecordArray,
  type SketchShelfExtra,
} from './render_interior_sketch_shared.js';
import { resolveSketchBoxSegmentForContent } from './render_interior_sketch_layout.js';
import { SKETCH_BOX_DOOR_PREVIEW_POLICY } from '../../shared/dimensions/sketch_box_preview_policy.js';
import { readGeometryRuntimePositiveNumber } from './geometry_runtime_contracts.js';
import {
  resolveSketchBoxDoorMountMode,
  resolveSketchBoxDoorThickness,
  resolveSketchBoxInsetReveal,
} from './render_interior_sketch_boxes_door_geometry.js';
import { resolveSketchFreeBoxDoorHandleAbsY } from './render_interior_sketch_boxes_fronts_door_handle_policy.js';
import { createBuilderHingedDoorMotionMetadata } from './hinged_door_motion_metadata.js';

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
    SKETCH_BOX_DOOR_PREVIEW_POLICY.doorInsetMinM,
    Math.min(
      SKETCH_BOX_DOOR_PREVIEW_POLICY.doorInsetMaxM,
      Math.min(boxGeo.outerW, hM) * SKETCH_BOX_DOOR_PREVIEW_POLICY.doorInsetSizeRatio
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
    Math.abs(segmentLeft - innerLeft) <= SKETCH_BOX_DOOR_PREVIEW_POLICY.doorEdgeEpsilonM
      ? woodThick
      : woodThick / 2;
  const rightExt =
    Math.abs(segmentRight - innerRight) <= SKETCH_BOX_DOOR_PREVIEW_POLICY.doorEdgeEpsilonM
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
        SKETCH_BOX_DOOR_PREVIEW_POLICY.doorDoublePairGapMinM,
        Math.min(
          SKETCH_BOX_DOOR_PREVIEW_POLICY.doorDoublePairGapMaxM,
          Math.min(doorSpanW, hM) * SKETCH_BOX_DOOR_PREVIEW_POLICY.doorDoublePairGapSizeRatio
        )
      )
    : 0;
  const segmentCenterX = (doorSpanLeft + doorSpanRight) / 2;
  const pairOuterInset = isCenterDoubleDoorPair
    ? isInsetDoorMount
      ? doorSideInset
      : Math.max(
          SKETCH_BOX_DOOR_PREVIEW_POLICY.doorDoublePairOuterInsetMinM,
          Math.min(
            doorSideInset,
            Math.min(doorSpanW, hM) * SKETCH_BOX_DOOR_PREVIEW_POLICY.doorDoublePairOuterInsetSizeRatio
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
  const doorW = Math.max(SKETCH_BOX_DOOR_PREVIEW_POLICY.doorMinDimensionM, doorFaceRight - doorFaceLeft);
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
    SKETCH_BOX_DOOR_PREVIEW_POLICY.doorMinDimensionM,
    doorCellHeight - doorVerticalInset * 2
  );
  const doorD = resolveSketchBoxDoorThickness(woodThick);
  const doorFrontZ = Number.isFinite(shell.frontZ) ? shell.frontZ : boxGeo.centerZ + boxGeo.outerD / 2;
  const doorBackClearanceZ = Math.max(
    SKETCH_BOX_DOOR_PREVIEW_POLICY.doorBackClearanceMinM,
    Math.min(
      SKETCH_BOX_DOOR_PREVIEW_POLICY.doorBackClearanceMaxM,
      doorD * SKETCH_BOX_DOOR_PREVIEW_POLICY.doorBackClearanceDepthRatio
    )
  );
  const doorZ = isInsetDoorMount
    ? doorFrontZ - doorD / 2 - insetReveal
    : doorFrontZ + doorD / 2 + doorBackClearanceZ;
  const pivotX = hingeLeft ? doorFaceLeft : doorFaceRight;
  const slabLocalX = hingeLeft ? doorW / 2 : -doorW / 2;
  const carcassBoundaryX = hingeLeft ? segmentLeft : segmentRight;
  const rawCarcassMountFaceX = carcassBoundaryX - pivotX;
  const nominalCarcassMountFaceX = (hingeLeft ? 1 : -1) * (woodThick / 2);
  const carcassMountFaceX =
    Number.isFinite(rawCarcassMountFaceX) && Math.abs(rawCarcassMountFaceX) <= woodThick + 1e-6
      ? rawCarcassMountFaceX
      : nominalCarcassMountFaceX;

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
    carcassMountFaceX,
    sharedDoorUserData: {
      __wpSketchBoxDoorId: doorId,
      __wpSketchFreePlacement: isFreePlacement === true,
      __wpSketchBoxDoorGroove: boxDoorGrooveOn,
      __wpSketchBoxDoorGrooveLinesCount: boxDoorGrooveLinesCount,
    },
    groupUserData: {
      ...createBuilderHingedDoorMotionMetadata({
        partId: doorPid,
        widthM: doorW,
        heightM: doorH,
        meshOffsetXM: slabLocalX,
        handleZSign: 1,
        noGlobalOpen: true,
      }),
      __wpSketchBoxId: bid,
      __wpSketchBoxDoorId: doorId,
      __wpSketchModuleKey: moduleKeyStr,
      __wpSketchBoxDoor: true,
      __wpSketchFreePlacement: isFreePlacement === true,
      __wpSketchBoxDoorGroove: boxDoorGrooveOn,
      __wpSketchBoxDoorGrooveLinesCount: boxDoorGrooveLinesCount,
      __wpSketchBoxDoubleDoor: isCenterDoubleDoorPair,
      __wpFaceOffsetX: slabLocalX,
      __hingeLeft: hingeLeft,
      ...(handleAbsY != null ? { __handleAbsY: handleAbsY } : {}),
    },
  };
}

export function resolveWinterBraceBoxDoorLayouts(
  args: RenderSketchBoxDoorFrontsArgs,
  layout: ResolvedSketchBoxDoorLayout
): ResolvedSketchBoxDoorLayout[] {
  const { shell, yFromBoxNorm } = args.frontsArgs;
  const doorSegment = layout.placement?.segment;
  const shelves = asRecordArray<SketchShelfExtra>(shell.box.shelves).filter(shelf => {
    if (!doorSegment) return true;
    const segment = resolveSketchBoxSegmentForContent({
      dividers: args.frontsArgs.boxDividers,
      horizontalDividers: args.frontsArgs.boxHorizontalDividers,
      boxCenterX: shell.geometry.centerX,
      innerW: shell.geometry.innerW,
      boxCenterY: shell.centerY,
      innerH: shell.sideH,
      woodThick: args.frontsArgs.args.woodThick,
      xNorm: shelf.xNorm,
      yNorm: shelf.yNorm,
    });
    return (
      !segment || Math.min(segment.rightX, doorSegment.rightX) > Math.max(segment.leftX, doorSegment.leftX)
    );
  });
  const plan = resolveWinterBraceDoorPlan({
    config: { ...shell.box, shelves },
    source: 'box',
    gridY: () => NaN,
    sketchY: norm => yFromBoxNorm(norm, args.frontsArgs.args.woodThick / 2),
  });
  if (!plan.cuts.length) return [layout];
  const bottom = layout.doorCenterY - layout.doorH / 2;
  const top = layout.doorCenterY + layout.doorH / 2;
  const cuts: number[] = [];
  const halfGap = SKETCH_BOX_DOOR_PREVIEW_POLICY.doorSplitGapM / 2;
  for (const y of plan.cuts) {
    const previousTop = cuts.length ? cuts.at(-1)! + halfGap : bottom;
    if (
      y - halfGap - previousTop >= SKETCH_BOX_DOOR_PREVIEW_POLICY.doorSplitMinSegmentHeightM &&
      top - y - halfGap >= SKETCH_BOX_DOOR_PREVIEW_POLICY.doorSplitMinSegmentHeightM
    )
      cuts.push(y);
  }
  if (!cuts.length) return [layout];
  const bounds = [bottom, ...cuts, top];
  return bounds.slice(0, -1).map((lo, index) => {
    const minY = lo + (index > 0 ? halfGap : 0);
    const maxY = bounds[index + 1]! - (index < cuts.length ? halfGap : 0);
    const partId = resolveSketchDoorSegmentPartId(layout.doorPid, bounds.length - 1, index);
    const height = maxY - minY;
    const fixedClosed = plan.fixedBelowY !== null && maxY <= plan.fixedBelowY + 1e-6;
    return {
      ...layout,
      doorPid: partId,
      doorH: height,
      doorCenterY: (minY + maxY) / 2,
      groupUserData: {
        ...layout.groupUserData,
        ...createBuilderHingedDoorMotionMetadata({ partId, heightM: height, fixedClosed }),
        noGlobalOpen: false,
      },
    };
  });
}
