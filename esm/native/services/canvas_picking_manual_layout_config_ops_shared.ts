import type { UnknownRecord } from '../../../types';
import { buildPresetBackedCustomData } from '../features/interior_layout_presets/api.js';
import {
  asRecord,
  ensureBraceShelves,
  ensureCustomData,
  readRecordString,
  type LayoutConfigCustomDataLike,
  type LayoutConfigRecordLike,
} from './canvas_picking_layout_edit_flow_shared.js';

type ManualLayoutConfigRecord = LayoutConfigRecordLike & UnknownRecord;
type ManualLayoutCustomData = LayoutConfigCustomDataLike & {
  shelfVariants: string[];
  rodOps: unknown[];
};

export type { ManualLayoutConfigRecord, ManualLayoutCustomData };

export type ManualLayoutShelfVariant = 'regular' | 'double' | 'glass' | 'brace';
export type ManualLayoutExtraListKey = 'rods' | 'shelves';

export type ManualLayoutGridMutationArgs = {
  divs: number;
  topY: number;
  bottomY: number;
};

export type ManualLayoutEditableGridArgs = ManualLayoutGridMutationArgs & {
  reset: boolean;
};

export type ToggleManualLayoutShelfArgs = ManualLayoutGridMutationArgs & {
  arrayIdx: number;
  shelfVariant: ManualLayoutShelfVariant;
};

export type ToggleManualLayoutRodArgs = ManualLayoutGridMutationArgs & {
  arrayIdx: number;
};

export type RemoveManualLayoutBaseShelfArgs = ManualLayoutGridMutationArgs & {
  shelfIndex: number;
};

export type RemoveManualLayoutBaseRodArgs = ManualLayoutGridMutationArgs & {
  rodIndex: number;
};

function readNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readRecordNumber(record: unknown, key: string): number | null {
  const rec = asRecord(record);
  return rec ? readNumber(rec[key]) : null;
}

function setManualLayoutFrame(
  cfg: ManualLayoutConfigRecord,
  divs: number,
  topY: number,
  bottomY: number
): void {
  cfg.isCustom = true;
  cfg.gridDivisions = divs;
  if (typeof topY === 'number' && typeof bottomY === 'number') {
    cfg.savedDims = { top: topY, bottom: bottomY };
  }
}

function seedPresetBackedManualLayout(cfg: ManualLayoutConfigRecord, divs: number): void {
  cfg.customData = buildPresetBackedCustomData(readRecordString(cfg, 'layout') || 'shelves', divs);
  if (!Array.isArray(cfg.braceShelves)) cfg.braceShelves = [];
}

function ensureManualLayoutCustomData(cfg: ManualLayoutConfigRecord): ManualLayoutCustomData {
  const customData = ensureCustomData(cfg);
  const manualData: ManualLayoutCustomData = {
    ...customData,
    shelfVariants: Array.isArray(customData.shelfVariants)
      ? customData.shelfVariants.filter((value): value is string => typeof value === 'string')
      : [],
    rodOps: Array.isArray(customData.rodOps) ? [...customData.rodOps] : [],
  };
  cfg.customData = manualData;
  return manualData;
}

export function prepareEditableManualLayoutGrid(
  cfg: ManualLayoutConfigRecord,
  args: ManualLayoutEditableGridArgs
): { customData: ManualLayoutCustomData; braceShelves: unknown[] } {
  setManualLayoutFrame(cfg, args.divs, args.topY, args.bottomY);
  const customData = ensureManualLayoutCustomData(cfg);
  const braceShelves = ensureBraceShelves(cfg);

  if (args.reset) {
    customData.shelves = [];
    customData.rods = [];
    customData.shelfVariants = [];
    customData.rodOps = [];
    braceShelves.length = 0;
  }

  return { customData, braceShelves };
}

export function preparePresetBackedManualLayoutGrid(
  cfg: ManualLayoutConfigRecord,
  args: ManualLayoutGridMutationArgs
): { customData: ManualLayoutCustomData; braceShelves: unknown[] } {
  const wasCustom = !!cfg.isCustom;
  setManualLayoutFrame(cfg, args.divs, args.topY, args.bottomY);
  if (!wasCustom) seedPresetBackedManualLayout(cfg, args.divs);
  return {
    customData: ensureManualLayoutCustomData(cfg),
    braceShelves: ensureBraceShelves(cfg),
  };
}

export function removeBraceShelfIndex(braceShelves: unknown[], shelfIndex: number): void {
  for (let i = braceShelves.length - 1; i >= 0; i -= 1) {
    if (Number(braceShelves[i]) === shelfIndex) braceShelves.splice(i, 1);
  }
}

export function addBraceShelfIndex(braceShelves: unknown[], shelfIndex: number): void {
  if (!braceShelves.some(value => Number(value) === shelfIndex)) braceShelves.push(shelfIndex);
}

function derivePresetRodGridIndex(rodOp: Record<string, unknown>, divs: number): number | null {
  const gridIndex = readRecordNumber(rodOp, 'gridIndex');
  if (gridIndex != null) {
    const rounded = Math.round(gridIndex);
    return Math.max(1, Math.min(divs, rounded));
  }
  const yFactor = readRecordNumber(rodOp, 'yFactor');
  if (yFactor == null) return null;
  const mapped = Math.round((yFactor * divs) / 6);
  return Math.max(1, Math.min(divs, mapped));
}

export function removeExactPresetRodOp(
  customData: ManualLayoutCustomData,
  rodIndex: number,
  divs: number
): void {
  const rodOps = Array.isArray(customData.rodOps) ? customData.rodOps : [];
  if (customData.rodOps !== rodOps) customData.rodOps = rodOps;
  for (let i = rodOps.length - 1; i >= 0; i -= 1) {
    const rodOp = asRecord(rodOps[i]);
    if (!rodOp) continue;
    if (derivePresetRodGridIndex(rodOp, divs) === rodIndex) rodOps.splice(i, 1);
  }
}

function isUnknownRecordArray(value: unknown): value is UnknownRecord[] {
  return (
    Array.isArray(value) &&
    value.every(entry => !!entry && typeof entry === 'object' && !Array.isArray(entry))
  );
}

export function ensureSketchExtrasList(
  cfg: ManualLayoutConfigRecord,
  key: ManualLayoutExtraListKey
): UnknownRecord[] {
  const extra = asRecord(cfg.sketchExtras);
  const sketchExtras: UnknownRecord = extra || {};
  if (!extra) cfg.sketchExtras = sketchExtras;
  const current = sketchExtras[key];
  if (isUnknownRecordArray(current)) return current;
  const next = Array.isArray(current)
    ? current.filter(
        (entry): entry is UnknownRecord => !!entry && typeof entry === 'object' && !Array.isArray(entry)
      )
    : [];
  sketchExtras[key] = next;
  return next;
}

export function normalizeManualLayoutShelfVariant(value: unknown): ManualLayoutShelfVariant {
  return value === 'double' || value === 'glass' || value === 'brace' ? value : 'regular';
}
