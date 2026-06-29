import {
  getDefaultBaseLegWidthCm,
  normalizeBaseLegHeightCm,
  normalizeBaseLegStyle,
  normalizeBaseLegWidthCm,
} from '../features/base_leg_support.js';
import { normalizeBasePlinthHeightCm } from '../features/base_plinth_support.js';
import {
  normalizeBaseLegPlatformFrontOverhangCm,
  normalizeBaseLegPlatformSideOverhangCm,
} from '../features/platform_overhang_support.js';
import { readRecord } from './build_flow_readers.js';

export type ChestModeUiLike = {
  isChestMode?: boolean;
  baseType?: string;
  baseLegStyle?: string;
  baseLegColor?: string;
  baseLegPlatformMode?: string;
  baseLegPlatformSideMode?: string;
  baseLegPlatformSideOverhangCm?: number;
  baseLegPlatformFrontOverhangCm?: number;
  basePlinthHeightCm?: number;
  baseLegHeightCm?: number;
  baseLegWidthCm?: number;
  colorChoice?: string;
  customColor?: string;
  doorStyle?: string;
  groovesEnabled?: boolean;
  chestCommodeEnabled?: boolean;
  chestCommodeMirrorHeightCm?: number;
  chestCommodeMirrorWidthCm?: number;
};

function readFiniteNumericDraft(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function pickChestModeUi(ui: unknown): ChestModeUiLike | null {
  const u = readRecord(ui);
  if (!u) return null;

  const out: ChestModeUiLike = {};
  if (typeof u.isChestMode === 'boolean') out.isChestMode = u.isChestMode;
  if (typeof u.baseType === 'string') out.baseType = u.baseType;
  if (typeof u.baseLegStyle === 'string') out.baseLegStyle = u.baseLegStyle;
  if (typeof u.baseLegColor === 'string') out.baseLegColor = u.baseLegColor;
  if (typeof u.baseLegPlatformMode === 'string') out.baseLegPlatformMode = u.baseLegPlatformMode;
  if (typeof u.baseLegPlatformSideMode === 'string') out.baseLegPlatformSideMode = u.baseLegPlatformSideMode;

  const baseLegStyle = normalizeBaseLegStyle(u.baseLegStyle);
  out.baseLegPlatformSideOverhangCm = normalizeBaseLegPlatformSideOverhangCm(u.baseLegPlatformSideOverhangCm);
  out.baseLegPlatformFrontOverhangCm = normalizeBaseLegPlatformFrontOverhangCm(
    u.baseLegPlatformFrontOverhangCm
  );
  out.basePlinthHeightCm = normalizeBasePlinthHeightCm(u.basePlinthHeightCm);
  out.baseLegHeightCm = normalizeBaseLegHeightCm(u.baseLegHeightCm);
  out.baseLegWidthCm = normalizeBaseLegWidthCm(u.baseLegWidthCm, getDefaultBaseLegWidthCm(baseLegStyle));

  if (typeof u.colorChoice === 'string') out.colorChoice = u.colorChoice;
  if (typeof u.customColor === 'string') out.customColor = u.customColor;
  if (typeof u.doorStyle === 'string') out.doorStyle = u.doorStyle;
  if (typeof u.groovesEnabled === 'boolean') out.groovesEnabled = u.groovesEnabled;
  if (typeof u.chestCommodeEnabled === 'boolean') out.chestCommodeEnabled = u.chestCommodeEnabled;

  const raw = readRecord(u.raw);
  const mirrorHeight =
    readFiniteNumericDraft(raw?.chestCommodeMirrorHeightCm) ??
    readFiniteNumericDraft(u.chestCommodeMirrorHeightCm);
  const mirrorWidth =
    readFiniteNumericDraft(raw?.chestCommodeMirrorWidthCm) ??
    readFiniteNumericDraft(u.chestCommodeMirrorWidthCm);
  if (typeof mirrorHeight === 'number') out.chestCommodeMirrorHeightCm = mirrorHeight;
  if (typeof mirrorWidth === 'number') out.chestCommodeMirrorWidthCm = mirrorWidth;
  return out;
}
