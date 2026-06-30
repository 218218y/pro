import {
  WARDROBE_DEFAULTS,
  WARDROBE_DIMENSION_GUIDE_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { AppContainer, BuilderDimensionLineScaleSpec } from '../../../types';

export type Vector3Like = { x: number; y: number; z: number };

export type RenderDimensionOpsDeps = {
  app: (ctx: unknown) => AppContainer;
  ops: (App: AppContainer) => unknown;
};

type Vector3Ctor = new (x?: number, y?: number, z?: number) => Vector3Like;

export type DimensionLineFn = (
  from: Vector3Like,
  to: Vector3Like,
  textOffset: Vector3Like,
  label: string,
  scale?: BuilderDimensionLineScaleSpec,
  labelOffset?: Vector3Like
) => unknown;

export type DimensionArgs = {
  App?: AppContainer;
  THREE?: { Vector3: Vector3Ctor } | null;
  addDimensionLine?: DimensionLineFn;
  totalW?: number;
  H?: number;
  D?: number;
  hasCornice?: boolean;
  isCornerMode?: boolean;
  noMainWardrobe?: boolean;
  cornerSide?: unknown;
  stackSplitActive?: boolean;
  moduleWidthsCm?: unknown;
  moduleHeightsCm?: unknown;
  moduleHeightsAllManual?: boolean;
  moduleDepthsCm?: unknown;
  moduleDepthsAllManual?: boolean;
  cornerConnectorActive?: boolean;
  cornerWingDoorCount?: number;
  cornerWallLenM?: number;
  cornerOffsetXM?: number;
  cornerOffsetZM?: number;
  cornerWingLenM?: number;
  cornerWingHeightM?: number;
  cornerWingDepthM?: number;
};

export type RenderDimensionContext = {
  THREE: { Vector3: Vector3Ctor };
  addDimensionLine: DimensionLineFn;
  totalW: number;
  H: number;
  D: number;
  hasCornice: boolean;
  isCornerMode: boolean;
  noMainWardrobe: boolean;
  cornerSide: 'left' | 'right';
  stackSplitActive: boolean;
  moduleWidthsCm: number[] | null;
  moduleHeightsCm: number[] | null;
  moduleHeightsAllManual: boolean;
  moduleDepthsCm: number[] | null;
  moduleDepthsAllManual: boolean;
  cornerConnectorActive: boolean;
  cornerWingDoorCount: number;
  cornerWingVisible: boolean;
  cornerWallLenM: number;
  cornerOffsetXM: number;
  cornerOffsetZM: number;
  cornerWingLenM: number;
  cornerWingHeightM: number;
  cornerWingDepthM: number;
  displayH: number;
  displayD: number;
  yTotal: number;
  yCells: number;
  dimsOnLeft: boolean;
  depthOnLeft: boolean;
  CELL_DIM_TEXT_SCALE: number;
  vec: (x: number, y: number, z: number) => Vector3Like;
};

function isDimensionLineFn(v: unknown): v is DimensionLineFn {
  return typeof v === 'function';
}

function asArgs(v: unknown): DimensionArgs {
  return v && typeof v === 'object' ? { ...v } : {};
}

function asFiniteNumber(v: unknown, defaultValue = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : defaultValue;
}

function requireCornerModeBoolean(args: DimensionArgs, key: 'cornerConnectorActive'): boolean {
  const value = args[key];
  if (typeof value !== 'boolean') {
    throw new Error(`[builder/render_dimension_ops] corner mode requires boolean ${key}`);
  }
  return value;
}

function requireCornerModeNumber(
  args: DimensionArgs,
  key:
    | 'cornerWingDoorCount'
    | 'cornerWallLenM'
    | 'cornerOffsetXM'
    | 'cornerOffsetZM'
    | 'cornerWingLenM'
    | 'cornerWingHeightM'
    | 'cornerWingDepthM'
): number {
  const value = args[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`[builder/render_dimension_ops] corner mode requires finite numeric ${key}`);
  }
  return value;
}

function asFiniteNumberArray(v: unknown): number[] | null {
  if (!Array.isArray(v)) return null;
  const out: number[] = [];
  for (let i = 0; i < v.length; i++) {
    const raw = v[i];
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
    out.push(raw);
  }
  return out;
}

function maxCm(values: number[] | null): number {
  if (!values || !values.length) return 0;
  let max = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (Number.isFinite(v) && v > max) max = v;
  }
  return max;
}

function cornerSide(v: unknown): 'left' | 'right' {
  return v === 'left' ? 'left' : 'right';
}

export function createRenderDimensionContext(argsIn: unknown): RenderDimensionContext | null {
  const args = asArgs(argsIn);
  const THREE = args.THREE;
  const addDimensionLine = args.addDimensionLine;
  if (!THREE || !isDimensionLineFn(addDimensionLine)) return null;

  const totalW = asFiniteNumber(args.totalW);
  const H = asFiniteNumber(args.H);
  const D0 = asFiniteNumber(args.D);
  const hasCornice = !!args.hasCornice;
  const isCornerMode = !!args.isCornerMode;
  const noMainWardrobe = !!args.noMainWardrobe;
  const resolvedCornerSide = cornerSide(args.cornerSide);
  const dimsOnLeft = isCornerMode && resolvedCornerSide === 'right';
  const depthOnLeft = isCornerMode ? dimsOnLeft : true;
  const stackSplitActive = !!args.stackSplitActive;

  const moduleWidthsCm = asFiniteNumberArray(args.moduleWidthsCm);
  const moduleHeightsCm = asFiniteNumberArray(args.moduleHeightsCm);
  const moduleHeightsAllManual = !!args.moduleHeightsAllManual;
  const moduleDepthsCm = asFiniteNumberArray(args.moduleDepthsCm);
  const moduleDepthsAllManual = !!args.moduleDepthsAllManual;

  const cornerConnectorActive = isCornerMode ? requireCornerModeBoolean(args, 'cornerConnectorActive') : true;
  const cornerWingDoorCountRaw = isCornerMode
    ? requireCornerModeNumber(args, 'cornerWingDoorCount')
    : WARDROBE_DEFAULTS.corner.doorsCount;
  const cornerWingDoorCount = Number.isFinite(cornerWingDoorCountRaw)
    ? Math.max(0, Math.round(cornerWingDoorCountRaw))
    : WARDROBE_DEFAULTS.corner.doorsCount;
  const cornerWingVisible = isCornerMode && cornerWingDoorCount > 0;
  const cornerWallLenM = isCornerMode ? requireCornerModeNumber(args, 'cornerWallLenM') : 0;
  const cornerOffsetXM = isCornerMode ? requireCornerModeNumber(args, 'cornerOffsetXM') : 0;
  const cornerOffsetZM = isCornerMode ? requireCornerModeNumber(args, 'cornerOffsetZM') : 0;
  const cornerWingLenM = isCornerMode ? requireCornerModeNumber(args, 'cornerWingLenM') : 0;
  const cornerWingHeightM = isCornerMode ? requireCornerModeNumber(args, 'cornerWingHeightM') : NaN;
  const cornerWingDepthM = isCornerMode ? requireCornerModeNumber(args, 'cornerWingDepthM') : NaN;

  let displayH = H;
  const maxHcm = maxCm(moduleHeightsCm);
  const maxH = Number.isFinite(maxHcm) && maxHcm > 0 ? maxHcm / 100 : NaN;
  if (Number.isFinite(maxH) && maxH > 0) {
    displayH = moduleHeightsAllManual ? maxH : Math.max(displayH, maxH);
  }

  let displayD = D0;
  const maxDcm = maxCm(moduleDepthsCm);
  const maxD = Number.isFinite(maxDcm) && maxDcm > 0 ? maxDcm / 100 : NaN;
  if (Number.isFinite(maxD) && maxD > 0) {
    displayD = moduleDepthsAllManual ? maxD : Math.max(displayD, maxD);
  }

  return {
    THREE,
    addDimensionLine,
    totalW,
    H,
    D: displayD,
    hasCornice,
    isCornerMode,
    noMainWardrobe,
    cornerSide: resolvedCornerSide,
    stackSplitActive,
    moduleWidthsCm,
    moduleHeightsCm,
    moduleHeightsAllManual,
    moduleDepthsCm,
    moduleDepthsAllManual,
    cornerConnectorActive,
    cornerWingDoorCount,
    cornerWingVisible,
    cornerWallLenM,
    cornerOffsetXM,
    cornerOffsetZM,
    cornerWingLenM,
    cornerWingHeightM,
    cornerWingDepthM,
    displayH,
    displayD,
    yTotal:
      displayH +
      (hasCornice
        ? WARDROBE_DIMENSION_GUIDE_DIMENSIONS.verticalPlacement.totalYOffsetWithCorniceM
        : WARDROBE_DIMENSION_GUIDE_DIMENSIONS.verticalPlacement.totalYOffsetWithoutCorniceM),
    yCells:
      displayH +
      (hasCornice
        ? WARDROBE_DIMENSION_GUIDE_DIMENSIONS.verticalPlacement.cellYOffsetWithCorniceM
        : WARDROBE_DIMENSION_GUIDE_DIMENSIONS.verticalPlacement.cellYOffsetWithoutCorniceM),
    dimsOnLeft,
    depthOnLeft,
    CELL_DIM_TEXT_SCALE: WARDROBE_DIMENSION_GUIDE_DIMENSIONS.textScale.cell,
    vec: (x: number, y: number, z: number) => new THREE.Vector3(x, y, z),
  };
}
