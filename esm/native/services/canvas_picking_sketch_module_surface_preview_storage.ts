import {
  INTERIOR_STORAGE_BARRIER_POLICY,
  INTERIOR_STORAGE_PREVIEW_POLICY,
} from '../../shared/dimensions/interior_storage_policy.js';
import { clampSketchModuleStorageCenterY } from './canvas_picking_sketch_module_vertical_content.js';
import {
  filterSketchModuleContentItemsForCell,
  resolveSketchModulePartitionCell,
} from './canvas_picking_sketch_module_partition.js';
import {
  createStorageRemoveHoverRecord,
  isRecord,
  readRecordNumber,
  readRecordValue,
  type ResolveSketchModuleSurfacePreviewArgs,
  type SketchModuleSurfacePreviewResult,
} from './canvas_picking_sketch_module_surface_preview_shared.js';

type StorageRemoveMatch = {
  removeKind: 'sketch' | 'base';
  removeIdx: number | null;
  yAbs: number;
  heightM: number;
  dy: number;
};

function distanceFromVerticalSpan(pointerY: number, centerY: number, heightM: number): number {
  const half = Math.max(0.0001, heightM / 2);
  const lo = centerY - half;
  const hi = centerY + half;
  if (pointerY < lo) return lo - pointerY;
  if (pointerY > hi) return pointerY - hi;
  return 0;
}

function readLayoutName(cfgRef: ResolveSketchModuleSurfacePreviewArgs['cfgRef']): string {
  const raw = readRecordValue(cfgRef, 'layout');
  return typeof raw === 'string' && raw ? raw : '';
}

function hasBaseStorageBarrier(cfgRef: ResolveSketchModuleSurfacePreviewArgs['cfgRef']): boolean {
  if (!cfgRef || typeof cfgRef !== 'object') return false;
  if (readRecordValue(cfgRef, 'isCustom') === true) {
    const customData = readRecordValue(cfgRef, 'customData');
    return isRecord(customData) && readRecordValue(customData, 'storage') === true;
  }
  const layout = readLayoutName(cfgRef);
  return layout === 'storage' || layout === 'storage_shelf';
}

function resolveSketchStorageRemoveMatch(args: {
  storageBarriers: ResolveSketchModuleSurfacePreviewArgs['storageBarriers'];
  cfgRef: ResolveSketchModuleSurfacePreviewArgs['cfgRef'];
  bottomY: number;
  spanH: number;
  pointerY: number;
  sketchExtras: ResolveSketchModuleSurfacePreviewArgs['sketchExtras'];
  innerW: number;
  internalCenterX: number;
  topY: number;
  woodThick: number;
  hitLocalX: number | null;
}): StorageRemoveMatch | null {
  const defaultHeight = INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM;
  let best: StorageRemoveMatch | null = null;

  const consider = (match: StorageRemoveMatch) => {
    if (!Number.isFinite(match.yAbs) || !(match.heightM > 0)) return;
    if (best && match.dy >= best.dy) return;
    best = match;
  };

  const geometry = {
    innerW: args.innerW,
    internalCenterX: args.internalCenterX,
    bottomY: args.bottomY,
    topY: args.topY,
    woodThick: args.woodThick,
  };
  const pointerX =
    typeof args.hitLocalX === 'number' && Number.isFinite(args.hitLocalX)
      ? args.hitLocalX
      : args.internalCenterX;
  const targetCell = resolveSketchModulePartitionCell({
    sketchExtras: args.sketchExtras,
    geometry,
    pointerX,
    pointerY: args.pointerY,
  });
  const candidates = filterSketchModuleContentItemsForCell({
    sketchExtras: args.sketchExtras,
    geometry,
    items: args.storageBarriers,
    cell: targetCell,
  });
  for (const candidate of candidates) {
    const barrier = candidate.item;
    if (!isRecord(barrier)) continue;
    const yNorm = readRecordNumber(barrier, 'yNorm');
    if (yNorm == null) continue;
    const yAbs = args.bottomY + Math.max(0, Math.min(1, yNorm)) * args.spanH;
    const rawHeight = readRecordNumber(barrier, 'heightM');
    const heightM = rawHeight != null && rawHeight > 0 ? rawHeight : defaultHeight;
    consider({
      removeKind: 'sketch',
      removeIdx: candidate.index,
      yAbs,
      heightM,
      dy: distanceFromVerticalSpan(args.pointerY, yAbs, heightM),
    });
  }

  if (hasBaseStorageBarrier(args.cfgRef)) {
    const heightM = defaultHeight;
    const yAbs = args.bottomY + heightM / 2;
    consider({
      removeKind: 'base',
      removeIdx: null,
      yAbs,
      heightM,
      dy: distanceFromVerticalSpan(args.pointerY, yAbs, heightM),
    });
  }

  return best;
}

export function resolveSketchModuleStorageRemovePreview(args: {
  source: ResolveSketchModuleSurfacePreviewArgs;
  removeEpsBox: number;
  bottomY: number;
  topY: number;
  pad: number;
  spanH: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  innerW: number;
  woodThick: number;
  yClamped: number;
  storageBarriers: ResolveSketchModuleSurfacePreviewArgs['storageBarriers'];
}): SketchModuleSurfacePreviewResult | null {
  const storageMatch = resolveSketchStorageRemoveMatch({
    storageBarriers: args.storageBarriers,
    cfgRef: args.source.cfgRef,
    bottomY: args.bottomY,
    spanH: args.spanH,
    pointerY: args.yClamped,
    sketchExtras: args.source.sketchExtras,
    innerW: args.innerW,
    internalCenterX: args.internalCenterX,
    topY: args.topY,
    woodThick: args.woodThick,
    hitLocalX: args.source.hitLocalX,
  });
  if (!storageMatch || storageMatch.dy > args.removeEpsBox) return null;

  const geometry = {
    innerW: args.innerW,
    internalCenterX: args.internalCenterX,
    bottomY: args.bottomY,
    topY: args.topY,
    woodThick: args.woodThick,
  };
  const pointerX =
    typeof args.source.hitLocalX === 'number' && Number.isFinite(args.source.hitLocalX)
      ? args.source.hitLocalX
      : args.internalCenterX;
  const targetCell = resolveSketchModulePartitionCell({
    sketchExtras: args.source.sketchExtras,
    geometry,
    pointerX,
    pointerY: storageMatch.yAbs,
  });
  const previewY = clampSketchModuleStorageCenterY({
    bottomY: targetCell?.bottomY ?? args.bottomY,
    topY: targetCell?.topY ?? args.topY,
    pad: args.pad,
    heightM: storageMatch.heightM,
    pointerY: storageMatch.yAbs,
  });
  const previewCenterX = targetCell?.centerX ?? args.internalCenterX;
  const previewInnerW = targetCell?.width ?? args.innerW;
  const depth0 = Number.isFinite(args.internalDepth) ? args.internalDepth : 0;
  const zFront = args.internalZ + depth0 / 2;
  return {
    handled: true,
    hoverRecord: createStorageRemoveHoverRecord({
      host: args.source.host,
      removeKind: storageMatch.removeKind,
      removeIdx: storageMatch.removeIdx,
    }),
    preview: {
      kind: 'storage',
      x: previewCenterX,
      y: previewY,
      z: zFront + INTERIOR_STORAGE_BARRIER_POLICY.barrierFrontZOffsetM,
      w: Math.max(
        INTERIOR_STORAGE_BARRIER_POLICY.barrierWidthMinM,
        previewInnerW - INTERIOR_STORAGE_BARRIER_POLICY.barrierWidthClearanceM
      ),
      h: storageMatch.heightM,
      d: Math.max(INTERIOR_STORAGE_PREVIEW_POLICY.previewThicknessMinM, args.woodThick),
      woodThick: args.woodThick,
      op: 'remove',
    },
  };
}
