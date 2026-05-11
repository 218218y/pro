import { readRecord } from './build_flow_readers.js';

export type ChestModeUiLike = {
  isChestMode?: boolean;
  baseType?: string;
  baseLegStyle?: string;
  baseLegColor?: string;
  basePlinthHeightCm?: number | string;
  baseLegHeightCm?: number | string;
  baseLegWidthCm?: number | string;
  colorChoice?: string;
  customColor?: string;
  doorStyle?: string;
  groovesEnabled?: boolean;
  chestCommodeEnabled?: boolean;
  chestCommodeMirrorHeightCm?: number | string;
  chestCommodeMirrorWidthCm?: number | string;
};

export function pickChestModeUi(ui: unknown): ChestModeUiLike | null {
  const u = readRecord(ui);
  if (!u) return null;

  const out: ChestModeUiLike = {};
  if (typeof u.isChestMode === 'boolean') out.isChestMode = u.isChestMode;
  if (typeof u.baseType === 'string') out.baseType = u.baseType;
  if (typeof u.baseLegStyle === 'string') out.baseLegStyle = u.baseLegStyle;
  if (typeof u.baseLegColor === 'string') out.baseLegColor = u.baseLegColor;
  if (typeof u.basePlinthHeightCm === 'number' || typeof u.basePlinthHeightCm === 'string') {
    out.basePlinthHeightCm = u.basePlinthHeightCm;
  }
  if (typeof u.baseLegHeightCm === 'number' || typeof u.baseLegHeightCm === 'string') {
    out.baseLegHeightCm = u.baseLegHeightCm;
  }
  if (typeof u.baseLegWidthCm === 'number' || typeof u.baseLegWidthCm === 'string') {
    out.baseLegWidthCm = u.baseLegWidthCm;
  }
  if (typeof u.colorChoice === 'string') out.colorChoice = u.colorChoice;
  if (typeof u.customColor === 'string') out.customColor = u.customColor;
  if (typeof u.doorStyle === 'string') out.doorStyle = u.doorStyle;
  if (typeof u.groovesEnabled === 'boolean') out.groovesEnabled = u.groovesEnabled;
  if (typeof u.chestCommodeEnabled === 'boolean') out.chestCommodeEnabled = u.chestCommodeEnabled;
  const raw = readRecord(u.raw);
  const mirrorHeight =
    raw &&
    (typeof raw.chestCommodeMirrorHeightCm === 'number' || typeof raw.chestCommodeMirrorHeightCm === 'string')
      ? raw.chestCommodeMirrorHeightCm
      : u.chestCommodeMirrorHeightCm;
  const mirrorWidth =
    raw &&
    (typeof raw.chestCommodeMirrorWidthCm === 'number' || typeof raw.chestCommodeMirrorWidthCm === 'string')
      ? raw.chestCommodeMirrorWidthCm
      : u.chestCommodeMirrorWidthCm;
  if (typeof mirrorHeight === 'number' || typeof mirrorHeight === 'string') {
    out.chestCommodeMirrorHeightCm = mirrorHeight;
  }
  if (typeof mirrorWidth === 'number' || typeof mirrorWidth === 'string') {
    out.chestCommodeMirrorWidthCm = mirrorWidth;
  }
  return out;
}
