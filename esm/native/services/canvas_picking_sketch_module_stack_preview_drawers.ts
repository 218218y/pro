import { DRAWER_DIMENSIONS, SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  buildManualLayoutSketchExternalDrawerBlockers,
  createManualLayoutSketchNormalizedCenterReader,
  resolveManualLayoutSketchInternalDrawerPlacement,
} from './canvas_picking_manual_layout_sketch_stack_placement.js';
import { buildManualLayoutVerticalContentBlockers } from './canvas_picking_manual_layout_vertical_blockers.js';
import { withoutInternalDrawerReplaceableShelfBlockers } from './canvas_picking_internal_drawer_shelf_replacement.js';
import { buildSketchModuleBoxVerticalBlockers } from './canvas_picking_sketch_module_box_blockers.js';
import { buildSketchModuleStackAwareMeasurementEntries } from './canvas_picking_sketch_neighbor_measurements.js';
import { createManualLayoutSketchStackHoverRecord } from './canvas_picking_manual_layout_sketch_hover_state.js';
import type {
  ResolveSketchModuleStackPreviewArgs,
  ResolveSketchModuleStackPreviewResult,
} from './canvas_picking_sketch_module_stack_preview_contracts.js';

export function resolveSketchModuleDrawersPreview(
  args: ResolveSketchModuleStackPreviewArgs
): ResolveSketchModuleStackPreviewResult {
  const {
    host,
    cfgRef,
    bottomY,
    topY,
    totalHeight,
    pad,
    desiredCenterY,
    innerW,
    internalCenterX,
    internalDepth,
    internalZ,
    drawers,
    extDrawers,
    woodThick,
  } = args;

  const readCenterY = createManualLayoutSketchNormalizedCenterReader({ bottomY, totalHeight });
  const verticalContentBlockers = buildManualLayoutVerticalContentBlockers({
    cfgRef,
    info: args.info,
    shelves: args.shelves,
    rods: args.rods,
    storageBarriers: args.storageBarriers,
    bottomY,
    topY,
    totalHeight,
    pad,
    woodThick,
  });
  const placementBlockers = [
    ...buildManualLayoutSketchExternalDrawerBlockers({
      extDrawers,
      bottomY,
      topY,
      pad,
      readCenterY,
    }),
    ...verticalContentBlockers,
    ...buildSketchModuleBoxVerticalBlockers({
      cfgRef,
      boxes: args.boxes,
      bottomY,
      topY,
      totalHeight,
      pad,
      woodThick,
    }),
  ];
  let placement = resolveManualLayoutSketchInternalDrawerPlacement({
    desiredCenterY,
    bottomY,
    topY,
    totalHeight,
    pad,
    drawerHeightM: args.drawerHeightM,
    drawers,
    readCenterY,
    woodThick,
    blockers: placementBlockers,
  });
  if (placement.op === 'blocked') {
    placement = resolveManualLayoutSketchInternalDrawerPlacement({
      desiredCenterY,
      bottomY,
      topY,
      totalHeight,
      pad,
      drawerHeightM: args.drawerHeightM,
      drawers,
      readCenterY,
      woodThick,
      blockers: withoutInternalDrawerReplaceableShelfBlockers(placementBlockers),
    });
  }
  const blockedReason =
    placement.op === 'blocked'
      ? 'collision'
      : placement.op !== 'remove' && !placement.fitsAvailable
        ? 'no-room'
        : null;
  let op: 'add' | 'remove' | 'blocked' = blockedReason ? 'blocked' : placement.op;
  let yCenter = placement.yCenter;
  let baseY = yCenter - placement.stackH / 2;
  let removeId = blockedReason ? null : placement.removeId;
  const removeKind: 'sketch' | '' =
    !blockedReason && placement.op === 'remove' && placement.removeId ? 'sketch' : '';

  const previewW = Math.max(
    DRAWER_DIMENSIONS.sketch.internalPreviewMinWidthM,
    innerW - DRAWER_DIMENSIONS.sketch.internalPreviewWidthClearanceM
  );
  const previewD = Math.max(
    DRAWER_DIMENSIONS.sketch.internalPreviewMinDepthM,
    internalDepth - DRAWER_DIMENSIONS.sketch.internalPreviewDepthClearanceM
  );
  const clearanceMeasurements = buildSketchModuleStackAwareMeasurementEntries({
    bottomY,
    topY,
    totalHeight,
    pad,
    woodThick,
    cfgRef,
    info: args.info,
    shelves: args.shelves,
    drawers,
    extDrawers,
    targetCenterX: internalCenterX,
    targetCenterY: yCenter,
    targetWidth: previewW,
    targetHeight: placement.stackH,
    z:
      internalZ +
      previewD / 2 +
      Math.max(
        DRAWER_DIMENSIONS.sketch.internalPreviewMeasurementZOffsetMinM,
        previewD * DRAWER_DIMENSIONS.sketch.internalPreviewMeasurementZOffsetDepthRatio
      ),
    styleKey: 'cell',
    textScale: SKETCH_BOX_DIMENSIONS.preview.measurementTextScale,
  });
  const hoverOp: 'add' | 'remove' = blockedReason || op === 'blocked' ? 'add' : op;
  const hoverRemoveId = blockedReason || op === 'blocked' ? null : removeId;

  return {
    hoverRecord: createManualLayoutSketchStackHoverRecord({
      host,
      kind: 'drawers',
      op: hoverOp,
      removeId: hoverRemoveId,
      removeKind,
      yCenter,
      baseY,
      drawerH: placement.drawerH,
      drawerGap: placement.drawerGap,
      drawerHeightM: args.drawerHeightM ?? placement.drawerH,
      stackH: placement.stackH,
      blockedReason,
    }),
    preview: {
      kind: 'drawers',
      x: internalCenterX,
      y: baseY,
      z: internalZ,
      w: previewW,
      d: previewD,
      drawerH: placement.drawerH,
      drawerGap: placement.drawerGap,
      woodThick,
      op,
      blockedReason: blockedReason ?? undefined,
      clearanceMeasurements,
    },
  };
}
