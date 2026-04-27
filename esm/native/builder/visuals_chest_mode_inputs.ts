import { readUiRawDimsCmFromSnapshot } from '../runtime/ui_raw_selectors.js';
import { readBaseLegOptions, type BaseLegColor, type BaseLegStyle } from '../features/base_leg_support.js';

import type { AppContainer, UnknownRecord } from '../../../types/index.js';

import { getChestModeBuildUI } from './visuals_chest_mode_runtime.js';

export type ChestModeBuildInputs = {
  H: number;
  totalW: number;
  D: number;
  drawersCount: number;
  effectiveBaseType: 'plinth' | 'legs';
  baseLegStyle: BaseLegStyle;
  baseLegColor: BaseLegColor;
  baseLegHeightCm: number;
  baseLegWidthCm: number;
  baseLegHeightM: number;
  colorChoice: string;
  customColor: string;
};

export function resolveChestModeBuildInputs(
  App: AppContainer,
  opts?: UnknownRecord | null
): ChestModeBuildInputs {
  let H: number;
  let totalW: number;
  let D: number;
  let drawersCount: number;
  let rawBaseType: unknown;
  let legSource: unknown;
  let colorChoice: unknown;
  let customColor: unknown;

  const ui = getChestModeBuildUI(App);
  if (opts && typeof opts === 'object') {
    H = Number(opts.H);
    totalW = Number(opts.totalW);
    D = Number(opts.D);
    drawersCount = parseInt(String(opts.drawersCount ?? ''), 10);
    rawBaseType = opts.baseType;
    legSource = opts;
    colorChoice = opts.colorChoice;
    customColor = opts.customColor;
  } else {
    const dims = ui ? readUiRawDimsCmFromSnapshot(ui) : null;
    const widthCm = dims ? dims.widthCm : 160;
    const heightCm = dims ? dims.heightCm : 240;
    const depthCm = dims ? dims.depthCm : 55;

    H = Number(heightCm) / 100;
    totalW = Number(widthCm) / 100;
    D = Number(depthCm) / 100;

    drawersCount = dims ? dims.chestDrawersCount : 4;
    rawBaseType = ui ? ui.baseType : '';
    legSource = ui;
    colorChoice = ui ? ui.colorChoice : '';
    customColor = ui ? ui.customColor : '';
  }

  const legOptions = readBaseLegOptions(legSource);
  return {
    H,
    totalW,
    D,
    drawersCount: Number.isFinite(drawersCount) ? drawersCount : 4,
    effectiveBaseType: String(rawBaseType || '') === 'plinth' ? 'plinth' : 'legs',
    baseLegStyle: legOptions.style,
    baseLegColor: legOptions.color,
    baseLegHeightCm: legOptions.heightCm,
    baseLegWidthCm: legOptions.widthCm,
    baseLegHeightM: legOptions.heightM,
    colorChoice: String(colorChoice || '#ffffff'),
    customColor: String(customColor || '#ffffff'),
  };
}
