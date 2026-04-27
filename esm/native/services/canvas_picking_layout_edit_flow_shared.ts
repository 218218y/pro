import type { AppContainer, ModuleConfigLike, ModuleSavedDimsLike, UnknownRecord } from '../../../types';
import type { RaycastHitLike } from './canvas_picking_engine.js';

export type ModuleKey = number | 'corner' | `corner:${number}`;

export type LayoutConfigRecordLike = ModuleConfigLike & {
  customData?: unknown;
  braceShelves?: unknown;
  savedDims?: ModuleSavedDimsLike;
  gridDivisions?: unknown;
  isCustom?: unknown;
  layout?: unknown;
};

export type PatchConfigForKeyFn = (
  mk: ModuleKey | 'corner' | null,
  patchFn: (cfg: LayoutConfigRecordLike) => void,
  meta: UnknownRecord
) => unknown;

export type GridInfoLike = { effectiveTopY?: unknown; effectiveBottomY?: unknown; gridDivisions?: unknown };
export type SavedDimsLike = ModuleSavedDimsLike & { top?: unknown; bottom?: unknown };
export type SelectorUserDataLike = UnknownRecord & { __kind?: unknown; partId?: unknown };
export type LayoutConfigCustomDataLike = UnknownRecord & {
  shelves: boolean[];
  rods: boolean[];
  shelfVariants?: string[];
  storage: boolean;
  rodOps?: unknown[];
};

export type CanvasLayoutEditClickArgs = {
  App: AppContainer;
  foundModuleIndex: ModuleKey | 'corner' | null;
  __activeModuleKey: ModuleKey | 'corner' | null;
  __isBottomStack: boolean;
  __isLayoutEditMode: boolean;
  __isManualLayoutMode: boolean;
  __isBraceShelvesMode: boolean;
  moduleHitY: number | null;
  intersects: RaycastHitLike[];
  __patchConfigForKey: PatchConfigForKeyFn;
  __getActiveConfigRef: () => LayoutConfigRecordLike | null;
};

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

export function readRecordString(value: unknown, key: string): string | null {
  const record = asRecord(value);
  const raw = record ? record[key] : null;
  return typeof raw === 'string' && raw ? raw : null;
}

export function readRecordNumber(value: unknown, key: string): number | null {
  const record = asRecord(value);
  const raw = record ? record[key] : null;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

export function readSavedDims(value: unknown): SavedDimsLike | null {
  const record = asRecord(value);
  return record ? { ...record } : null;
}

export function readGridBounds(
  gridInfo: GridInfoLike | null,
  savedDims: unknown
): { topY: number; bottomY: number } | null {
  const topY =
    readRecordNumber(gridInfo, 'effectiveTopY') ?? readRecordNumber(readSavedDims(savedDims), 'top');
  const bottomY =
    readRecordNumber(gridInfo, 'effectiveBottomY') ?? readRecordNumber(readSavedDims(savedDims), 'bottom');
  return typeof topY === 'number' && typeof bottomY === 'number' ? { topY, bottomY } : null;
}

export function ensureCustomData(cfg: LayoutConfigRecordLike): LayoutConfigCustomDataLike {
  const existing = asRecord(cfg.customData);
  const next: LayoutConfigCustomDataLike = {
    ...(existing || {}),
    shelves: Array.isArray(existing?.shelves) ? existing.shelves.filter(v => typeof v === 'boolean') : [],
    rods: Array.isArray(existing?.rods) ? existing.rods.filter(v => typeof v === 'boolean') : [],
    storage: typeof existing?.storage === 'boolean' ? existing.storage : false,
  };
  if (!Array.isArray(next.shelfVariants)) next.shelfVariants = [];
  else next.shelfVariants = next.shelfVariants.filter(v => typeof v === 'string');
  cfg.customData = next;
  return next;
}

export function ensureBraceShelves(cfg: LayoutConfigRecordLike): unknown[] {
  const existing = Array.isArray(cfg.braceShelves) ? cfg.braceShelves : [];
  cfg.braceShelves = existing;
  return existing;
}

export function readGridInfo(gridMap: unknown, mapKey: ModuleKey | 'corner'): GridInfoLike | null {
  const gridRecord = asRecord(gridMap);
  const entry = gridRecord ? gridRecord[String(mapKey)] : null;
  const rec = asRecord(entry);
  return rec
    ? {
        effectiveTopY: rec.effectiveTopY,
        effectiveBottomY: rec.effectiveBottomY,
        gridDivisions: rec.gridDivisions,
      }
    : null;
}

export function readHitPointY(hit: RaycastHitLike | null | undefined): number | null {
  const y = hit?.point?.y;
  return typeof y === 'number' ? y : null;
}

export function readSelectorUserData(value: unknown): SelectorUserDataLike | null {
  const rec = asRecord(value);
  return rec
    ? {
        ...rec,
        __kind: rec.__kind,
        partId: rec.partId,
      }
    : null;
}
