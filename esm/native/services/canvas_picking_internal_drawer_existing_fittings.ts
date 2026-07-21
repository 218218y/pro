import type { ModuleConfigLike } from '../../../types';
import {
  INTERIOR_STORAGE_BARRIER_POLICY,
  INTERIOR_STORAGE_GRID_POLICY,
} from '../../shared/dimensions/interior_storage_policy.js';
import {
  SKETCH_BOX_PREVIEW_CORE_POLICY,
  SKETCH_BOX_SHELF_PREVIEW_POLICY,
} from '../../shared/dimensions/sketch_box_preview_policy.js';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import {
  removeManualLayoutBaseRod,
  removeManualLayoutBaseShelf,
  removeManualLayoutBaseStorage,
  removeManualLayoutSketchExtraByIndex,
} from './canvas_picking_manual_layout_config_ops.js';
import {
  readManualLayoutSketchRodHoverIntent,
  readManualLayoutSketchShelfHoverIntent,
  readManualLayoutSketchStorageHoverIntent,
} from './canvas_picking_manual_layout_sketch_hover_intent.js';
import type { SketchBoxDividerState, SketchBoxSegmentState } from './canvas_picking_sketch_box_dividers.js';
import { resolveSketchModuleSurfacePreview } from './canvas_picking_sketch_module_surface_preview.js';
import type { RecordMap } from './canvas_picking_sketch_module_surface_preview_shared.js';

type ModuleKey = number | 'corner' | `corner:${number}` | null;

type ExistingFittingRemovalArgs = {
  moduleKey: ModuleKey;
  isBottom: boolean;
  intersects: RaycastHitLike[];
  info: RecordMap;
  cfgRef: RecordMap | null;
  yClamped: number;
  bottomY: number;
  topY: number;
  pad: number;
  woodThick: number;
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
};

export type InternalDrawerExistingFittingRemovalResult = {
  preview: RecordMap;
  hoverRecord: RecordMap;
};

function isRecord(value: unknown): value is RecordMap {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readRecordArray(record: unknown, key: string): RecordMap[] {
  if (!isRecord(record)) return [];
  const value = record[key];
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function readGridDivisions(info: RecordMap | null): number {
  const raw = info?.gridDivisions;
  const value = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(value) && value > 0
    ? Math.round(value)
    : INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault;
}

function readSketchExtras(cfgRef: RecordMap | null): RecordMap | null {
  if (!cfgRef || !isRecord(cfgRef.sketchExtras)) return null;
  return cfgRef.sketchExtras;
}

function isCornerKey(value: unknown): boolean {
  return value === 'corner' || (typeof value === 'string' && value.startsWith('corner:'));
}

function resolveDefaultBoxGeometry(args: {
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  woodThick: number;
  widthM?: number | null;
  depthM?: number | null;
  xNorm?: number | null;
}) {
  const outerW = Math.max(SKETCH_BOX_SHELF_PREVIEW_POLICY.shelfMinWidthM, args.widthM ?? args.innerW);
  const outerD = Math.max(SKETCH_BOX_PREVIEW_CORE_POLICY.minScaleM, args.depthM ?? args.internalDepth);
  const innerW = Math.max(SKETCH_BOX_PREVIEW_CORE_POLICY.minScaleM, outerW - args.woodThick * 2);
  const innerD = Math.max(SKETCH_BOX_PREVIEW_CORE_POLICY.minScaleM, outerD - args.woodThick * 2);
  const xNorm = typeof args.xNorm === 'number' && Number.isFinite(args.xNorm) ? args.xNorm : 0.5;
  const centerX = args.internalCenterX + (xNorm - 0.5) * Math.max(0, args.innerW - outerW);
  return {
    outerW,
    innerW,
    centerX,
    xNorm,
    centered: Math.abs(xNorm - 0.5) < 1e-6,
    outerD,
    innerD,
    centerZ: args.internalZ,
    innerCenterZ: args.internalZ,
    innerBackZ: args.internalZ - args.internalDepth / 2 + args.woodThick,
  };
}

function readSketchBoxDividers(): SketchBoxDividerState[] {
  return [];
}

function resolveSketchBoxSegments(): SketchBoxSegmentState[] {
  return [];
}

export function resolveInternalDrawerExistingFittingRemoval(
  args: ExistingFittingRemovalArgs
): InternalDrawerExistingFittingRemovalResult | null {
  const spanH = Math.max(0, args.topY - args.bottomY);
  if (!(spanH > 0)) return null;

  const sketchExtras = readSketchExtras(args.cfgRef);
  const result = resolveSketchModuleSurfacePreview({
    host: { tool: 'sketch_int_drawers', moduleKey: args.moduleKey, isBottom: args.isBottom },
    tool: 'sketch_int_drawers',
    hitModuleKey: args.moduleKey,
    intersects: args.intersects,
    info: args.info,
    cfgRef: args.cfgRef,
    hitLocalX: null,
    yClamped: args.yClamped,
    bottomY: args.bottomY,
    topY: args.topY,
    spanH,
    pad: args.pad,
    woodThick: args.woodThick,
    innerW: args.innerW,
    internalCenterX: args.internalCenterX,
    internalDepth: args.internalDepth,
    internalZ: args.internalZ,
    isBox: false,
    isStorage: false,
    isShelf: false,
    isRod: false,
    allowExistingShelfRemove: true,
    allowExistingRodRemove: true,
    allowExistingStorageRemove: true,
    variant: 'regular',
    shelfDepthOverrideM: null,
    boxH: 0,
    boxWidthOverrideM: null,
    boxDepthOverrideM: null,
    storageH: INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM,
    boxes: [],
    storageBarriers: readRecordArray(sketchExtras, 'storageBarriers'),
    shelves: readRecordArray(sketchExtras, 'shelves'),
    drawers: [],
    extDrawers: [],
    rods: readRecordArray(sketchExtras, 'rods'),
    isCornerKey,
    resolveSketchBoxGeometry: resolveDefaultBoxGeometry,
    readSketchBoxDividers,
    resolveSketchBoxSegments,
  });

  if (!result.handled || !result.preview || !result.hoverRecord) return null;
  return { preview: result.preview, hoverRecord: result.hoverRecord };
}

export function applyInternalDrawerExistingFittingRemoval(
  cfg: ModuleConfigLike,
  hoverRecord: RecordMap,
  info: RecordMap | null,
  bottomY: number,
  topY: number
): boolean {
  const divs = readGridDivisions(info);
  const storageHover = readManualLayoutSketchStorageHoverIntent(hoverRecord);
  if (storageHover && storageHover.op === 'remove') {
    if (storageHover.removeKind === 'sketch') {
      removeManualLayoutSketchExtraByIndex(cfg, 'storageBarriers', storageHover.removeIdx ?? NaN);
      return true;
    }
    if (storageHover.removeKind === 'base') {
      removeManualLayoutBaseStorage(cfg, { divs, topY, bottomY });
      return true;
    }
    return false;
  }

  const rodHover = readManualLayoutSketchRodHoverIntent(hoverRecord);
  if (rodHover && rodHover.op === 'remove') {
    if (rodHover.removeKind === 'sketch') {
      removeManualLayoutSketchExtraByIndex(cfg, 'rods', rodHover.removeIdx ?? NaN);
      return true;
    }
    if (rodHover.removeKind === 'base' && Number.isFinite(rodHover.rodIndex)) {
      removeManualLayoutBaseRod(cfg, { divs, rodIndex: Number(rodHover.rodIndex), topY, bottomY });
      return true;
    }
    return false;
  }

  const shelfHover = readManualLayoutSketchShelfHoverIntent(hoverRecord);
  if (shelfHover && shelfHover.op === 'remove') {
    if (shelfHover.removeKind === 'sketch') {
      removeManualLayoutSketchExtraByIndex(cfg, 'shelves', shelfHover.removeIdx ?? NaN);
      return true;
    }
    if (shelfHover.removeKind === 'base' && Number.isFinite(shelfHover.shelfIndex) && divs > 1) {
      removeManualLayoutBaseShelf(cfg, {
        divs,
        shelfIndex: Number(shelfHover.shelfIndex),
        topY,
        bottomY,
      });
      return true;
    }
  }

  return false;
}
