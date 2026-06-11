import { DRAWER_DIMENSIONS, SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  buildManualLayoutSketchInternalDrawerBlockers,
  resolveManualLayoutSketchExternalDrawerPlacement,
} from './canvas_picking_manual_layout_sketch_stack_placement.js';
import { sketchStackFitsAvailableHeight } from '../features/sketch_drawer_sizing.js';
import { buildSketchBoxVerticalContentBlockers } from './canvas_picking_sketch_box_vertical_content_blockers.js';
import { buildSketchBoxStackAwareMeasurementEntries } from './canvas_picking_sketch_neighbor_measurements.js';
import { createManualLayoutSketchBoxContentHoverRecord } from './canvas_picking_manual_layout_sketch_hover_state.js';
import type {
  RecordMap,
  ResolveSketchBoxStackPreviewArgs,
  ResolveSketchBoxStackPreviewResult,
} from './canvas_picking_sketch_box_stack_preview_contracts.js';
import {
  clampUnit,
  resolveSketchBoxStackPreviewContext,
} from './canvas_picking_sketch_box_stack_preview_shared.js';

export function resolveSketchBoxExternalDrawersPreview(
  args: ResolveSketchBoxStackPreviewArgs
): ResolveSketchBoxStackPreviewResult {
  const ctx = resolveSketchBoxStackPreviewContext(args);
  const { host, boxId, freePlacement, pointerY, targetGeo, targetHeight, woodThick, selectedDrawerCount } =
    args;
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
    frontOverlay,
  } = ctx;

  const placement = resolveManualLayoutSketchExternalDrawerPlacement({
    desiredCenterY: pointerY,
    selectedDrawerCount:
      selectedDrawerCount != null && selectedDrawerCount > 0
        ? selectedDrawerCount
        : DRAWER_DIMENSIONS.sketch.externalPreviewDefaultCount,
    drawerHeightM: args.drawerHeightM,
    bottomY: boxBottomY,
    topY: boxTopY,
    pad: woodThick,
    gap: DRAWER_DIMENSIONS.sketch.verticalStackCollisionGapM,
    extDrawers: localExtDrawers,
    readCenterY,
    blockers: buildManualLayoutSketchInternalDrawerBlockers({
      drawers: localDrawers,
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
    ),
  });
  const drawerH = placement.drawerH;
  const baseY = placement.yCenter - placement.stackH / 2;
  const fitsRenderedBoxSpace = sketchStackFitsAvailableHeight(
    placement.stackH,
    Math.max(0, cellHeight - woodThick * 3)
  );
  const blockedReason =
    placement.op === 'blocked'
      ? 'collision'
      : placement.op !== 'remove' && (!placement.fitsAvailable || !fitsRenderedBoxSpace)
        ? 'no-room'
        : null;
  const faceCenterX = frontOverlay
    ? frontOverlay.x
    : activeSegment
      ? activeSegment.centerX
      : targetGeo.centerX;
  const faceWidth = frontOverlay
    ? frontOverlay.w
    : Math.max(
        DRAWER_DIMENSIONS.sketch.externalPreviewVisualMinWidthM,
        (activeSegment ? activeSegment.width : targetGeo.innerW) -
          DRAWER_DIMENSIONS.external.visualWidthClearanceM
      );
  const previewW = Math.max(
    DRAWER_DIMENSIONS.sketch.externalPreviewVisualMinWidthM,
    faceWidth - DRAWER_DIMENSIONS.external.visualWidthClearanceM
  );
  const previewZ = frontOverlay
    ? frontOverlay.z
    : targetGeo.centerZ + targetGeo.outerD / 2 + DRAWER_DIMENSIONS.external.frontOffsetZM;
  const previewD = frontOverlay ? frontOverlay.d : DRAWER_DIMENSIONS.external.visualThicknessM;
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
    targetCenterX: faceCenterX,
    targetCenterY: placement.yCenter,
    targetWidth: previewW,
    targetHeight: placement.stackH,
    z:
      previewZ +
      previewD / 2 +
      Math.max(
        DRAWER_DIMENSIONS.sketch.externalPreviewMeasurementZOffsetMinM,
        previewD * DRAWER_DIMENSIONS.sketch.externalPreviewMeasurementZOffsetThicknessRatio
      ),
    styleKey: 'cell',
    textScale: SKETCH_BOX_DIMENSIONS.preview.measurementTextScale,
  });
  const drawersPreview: RecordMap[] = [];
  const hoverOp: 'add' | 'remove' = blockedReason || placement.op === 'blocked' ? 'add' : placement.op;
  const hoverRemoveId = blockedReason || placement.op === 'blocked' ? null : placement.removeId;
  for (let i = 0; i < placement.drawerCount; i++) {
    drawersPreview.push({
      y: baseY + i * drawerH + drawerH / 2,
      h: Math.max(
        DRAWER_DIMENSIONS.sketch.externalPreviewVisualMinHeightM,
        drawerH - DRAWER_DIMENSIONS.external.visualHeightClearanceM
      ),
    });
  }

  return {
    hoverRecord: createManualLayoutSketchBoxContentHoverRecord({
      host,
      contentKind: 'ext_drawers',
      boxId,
      freePlacement,
      op: hoverOp,
      removeId: hoverRemoveId,
      contentXNorm: activeSegment ? activeSegment.xNorm : 0.5,
      boxYNorm: clampUnit((placement.yCenter - fullBoxBottomY) / targetHeight),
      boxBaseYNorm: clampUnit((baseY - fullBoxBottomY) / targetHeight),
      yCenter: placement.yCenter,
      stackH: placement.stackH,
      drawerCount: placement.drawerCount,
      drawerHeightM: args.drawerHeightM ?? placement.drawerH,
      drawerH,
      blockedReason,
    }),
    preview: {
      kind: 'ext_drawers',
      x: faceCenterX,
      y: baseY,
      z: previewZ,
      w: previewW,
      d: previewD,
      woodThick,
      drawers: drawersPreview,
      op: blockedReason ? 'blocked' : placement.op,
      blockedReason: blockedReason ?? undefined,
      clearanceMeasurements,
    },
  };
}
