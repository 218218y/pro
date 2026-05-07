import { DRAWER_DIMENSIONS, SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  buildManualLayoutSketchInternalDrawerBlockers,
  resolveManualLayoutSketchExternalDrawerPlacement,
} from './canvas_picking_manual_layout_sketch_stack_placement.js';
import { buildSketchBoxStackAwareMeasurementEntries } from './canvas_picking_sketch_neighbor_measurements.js';
import { createManualLayoutSketchBoxContentHoverRecord } from './canvas_picking_manual_layout_sketch_hover_state.js';
import type {
  RecordMap,
  ResolveSketchBoxStackPreviewArgs,
  ResolveSketchBoxStackPreviewResult,
} from './canvas_picking_sketch_box_stack_preview_contracts.js';
import {
  buildSketchBoxFrontOverlayFields,
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
    boxBottomY,
    boxTopY,
    readCenterY,
    boxSegments,
    activeSegment,
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
    }),
  });
  const drawerH = placement.drawerH;
  const baseY = placement.yCenter - placement.stackH / 2;
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
    totalHeight: targetHeight,
    pad: woodThick,
    woodThick,
    neighborBottomY: boxBottomY,
    neighborTopY: boxTopY,
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
      op: placement.op,
      removeId: placement.removeId,
      contentXNorm: activeSegment ? activeSegment.xNorm : 0.5,
      boxYNorm: clampUnit((placement.yCenter - boxBottomY) / targetHeight),
      boxBaseYNorm: clampUnit((baseY - boxBottomY) / targetHeight),
      yCenter: placement.yCenter,
      stackH: placement.stackH,
      drawerCount: placement.drawerCount,
      drawerHeightM: args.drawerHeightM ?? placement.drawerH,
      drawerH,
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
      op: placement.op,
      clearanceMeasurements,
      ...buildSketchBoxFrontOverlayFields(frontOverlay),
    },
  };
}
