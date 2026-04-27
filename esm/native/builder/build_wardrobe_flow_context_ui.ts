import { readRecord } from './build_flow_readers.js';

export type ChestModeUiLike = {
  isChestMode?: boolean;
  baseType?: string;
  baseLegStyle?: string;
  baseLegColor?: string;
  baseLegHeightCm?: number | string;
  baseLegWidthCm?: number | string;
  colorChoice?: string;
  customColor?: string;
};

export function pickChestModeUi(ui: unknown): ChestModeUiLike | null {
  const u = readRecord(ui);
  if (!u) return null;

  const out: ChestModeUiLike = {};
  if (typeof u.isChestMode === 'boolean') out.isChestMode = u.isChestMode;
  if (typeof u.baseType === 'string') out.baseType = u.baseType;
  if (typeof u.baseLegStyle === 'string') out.baseLegStyle = u.baseLegStyle;
  if (typeof u.baseLegColor === 'string') out.baseLegColor = u.baseLegColor;
  if (typeof u.baseLegHeightCm === 'number' || typeof u.baseLegHeightCm === 'string') {
    out.baseLegHeightCm = u.baseLegHeightCm;
  }
  if (typeof u.baseLegWidthCm === 'number' || typeof u.baseLegWidthCm === 'string') {
    out.baseLegWidthCm = u.baseLegWidthCm;
  }
  if (typeof u.colorChoice === 'string') out.colorChoice = u.colorChoice;
  if (typeof u.customColor === 'string') out.customColor = u.customColor;
  return out;
}
