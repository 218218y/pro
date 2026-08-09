import {
  DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY,
  DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY,
  DRAWER_SKETCH_SIZING_POLICY,
  EXTERNAL_DRAWER_FRONT_RENDER_POLICY,
} from '../../shared/dimensions/drawer_sketch_policy.js';
import { SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY } from '../../shared/dimensions/sketch_box_preview_policy.js';
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
  const placementBase = resolveManualLayoutSketchExternalDrawerPlacement({
    desiredCenterY,
    selectedDrawerCount:
      selectedDrawerCount != null && selectedDrawerCount > 0
        ? selectedDrawerCount
        : DRAWER_SKETCH_SIZING_POLICY.externalPreviewDefaultCount,
    drawerType: args.externalDrawerType,
    drawerHeightM: args.drawerHeightM,
    bottomY,
    topY,
    pad,
    gap: DRAWER_SKETCH_COLLISION_ALIGNMENT_POLICY.verticalStackCollisionGapM,
    extDrawers,
    readCenterY,
    blockers: internalDrawerBlockers,
  });
  const standardShoeExists = args.externalDrawerType === 'shoe' && args.cfgRef?.hasShoeDrawer === true;
  const standardShoePreview = standardShoeExists ? (args.standardShoePreview ?? null) : null;
  const placement = standardShoeExists
    ? {
        ...placementBase,
        op: 'remove' as const,
        removeId: null,
        yCenter:
          standardShoePreview != null
            ? standardShoePreview.y + standardShoePreview.stackH / 2
            : bottomY + placementBase.drawerH / 2,
        drawerCount: 1,
        drawerH: standardShoePreview?.drawerH ?? placementBase.drawerH,
        stackH: standardShoePreview?.stackH ?? placementBase.drawerH,
        fitsAvailable: true,
      }
    : placementBase;
  const blockedReason =
    placement.op === 'blocked'
      ? 'collision'
      : placement.op !== 'remove' && !placement.fitsAvailable
        ? 'no-room'
        : null;
  const visualT = EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualThicknessM;
  const faceEnvelope = selectorFrontEnvelope ?? readSelectorFrontEnvelope(hitSelectorObj);
  const outerW = Math.max(
    DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewMinWidthM,
    faceEnvelope?.outerW ?? innerW
  );
  const defaultCenterX = faceEnvelope?.centerX ?? internalCenterX;
  const frontPlaneZ =
    (faceEnvelope?.centerZ ??
      internalZ + internalDepth / 2 + DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewCenterZInsetM) +
    (faceEnvelope?.outerD ??
      Math.max(
        DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewMinDepthM,
        internalDepth + DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewDepthClearanceM
      )) /
      2;
  const defaultFrontZ =
    frontPlaneZ + visualT / 2 + DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewFrontZOffsetM;
  const defaultPreviewW = Math.max(
    DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinWidthM,
    outerW - EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualWidthClearanceM
  );
  const centerX = standardShoePreview?.x ?? defaultCenterX;
  const frontZ = standardShoePreview?.z ?? defaultFrontZ;
  const previewW = standardShoePreview?.w ?? defaultPreviewW;
  const previewD = standardShoePreview?.d ?? visualT;
  const baseY = standardShoePreview?.y ?? placement.yCenter - placement.stackH / 2;
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
      previewD / 2 +
      Math.max(
        DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewMeasurementZOffsetMinM,
        previewD * DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewMeasurementZOffsetThicknessRatio
      ),
    styleKey: 'cell',
    textScale: SKETCH_BOX_MEASUREMENT_PREVIEW_POLICY.measurementTextScale,
  });
  const drawerH = placement.drawerH;
  const hoverOp: 'add' | 'remove' = blockedReason || placement.op === 'blocked' ? 'add' : placement.op;
  const hoverRemoveId = blockedReason || placement.op === 'blocked' ? null : placement.removeId;
  const hoverRemovePid = hoverOp === 'remove' && standardShoePreview ? standardShoePreview.partId : null;
  const drawersPreview: RecordMap[] = standardShoePreview
    ? standardShoePreview.drawers.map(drawer => ({ ...drawer }))
    : [];
  if (!standardShoePreview) {
    for (let i = 0; i < placement.drawerCount; i++) {
      drawersPreview.push({
        y: baseY + i * drawerH + drawerH / 2,
        h: Math.max(
          DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY.externalPreviewVisualMinHeightM,
          drawerH - EXTERNAL_DRAWER_FRONT_RENDER_POLICY.visualHeightClearanceM
        ),
      });
    }
  }

  return {
    hoverRecord: createManualLayoutSketchStackHoverRecord({
      host,
      kind: 'ext_drawers',
      op: hoverOp,
      removeId: hoverRemoveId,
      removeKind: hoverRemovePid ? 'std' : undefined,
      removePid: hoverRemovePid,
      yCenter: placement.yCenter,
      baseY,
      drawerCount: placement.drawerCount,
      drawerHeightM: standardShoePreview?.drawerH ?? args.drawerHeightM ?? placement.drawerH,
      drawerH,
      stackH: placement.stackH,
      blockedReason,
    }),
    preview: {
      kind: 'ext_drawers',
      ...(standardShoePreview
        ? { anchor: standardShoePreview.anchor, anchorParent: standardShoePreview.anchorParent }
        : {}),
      x: centerX,
      y: baseY,
      z: frontZ,
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
