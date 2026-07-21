import {
  DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY,
  DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY,
  DRAWER_SKETCH_SIZING_POLICY,
  EXTERNAL_DRAWER_FRONT_RENDER_POLICY,
} from '../../shared/dimensions/drawer_sketch_policy.js';
import { SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY } from '../../shared/dimensions/sketch_box_preview_policy.js';
import {
  buildManualLayoutSketchInternalDrawerBlockers,
  resolveManualLayoutSketchExternalDrawerPlacement,
} from './canvas_picking_manual_layout_sketch_stack_placement.js';
import { sketchStackFitsAvailableHeight } from '../features/sketch_drawer_sizing.js';
import { buildSketchBoxVerticalContentBlockers } from './canvas_picking_sketch_box_vertical_content_blockers.js';
import { buildSketchBoxStackAwareMeasurementEntries } from './canvas_picking_sketch_neighbor_measurements.js';
import { createManualLayoutSketchBoxCommandHoverRecord } from './canvas_picking_manual_layout_sketch_hover_state.js';
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
        : DRAWER_SKETCH_SIZING_POLICY.externalPreviewDefaultCount,
    drawerHeightM: args.drawerHeightM,
    bottomY: boxBottomY,
    topY: boxTopY,
    pad: woodThick,
    gap: DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY.verticalStackCollisionGapM,
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
        DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinWidthM,
        (activeSegment ? activeSegment.width : targetGeo.innerW) -
          EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualWidthClearanceM
      );
  const previewW = Math.max(
    DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinWidthM,
    faceWidth - EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualWidthClearanceM
  );
  const previewZ = frontOverlay
    ? frontOverlay.z
    : targetGeo.centerZ + targetGeo.outerD / 2 + EXTERNAL_DRAWER_FRONT_RENDER_POLICY.frontOffsetZM;
  const previewD = frontOverlay ? frontOverlay.d : EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualThicknessM;
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
        DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewMeasurementZOffsetMinM,
        previewD * DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewMeasurementZOffsetThicknessRatio
      ),
    styleKey: 'cell',
    textScale: SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY.measurementTextScale,
  });
  const drawersPreview: RecordMap[] = [];
  const hoverOp: 'add' | 'remove' = blockedReason || placement.op === 'blocked' ? 'add' : placement.op;
  const hoverRemoveId = blockedReason || placement.op === 'blocked' ? null : placement.removeId;
  for (let i = 0; i < placement.drawerCount; i++) {
    drawersPreview.push({
      y: baseY + i * drawerH + drawerH / 2,
      h: Math.max(
        DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinHeightM,
        drawerH - EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualHeightClearanceM
      ),
    });
  }

  return {
    hoverRecord: createManualLayoutSketchBoxCommandHoverRecord({
      host,
      command: {
        kind: 'sketch-external-drawers',
        boxId,
        freePlacement,
        op: hoverOp,
        removeId: hoverRemoveId,
        contentXNorm: activeSegment ? activeSegment.xNorm : 0.5,
        boxYNorm: clampUnit((placement.yCenter - fullBoxBottomY) / targetHeight),
        boxBaseYNorm: clampUnit((baseY - fullBoxBottomY) / targetHeight),
        drawerHeightM: args.drawerHeightM ?? placement.drawerH,
        drawerH,
        stackH: placement.stackH,
        drawerCount: placement.drawerCount,
        blockedReason,
      },
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
      ...(placement.op === 'remove' ? {} : buildSketchBoxFrontOverlayFields(frontOverlay)),
    },
  };
}
