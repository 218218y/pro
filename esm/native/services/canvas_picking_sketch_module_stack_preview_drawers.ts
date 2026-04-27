import {
  buildManualLayoutSketchExternalDrawerBlockers,
  createManualLayoutSketchNormalizedCenterReader,
  resolveManualLayoutSketchInternalDrawerPlacement,
} from './canvas_picking_manual_layout_sketch_stack_placement.js';
import { buildVerticalClearanceMeasurementEntries } from './canvas_picking_hover_clearance_measurements.js';
import { createManualLayoutSketchStackHoverRecord } from './canvas_picking_manual_layout_sketch_hover_state.js';
import type {
  ModuleKey,
  RecordMap,
  ResolveSketchModuleStackPreviewArgs,
  ResolveSketchModuleStackPreviewResult,
} from './canvas_picking_sketch_module_stack_preview_contracts.js';
import { readRecordValue } from './canvas_picking_sketch_module_stack_preview_records.js';

function resolveSketchStandardDrawerRemoval(args: {
  cfgRef: RecordMap | null;
  moduleKey: ModuleKey;
  isCornerKey: (moduleKey: ModuleKey) => boolean;
  bottomY: number;
  totalHeight: number;
  desiredCenterY: number;
  clampCenter: (yCenter: number) => number;
}): {
  removePid: string | null;
  removeSlot: number | null;
  yCenter: number | null;
} {
  const { cfgRef, moduleKey, isCornerKey, bottomY, totalHeight, desiredCenterY, clampCenter } = args;
  if (!cfgRef) return { removePid: null, removeSlot: null, yCenter: null };

  const isCornerMk = isCornerKey(moduleKey);
  let cornerIdx = 0;
  if (isCornerMk && typeof moduleKey === 'string' && moduleKey.startsWith('corner:')) {
    const n = Number(moduleKey.slice('corner:'.length));
    if (Number.isFinite(n) && n >= 0) cornerIdx = Math.floor(n);
  }

  const divsRaw = Number(readRecordValue(cfgRef, 'gridDivisions'));
  const divs = Number.isFinite(divsRaw) && divsRaw >= 2 && divsRaw <= 12 ? Math.floor(divsRaw) : 6;
  const localGridStep = divs > 0 ? totalHeight / divs : totalHeight / 6;
  const targetSingleDrawerH = (Math.min(0.35, localGridStep - 0.02) - 0.02) / 2;
  const hStd = Number.isFinite(targetSingleDrawerH) && targetSingleDrawerH > 0 ? targetSingleDrawerH : 0.11;
  const halfStd = hStd + 0.01;
  const tolStd = Math.max(0.045, Math.min(0.14, halfStd + 0.02));

  const slots: number[] = [];
  const lst = readRecordValue(cfgRef, 'intDrawersList');
  if (Array.isArray(lst)) {
    for (let i = 0; i < lst.length; i++) {
      const slot = Number(lst[i]);
      if (Number.isFinite(slot)) slots.push(Math.floor(slot));
    }
  }
  const singleSlot = Number(readRecordValue(cfgRef, 'intDrawersSlot'));
  if (Number.isFinite(singleSlot)) slots.push(Math.floor(singleSlot));

  let bestDy = Infinity;
  let bestSlot: number | null = null;
  let bestCenter: number | null = null;
  const seen = new Set<number>();
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (!Number.isFinite(slot) || slot < 1) continue;
    if (seen.has(slot)) continue;
    seen.add(slot);

    const baseGridY = bottomY + (slot - 1) * localGridStep;
    const centerAbs = clampCenter(baseGridY + hStd + 0.02);
    const dy = Math.abs(desiredCenterY - centerAbs);
    if (dy <= tolStd && dy < bestDy) {
      bestDy = dy;
      bestSlot = slot;
      bestCenter = centerAbs;
    }
  }

  if (bestSlot == null || bestCenter == null) return { removePid: null, removeSlot: null, yCenter: null };
  return {
    removePid: isCornerMk
      ? `div_int_corner_c${String(cornerIdx)}_slot_${String(bestSlot)}`
      : `div_int_${String(moduleKey)}_slot_${String(bestSlot)}`,
    removeSlot: bestSlot,
    yCenter: bestCenter,
  };
}

export function resolveSketchModuleDrawersPreview(
  args: ResolveSketchModuleStackPreviewArgs
): ResolveSketchModuleStackPreviewResult {
  const {
    host,
    moduleKey,
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
    isCornerKey,
  } = args;

  const readCenterY = createManualLayoutSketchNormalizedCenterReader({ bottomY, totalHeight });
  const placement = resolveManualLayoutSketchInternalDrawerPlacement({
    desiredCenterY,
    bottomY,
    topY,
    totalHeight,
    pad,
    drawerHeightM: args.drawerHeightM,
    drawers,
    readCenterY,
    blockers: buildManualLayoutSketchExternalDrawerBlockers({
      extDrawers,
      bottomY,
      topY,
      pad,
      readCenterY,
    }),
  });
  let op = placement.op;
  let yCenter = placement.yCenter;
  let baseY = yCenter - placement.stackH / 2;
  let removeId = placement.removeId;
  let removeKind: 'sketch' | 'std' | '' = placement.op === 'remove' && placement.removeId ? 'sketch' : '';
  let removePid: string | null = null;
  let removeSlot: number | null = null;

  if (op !== 'remove') {
    const stdRemoval = resolveSketchStandardDrawerRemoval({
      cfgRef,
      moduleKey,
      isCornerKey,
      bottomY,
      totalHeight,
      desiredCenterY: yCenter,
      clampCenter: centerY => {
        const lo = bottomY + pad + placement.stackH / 2;
        const hi = topY - pad - placement.stackH / 2;
        if (!(hi > lo)) return Math.max(bottomY + pad, Math.min(topY - pad, centerY));
        return Math.max(lo, Math.min(hi, centerY));
      },
    });
    if (stdRemoval.removeSlot != null && stdRemoval.yCenter != null) {
      op = 'remove';
      yCenter = stdRemoval.yCenter;
      baseY = yCenter - placement.stackH / 2;
      removeId = null;
      removeKind = 'std';
      removePid = stdRemoval.removePid;
      removeSlot = stdRemoval.removeSlot;
    }
  }
  const previewW = Math.max(0.05, innerW - 0.03);
  const previewD = Math.max(0.05, internalDepth - 0.02);
  const clearanceMeasurements = buildVerticalClearanceMeasurementEntries({
    containerMinY: bottomY,
    containerMaxY: topY,
    targetCenterX: internalCenterX,
    targetCenterY: yCenter,
    targetWidth: previewW,
    targetHeight: placement.stackH,
    z: internalZ + previewD / 2 + Math.max(0.004, previewD * 0.08),
    styleKey: 'cell',
    textScale: 0.82,
  });
  return {
    hoverRecord: createManualLayoutSketchStackHoverRecord({
      host,
      kind: 'drawers',
      op,
      removeId,
      removeKind,
      removePid,
      removeSlot,
      yCenter,
      baseY,
      drawerH: placement.drawerH,
      drawerGap: placement.drawerGap,
      drawerHeightM: args.drawerHeightM ?? placement.drawerH,
      stackH: placement.stackH,
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
      clearanceMeasurements,
    },
  };
}
