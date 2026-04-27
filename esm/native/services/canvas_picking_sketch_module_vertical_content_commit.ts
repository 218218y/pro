import {
  ensureRecord,
  ensureRecordList,
  type RecordMap,
} from './canvas_picking_sketch_module_vertical_content_records.js';
import {
  clampSketchModuleStorageCenterY,
  findNearestSketchModuleRod,
  findNearestSketchModuleShelf,
  findNearestSketchModuleStorageBarrier,
} from './canvas_picking_sketch_module_vertical_content_match.js';

export function commitSketchModuleShelf(args: {
  cfg: RecordMap;
  bottomY: number;
  totalHeight: number;
  pointerY: number;
  yNorm: number;
  variant: string;
  shelfDepthM?: number | null;
  removeEps: number;
}): void {
  const { cfg, bottomY, totalHeight, pointerY, yNorm, variant, shelfDepthM, removeEps } = args;
  const extra = ensureRecord(cfg, 'sketchExtras');
  const shelves = ensureRecordList(extra, 'shelves');
  const match = findNearestSketchModuleShelf({
    shelves,
    bottomY,
    totalHeight,
    pointerY,
  });
  if (match && match.dy <= removeEps) {
    shelves.splice(match.index, 1);
    return;
  }
  const next: RecordMap = { yNorm, variant: variant || 'double' };
  if (shelfDepthM != null && Number.isFinite(shelfDepthM) && shelfDepthM > 0) next.depthM = shelfDepthM;
  shelves.push(next);
}

export function commitSketchModuleRod(args: {
  cfg: RecordMap;
  bottomY: number;
  totalHeight: number;
  pointerY: number;
  yNorm: number;
  removeEps: number;
}): void {
  const { cfg, bottomY, totalHeight, pointerY, yNorm, removeEps } = args;
  const extra = ensureRecord(cfg, 'sketchExtras');
  const rods = ensureRecordList(extra, 'rods');
  const match = findNearestSketchModuleRod({
    rods,
    bottomY,
    totalHeight,
    pointerY,
  });
  if (match && match.dy <= removeEps) {
    rods.splice(match.index, 1);
    return;
  }
  rods.push({ yNorm });
}

export function commitSketchModuleStorageBarrier(args: {
  cfg: RecordMap;
  bottomY: number;
  topY: number;
  totalHeight: number;
  pad: number;
  pointerY: number;
  heightM: number;
  removeEps: number;
  idFactory: () => string;
}): void {
  const { cfg, bottomY, topY, totalHeight, pad, pointerY, heightM, removeEps, idFactory } = args;
  const extra = ensureRecord(cfg, 'sketchExtras');
  const barriers = ensureRecordList(extra, 'storageBarriers');
  const yCenterAbs = clampSketchModuleStorageCenterY({
    bottomY,
    topY,
    pad,
    heightM,
    pointerY,
  });
  const match = findNearestSketchModuleStorageBarrier({
    storageBarriers: barriers,
    bottomY,
    totalHeight,
    pointerY: yCenterAbs,
  });
  if (match && match.dy <= removeEps) {
    barriers.splice(match.index, 1);
    return;
  }
  const yNorm = Math.max(0, Math.min(1, (yCenterAbs - bottomY) / totalHeight));
  barriers.push({ id: idFactory(), yNorm, heightM });
}
