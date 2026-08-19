import {
  CORNER_CONNECTOR_DOOR_RENDER_POLICY,
  CORNER_CONNECTOR_HANDLE_POLICY,
  CORNER_WING_DRAWER_POLICY,
} from '../../shared/dimensions/corner_system_policy.js';
import type { HexCellGeometry } from '../features/hex_cell/index.js';
// Corner wing: shared geometry + plan helpers
//
// Extracted from the original monolithic `corner_wing.ts` to keep the main builder
// module readable and to enable further refactors (Tier B).

type ValueRecord = Record<string, unknown>;
export type UnknownRecord = ValueRecord;

export type BufferAttrLike = {
  count: number;
  getX(i: number): number;
  getY(i: number): number;
  getZ(i: number): number;
  setZ(i: number, v: number): void;
  needsUpdate: boolean;
};

export const EDGE_HANDLE_VARIANT_GLOBAL_KEY = '__wp_edge_handle_variant_global';
export const EDGE_HANDLE_VARIANT_PART_PREFIX = '__wp_edge_handle_variant:';

type CornerHandleCfgLike = ValueRecord & {
  globalHandleType?: string;
  handlesMap?: ValueRecord | null;
};

type CornerCellInputLike = ValueRecord & {
  extDrawersCount?: number | null;
  extDrawers?: number | 'shoe' | null;
  extDrawersType?: string | null;
  hasShoeDrawer?: boolean;
  shoeDrawer?: boolean;
};

function readCornerHandleCfg(cfg: ValueRecord | null | undefined): CornerHandleCfgLike | null {
  if (!cfg || typeof cfg !== 'object') return null;
  const { globalHandleType: _rawGlobalHandleType, handlesMap: _rawHandlesMap, ...rest } = cfg;
  const handlesMap = isRecord(cfg.handlesMap) ? cfg.handlesMap : null;
  return {
    ...rest,
    ...(typeof cfg.globalHandleType === 'string' ? { globalHandleType: String(cfg.globalHandleType) } : {}),
    handlesMap,
  };
}

function readCornerCellInput(cellCfg: ValueRecord | null | undefined): CornerCellInputLike | null {
  if (!cellCfg || typeof cellCfg !== 'object') return null;
  const {
    extDrawersCount: _rawExtDrawersCount,
    extDrawers: _rawExtDrawers,
    extDrawersType: _rawExtDrawersType,
    hasShoeDrawer: _rawHasShoeDrawer,
    shoeDrawer: _rawShoeDrawer,
    ...rest
  } = cellCfg;
  return {
    ...rest,
    ...(typeof cellCfg.extDrawersCount === 'number' ? { extDrawersCount: cellCfg.extDrawersCount } : {}),
    ...(typeof cellCfg.extDrawers === 'number' || cellCfg.extDrawers === 'shoe'
      ? { extDrawers: cellCfg.extDrawers }
      : {}),
    ...(typeof cellCfg.extDrawersType === 'string' ? { extDrawersType: cellCfg.extDrawersType } : {}),
    hasShoeDrawer: cellCfg.hasShoeDrawer === true,
    shoeDrawer: cellCfg.shoeDrawer === true,
  };
}

function readExternalDrawerCount(cellCfg: ValueRecord | null | undefined): number {
  const cell = readCornerCellInput(cellCfg);
  if (!cell) return 0;
  const raw =
    typeof cell.extDrawersCount === 'number'
      ? cell.extDrawersCount
      : typeof cell.extDrawers === 'number'
        ? cell.extDrawers
        : 0;
  return Number.isFinite(raw) ? raw : 0;
}

function hasShoeDrawer(cellCfg: ValueRecord | null | undefined): boolean {
  const cell = readCornerCellInput(cellCfg);
  if (!cell) return false;
  return (
    cell.hasShoeDrawer === true ||
    cell.extDrawers === 'shoe' ||
    cell.extDrawersType === 'shoe' ||
    cell.shoeDrawer === true
  );
}

export function __isLongEdgeHandleVariantForPart(
  cfg: ValueRecord | null | undefined,
  partId: string | number | null | undefined
): boolean {
  const handleCfg = readCornerHandleCfg(cfg);
  if (!handleCfg || handleCfg.globalHandleType !== 'edge') return false;
  const hm = handleCfg.handlesMap;
  if (!hm) return false;

  const sid = partId == null ? '' : String(partId);
  const base = sid.replace(/_(full|top|mid|bot)$/i, '');
  const partKey = `${EDGE_HANDLE_VARIANT_PART_PREFIX}${sid}`;
  const baseKey = `${EDGE_HANDLE_VARIANT_PART_PREFIX}${base}`;

  const partV = hm[partKey] ?? (base !== sid ? hm[baseKey] : undefined);
  if (partV === 'long') return true;
  if (partV === 'short') return false;
  return hm[EDGE_HANDLE_VARIANT_GLOBAL_KEY] === 'long';
}

export function __topSplitHandleInsetForPart(cfg: ValueRecord | null | undefined, partId: string): number {
  return __isLongEdgeHandleVariantForPart(cfg, partId)
    ? CORNER_CONNECTOR_HANDLE_POLICY.edgeHandleLongInsetM
    : CORNER_CONNECTOR_HANDLE_POLICY.edgeHandleShortInsetM;
}

export function __edgeHandleLongLiftAbsYForCell(
  cfg: ValueRecord | null | undefined,
  cellCfg: ValueRecord | null | undefined
): number {
  const handleCfg = readCornerHandleCfg(cfg);
  if (!handleCfg || handleCfg.globalHandleType !== 'edge') return 0;
  const count = readExternalDrawerCount(cellCfg);
  return count >= CORNER_CONNECTOR_HANDLE_POLICY.edgeHandleLiftDrawerCountThreshold
    ? CORNER_CONNECTOR_HANDLE_POLICY.edgeHandleLongLiftM
    : 0;
}

export function __edgeHandleLongLiftAbsYForCornerCells(
  cfg: ValueRecord | null | undefined,
  cornerCellCfgs: unknown
): number {
  const handleCfg = readCornerHandleCfg(cfg);
  if (!handleCfg || handleCfg.globalHandleType !== 'edge') return 0;
  const list = Array.isArray(cornerCellCfgs) ? cornerCellCfgs : [];
  let maxLift = 0;
  for (let i = 0; i < list.length; i++) {
    const cellCfg = isRecord(list[i]) ? list[i] : null;
    const lift = __edgeHandleLongLiftAbsYForCell(cfg, cellCfg);
    if (lift > maxLift) maxLift = lift;
    if (maxLift >= CORNER_CONNECTOR_HANDLE_POLICY.edgeHandleLongLiftM) break;
  }
  return maxLift;
}

export function __edgeHandleAlignedBaseAbsYForCornerCells(
  cfg: ValueRecord | null | undefined,
  cornerCellCfgs: unknown,
  startY: number,
  woodThick: number
): number {
  const handleCfg = readCornerHandleCfg(cfg);
  if (!handleCfg || handleCfg.globalHandleType !== 'edge')
    return CORNER_CONNECTOR_HANDLE_POLICY.edgeHandleDefaultAbsY;

  const list = Array.isArray(cornerCellCfgs) ? cornerCellCfgs : [];
  let maxDrawerH = 0;

  for (let i = 0; i < list.length; i++) {
    const c = isRecord(list[i]) ? list[i] : null;
    if (!c) continue;

    let h = 0;
    if (hasShoeDrawer(c)) h += CORNER_WING_DRAWER_POLICY.shoeHeightM;

    const count = readExternalDrawerCount(c);
    if (count > 0) h += count * CORNER_WING_DRAWER_POLICY.externalRegularHeightM;

    if (h > maxDrawerH) maxDrawerH = h;
  }

  const maxDoorBottom =
    startY +
    woodThick +
    maxDrawerH +
    (maxDrawerH > 0 ? CORNER_CONNECTOR_DOOR_RENDER_POLICY.doorBottomOffsetM : 0);
  if (maxDoorBottom > CORNER_CONNECTOR_HANDLE_POLICY.edgeHandleLiftDoorBottomThresholdM) {
    return maxDoorBottom + CORNER_CONNECTOR_HANDLE_POLICY.edgeHandleLiftExtraM;
  }
  return CORNER_CONNECTOR_HANDLE_POLICY.edgeHandleDefaultAbsY;
}

export function __clampHandleAbsYForPart(
  cfg: ValueRecord | null | undefined,
  partId: string,
  absY: number,
  segBottomY: number,
  segTopY: number
): number {
  const pad = __isLongEdgeHandleVariantForPart(cfg, partId)
    ? CORNER_CONNECTOR_HANDLE_POLICY.edgeHandleLongInsetM
    : CORNER_CONNECTOR_HANDLE_POLICY.edgeHandleShortInsetM;
  let y = absY;
  const minY = segBottomY + pad;
  const maxY = segTopY - pad;
  if (y < minY) y = minY;
  if (y > maxY) y = maxY;
  return y;
}

export type CornerCellCustomData = {
  shelves: unknown[];
  rods: unknown[];
  storage: boolean;
  shelfVariants?: unknown[];
  [k: string]: unknown;
};

export type CornerCellCfg = ValueRecord & {
  // Normalized module configuration for a logical corner cell.
  layout: string;
  extDrawersCount: number;
  hasShoeDrawer: boolean;
  isCustom: boolean;
  gridDivisions: number;
  customData: CornerCellCustomData;

  // Optional extras used by corner wing interiors.
  braceShelves?: unknown[];
};

export type CornerCell = {
  idx: number;
  key: string;
  doorStart: number;
  doorsInCell: number;

  width: number;
  startX: number;
  centerX: number;

  bodyHeight: number;
  depth: number;

  __hasActiveHeight: boolean;
  __hasActiveDepth: boolean;
  __hasActiveSpecialDims: boolean;
  __hexCellGeometry?: HexCellGeometry | null;

  cfg: CornerCellCfg;

  drawerHeightTotal: number;
  effectiveBottomY: number;
  effectiveTopY: number;
  gridDivisions: number;
  localGridStep: number;
};

export function isRecord(v: unknown): v is ValueRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

export function asRecord(v: unknown): ValueRecord {
  return isRecord(v) ? v : {};
}

export function readFiniteNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function readNumFrom(obj: unknown, key: string, defaultValue: number): number {
  const v = asRecord(obj)[key];
  const n = readFiniteNumber(v);
  return n != null ? n : defaultValue;
}

export function readStrFrom(obj: unknown, key: string, defaultValue = ''): string {
  const v = asRecord(obj)[key];
  return typeof v === 'string' ? v : defaultValue;
}

type CloneMaybeFn = {
  <T extends { clone?: () => T }>(v: T): T;
  <T>(v: T): T;
};

export const cloneMaybe: CloneMaybeFn = <T>(v: T): T => {
  if (!isRecord(v)) return v;
  const fn = v.clone;
  if (typeof fn === 'function') return Reflect.apply(fn, v, []);
  return v;
};
