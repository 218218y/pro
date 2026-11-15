import {
  ensureRecord,
  ensureRecordList,
  type RecordMap,
} from './canvas_picking_sketch_module_vertical_content_records.js';
import {
  writeSketchCommitClampedUnitNumber,
  writeSketchCommitPositiveNumber,
} from './canvas_picking_sketch_commit_geometry.js';
import {
  clampSketchModuleStorageCenterY,
  findNearestSketchModuleRod,
  findNearestSketchModuleShelf,
  findNearestSketchModuleStorageBarrier,
} from './canvas_picking_sketch_module_vertical_content_match.js';

function updateSketchShelfVariant(shelf: RecordMap, variant: string, depthM?: number | null): void {
  shelf.variant = variant || 'double';
  if (typeof depthM === 'number' && Number.isFinite(depthM) && depthM > 0) shelf.depthM = depthM;
  else delete shelf.depthM;
}

export function convertSketchModuleShelfAtIndex(
  cfg: RecordMap,
  index: number,
  variant: string,
  depthM?: number | null
): boolean {
  const extra = cfg.sketchExtras;
  if (!extra || typeof extra !== 'object' || Array.isArray(extra)) return false;
  const shelves = (extra as RecordMap).shelves;
  if (!Array.isArray(shelves) || !Number.isInteger(index) || index < 0 || index >= shelves.length)
    return false;
  const shelf = shelves[index];
  if (!shelf || typeof shelf !== 'object' || Array.isArray(shelf)) return false;
  if ((shelf.variant || 'double') === (variant || 'double')) return false;
  updateSketchShelfVariant(shelf as RecordMap, variant, depthM);
  return true;
}

export function commitSketchModuleShelf(args: {
  cfg: RecordMap;
  bottomY: number;
  totalHeight: number;
  pointerY: number;
  yNorm: number;
  xNorm?: number | null;
  scopeOrder?: number | null;
  variant: string;
  shelfDepthM?: number | null;
  removeEps: number;
}): void {
  const { cfg, bottomY, totalHeight, pointerY, yNorm, xNorm, scopeOrder, variant, shelfDepthM, removeEps } =
    args;
  const extra = ensureRecord(cfg, 'sketchExtras');
  const shelves = ensureRecordList(extra, 'shelves');
  const match = findNearestSketchModuleShelf({
    shelves,
    bottomY,
    totalHeight,
    pointerY,
  });
  if (match && match.dy <= removeEps) {
    if ((match.variant || 'double') === (variant || 'double')) shelves.splice(match.index, 1);
    else {
      const matchedShelf = shelves[match.index];
      if (matchedShelf) updateSketchShelfVariant(matchedShelf, variant, shelfDepthM);
    }
    return;
  }
  const next: RecordMap = { variant: variant || 'double' };
  writeSketchCommitClampedUnitNumber(next, 'yNorm', yNorm, 0.5);
  if (typeof xNorm === 'number' && Number.isFinite(xNorm))
    writeSketchCommitClampedUnitNumber(next, 'xNorm', xNorm, 0.5);
  if (typeof scopeOrder === 'number' && Number.isFinite(scopeOrder) && scopeOrder >= 0)
    next.scopeOrder = scopeOrder;
  writeSketchCommitPositiveNumber(next, 'depthM', shelfDepthM);
  shelves.push(next);
}

export function commitSketchModuleRod(args: {
  cfg: RecordMap;
  bottomY: number;
  totalHeight: number;
  pointerY: number;
  yNorm: number;
  xNorm?: number | null;
  scopeOrder?: number | null;
  removeEps: number;
}): void {
  const { cfg, bottomY, totalHeight, pointerY, yNorm, xNorm, scopeOrder, removeEps } = args;
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
  const next: RecordMap = {};
  writeSketchCommitClampedUnitNumber(next, 'yNorm', yNorm, 0.5);
  if (typeof xNorm === 'number' && Number.isFinite(xNorm))
    writeSketchCommitClampedUnitNumber(next, 'xNorm', xNorm, 0.5);
  if (typeof scopeOrder === 'number' && Number.isFinite(scopeOrder) && scopeOrder >= 0)
    next.scopeOrder = scopeOrder;
  rods.push(next);
}

export function commitSketchModuleStorageBarrier(args: {
  cfg: RecordMap;
  bottomY: number;
  topY: number;
  totalHeight: number;
  pad: number;
  pointerY: number;
  xNorm?: number | null;
  scopeOrder?: number | null;
  heightM: number;
  removeEps: number;
  idFactory: () => string;
}): void {
  const { cfg, bottomY, topY, totalHeight, pad, pointerY, xNorm, scopeOrder, heightM, removeEps, idFactory } =
    args;
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
  const next: RecordMap = { id: idFactory() };
  writeSketchCommitClampedUnitNumber(next, 'yNorm', yNorm, 0.5);
  if (typeof xNorm === 'number' && Number.isFinite(xNorm))
    writeSketchCommitClampedUnitNumber(next, 'xNorm', xNorm, 0.5);
  if (typeof scopeOrder === 'number' && Number.isFinite(scopeOrder) && scopeOrder >= 0)
    next.scopeOrder = scopeOrder;
  writeSketchCommitPositiveNumber(next, 'heightM', heightM);
  barriers.push(next);
}
