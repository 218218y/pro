import { DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY } from '../../shared/dimensions/drawer_sketch_policy.js';
import { SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY } from '../../shared/dimensions/sketch_box_preview_policy.js';
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
import {
  doesSketchModuleContentItemBelongToCell,
  resolveSketchModulePartitionCell,
  resolveSketchModulePartitionScopeOrder,
  resolveSketchModulePointerNorm,
} from './canvas_picking_sketch_module_partition.js';
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

  const sketchExtras = cfgRef?.sketchExtras ?? {};
  const geometry = { innerW, internalCenterX, bottomY, topY, woodThick };
  const pointerX =
    typeof args.hitLocalX === 'number' && Number.isFinite(args.hitLocalX) ? args.hitLocalX : internalCenterX;
  const pointerNorm = resolveSketchModulePointerNorm({ geometry, pointerX, pointerY: desiredCenterY });
  const partitionCell = resolveSketchModulePartitionCell({
    sketchExtras,
    geometry,
    pointerX,
    pointerY: desiredCenterY,
  });
  const scopeOrder = resolveSketchModulePartitionScopeOrder(sketchExtras);
  const targetBottomY = partitionCell?.bottomY ?? bottomY;
  const targetTopY = partitionCell?.topY ?? topY;
  const targetInnerW = partitionCell?.width ?? innerW;
  const targetCenterX = partitionCell?.centerX ?? internalCenterX;
  const belongsToTarget = (item: Record<string, unknown>): boolean =>
    !partitionCell ||
    doesSketchModuleContentItemBelongToCell({
      sketchExtras,
      geometry,
      item,
      cell: partitionCell,
    });
  const targetDrawers = drawers.filter(belongsToTarget);
  const targetExtDrawers = extDrawers.filter(belongsToTarget);
  const targetShelves = (args.shelves ?? []).filter(belongsToTarget);
  const targetRods = (args.rods ?? []).filter(belongsToTarget);
  const targetStorage = (args.storageBarriers ?? []).filter(belongsToTarget);

  const readCenterY = createManualLayoutSketchNormalizedCenterReader({ bottomY, totalHeight });
  const verticalContentBlockers = buildManualLayoutVerticalContentBlockers({
    cfgRef,
    info: args.info,
    shelves: targetShelves,
    rods: targetRods,
    storageBarriers: targetStorage,
    bottomY,
    topY,
    totalHeight,
    pad,
    woodThick,
  });
  const placementBlockers = [
    ...buildManualLayoutSketchExternalDrawerBlockers({
      extDrawers: targetExtDrawers,
      bottomY: targetBottomY,
      topY: targetTopY,
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
    bottomY: targetBottomY,
    topY: targetTopY,
    totalHeight,
    pad,
    drawerHeightM: args.drawerHeightM,
    drawers: targetDrawers,
    readCenterY,
    woodThick,
    blockers: placementBlockers,
  });
  if (placement.op === 'blocked') {
    placement = resolveManualLayoutSketchInternalDrawerPlacement({
      desiredCenterY,
      bottomY: targetBottomY,
      topY: targetTopY,
      totalHeight,
      pad,
      drawerHeightM: args.drawerHeightM,
      drawers: targetDrawers,
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
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewMinWidthM,
    targetInnerW - DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewWidthClearanceM
  );
  const previewD = Math.max(
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewMinDepthM,
    internalDepth - DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewDepthClearanceM
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
    targetCenterX,
    targetCenterY: yCenter,
    targetWidth: previewW,
    targetHeight: placement.stackH,
    z:
      internalZ +
      previewD / 2 +
      Math.max(
        DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewMeasurementZOffsetMinM,
        previewD * DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalPreviewMeasurementZOffsetDepthRatio
      ),
    styleKey: 'cell',
    textScale: SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY.measurementTextScale,
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
      ...(partitionCell ? { xNorm: pointerNorm.xNorm, scopeOrder } : {}),
      blockedReason,
    }),
    preview: {
      kind: 'drawers',
      x: targetCenterX,
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
