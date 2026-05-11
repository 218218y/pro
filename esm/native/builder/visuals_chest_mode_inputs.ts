import {
  CHEST_MODE_DIMENSIONS,
  WARDROBE_DEFAULTS,
  clampDimension,
  cmToM,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import { readUiRawDimsCmFromSnapshot, readUiRawNumberFromSnapshot } from '../runtime/ui_raw_selectors.js';
import { readBaseLegOptions, type BaseLegColor, type BaseLegStyle } from '../features/base_leg_support.js';
import { getBasePlinthHeightM, normalizeBasePlinthHeightCm } from '../features/base_plinth_support.js';

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
  basePlinthHeightCm: number;
  basePlinthHeightM: number;
  baseLegHeightCm: number;
  baseLegWidthCm: number;
  baseLegHeightM: number;
  colorChoice: string;
  customColor: string;
  chestCommodeEnabled: boolean;
  chestCommodeMirrorHeightCm: number;
  chestCommodeMirrorWidthCm: number;
  chestCommodeMirrorHeightM: number;
  chestCommodeMirrorWidthM: number;
  doorStyle: string;
  isGroovesEnabled: boolean;
};

function normalizeChestCommodeDimensionCm(
  value: unknown,
  fallbackCm: number,
  bounds: { min: number; max: number }
): number {
  const n = typeof value === 'number' ? value : Number(value);
  const raw = Number.isFinite(n) ? n : fallbackCm;
  return clampDimension(raw, bounds.min, bounds.max);
}

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
  let plinthHeightSource: unknown;
  let colorChoice: unknown;
  let customColor: unknown;
  let chestCommodeEnabled: boolean;
  let chestCommodeMirrorHeightSource: unknown;
  let chestCommodeMirrorWidthSource: unknown;
  let doorStyle: unknown;
  let isGroovesEnabled: boolean;

  const ui = getChestModeBuildUI(App);
  if (opts && typeof opts === 'object') {
    H = Number(opts.H);
    totalW = Number(opts.totalW);
    D = Number(opts.D);
    drawersCount = parseInt(String(opts.drawersCount ?? ''), 10);
    rawBaseType = opts.baseType;
    legSource = opts;
    plinthHeightSource = opts.basePlinthHeightCm;
    colorChoice = opts.colorChoice;
    customColor = opts.customColor;
    chestCommodeEnabled = !!opts.chestCommodeEnabled;
    chestCommodeMirrorHeightSource = opts.chestCommodeMirrorHeightCm;
    chestCommodeMirrorWidthSource = opts.chestCommodeMirrorWidthCm;
    doorStyle = opts.doorStyle;
    isGroovesEnabled = opts.isGroovesEnabled === true;
  } else {
    const dims = ui ? readUiRawDimsCmFromSnapshot(ui) : null;
    const widthCm = dims ? dims.widthCm : WARDROBE_DEFAULTS.widthCm;
    const heightCm = dims ? dims.heightCm : WARDROBE_DEFAULTS.heightCm;
    const depthCm = dims ? dims.depthCm : WARDROBE_DEFAULTS.byType.hinged.depthCm;

    H = Number(heightCm) / 100;
    totalW = Number(widthCm) / 100;
    D = Number(depthCm) / 100;

    drawersCount = dims ? dims.chestDrawersCount : WARDROBE_DEFAULTS.chestDrawersCount;
    rawBaseType = ui ? ui.baseType : '';
    legSource = ui;
    plinthHeightSource = ui ? ui.basePlinthHeightCm : undefined;
    colorChoice = ui ? ui.colorChoice : '';
    customColor = ui ? ui.customColor : '';
    chestCommodeEnabled = !!(ui && ui.chestCommodeEnabled);
    chestCommodeMirrorHeightSource = ui
      ? readUiRawNumberFromSnapshot(
          ui,
          'chestCommodeMirrorHeightCm',
          CHEST_MODE_DIMENSIONS.commode.defaultMirrorHeightCm
        )
      : CHEST_MODE_DIMENSIONS.commode.defaultMirrorHeightCm;
    chestCommodeMirrorWidthSource = ui
      ? readUiRawNumberFromSnapshot(ui, 'chestCommodeMirrorWidthCm', widthCm)
      : widthCm;
    doorStyle = ui ? ui.doorStyle : 'flat';
    isGroovesEnabled = !!(ui && ui.groovesEnabled);
  }

  const legOptions = readBaseLegOptions(legSource);
  const basePlinthHeightCm = normalizeBasePlinthHeightCm(plinthHeightSource);
  const chestCommodeMirrorHeightCm = normalizeChestCommodeDimensionCm(
    chestCommodeMirrorHeightSource,
    CHEST_MODE_DIMENSIONS.commode.defaultMirrorHeightCm,
    {
      min: CHEST_MODE_DIMENSIONS.commode.minMirrorHeightCm,
      max: CHEST_MODE_DIMENSIONS.commode.maxMirrorHeightCm,
    }
  );
  const chestCommodeMirrorWidthCm = normalizeChestCommodeDimensionCm(
    chestCommodeMirrorWidthSource,
    totalW * 100,
    {
      min: CHEST_MODE_DIMENSIONS.commode.minMirrorWidthCm,
      max: CHEST_MODE_DIMENSIONS.commode.maxMirrorWidthCm,
    }
  );
  return {
    H,
    totalW,
    D,
    drawersCount: Number.isFinite(drawersCount) ? drawersCount : WARDROBE_DEFAULTS.chestDrawersCount,
    effectiveBaseType: String(rawBaseType || '') === 'plinth' ? 'plinth' : 'legs',
    baseLegStyle: legOptions.style,
    baseLegColor: legOptions.color,
    basePlinthHeightCm,
    basePlinthHeightM: getBasePlinthHeightM(basePlinthHeightCm),
    baseLegHeightCm: legOptions.heightCm,
    baseLegWidthCm: legOptions.widthCm,
    baseLegHeightM: legOptions.heightM,
    colorChoice: String(colorChoice || '#ffffff'),
    customColor: String(customColor || '#ffffff'),
    chestCommodeEnabled,
    chestCommodeMirrorHeightCm,
    chestCommodeMirrorWidthCm,
    chestCommodeMirrorHeightM: cmToM(chestCommodeMirrorHeightCm),
    chestCommodeMirrorWidthM: cmToM(chestCommodeMirrorWidthCm),
    doorStyle: String(doorStyle || 'flat'),
    isGroovesEnabled,
  };
}
