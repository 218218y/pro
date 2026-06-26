import { DRAWER_DIMENSIONS, SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  buildManualLayoutSketchExternalDrawerBlockers,
  resolveManualLayoutSketchInternalDrawerPlacement,
} from './canvas_picking_manual_layout_sketch_stack_placement.js';
import { buildSketchBoxStackAwareMeasurementEntries } from './canvas_picking_sketch_neighbor_measurements.js';
import { buildSketchBoxVerticalContentBlockers } from './canvas_picking_sketch_box_vertical_content_blockers.js';
import { withoutInternalDrawerReplaceableShelfBlockers } from './canvas_picking_internal_drawer_shelf_replacement.js';
import { createManualLayoutSketchBoxContentHoverRecord } from './canvas_picking_manual_layout_sketch_hover_state.js';
import type {
  ResolveSketchBoxStackPreviewArgs,
  ResolveSketchBoxStackPreviewResult,
} from './canvas_picking_sketch_box_stack_preview_contracts.js';
import {
  clampUnit,
  resolveSketchBoxStackPreviewContext,
} from './canvas_picking_sketch_box_stack_preview_shared.js';

export function resolveSketchBoxDrawersPreview(
  args: ResolveSketchBoxStackPreviewArgs
): ResolveSketchBoxStackPreviewResult {
  const ctx = resolveSketchBoxStackPreviewContext(args);
  const { host, boxId, freePlacement, pointerY, targetGeo, targetHeight, woodThick } = args;
  const {
    fullBoxBottomY,
    fullBoxTopY,
    boxBottomY,
    boxTopY,
    cellHeight,
    readCenterY,
    boxSegments,
    activeSegment,
    verticalSegments,
    activeVerticalSegment,
    localDrawers,
    localExtDrawers,
  } = ctx;

  const placementBlockers = buildManualLayoutSketchExternalDrawerBlockers({
    extDrawers: localExtDrawers,
    bottomY: boxBottomY,
    topY: boxTopY,
    pad: woodThick,
    readCenterY,
  }).concat(
    buildSketchBoxVerticalContentBlockers({
      targetBox: args.targetBox,
      targetGeo,
      targetCenterY: args.targetCenterY,
      targetHeight,
      woodThick,
      boxSegments,
      activeSegment,
      verticalSegments,
      activeVerticalSegment,
      pickSketchBoxSegment: args.pickSketchBoxSegment,
      pickSketchBoxVerticalSegment: args.pickSketchBoxVerticalSegment,
    })
  );
  let placement = resolveManualLayoutSketchInternalDrawerPlacement({
    desiredCenterY: pointerY,
    bottomY: boxBottomY,
    topY: boxTopY,
    totalHeight: cellHeight,
    pad: woodThick,
    drawerHeightM: args.drawerHeightM,
    drawers: localDrawers,
    readCenterY,
    blockers: placementBlockers,
  });
  if (placement.op === 'blocked') {
    placement = resolveManualLayoutSketchInternalDrawerPlacement({
      desiredCenterY: pointerY,
      bottomY: boxBottomY,
      topY: boxTopY,
      totalHeight: cellHeight,
      pad: woodThick,
      drawerHeightM: args.drawerHeightM,
      drawers: localDrawers,
      readCenterY,
      blockers: withoutInternalDrawerReplaceableShelfBlockers(placementBlockers),
    });
  }
  const baseY = placement.yCenter - placement.stackH / 2;
  const blockedReason =
    placement.op === 'blocked'
      ? 'collision'
      : placement.op !== 'remove' && !placement.fitsAvailable
        ? 'no-room'
        : null;
  const hoverOp: 'add' | 'remove' = blockedReason || placement.op === 'blocked' ? 'add' : placement.op;
  const hoverRemoveId = blockedReason || placement.op === 'blocked' ? null : placement.removeId;
  const previewX = activeSegment ? activeSegment.centerX : targetGeo.centerX;
  const previewW = Math.max(
    DRAWER_DIMENSIONS.sketch.internalPreviewMinWidthM,
    (activeSegment ? activeSegment.width : targetGeo.innerW) -
      DRAWER_DIMENSIONS.sketch.internalPreviewWidthClearanceM
  );
  const previewD = Math.max(
    DRAWER_DIMENSIONS.sketch.internalPreviewMinDepthM,
    targetGeo.innerD - DRAWER_DIMENSIONS.sketch.internalPreviewDepthClearanceM
  );
  const previewZ = targetGeo.innerBackZ + targetGeo.innerD / 2;
  const clearanceMeasurements = buildSketchBoxStackAwareMeasurementEntries({
    bottomY: boxBottomY + woodThick,
    topY: boxTopY - woodThick,
    totalHeight: cellHeight,
    pad: woodThick,
    woodThick,
    neighborBottomY: fullBoxBottomY,
    neighborTopY: fullBoxTopY,
    neighborTotalHeight: targetHeight,
    neighborPad: woodThick,
    targetBox: args.targetBox,
    targetGeo,
    activeSegment,
    boxSegments,
    pickSegment: args.pickSketchBoxSegment,
    targetCenterX: previewX,
    targetCenterY: placement.yCenter,
    targetWidth: previewW,
    targetHeight: placement.stackH,
    z:
      previewZ +
      previewD / 2 +
      Math.max(
        DRAWER_DIMENSIONS.sketch.internalPreviewMeasurementZOffsetMinM,
        previewD * DRAWER_DIMENSIONS.sketch.internalPreviewMeasurementZOffsetDepthRatio
      ),
    styleKey: 'cell',
    textScale: SKETCH_BOX_DIMENSIONS.preview.measurementTextScale,
  });

  return {
    hoverRecord: createManualLayoutSketchBoxContentHoverRecord({
      host,
      contentKind: 'drawers',
      boxId,
      freePlacement,
      op: hoverOp,
      removeId: hoverRemoveId,
      contentXNorm: activeSegment ? activeSegment.xNorm : 0.5,
      boxYNorm: clampUnit((placement.yCenter - fullBoxBottomY) / targetHeight),
      boxBaseYNorm: clampUnit((baseY - fullBoxBottomY) / targetHeight),
      yCenter: placement.yCenter,
      stackH: placement.stackH,
      drawerH: placement.drawerH,
      drawerGap: placement.drawerGap,
      drawerHeightM: args.drawerHeightM ?? placement.drawerH,
      blockedReason,
    }),
    preview: {
      kind: 'drawers',
      x: previewX,
      y: baseY,
      z: previewZ,
      w: previewW,
      d: previewD,
      drawerH: placement.drawerH,
      drawerGap: placement.drawerGap,
      woodThick,
      op: blockedReason ? 'blocked' : placement.op,
      blockedReason: blockedReason ?? undefined,
      clearanceMeasurements,
    },
  };
}
