import {
  CARCASS_BASE_DIMENSIONS,
  CHEST_MODE_DIMENSIONS,
  clampDimension,
  cmToM,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  isBaseLegWheelsStyle,
  normalizeBaseLegPlatformMode,
  normalizeBaseLegPlatformSideMode,
  readBaseLegOptions,
  type BaseLegColor,
  type BaseLegPlatformMode,
  type BaseLegPlatformSideMode,
  type BaseLegStyle,
} from '../features/base_leg_support.js';
import { getBasePlinthHeightM, normalizeBasePlinthHeightCm } from '../features/base_plinth_support.js';
import {
  DEFAULT_BASE_LEG_PLATFORM_FRONT_OVERHANG_CM,
  DEFAULT_BASE_LEG_PLATFORM_SIDE_OVERHANG_CM,
  platformOverhangCmToM,
} from '../features/platform_overhang_support.js';

import type { BuilderBuildChestOnlyOptsLike } from '../../../types/index.js';

export type ChestModeBuildInputs = {
  H: number;
  totalW: number;
  D: number;
  drawersCount: number;
  effectiveBaseType: 'plinth' | 'legs';
  baseLegStyle: BaseLegStyle;
  baseLegColor: BaseLegColor;
  baseLegPlatformMode: BaseLegPlatformMode;
  baseLegPlatformSideMode: BaseLegPlatformSideMode;
  basePlinthHeightCm: number;
  basePlinthHeightM: number;
  baseLegHeightCm: number;
  baseLegWidthCm: number;
  baseLegHeightM: number;
  baseLegBottomPlatformHeightM: number;
  baseLegTopPlatformHeightM: number;
  baseLegPlatformSideOverhangM: number;
  baseLegPlatformFrontOverhangM: number;
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

export function resolveChestModeBuildInputs(opts: BuilderBuildChestOnlyOptsLike): ChestModeBuildInputs {
  if (!opts || typeof opts !== 'object') {
    throw new TypeError('[visuals_chest_mode] build options snapshot is required');
  }
  const H = Number(opts.H);
  const totalW = Number(opts.totalW);
  const D = Number(opts.D);
  const drawersCount = parseInt(String(opts.drawersCount), 10);
  if (![H, totalW, D, drawersCount].every(value => Number.isFinite(value) && value > 0)) {
    throw new TypeError('[visuals_chest_mode] positive finite dimensions and drawersCount are required');
  }

  const rawBaseType = opts.baseType;
  const legSource = opts;
  const plinthHeightSource = opts.basePlinthHeightCm;
  const colorChoice = opts.colorChoice;
  const customColor = opts.customColor;
  const chestCommodeEnabled = !!opts.chestCommodeEnabled;
  const chestCommodeMirrorHeightSource = opts.chestCommodeMirrorHeightCm;
  const chestCommodeMirrorWidthSource = opts.chestCommodeMirrorWidthCm;
  const doorStyle = opts.doorStyle;
  const isGroovesEnabled = opts.isGroovesEnabled === true;

  const legOptions = readBaseLegOptions(legSource);
  const isWheelsBase = isBaseLegWheelsStyle(legOptions.style);
  const baseLegPlatformMode = isWheelsBase ? 'plain' : normalizeBaseLegPlatformMode(opts.baseLegPlatformMode);
  const baseLegPlatformSideMode = normalizeBaseLegPlatformSideMode(opts.baseLegPlatformSideMode);
  const baseLegPlatformSideOverhangM = platformOverhangCmToM(
    opts.baseLegPlatformSideOverhangCm,
    DEFAULT_BASE_LEG_PLATFORM_SIDE_OVERHANG_CM
  );
  const baseLegPlatformFrontOverhangM = platformOverhangCmToM(
    opts.baseLegPlatformFrontOverhangCm,
    DEFAULT_BASE_LEG_PLATFORM_FRONT_OVERHANG_CM
  );
  const baseLegPlatformEnabled =
    !isWheelsBase && String(rawBaseType || '') !== 'plinth' && baseLegPlatformMode === 'stage';
  const baseLegPlatformHeightM = baseLegPlatformEnabled ? CARCASS_BASE_DIMENSIONS.legs.platform.heightM : 0;
  const basePlinthHeightCm = normalizeBasePlinthHeightCm(plinthHeightSource);
  const effectiveBaseLegHeightM = isWheelsBase
    ? CARCASS_BASE_DIMENSIONS.chest.wheels.heightM
    : legOptions.heightM;
  const effectiveBaseLegHeightCm = Math.round(effectiveBaseLegHeightM * 1000) / 10;
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
    drawersCount,
    effectiveBaseType: String(rawBaseType || '') === 'plinth' ? 'plinth' : 'legs',
    baseLegStyle: legOptions.style,
    baseLegColor: legOptions.color,
    basePlinthHeightCm,
    basePlinthHeightM: getBasePlinthHeightM(basePlinthHeightCm),
    baseLegHeightCm: effectiveBaseLegHeightCm,
    baseLegWidthCm: legOptions.widthCm,
    baseLegHeightM: effectiveBaseLegHeightM,
    baseLegPlatformMode,
    baseLegPlatformSideMode,
    baseLegBottomPlatformHeightM: baseLegPlatformHeightM,
    baseLegTopPlatformHeightM: baseLegPlatformHeightM,
    baseLegPlatformSideOverhangM,
    baseLegPlatformFrontOverhangM,
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
