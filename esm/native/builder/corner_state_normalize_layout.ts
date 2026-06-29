import type { CornerBuildMeta, CornerBuildUI } from './corner_state_normalize_contracts.js';
import {
  CARCASS_BASE_DIMENSIONS,
  CORNER_WING_DIMENSIONS,
  WARDROBE_DEFAULTS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  normalizeBaseLegPlatformMode,
  normalizeBaseLegPlatformSideMode,
  readBaseLegOptions,
  type BaseLegColor,
  type BaseLegPlatformMode,
  type BaseLegPlatformSideMode,
  type BaseLegStyle,
} from '../features/base_leg_support.js';
import {
  DEFAULT_BASE_LEG_PLATFORM_FRONT_OVERHANG_CM,
  DEFAULT_BASE_LEG_PLATFORM_SIDE_OVERHANG_CM,
  platformOverhangCmToM,
} from '../features/platform_overhang_support.js';
import { getBasePlinthHeightM, normalizeBasePlinthHeightCm } from '../features/base_plinth_support.js';
import { resolveRemoveDoorsEnabledFromSnapshots } from '../features/door_removal_visibility.js';
import {
  readBool,
  readFiniteNumber,
  readModeConstant,
  readPositiveCm,
  readStringValue,
} from './corner_state_normalize_shared.js';

const CORNER_WING = CORNER_WING_DIMENSIONS.wing;
const CORNER_CONNECTOR = CORNER_WING_DIMENSIONS.connector;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readPositiveSpecialCm(config: unknown, key: string): number | null {
  const cfg = isRecord(config) ? config : null;
  const specialDims = isRecord(cfg?.specialDims) ? cfg.specialDims : null;
  if (!specialDims) return null;
  const n = readPositiveCm(specialDims[key]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function readPositiveConnectorSpecialCm(config: unknown, key: string): number | null {
  const cfg = isRecord(config) ? config : null;
  const specialDims = isRecord(cfg?.connectorSpecialDims) ? cfg.connectorSpecialDims : null;
  if (!specialDims) return null;
  const n = readPositiveCm(specialDims[key]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function readUiRawRecord(uiAny: CornerBuildUI): UnknownRecord | null {
  return isRecord(uiAny.raw) ? uiAny.raw : null;
}

function readPositiveUiRawCm(uiAny: CornerBuildUI, key: string): number | null {
  const raw = readUiRawRecord(uiAny);
  const n = raw ? readPositiveCm(raw[key]) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function readCornerDoorsCount(uiAny: CornerBuildUI): number {
  const rec = isRecord(uiAny) ? uiAny : {};
  const parsedRaw = readFiniteNumber(rec.cornerDoors);
  const parsed = parsedRaw != null ? Math.round(parsedRaw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : WARDROBE_DEFAULTS.corner.doorsCount;
}

function resolveAutoCornerWidthForDoors(uiAny: CornerBuildUI): number {
  const doors = readCornerDoorsCount(uiAny);
  const perDoor = WARDROBE_DEFAULTS.byType.hinged.perDoorWidthCm;
  return Math.max(perDoor, doors * perDoor);
}

function readRootCornerConfiguration(rootConfig: unknown): UnknownRecord | null {
  const root = isRecord(rootConfig) ? rootConfig : null;
  if (!root) return null;
  const nested = isRecord(root.cornerConfiguration) ? root.cornerConfiguration : null;
  return nested || root;
}

function hasTopCornerWidthSpecialDims(rootConfig: unknown): boolean {
  const corner = readRootCornerConfiguration(rootConfig);
  const specialDims = isRecord(corner?.specialDims) ? corner.specialDims : null;
  if (!specialDims) return false;
  const widthCm = readPositiveCm(specialDims.widthCm);
  const baseWidthCm = readPositiveCm(specialDims.baseWidthCm);
  return (Number.isFinite(widthCm) && widthCm > 0) || (Number.isFinite(baseWidthCm) && baseWidthCm > 0);
}

function resolveBottomCornerWidthBase(
  uiAny: CornerBuildUI,
  fallbackWingLengthCm: number,
  rootConfig?: unknown
): number {
  if (hasTopCornerWidthSpecialDims(rootConfig)) return resolveAutoCornerWidthForDoors(uiAny);
  return fallbackWingLengthCm;
}

export type CornerWingStackMetaState = {
  __stackKey: 'top' | 'bottom';
  __stackSplitEnabled: boolean;
  __stackSplitUnifiedFrame: boolean;
  __stackOffsetZ: number;
  __baseTypeOverride: unknown;
  __baseLegStyleOverride: unknown;
  __baseLegColorOverride: unknown;
  __basePlinthHeightCmOverride: unknown;
  __baseLegHeightCmOverride: unknown;
  __baseLegWidthCmOverride: unknown;
  __baseLegPlatformModeOverride: unknown;
  __baseLegPlatformSideModeOverride: unknown;
  __baseLegPlatformSideOverhangCmOverride: unknown;
  __baseLegPlatformFrontOverhangCmOverride: unknown;
};

export type CornerWingMetricsState = {
  cornerConnectorEnabled: boolean;
  wingLengthCM: number;
  cornerSide: 'left' | 'right';
  __mirrorX: 1 | -1;
  wingW: number;
  wingH: number;
  wingD: number;
  blindWidth: number;
  activeWidth: number;
  activeFaceCenter: number;
};

export type CornerWingFlagsState = {
  removeDoorsEnabled: boolean;
  doorStyle: string;
  splitDoors: boolean;
  groovesEnabled: boolean;
  internalDrawersEnabled: boolean;
  showHangerEnabled: boolean;
  showContentsEnabled: boolean;
  hasCorniceEnabled: boolean;
  __corniceAllowedForThisStack: boolean;
  __corniceTypeNorm: string;
};

export type CornerWingPlacementState = {
  baseType: string;
  baseLegStyle: BaseLegStyle;
  baseLegColor: BaseLegColor;
  basePlinthHeightCm: number;
  baseLegHeightCm: number;
  baseLegWidthCm: number;
  baseLegHeightM: number;
  baseLegPlatformMode: BaseLegPlatformMode;
  baseLegPlatformSideMode: BaseLegPlatformSideMode;
  baseLegPlatformSideOverhangM: number;
  baseLegPlatformFrontOverhangM: number;
  baseLegBottomPlatformHeightM: number;
  baseLegTopPlatformHeightM: number;
  baseH: number;
  stackOffsetY: number;
  cabinetBodyHeight: number;
  cornerWallL: number;
  cornerOX: number;
  cornerOZ: number;
  roomCornerX: number;
  roomCornerZ: number;
  wingStartX: number;
  wingStartZ: number;
  wingRotationY: number;
  wingScaleX: number;
};

export function resolveCornerWingStackMeta(
  meta: CornerBuildMeta | null | undefined
): CornerWingStackMetaState {
  const metaRec = meta && typeof meta === 'object' ? meta : null;
  return {
    __stackKey: metaRec && metaRec.stackKey === 'bottom' ? 'bottom' : 'top',
    __stackSplitEnabled: !!(metaRec && metaRec.stackSplitEnabled),
    __stackSplitUnifiedFrame: !!(metaRec && metaRec.stackSplitUnifiedFrame),
    __stackOffsetZ:
      metaRec && typeof metaRec.stackOffsetZ === 'number' && Number.isFinite(metaRec.stackOffsetZ)
        ? metaRec.stackOffsetZ
        : 0,
    __baseTypeOverride: metaRec ? metaRec.baseType : undefined,
    __baseLegStyleOverride: metaRec ? metaRec.baseLegStyle : undefined,
    __baseLegColorOverride: metaRec ? metaRec.baseLegColor : undefined,
    __basePlinthHeightCmOverride: metaRec ? metaRec.basePlinthHeightCm : undefined,
    __baseLegHeightCmOverride: metaRec ? metaRec.baseLegHeightCm : undefined,
    __baseLegWidthCmOverride: metaRec ? metaRec.baseLegWidthCm : undefined,
    __baseLegPlatformModeOverride: metaRec ? metaRec.baseLegPlatformMode : undefined,
    __baseLegPlatformSideModeOverride: metaRec ? metaRec.baseLegPlatformSideMode : undefined,
    __baseLegPlatformSideOverhangCmOverride: metaRec ? metaRec.baseLegPlatformSideOverhangCm : undefined,
    __baseLegPlatformFrontOverhangCmOverride: metaRec ? metaRec.baseLegPlatformFrontOverhangCm : undefined,
  };
}

export function resolveCornerWingMetrics(args: {
  uiAny: CornerBuildUI;
  config?: unknown;
  rootConfig?: unknown;
  mainH: number;
  mainD: number;
  woodThick: number;
  startY: number;
  __stackKey: 'top' | 'bottom';
  __stackSplitEnabled: boolean;
}): CornerWingMetricsState {
  const { uiAny, config, rootConfig, mainH, mainD, startY, woodThick, __stackKey, __stackSplitEnabled } =
    args;

  const cornerConnectorEnabled = true;

  let wingLengthCM = uiAny.cornerWidth != null ? readPositiveCm(uiAny.cornerWidth) : NaN;
  if (!Number.isFinite(wingLengthCM)) wingLengthCM = CORNER_WING.defaultWidthCm;
  if (wingLengthCM < 0) wingLengthCM = 0;

  const cornerSide: 'left' | 'right' = uiAny.cornerSide === 'left' ? 'left' : 'right';
  const __mirrorX: 1 | -1 = cornerSide === 'left' ? -1 : 1;

  let __cornerHeightCM = readPositiveCm(uiAny.cornerHeight);
  if (!Number.isFinite(__cornerHeightCM) || __cornerHeightCM <= 0) __cornerHeightCM = NaN;

  let __cornerDepthCM = readPositiveCm(uiAny.cornerDepth);
  if (!Number.isFinite(__cornerDepthCM) || __cornerDepthCM <= 0) __cornerDepthCM = NaN;

  if (__stackSplitEnabled && __stackKey === 'bottom') {
    wingLengthCM = resolveBottomCornerWidthBase(uiAny, wingLengthCM, rootConfig);

    const lowerWingWidthCm = readPositiveSpecialCm(config, 'widthCm');
    if (lowerWingWidthCm != null) wingLengthCM = lowerWingWidthCm;

    const lowerRawWingDepthCm = readPositiveUiRawCm(uiAny, 'stackSplitLowerDepth');
    if (lowerRawWingDepthCm != null) __cornerDepthCM = lowerRawWingDepthCm;

    const lowerWingDepthCm = readPositiveSpecialCm(config, 'depthCm');
    if (lowerWingDepthCm != null) __cornerDepthCM = lowerWingDepthCm;
  }

  const __stackCornerTopBodyH =
    Number.isFinite(__cornerHeightCM) && __stackSplitEnabled && __stackKey === 'top'
      ? Math.max(CORNER_WING.minBodyHeightM, __cornerHeightCM / 100 - startY)
      : NaN;

  const wingH = __stackSplitEnabled
    ? __stackKey === 'top' && Number.isFinite(__stackCornerTopBodyH)
      ? __stackCornerTopBodyH
      : mainH
    : Number.isFinite(__cornerHeightCM)
      ? Math.max(CORNER_WING.minBodyHeightM, __cornerHeightCM / 100 - startY)
      : mainH;

  const wingD = Number.isFinite(__cornerDepthCM)
    ? Math.max(CORNER_WING.minDepthM, __cornerDepthCM / 100)
    : mainD;
  const wingW = wingLengthCM / 100;
  const blindWidth = cornerConnectorEnabled ? 0 : Math.max(mainD, wingD) + CORNER_WING.blindClearanceM;
  const activeWidth = wingW - blindWidth - woodThick;
  const activeFaceCenter = blindWidth + activeWidth / 2;

  return {
    cornerConnectorEnabled,
    wingLengthCM,
    cornerSide,
    __mirrorX,
    wingW,
    wingH,
    wingD,
    blindWidth,
    activeWidth,
    activeFaceCenter,
  };
}

export function resolveCornerWingFlags(args: {
  uiAny: CornerBuildUI;
  primaryMode: string;
  __stackKey: 'top' | 'bottom';
  __stackSplitEnabled: boolean;
}): CornerWingFlagsState {
  const { uiAny, primaryMode, __stackKey, __stackSplitEnabled } = args;
  const isMode = (id: unknown): boolean => {
    const s = String(id || '');
    return !!s && primaryMode === s;
  };

  return {
    removeDoorsEnabled: resolveRemoveDoorsEnabledFromSnapshots(uiAny, { primary: primaryMode }),
    doorStyle: readStringValue(uiAny, 'doorStyle'),
    splitDoors: readBool(uiAny, 'splitDoors'),
    groovesEnabled: readBool(uiAny, 'groovesEnabled') || isMode(readModeConstant('GROOVE', 'groove')),
    internalDrawersEnabled: readBool(uiAny, 'internalDrawersEnabled'),
    showHangerEnabled: readBool(uiAny, 'showHanger'),
    showContentsEnabled: readBool(uiAny, 'showContents'),
    hasCorniceEnabled: readBool(uiAny, 'hasCornice'),
    __corniceAllowedForThisStack: !__stackSplitEnabled || __stackKey === 'top',
    __corniceTypeNorm: String(uiAny.corniceType || 'classic').toLowerCase(),
  };
}

export function resolveCornerWingPlacement(args: {
  uiAny: CornerBuildUI;
  config?: unknown;
  mainW: number;
  mainD: number;
  startY: number;
  wingH: number;
  wingD: number;
  cornerSide: 'left' | 'right';
  __baseTypeOverride: unknown;
  __baseLegStyleOverride: unknown;
  __baseLegColorOverride: unknown;
  __basePlinthHeightCmOverride: unknown;
  __baseLegHeightCmOverride: unknown;
  __baseLegWidthCmOverride: unknown;
  __baseLegPlatformModeOverride: unknown;
  __baseLegPlatformSideModeOverride: unknown;
  __baseLegPlatformSideOverhangCmOverride: unknown;
  __baseLegPlatformFrontOverhangCmOverride: unknown;
  __stackKey: 'top' | 'bottom';
  __stackSplitEnabled: boolean;
}): CornerWingPlacementState {
  const {
    uiAny,
    config,
    mainW,
    mainD,
    startY,
    wingH,
    wingD,
    cornerSide,
    __baseTypeOverride,
    __baseLegStyleOverride,
    __baseLegColorOverride,
    __basePlinthHeightCmOverride,
    __baseLegHeightCmOverride,
    __baseLegWidthCmOverride,
    __baseLegPlatformModeOverride,
    __baseLegPlatformSideModeOverride,
    __baseLegPlatformSideOverhangCmOverride,
    __baseLegPlatformFrontOverhangCmOverride,
    __stackKey,
    __stackSplitEnabled,
  } = args;

  const __baseTypeRaw = (() => {
    const v = __baseTypeOverride != null ? __baseTypeOverride : uiAny.baseType;
    const s = v != null && String(v).trim() !== '' ? String(v).trim() : 'plinth';
    return s;
  })();

  let baseType =
    __baseTypeRaw === 'none' || __baseTypeRaw === 'no' || __baseTypeRaw === 'off' || __baseTypeRaw === ''
      ? 'none'
      : __baseTypeRaw;

  if (__stackSplitEnabled && __stackKey === 'top') baseType = 'none';

  const basePlinthHeightSource =
    __basePlinthHeightCmOverride != null && String(__basePlinthHeightCmOverride).trim() !== ''
      ? __basePlinthHeightCmOverride
      : uiAny.basePlinthHeightCm;
  const basePlinthHeightCm = normalizeBasePlinthHeightCm(basePlinthHeightSource);

  const legOptions = readBaseLegOptions({
    baseLegStyle:
      __baseLegStyleOverride != null && String(__baseLegStyleOverride).trim() !== ''
        ? __baseLegStyleOverride
        : uiAny.baseLegStyle,
    baseLegColor:
      __baseLegColorOverride != null && String(__baseLegColorOverride).trim() !== ''
        ? __baseLegColorOverride
        : uiAny.baseLegColor,
    baseLegHeightCm:
      __baseLegHeightCmOverride != null && String(__baseLegHeightCmOverride).trim() !== ''
        ? __baseLegHeightCmOverride
        : uiAny.baseLegHeightCm,
    baseLegWidthCm:
      __baseLegWidthCmOverride != null && String(__baseLegWidthCmOverride).trim() !== ''
        ? __baseLegWidthCmOverride
        : uiAny.baseLegWidthCm,
  });

  const baseLegPlatformMode = normalizeBaseLegPlatformMode(
    __baseLegPlatformModeOverride != null && String(__baseLegPlatformModeOverride).trim() !== ''
      ? __baseLegPlatformModeOverride
      : uiAny.baseLegPlatformMode,
    'plain'
  );
  const baseLegPlatformSideMode = normalizeBaseLegPlatformSideMode(
    __baseLegPlatformSideModeOverride != null && String(__baseLegPlatformSideModeOverride).trim() !== ''
      ? __baseLegPlatformSideModeOverride
      : uiAny.baseLegPlatformSideMode
  );
  const baseLegPlatformSideOverhangM = platformOverhangCmToM(
    __baseLegPlatformSideOverhangCmOverride != null &&
      String(__baseLegPlatformSideOverhangCmOverride).trim() !== ''
      ? __baseLegPlatformSideOverhangCmOverride
      : uiAny.baseLegPlatformSideOverhangCm,
    DEFAULT_BASE_LEG_PLATFORM_SIDE_OVERHANG_CM
  );
  const baseLegPlatformFrontOverhangM = platformOverhangCmToM(
    __baseLegPlatformFrontOverhangCmOverride != null &&
      String(__baseLegPlatformFrontOverhangCmOverride).trim() !== ''
      ? __baseLegPlatformFrontOverhangCmOverride
      : uiAny.baseLegPlatformFrontOverhangCm,
    DEFAULT_BASE_LEG_PLATFORM_FRONT_OVERHANG_CM
  );
  const requestedLegPlatformHeightM =
    baseType === 'legs' && baseLegPlatformMode === 'stage'
      ? CARCASS_BASE_DIMENSIONS.legs.platform.heightM
      : 0;

  let baseH =
    baseType === 'plinth'
      ? getBasePlinthHeightM(basePlinthHeightCm)
      : baseType === 'legs'
        ? legOptions.heightM + requestedLegPlatformHeightM
        : 0;
  if (startY < CORNER_CONNECTOR.doorMinHeightM && baseH > startY) baseH = Math.max(0, startY);

  const baseLegBottomPlatformHeightM = baseType === 'legs' ? Math.min(requestedLegPlatformHeightM, baseH) : 0;
  const baseLegHeightM = baseType === 'legs' ? Math.max(0, baseH - baseLegBottomPlatformHeightM) : 0;
  const baseLegTopPlatformHeightM =
    baseType === 'legs' && baseLegPlatformMode === 'stage' && baseLegHeightM > 0
      ? CARCASS_BASE_DIMENSIONS.legs.platform.heightM
      : 0;

  const stackOffsetY = Math.max(0, startY - baseH);
  const cabinetBodyHeight = wingH;

  const rawWallLen = uiAny.cornerCabinetWallLenCm;
  const wallLenCm = readFiniteNumber(rawWallLen);
  let cornerWallL = wallLenCm != null ? wallLenCm / 100 : CORNER_CONNECTOR.defaultWallLengthM;
  if (!Number.isFinite(cornerWallL) || cornerWallL <= CORNER_CONNECTOR.minWallLengthM) {
    cornerWallL = CORNER_CONNECTOR.defaultWallLengthM;
  }
  if (__stackSplitEnabled && __stackKey === 'bottom') {
    const lowerConnectorWallCm = readPositiveConnectorSpecialCm(config, 'widthCm');
    if (lowerConnectorWallCm != null) {
      cornerWallL = Math.max(CORNER_CONNECTOR.minWallLengthM, lowerConnectorWallCm / 100);
    }
  }

  const rawOX = uiAny.cornerCabinetOffsetXcm;
  const rawOZ = uiAny.cornerCabinetOffsetZcm;
  const offsetXCm = readFiniteNumber(rawOX);
  let cornerOX = offsetXCm != null ? offsetXCm / 100 : 0;
  if (cornerSide === 'left') cornerOX = -cornerOX;
  const offsetZCm = readFiniteNumber(rawOZ);
  const cornerOZ = offsetZCm != null ? offsetZCm / 100 : 0;

  const roomCornerX = (cornerSide === 'left' ? -mainW / 2 - cornerWallL : mainW / 2 + cornerWallL) + cornerOX;
  const roomCornerZ = -(mainD / 2) + cornerOZ;

  const wingStartZ = roomCornerZ + cornerWallL;
  const wingStartX = cornerSide === 'left' ? roomCornerX + wingD : roomCornerX - wingD;
  const wingRotationY = cornerSide === 'left' ? Math.PI / 2 : -Math.PI / 2;
  const wingScaleX = cornerSide === 'left' ? -1 : 1;

  return {
    baseType,
    baseLegStyle: legOptions.style,
    baseLegColor: legOptions.color,
    basePlinthHeightCm,
    baseLegHeightCm: legOptions.heightCm,
    baseLegWidthCm: legOptions.widthCm,
    baseLegHeightM,
    baseLegPlatformMode,
    baseLegPlatformSideMode,
    baseLegPlatformSideOverhangM,
    baseLegPlatformFrontOverhangM,
    baseLegBottomPlatformHeightM,
    baseLegTopPlatformHeightM,
    baseH,
    stackOffsetY,
    cabinetBodyHeight,
    cornerWallL,
    cornerOX,
    cornerOZ,
    roomCornerX,
    roomCornerZ,
    wingStartX,
    wingStartZ,
    wingRotationY,
    wingScaleX,
  };
}
