import type { UnknownRecord } from '../../../types';
import type { ModuleKey } from './canvas_picking_layout_edit_flow_shared.js';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import {
  createSketchModuleShelfPreviewGeometry,
  findNearestSketchModuleShelf,
} from './canvas_picking_sketch_module_vertical_content.js';

export type BraceSketchShelfMatch = {
  index: number;
  shelf: UnknownRecord;
  yAbs: number;
  yNorm: number;
  depthM: number | null;
  isBrace: boolean;
};

export type BraceSketchShelfHoverRecord = UnknownRecord & {
  kind: 'brace_shelf';
  op: 'add' | 'remove';
  removeIdx: number;
};

function asRecord(value: unknown): UnknownRecord | null {
  return !!value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function stripLowerStackPrefix(partId: string): string {
  return partId.startsWith('lower_') ? partId.slice('lower_'.length) : partId;
}

function isStandaloneSketchShelfPartId(partId: unknown): boolean {
  const pid = stripLowerStackPrefix(readString(partId));
  return pid.startsWith('sketch_shelf_') && !pid.includes('_external_drawers_');
}

function readSketchShelfBoardHit(
  intersects: readonly RaycastHitLike[] | null | undefined
): { y: number | null; index: number | null } | null {
  const hits = Array.isArray(intersects) ? intersects : [];
  for (let i = 0; i < hits.length; i += 1) {
    const hit = hits[i];
    const ud = asRecord(asRecord(hit?.object)?.userData);
    if (!ud) continue;
    if (ud.__kind === 'shelf_pin' || ud.__kind === 'brace_seam') continue;
    if (!isStandaloneSketchShelfPartId(ud.partId)) continue;
    return {
      y: readNumber(hit?.point?.y),
      index: readNumber(ud.__wpShelfIndex),
    };
  }
  return null;
}

function readSketchExtraShelves(cfgRef: unknown): unknown[] {
  const extra = asRecord(asRecord(cfgRef)?.sketchExtras);
  return Array.isArray(extra?.shelves) ? extra.shelves : [];
}

function readShelfYNorm(shelf: UnknownRecord): number | null {
  const n = readNumber(shelf.yNorm);
  return n != null && Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : null;
}

function readShelfDepthM(shelf: UnknownRecord): number | null {
  const depth = readNumber(shelf.depthM);
  return depth != null && depth > 0 ? depth : null;
}

function createMatchFromIndex(args: {
  shelves: unknown[];
  index: number;
  bottomY: number;
  totalHeight: number;
  pointerY: number | null;
  toleranceM: number;
}): BraceSketchShelfMatch | null {
  const idx = Math.round(args.index) - 1;
  if (idx < 0 || idx >= args.shelves.length) return null;
  const shelf = asRecord(args.shelves[idx]);
  if (!shelf) return null;
  const yNorm = readShelfYNorm(shelf);
  if (yNorm == null) return null;
  const yAbs = args.bottomY + yNorm * args.totalHeight;
  if (
    args.pointerY != null &&
    Math.abs(args.pointerY - yAbs) > Math.max(args.toleranceM * 2, args.toleranceM)
  ) {
    return null;
  }
  return {
    index: idx,
    shelf,
    yAbs,
    yNorm,
    depthM: readShelfDepthM(shelf),
    isBrace: shelf.variant === 'brace',
  };
}

export function resolveBraceSketchShelfMatch(args: {
  cfgRef: unknown;
  intersects: readonly RaycastHitLike[] | null | undefined;
  selectorHitY: number | null;
  bottomY: number;
  topY: number;
  toleranceM: number;
}): BraceSketchShelfMatch | null {
  const shelves = readSketchExtraShelves(args.cfgRef);
  if (!shelves.length) return null;
  const totalHeight = args.topY - args.bottomY;
  if (!Number.isFinite(totalHeight) || totalHeight <= 0) return null;

  const boardHit = readSketchShelfBoardHit(args.intersects);
  const tolerance = Number.isFinite(args.toleranceM) && args.toleranceM >= 0 ? args.toleranceM : 0;
  if (boardHit?.index != null) {
    const byIndex = createMatchFromIndex({
      shelves,
      index: boardHit.index,
      bottomY: args.bottomY,
      totalHeight,
      pointerY: boardHit.y,
      toleranceM: tolerance,
    });
    if (byIndex) return byIndex;
  }

  const pointerY = boardHit?.y ?? args.selectorHitY;
  if (pointerY == null || !Number.isFinite(pointerY)) return null;
  const match = findNearestSketchModuleShelf({
    shelves,
    bottomY: args.bottomY,
    totalHeight,
    pointerY,
  });
  if (!match || match.dy > tolerance) return null;
  const shelf = asRecord(shelves[match.index]);
  if (!shelf) return null;
  const yNorm = readShelfYNorm(shelf);
  if (yNorm == null) return null;
  return {
    index: match.index,
    shelf,
    yAbs: match.yAbs,
    yNorm,
    depthM: match.depthM,
    isBrace: shelf.variant === 'brace',
  };
}

export function createBraceSketchShelfHoverRecord(args: {
  moduleKey: ModuleKey | 'corner' | null;
  isBottom: boolean;
  match: BraceSketchShelfMatch;
}): BraceSketchShelfHoverRecord {
  const op: 'add' | 'remove' = args.match.isBrace ? 'remove' : 'add';
  return {
    ts: Date.now(),
    tool: 'brace_shelves',
    moduleKey: args.moduleKey,
    isBottom: !!args.isBottom,
    hostModuleKey: args.moduleKey,
    hostIsBottom: !!args.isBottom,
    kind: 'brace_shelf',
    op,
    removeIdx: args.match.index,
    yNorm: args.match.yNorm,
  };
}

export function createBraceSketchShelfPreview(args: {
  match: BraceSketchShelfMatch;
  internalCenterX: number;
  innerW: number;
  internalDepth: number;
  backZ: number;
  woodThick: number;
  regularDepth: number;
}): UnknownRecord {
  const shelfPreview = createSketchModuleShelfPreviewGeometry({
    innerW: args.innerW,
    internalDepth: args.internalDepth,
    backZ: args.backZ,
    woodThick: args.woodThick,
    regularDepth: args.regularDepth,
    variant: 'brace',
    shelfDepthOverrideM: args.match.depthM,
  });
  return {
    kind: 'shelf',
    variant: 'brace',
    x: args.internalCenterX,
    y: args.match.yAbs,
    z: shelfPreview.z,
    w: shelfPreview.w,
    h: shelfPreview.h,
    d: shelfPreview.d,
    woodThick: args.woodThick,
    op: args.match.isBrace ? 'remove' : 'add',
  };
}

export function isFreshBraceSketchShelfHover(args: {
  hover: unknown;
  moduleKey: ModuleKey | 'corner' | null;
  isBottom: boolean;
  now: number;
  maxAgeMs?: number;
}): boolean {
  const rec = asRecord(args.hover);
  if (!rec) return false;
  if (rec.tool !== 'brace_shelves') return false;
  if (rec.kind !== 'brace_shelf') return false;
  if (String(rec.moduleKey ?? '') !== String(args.moduleKey ?? '')) return false;
  if (!!rec.isBottom !== !!args.isBottom) return false;
  const ts = readNumber(rec.ts);
  if (ts == null) return false;
  if (args.now - ts > (args.maxAgeMs ?? 1200)) return false;
  const idx = readNumber(rec.removeIdx);
  return idx != null && idx >= 0;
}

export function toggleBraceSketchShelfAtIndex(cfg: unknown, index: number): boolean {
  const cfgRec = asRecord(cfg);
  if (!cfgRec) return false;
  const extra = asRecord(cfgRec.sketchExtras);
  const shelves = Array.isArray(extra?.shelves) ? extra.shelves : null;
  const idx = Math.round(index);
  if (!shelves || idx < 0 || idx >= shelves.length) return false;
  const shelf = asRecord(shelves[idx]);
  if (!shelf) return false;
  shelf.variant = shelf.variant === 'brace' ? 'regular' : 'brace';
  return true;
}
