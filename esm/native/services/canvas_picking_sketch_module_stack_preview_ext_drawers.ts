import { DRAWER_DIMENSIONS, SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  buildManualLayoutSketchInternalDrawerBlockers,
  buildManualLayoutStandardInternalDrawerBlockers,
  createManualLayoutSketchNormalizedCenterReader,
  resolveManualLayoutSketchExternalDrawerPlacement,
} from './canvas_picking_manual_layout_sketch_stack_placement.js';
import { buildManualLayoutVerticalContentBlockers } from './canvas_picking_manual_layout_vertical_blockers.js';
import { buildSketchModuleBoxVerticalBlockers } from './canvas_picking_sketch_module_box_blockers.js';
import { buildSketchModuleStackAwareMeasurementEntries } from './canvas_picking_sketch_neighbor_measurements.js';
import { createManualLayoutSketchStackHoverRecord } from './canvas_picking_manual_layout_sketch_hover_state.js';
import type {
  RecordMap,
  ResolveSketchModuleStackPreviewArgs,
  ResolveSketchModuleStackPreviewResult,
  SelectorFrontEnvelope,
} from './canvas_picking_sketch_module_stack_preview_contracts.js';
import {
  asRecord,
  readRecordNumber,
  readRecordValue,
} from './canvas_picking_sketch_module_stack_preview_records.js';

function readSelectorFrontEnvelope(hitSelectorObj: unknown): SelectorFrontEnvelope | null {
  const obj = asRecord(hitSelectorObj);
  const geo = asRecord(readRecordValue(obj, 'geometry'));
  const params = asRecord(readRecordValue(geo, 'parameters'));
  const pos = asRecord(readRecordValue(obj, 'position'));
  const centerX = readRecordNumber(pos, 'x');
  const centerZ = readRecordNumber(pos, 'z');
  const outerW = readRecordNumber(params, 'width');
  const outerD = readRecordNumber(params, 'depth');
  if (
    centerX == null ||
    centerZ == null ||
    outerW == null ||
    !(outerW > 0) ||
    outerD == null ||
    !(outerD > 0)
  ) {
    return null;
  }
  return { centerX, centerZ, outerW, outerD };
}

export function resolveSketchModuleExternalDrawersPreview(
  args: ResolveSketchModuleStackPreviewArgs
): ResolveSketchModuleStackPreviewResult {
  const {
    host,
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
    selectedDrawerCount,
    woodThick,
    selectorFrontEnvelope,
    hitSelectorObj,
  } = args;

  const readCenterY = createManualLayoutSketchNormalizedCenterReader({ bottomY, totalHeight });
  const internalDrawerBlockers = [
    ...buildManualLayoutSketchInternalDrawerBlockers({
      drawers,
      bottomY,
      topY,
      pad,
      woodThick,
      readCenterY,
    }),
    ...buildManualLayoutStandardInternalDrawerBlockers({
      cfgRef: args.cfgRef,
      bottomY,
      topY,
      totalHeight,
      gridDivisions: args.info?.gridDivisions ?? args.cfgRef?.gridDivisions,
      moduleIndex: args.moduleKey,
    }),
    ...buildManualLayoutVerticalContentBlockers({
      cfgRef: args.cfgRef,
      info: args.info,
      shelves: args.shelves,
      rods: args.rods,
      storageBarriers: args.storageBarriers,
      bottomY,
      topY,
      totalHeight,
      pad,
      woodThick,
    }),
    ...buildSketchModuleBoxVerticalBlockers({
      cfgRef: args.cfgRef,
      boxes: args.boxes,
      bottomY,
      topY,
      totalHeight,
      pad,
      woodThick,
    }),
  ];
  const placement = resolveManualLayoutSketchExternalDrawerPlacement({
    desiredCenterY,
    selectedDrawerCount:
      selectedDrawerCount != null && selectedDrawerCount > 0
        ? selectedDrawerCount
        : DRAWER_DIMENSIONS.sketch.externalPreviewDefaultCount,
    drawerHeightM: args.drawerHeightM,
    bottomY,
    topY,
    pad,
    gap: DRAWER_DIMENSIONS.sketch.verticalStackCollisionGapM,
    extDrawers,
    readCenterY,
    blockers: internalDrawerBlockers,
  });
  const blockedReason =
    placement.op === 'blocked'
      ? 'collision'
      : placement.op !== 'remove' && !placement.fitsAvailable
        ? 'no-room'
        : null;
  const visualT = DRAWER_DIMENSIONS.external.visualThicknessM;
  const faceEnvelope = selectorFrontEnvelope ?? readSelectorFrontEnvelope(hitSelectorObj);
  const outerW = Math.max(DRAWER_DIMENSIONS.sketch.externalPreviewMinWidthM, faceEnvelope?.outerW ?? innerW);
  const centerX = faceEnvelope?.centerX ?? internalCenterX;
  const frontPlaneZ =
    (faceEnvelope?.centerZ ??
      internalZ + internalDepth / 2 + DRAWER_DIMENSIONS.sketch.externalPreviewCenterZInsetM) +
    (faceEnvelope?.outerD ??
      Math.max(
        DRAWER_DIMENSIONS.sketch.externalPreviewMinDepthM,
        internalDepth + DRAWER_DIMENSIONS.sketch.externalPreviewDepthClearanceM
      )) /
      2;
  const frontZ = frontPlaneZ + visualT / 2 + DRAWER_DIMENSIONS.sketch.externalPreviewFrontZOffsetM;
  const baseY = placement.yCenter - placement.stackH / 2;
  const previewW = Math.max(
    DRAWER_DIMENSIONS.sketch.externalPreviewVisualMinWidthM,
    outerW - DRAWER_DIMENSIONS.external.visualWidthClearanceM
  );
  const clearanceMeasurements = buildSketchModuleStackAwareMeasurementEntries({
    bottomY,
    topY,
    totalHeight,
    pad,
    woodThick,
    cfgRef: args.cfgRef,
    info: args.info,
    shelves: args.shelves,
    drawers,
    extDrawers,
    targetCenterX: centerX,
    targetCenterY: placement.yCenter,
    targetWidth: previewW,
    targetHeight: placement.stackH,
    z:
      frontZ +
      visualT / 2 +
      Math.max(
        DRAWER_DIMENSIONS.sketch.externalPreviewMeasurementZOffsetMinM,
        visualT * DRAWER_DIMENSIONS.sketch.externalPreviewMeasurementZOffsetThicknessRatio
      ),
    styleKey: 'cell',
    textScale: SKETCH_BOX_DIMENSIONS.preview.measurementTextScale,
  });
  const drawersPreview: RecordMap[] = [];
  const drawerH = placement.drawerH;
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
    hoverRecord: createManualLayoutSketchStackHoverRecord({
      host,
      kind: 'ext_drawers',
      op: hoverOp,
      removeId: hoverRemoveId,
      yCenter: placement.yCenter,
      baseY,
      drawerCount: placement.drawerCount,
      drawerHeightM: args.drawerHeightM ?? placement.drawerH,
      drawerH,
      stackH: placement.stackH,
      blockedReason,
    }),
    preview: {
      kind: 'ext_drawers',
      x: centerX,
      y: baseY,
      z: frontZ,
      w: previewW,
      d: visualT,
      woodThick,
      drawers: drawersPreview,
      op: blockedReason ? 'blocked' : placement.op,
      blockedReason: blockedReason ?? undefined,
      clearanceMeasurements,
    },
  };
}
