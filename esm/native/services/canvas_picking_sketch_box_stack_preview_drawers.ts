import { DRAWER_DIMENSIONS, SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  buildManualLayoutSketchExternalDrawerBlockers,
  resolveManualLayoutSketchInternalDrawerPlacement,
} from './canvas_picking_manual_layout_sketch_stack_placement.js';
import { buildSketchBoxStackAwareMeasurementEntries } from './canvas_picking_sketch_neighbor_measurements.js';
import { createManualLayoutSketchBoxContentHoverRecord } from './canvas_picking_manual_layout_sketch_hover_state.js';
import type {
  ResolveSketchBoxStackPreviewArgs,
  ResolveSketchBoxStackPreviewResult,
} from './canvas_picking_sketch_box_stack_preview_contracts.js';
import {
  buildSketchBoxFrontOverlayFields,
  clampUnit,
  resolveSketchBoxStackPreviewContext,
} from './canvas_picking_sketch_box_stack_preview_shared.js';

export function resolveSketchBoxDrawersPreview(
  args: ResolveSketchBoxStackPreviewArgs
): ResolveSketchBoxStackPreviewResult {
  const ctx = resolveSketchBoxStackPreviewContext(args);
  const { host, boxId, freePlacement, pointerY, targetGeo, targetHeight, woodThick } = args;
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

  const placement = resolveManualLayoutSketchInternalDrawerPlacement({
    desiredCenterY: pointerY,
    bottomY: boxBottomY,
    topY: boxTopY,
    totalHeight: targetHeight,
    pad: woodThick,
    drawerHeightM: args.drawerHeightM,
    drawers: localDrawers,
    readCenterY,
    blockers: buildManualLayoutSketchExternalDrawerBlockers({
      extDrawers: localExtDrawers,
      bottomY: boxBottomY,
      topY: boxTopY,
      pad: woodThick,
      readCenterY,
    }),
  });
  const baseY = placement.yCenter - placement.stackH / 2;
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
      op: placement.op,
      removeId: placement.removeId,
      contentXNorm: activeSegment ? activeSegment.xNorm : 0.5,
      boxYNorm: clampUnit((placement.yCenter - boxBottomY) / targetHeight),
      boxBaseYNorm: clampUnit((baseY - boxBottomY) / targetHeight),
      yCenter: placement.yCenter,
      stackH: placement.stackH,
      drawerH: placement.drawerH,
      drawerGap: placement.drawerGap,
      drawerHeightM: args.drawerHeightM ?? placement.drawerH,
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
      op: placement.op,
      clearanceMeasurements,
      ...buildSketchBoxFrontOverlayFields(frontOverlay),
    },
  };
}
