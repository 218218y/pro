import type { ModuleConfigLike, UnknownRecord } from '../../../../types/index.js';

import { getActiveDepthCmFromConfig, getSpecialDims } from '../special_dims/index.js';

export type HexCellConfig = {
  enabled?: boolean;
  protrusionCm?: number;
  doorWidthCm?: number;
  [key: string]: unknown;
};

export type HexCellResolvedDraft = {
  enabled: true;
  protrusionCm: number;
  doorWidthCm: number | null;
};

export type HexCellGeometry = {
  enabled: true;
  moduleWidthM: number;
  doorWidthM: number;
  doorDepthM: number;
  sideDepthM: number;
  protrusionM: number;
  diagonalDepthM: number;
};

export const HEX_CELL_CONFIG_KEY = 'hexCell';
export const HEX_CELL_DEFAULT_PROTRUSION_CM = 10;
export const HEX_CELL_DEFAULT_DOOR_WIDTH_RATIO = 0.75;
export const HEX_CELL_MIN_DOOR_WIDTH_CM = 20;
export const HEX_CELL_MIN_DIAGONAL_DEPTH_CM = 2;

const CM_PER_METER = 100;
const EPS = 1e-6;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function toFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function positiveCmOrNull(value: unknown): number | null {
  const n = toFiniteNumber(value);
  return n != null && n > 0 ? n : null;
}

function nonNegativeCmOrNull(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = toFiniteNumber(value);
  return n != null && n >= 0 ? n : null;
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.max(min, Math.min(max, value));
}

function readConfigBag(cfgMod: unknown): HexCellConfig | null {
  const mod = isRecord(cfgMod) ? cfgMod : null;
  const raw = mod ? mod[HEX_CELL_CONFIG_KEY] : null;
  return isRecord(raw) ? ({ ...raw } as HexCellConfig) : null;
}

export function isHexCellDiagonalPanelPartId(value: unknown): boolean {
  const partId = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
  if (!partId) return false;
  if (/^(?:lower_)?hex_cell_\d+_diag_(?:left|right)$/.test(partId)) return true;
  if (/^(?:lower_)?corner_hex_cell_c\d+_diag_(?:left|right)$/.test(partId)) return true;
  return false;
}

export function readHexCellConfig(cfgMod: unknown): HexCellConfig | null {
  const hex = readConfigBag(cfgMod);
  if (!hex) return null;
  if (hex.enabled === false) return null;
  return hex;
}

export function moduleHasHexCell(cfgMod: unknown): boolean {
  return !!readHexCellConfig(cfgMod);
}

export function resolveDefaultHexDoorWidthCm(moduleWidthCm: unknown): number {
  const width = positiveCmOrNull(moduleWidthCm) || 0;
  if (width <= 0) return HEX_CELL_MIN_DOOR_WIDTH_CM;
  const max = Math.max(HEX_CELL_MIN_DOOR_WIDTH_CM, width - HEX_CELL_MIN_DOOR_WIDTH_CM / 2);
  return Math.round(clamp(width * HEX_CELL_DEFAULT_DOOR_WIDTH_RATIO, HEX_CELL_MIN_DOOR_WIDTH_CM, max));
}

export function resolveHexCellDraftConfig(args: {
  protrusionCm?: unknown;
  doorWidthCm?: unknown;
  moduleWidthCm?: unknown;
}): HexCellResolvedDraft {
  const moduleWidthCm = positiveCmOrNull(args.moduleWidthCm) || 0;
  const protrusionCm = nonNegativeCmOrNull(args.protrusionCm) ?? HEX_CELL_DEFAULT_PROTRUSION_CM;
  const rawDoorWidth = positiveCmOrNull(args.doorWidthCm);
  const doorWidthCm = rawDoorWidth != null ? rawDoorWidth : resolveDefaultHexDoorWidthCm(moduleWidthCm);
  return {
    enabled: true,
    protrusionCm: Math.max(0, protrusionCm),
    doorWidthCm,
  };
}

function resolveHexCellConfigProtrusionCm(hex: HexCellConfig | null): number {
  return nonNegativeCmOrNull(hex?.protrusionCm) ?? HEX_CELL_DEFAULT_PROTRUSION_CM;
}

function resolveHexCellConfigDoorWidthCm(hex: HexCellConfig | null, moduleWidthCm: number): number {
  return positiveCmOrNull(hex?.doorWidthCm) ?? resolveDefaultHexDoorWidthCm(moduleWidthCm);
}

export function resolveHexCellUpdateConfig(args: {
  cfgMod?: unknown;
  protrusionCm?: unknown;
  doorWidthCm?: unknown;
  moduleWidthCm?: unknown;
}): HexCellResolvedDraft {
  const moduleWidthCm = positiveCmOrNull(args.moduleWidthCm) || 0;
  const current = readHexCellConfig(args.cfgMod);
  const requestedProtrusion = nonNegativeCmOrNull(args.protrusionCm);
  const requestedDoorWidth = positiveCmOrNull(args.doorWidthCm);

  return {
    enabled: true,
    protrusionCm:
      requestedProtrusion != null ? requestedProtrusion : resolveHexCellConfigProtrusionCm(current),
    doorWidthCm:
      requestedDoorWidth != null
        ? requestedDoorWidth
        : resolveHexCellConfigDoorWidthCm(current, moduleWidthCm),
  };
}

export function hasHexCellDraftConfigChange(args: {
  cfgMod: unknown;
  protrusionCm?: unknown;
  doorWidthCm?: unknown;
  moduleWidthCm?: unknown;
  toleranceCm?: number;
}): boolean {
  const current = readHexCellConfig(args.cfgMod);
  if (!current) return true;

  const toleranceCm = Math.max(0, toFiniteNumber(args.toleranceCm) ?? 1e-6);
  const moduleWidthCm = positiveCmOrNull(args.moduleWidthCm) || 0;
  const requestedProtrusion = nonNegativeCmOrNull(args.protrusionCm);
  if (requestedProtrusion != null) {
    const currentProtrusion = resolveHexCellConfigProtrusionCm(current);
    if (Math.abs(currentProtrusion - requestedProtrusion) > toleranceCm) return true;
  }

  const requestedDoorWidth = positiveCmOrNull(args.doorWidthCm);
  if (requestedDoorWidth != null) {
    const currentDoorWidth = resolveHexCellConfigDoorWidthCm(current, moduleWidthCm);
    if (Math.abs(currentDoorWidth - requestedDoorWidth) > toleranceCm) return true;
  }

  return false;
}

export function assignHexCellToConfig(
  cfgMod: ModuleConfigLike | UnknownRecord,
  config: HexCellResolvedDraft
): void {
  cfgMod[HEX_CELL_CONFIG_KEY] = {
    enabled: true,
    protrusionCm: config.protrusionCm,
    doorWidthCm: config.doorWidthCm,
  };
}

export function clearHexCellFromConfig(cfgMod: ModuleConfigLike | UnknownRecord): void {
  delete cfgMod[HEX_CELL_CONFIG_KEY];
}

export function stripHexCellFromConfig(cfgMod: unknown): UnknownRecord {
  const out: UnknownRecord = { ...(isRecord(cfgMod) ? cfgMod : {}) };
  clearHexCellFromConfig(out);
  return out;
}

export function resolveHexCellGeometry(args: {
  cfgMod: unknown;
  moduleWidthM: number;
  defaultDepthM: number;
  woodThickM: number;
}): HexCellGeometry | null {
  const hex = readHexCellConfig(args.cfgMod);
  if (!hex) return null;

  const moduleWidthM = toFiniteNumber(args.moduleWidthM) || 0;
  const defaultDepthM = toFiniteNumber(args.defaultDepthM) || 0;
  const woodThickM = Math.max(0.001, toFiniteNumber(args.woodThickM) || 0.018);
  if (moduleWidthM <= woodThickM * 2 || defaultDepthM <= woodThickM * 2) return null;

  const protrusionM = Math.max(0, resolveHexCellConfigProtrusionCm(hex)) / CM_PER_METER;
  const moduleWidthCm = moduleWidthM * CM_PER_METER;
  const doorWidthCm = resolveHexCellConfigDoorWidthCm(hex, moduleWidthCm);
  const maxDoorWidthM = Math.max(woodThickM, moduleWidthM - woodThickM * 2);
  const doorWidthM = clamp(doorWidthCm / CM_PER_METER, woodThickM, maxDoorWidthM);

  const activeDepthCm = getActiveDepthCmFromConfig(args.cfgMod);
  const specialDims = getSpecialDims(args.cfgMod);
  const baseDepthCm = positiveCmOrNull(specialDims?.baseDepthCm);
  const baseDepthM = baseDepthCm != null ? baseDepthCm / CM_PER_METER : defaultDepthM;
  const doorDepthM = Math.max(
    woodThickM * 2,
    activeDepthCm != null ? activeDepthCm / CM_PER_METER : defaultDepthM
  );
  const minDiagonalDepthM = HEX_CELL_MIN_DIAGONAL_DEPTH_CM / CM_PER_METER;

  const preferredSideDepthM = baseDepthM + protrusionM;
  let sideDepthM: number;
  if (activeDepthCm != null && doorDepthM > preferredSideDepthM + EPS) {
    sideDepthM = preferredSideDepthM;
  } else {
    sideDepthM = doorDepthM - Math.max(minDiagonalDepthM, protrusionM);
  }

  sideDepthM = clamp(sideDepthM, woodThickM, Math.max(woodThickM, doorDepthM - minDiagonalDepthM));

  return {
    enabled: true,
    moduleWidthM,
    doorWidthM,
    doorDepthM,
    sideDepthM,
    protrusionM,
    diagonalDepthM: Math.max(0, doorDepthM - sideDepthM),
  };
}
