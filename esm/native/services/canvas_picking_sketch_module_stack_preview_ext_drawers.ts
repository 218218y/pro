import {
  buildManualLayoutSketchInternalDrawerBlockers,
  createManualLayoutSketchNormalizedCenterReader,
  resolveManualLayoutSketchExternalDrawerPlacement,
} from './canvas_picking_manual_layout_sketch_stack_placement.js';
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
  const placement = resolveManualLayoutSketchExternalDrawerPlacement({
    desiredCenterY,
    selectedDrawerCount: selectedDrawerCount != null && selectedDrawerCount > 0 ? selectedDrawerCount : 3,
    drawerHeightM: args.drawerHeightM,
    bottomY,
    topY,
    pad,
    gap: 0.008,
    extDrawers,
    readCenterY,
    blockers: buildManualLayoutSketchInternalDrawerBlockers({
      drawers,
      bottomY,
      topY,
      pad,
      readCenterY,
    }),
  });
  const visualT = 0.02;
  const faceEnvelope = selectorFrontEnvelope ?? readSelectorFrontEnvelope(hitSelectorObj);
  const outerW = Math.max(0.08, faceEnvelope?.outerW ?? innerW);
  const centerX = faceEnvelope?.centerX ?? internalCenterX;
  const frontPlaneZ =
    (faceEnvelope?.centerZ ?? internalZ + internalDepth / 2 + 0.025) +
    (faceEnvelope?.outerD ?? Math.max(0.1, internalDepth + 0.05)) / 2;
  const frontZ = frontPlaneZ + visualT / 2 + 0.001;
  const baseY = placement.yCenter - placement.stackH / 2;
  const previewW = Math.max(0.05, outerW - 0.004);
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
    z: frontZ + visualT / 2 + Math.max(0.004, visualT * 0.25),
    styleKey: 'cell',
    textScale: 0.82,
  });
  const drawersPreview: RecordMap[] = [];
  const drawerH = placement.drawerH;
  for (let i = 0; i < placement.drawerCount; i++) {
    drawersPreview.push({
      y: baseY + i * drawerH + drawerH / 2,
      h: Math.max(0.05, drawerH - 0.008),
    });
  }

  return {
    hoverRecord: createManualLayoutSketchStackHoverRecord({
      host,
      kind: 'ext_drawers',
      op: placement.op,
      removeId: placement.removeId,
      yCenter: placement.yCenter,
      baseY,
      drawerCount: placement.drawerCount,
      drawerHeightM: args.drawerHeightM ?? placement.drawerH,
      drawerH,
      stackH: placement.stackH,
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
      op: placement.op,
      clearanceMeasurements,
    },
  };
}
