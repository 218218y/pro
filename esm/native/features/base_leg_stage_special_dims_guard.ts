import type { UnknownRecord } from '../../../types/index.js';

import { normalizeBaseLegPlatformMode } from './base_leg_support.js';
import { getActiveDepthCmFromConfig, getActiveHeightCmFromConfig } from './special_dims/index.js';

export const BASE_LEG_STAGE_SPECIAL_DIMS_APPLY_BLOCKED_MESSAGE =
  'אי אפשר לעשות תא עם שינוי גובה או עומק כאשר הארון מוגדר עם רגליים ובמה. אפשר לבחור רגליים בלי במה או בסיס אחר.';

export const BASE_LEG_STAGE_SPECIAL_DIMS_SELECT_BLOCKED_MESSAGE =
  'אי אפשר לבחור רגליים עם במה כאשר קיימים תאים עם שינוי גובה או עומק. בטל את שינוי הגובה/עומק, או בחר רגליים בלי במה / בסיס אחר.';

const EPS_CM = 1e-6;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function readList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readPositiveNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : value != null ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function isBaseLegStageUiState(ui: unknown): boolean {
  const rec = readRecord(ui);
  if (!rec) return false;
  return rec.baseType === 'legs' && normalizeBaseLegPlatformMode(rec.baseLegPlatformMode) === 'stage';
}

export function willHeightDepthTargetCreateActiveSpecialOverride(args: {
  targetCm: unknown;
  baseCm: unknown;
  toggledBack?: boolean;
}): boolean {
  if (args.toggledBack === true) return false;
  const target = readPositiveNumber(args.targetCm);
  const base = readPositiveNumber(args.baseCm);
  if (target == null || base == null) return false;
  return Math.abs(target - base) > EPS_CM;
}

export function moduleHasActiveHeightDepthSpecialDims(cfgMod: unknown): boolean {
  return getActiveHeightCmFromConfig(cfgMod, 0) != null || getActiveDepthCmFromConfig(cfgMod) != null;
}

function sketchBoxesHaveActiveHeightDepthSpecialDims(cfgMod: unknown): boolean {
  const mod = readRecord(cfgMod);
  const sketchExtras = readRecord(mod?.sketchExtras);
  for (const box of readList(sketchExtras?.boxes)) {
    if (moduleHasActiveHeightDepthSpecialDims(box)) return true;
  }
  return false;
}

function moduleOrNestedBoxesHaveActiveHeightDepthSpecialDims(cfgMod: unknown): boolean {
  return moduleHasActiveHeightDepthSpecialDims(cfgMod) || sketchBoxesHaveActiveHeightDepthSpecialDims(cfgMod);
}

function listHasActiveHeightDepthSpecialDims(listValue: unknown): boolean {
  for (const item of readList(listValue)) {
    if (moduleOrNestedBoxesHaveActiveHeightDepthSpecialDims(item)) return true;
  }
  return false;
}

export function configHasActiveHeightDepthSpecialDims(config: unknown): boolean {
  const cfg = readRecord(config);
  if (!cfg) return false;

  if (listHasActiveHeightDepthSpecialDims(cfg.modulesConfiguration)) return true;
  if (listHasActiveHeightDepthSpecialDims(cfg.stackSplitLowerModulesConfiguration)) return true;

  const corner = readRecord(cfg.cornerConfiguration);
  if (!corner) return false;

  if (moduleHasActiveHeightDepthSpecialDims(corner)) return true;
  if (listHasActiveHeightDepthSpecialDims(corner.modulesConfiguration)) return true;

  const lowerCorner = readRecord(corner.stackSplitLower);
  if (moduleHasActiveHeightDepthSpecialDims(lowerCorner)) return true;
  if (listHasActiveHeightDepthSpecialDims(lowerCorner?.modulesConfiguration)) return true;

  return false;
}
