import type { CornerBuildMeta, CornerBuildUI } from './corner_state_normalize_contracts.js';
import {
  CARCASS_BASE_DIMENSIONS,
  CORNER_WING_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import { readBaseLegOptions, type BaseLegColor, type BaseLegStyle } from '../features/base_leg_support.js';
import {
  readBool,
  readFiniteNumber,
  readModeConstant,
  readPositiveCm,
  readStringValue,
  resolveCornerPrimaryMode,
} from './corner_state_normalize_shared.js';

const PLINTH_DIMENSIONS = CARCASS_BASE_DIMENSIONS.plinth;
const CORNER_WING = CORNER_WING_DIMENSIONS.wing;
const CORNER_CONNECTOR = CORNER_WING_DIMENSIONS.connector;

export type CornerWingStackMetaState = {
  __stackKey: 'top' | 'bottom';
  __stackSplitEnabled: boolean;
  __stackOffsetZ: number;
  __baseTypeOverride: unknown;
  __baseLegStyleOverride: unknown;
  __baseLegColorOverride: unknown;
  __baseLegHeightCmOverride: unknown;
  __baseLegWidthCmOverride: unknown;
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
  baseLegHeightCm: number;
  baseLegWidthCm: number;
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
    __stackOffsetZ:
      metaRec && typeof metaRec.stackOffsetZ === 'number' && Number.isFinite(metaRec.stackOffsetZ)
        ? Number(metaRec.stackOffsetZ)
        : 0,
    __baseTypeOverride: metaRec ? metaRec.baseType : undefined,
    __baseLegStyleOverride: metaRec ? metaRec.baseLegStyle : undefined,
    __baseLegColorOverride: metaRec ? metaRec.baseLegColor : undefined,
    __baseLegHeightCmOverride: metaRec ? metaRec.baseLegHeightCm : undefined,
    __baseLegWidthCmOverride: metaRec ? metaRec.baseLegWidthCm : undefined,
  };
}

export function resolveCornerWingMetrics(args: {
  uiAny: CornerBuildUI;
  mainH: number;
  mainD: number;
  woodThick: number;
  startY: number;
  __stackKey: 'top' | 'bottom';
  __stackSplitEnabled: boolean;
}): CornerWingMetricsState {
  const { uiAny, mainH, mainD, startY, woodThick, __stackKey, __stackSplitEnabled } = args;

  const cornerConnectorEnabled =
    typeof uiAny.cornerConnectorEnabled !== 'undefined' ? !!uiAny.cornerConnectorEnabled : true;

  let wingLengthCM = uiAny.cornerWidth != null ? readPositiveCm(uiAny.cornerWidth) : NaN;
  if (!Number.isFinite(wingLengthCM)) wingLengthCM = CORNER_WING.defaultWidthCm;
  if (wingLengthCM < 0) wingLengthCM = 0;

  const cornerSide: 'left' | 'right' = uiAny.cornerSide === 'left' ? 'left' : 'right';
  const __mirrorX: 1 | -1 = cornerSide === 'left' ? -1 : 1;

  let __cornerHeightCM = readPositiveCm(uiAny.cornerHeight ?? uiAny.cornerHeightCm);
  if (!Number.isFinite(__cornerHeightCM) || __cornerHeightCM <= 0) __cornerHeightCM = NaN;

  let __cornerDepthCM = readPositiveCm(uiAny.cornerDepth ?? uiAny.cornerDepthCm);
  if (!Number.isFinite(__cornerDepthCM) || __cornerDepthCM <= 0) __cornerDepthCM = NaN;

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
  App: unknown;
  uiAny: CornerBuildUI;
  __stackKey: 'top' | 'bottom';
  __stackSplitEnabled: boolean;
}): CornerWingFlagsState {
  const { App, uiAny, __stackKey, __stackSplitEnabled } = args;
  const primaryMode = resolveCornerPrimaryMode(App);
  const isMode = (id: unknown): boolean => {
    const s = String(id || '');
    return !!s && primaryMode === s;
  };

  return {
    removeDoorsEnabled:
      readBool(uiAny, 'removeDoorsEnabled') ||
      (typeof uiAny.removeDoors !== 'undefined' ? !!uiAny.removeDoors : false) ||
      isMode(readModeConstant('REMOVE_DOOR', 'remove_door')),
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
  mainW: number;
  mainD: number;
  startY: number;
  wingH: number;
  wingD: number;
  cornerSide: 'left' | 'right';
  __baseTypeOverride: unknown;
  __baseLegStyleOverride: unknown;
  __baseLegColorOverride: unknown;
  __baseLegHeightCmOverride: unknown;
  __baseLegWidthCmOverride: unknown;
  __stackKey: 'top' | 'bottom';
  __stackSplitEnabled: boolean;
}): CornerWingPlacementState {
  const {
    uiAny,
    mainW,
    mainD,
    startY,
    wingH,
    wingD,
    cornerSide,
    __baseTypeOverride,
    __baseLegStyleOverride,
    __baseLegColorOverride,
    __baseLegHeightCmOverride,
    __baseLegWidthCmOverride,
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

  let baseH =
    baseType === 'plinth' ? PLINTH_DIMENSIONS.heightM : baseType === 'legs' ? legOptions.heightM : 0;
  if (startY < CORNER_CONNECTOR.doorMinHeightM && baseH > startY) baseH = Math.max(0, startY);

  const stackOffsetY = Math.max(0, startY - baseH);
  const cabinetBodyHeight = wingH;

  const rawWallLen =
    uiAny.cornerCabinetWallLenCm ?? uiAny.cornerCabinetWallLen ?? uiAny.cornerConnectorWallLenCm;
  let cornerWallL = Number.isFinite(readFiniteNumber(rawWallLen) ?? NaN)
    ? Number(rawWallLen) / 100
    : CORNER_CONNECTOR.defaultWallLengthM;
  if (!Number.isFinite(cornerWallL) || cornerWallL <= CORNER_CONNECTOR.minWallLengthM) {
    cornerWallL = CORNER_CONNECTOR.defaultWallLengthM;
  }

  const rawOX = uiAny.cornerCabinetOffsetXcm;
  const rawOZ = uiAny.cornerCabinetOffsetZcm;
  let cornerOX = Number.isFinite(readFiniteNumber(rawOX) ?? NaN) ? Number(rawOX) / 100 : 0;
  if (cornerSide === 'left') cornerOX = -cornerOX;
  const cornerOZ = Number.isFinite(readFiniteNumber(rawOZ) ?? NaN) ? Number(rawOZ) / 100 : 0;

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
    baseLegHeightCm: legOptions.heightCm,
    baseLegWidthCm: legOptions.widthCm,
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
