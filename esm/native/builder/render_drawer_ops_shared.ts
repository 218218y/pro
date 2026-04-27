import type {
  UnknownRecord,
  AppContainer,
  BuilderAddFoldedClothesFn,
  BuilderCreateDoorVisualFn,
  BuilderCreateInternalDrawerBoxFn,
  BuilderOutlineFn,
  DrawerVisualEntryLike,
  Object3DLike,
  ThreeLike,
  UnknownCallable,
} from '../../../types';
import { readDoorStyleMap } from '../features/door_style_overrides.js';
import { readCurtainType } from './render_door_ops_shared.js';

type FnLike = UnknownCallable;
export type RegisterFn = (App: AppContainer, partId: unknown, obj: unknown, kind: unknown) => void;
type WardrobeGroupFn = (App: AppContainer) => unknown;
type DrawersArrayFn = (App: AppContainer) => DrawerVisualEntryLike[];
type GetMirrorMaterialFn = (args: { App: AppContainer; THREE: ThreeLike }) => unknown;
export type GetPartMaterialFn = (partId: string) => unknown;
export type GetPartColorValueFn = (partId: string) => unknown;

export type BuilderRenderDrawerDeps = {
  __isFn?: (value: unknown) => boolean;
  __app: (ctx: unknown) => AppContainer;
  __ops: (App: AppContainer) => unknown;
  __wardrobeGroup: WardrobeGroupFn;
  __reg: RegisterFn;
  __drawers: DrawersArrayFn;
  getMirrorMaterial: GetMirrorMaterialFn;
};

export type DrawerConfig = {
  groovesMap?: Record<string, unknown>;
  drawerDividersMap?: Record<string, unknown>;
  doorSpecialMap?: Record<string, string | null | undefined>;
  doorStyleMap?: ReturnType<typeof readDoorStyleMap>;
  curtainMap?: Record<string, unknown>;
  isMultiColorMode?: boolean;
};

export type ExternalDrawerOpLike = {
  partId: string;
  grooveKey?: string;
  dividerKey?: string;
  visualW: number;
  visualH: number;
  visualT?: number;
  boxW: number;
  boxH: number;
  boxD: number;
  boxOffsetZ?: number;
  moduleIndex?: unknown;
  connectW?: number;
  connectH?: number;
  connectD?: number;
  connectZ?: number;
  closed?: { x?: number; y?: number; z?: number };
  open?: { x?: number; y?: number; z?: number };
  faceW?: number;
  faceOffsetX?: number;
  frontZ?: number;
};

export type InternalDrawerOpLike = {
  partId: string;
  width: number;
  height: number;
  depth: number;
  moduleIndex?: unknown;
  dividerKey?: string;
  hasDivider: boolean;
  x: number;
  y: number;
  z: number;
  openZ?: number;
};

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function isFunction(value: unknown): value is FnLike {
  return typeof value === 'function';
}

export function readFinite(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readObjectMap(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function readStringNullableMap(value: unknown): Record<string, string | null | undefined> | undefined {
  if (!isRecord(value)) return undefined;
  const out: Record<string, string | null | undefined> = Object.create(null);
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') out[key] = entry;
    else if (entry === null) out[key] = null;
    else if (typeof entry === 'undefined') out[key] = undefined;
  }
  return out;
}

function isObject3DLike(value: unknown): value is Object3DLike {
  return isRecord(value) && typeof value.add === 'function';
}

export function readObject3D(value: unknown): Object3DLike | null {
  return isObject3DLike(value) ? value : null;
}

function isThreeLike(value: unknown): value is ThreeLike {
  if (!isRecord(value)) return false;
  return (
    typeof value.Group === 'function' &&
    typeof value.Mesh === 'function' &&
    typeof value.Vector3 === 'function' &&
    typeof value.BoxGeometry === 'function'
  );
}

export function readThreeLike(value: unknown): ThreeLike | null {
  return isThreeLike(value) ? value : null;
}

export function readDrawerConfig(value: unknown): DrawerConfig {
  if (!isRecord(value)) return {};
  return {
    groovesMap: readObjectMap(value.groovesMap),
    drawerDividersMap: readObjectMap(value.drawerDividersMap),
    doorSpecialMap: readStringNullableMap(value.doorSpecialMap),
    doorStyleMap: readDoorStyleMap(value.doorStyleMap),
    curtainMap: readObjectMap(value.curtainMap),
    isMultiColorMode: value.isMultiColorMode === true,
  };
}

export function readGetPartMaterial(value: unknown): GetPartMaterialFn | null {
  if (!isFunction(value)) return null;
  return partId => value(partId);
}

export function readGetPartColorValue(value: unknown): GetPartColorValueFn | null {
  if (!isFunction(value)) return null;
  return partId => value(partId);
}

export function readOutlineFn(value: unknown): BuilderOutlineFn | null {
  if (!isFunction(value)) return null;
  return mesh => value(mesh);
}

export function readCreateDoorVisual(value: unknown): BuilderCreateDoorVisualFn | null {
  if (!isFunction(value)) return null;
  return (
    w,
    h,
    thickness,
    mat,
    style,
    hasGrooves,
    isMirror,
    curtainType,
    baseMaterial,
    frontFaceSign,
    forceCurtainFix,
    mirrorLayout,
    groovePartId
  ) => {
    const next = readObject3D(
      value(
        w,
        h,
        thickness,
        mat,
        style,
        hasGrooves,
        isMirror,
        curtainType,
        baseMaterial,
        frontFaceSign,
        forceCurtainFix,
        mirrorLayout,
        groovePartId
      )
    );
    if (!next) throw new Error('[render_drawer_ops] createDoorVisual returned invalid object');
    return next;
  };
}

export function readCreateInternalDrawerBox(value: unknown): BuilderCreateInternalDrawerBoxFn | null {
  if (!isFunction(value)) return null;
  return (w, h, d, mat, drawerMat, outlineFunc, hasDivider, addHandle) => {
    const next = readObject3D(value(w, h, d, mat, drawerMat, outlineFunc, hasDivider, addHandle));
    if (!next) throw new Error('[render_drawer_ops] createInternalDrawerBox returned invalid object');
    return next;
  };
}

export function readAddFoldedClothes(value: unknown): BuilderAddFoldedClothesFn | null {
  if (!isFunction(value)) return null;
  return (shelfX, shelfY, shelfZ, width, parentGroup, maxHeight, maxDepth) =>
    value(shelfX, shelfY, shelfZ, width, parentGroup, maxHeight, maxDepth);
}

function readPositionTriplet(value: unknown): { x?: number; y?: number; z?: number } | undefined {
  if (!isRecord(value)) return undefined;
  return {
    x: typeof value.x === 'number' && Number.isFinite(value.x) ? value.x : undefined,
    y: typeof value.y === 'number' && Number.isFinite(value.y) ? value.y : undefined,
    z: typeof value.z === 'number' && Number.isFinite(value.z) ? value.z : undefined,
  };
}

export function readExternalDrawerOp(value: unknown): ExternalDrawerOpLike | null {
  if (!isRecord(value)) return null;
  const partId = typeof value.partId === 'string' ? value.partId : '';
  const visualW = readFinite(value.visualW, Number.NaN);
  const visualH = readFinite(value.visualH, Number.NaN);
  const boxW = readFinite(value.boxW, Number.NaN);
  const boxH = readFinite(value.boxH, Number.NaN);
  const boxD = readFinite(value.boxD, Number.NaN);
  if (
    !partId ||
    !Number.isFinite(visualW) ||
    !Number.isFinite(visualH) ||
    !Number.isFinite(boxW) ||
    !Number.isFinite(boxH) ||
    !Number.isFinite(boxD)
  ) {
    return null;
  }
  return {
    partId,
    grooveKey: typeof value.grooveKey === 'string' ? value.grooveKey : undefined,
    dividerKey: typeof value.dividerKey === 'string' ? value.dividerKey : undefined,
    visualW,
    visualH,
    visualT: typeof value.visualT === 'number' && Number.isFinite(value.visualT) ? value.visualT : undefined,
    boxW,
    boxH,
    boxD,
    boxOffsetZ:
      typeof value.boxOffsetZ === 'number' && Number.isFinite(value.boxOffsetZ)
        ? value.boxOffsetZ
        : undefined,
    moduleIndex: value.moduleIndex,
    connectW:
      typeof value.connectW === 'number' && Number.isFinite(value.connectW) ? value.connectW : undefined,
    connectH:
      typeof value.connectH === 'number' && Number.isFinite(value.connectH) ? value.connectH : undefined,
    connectD:
      typeof value.connectD === 'number' && Number.isFinite(value.connectD) ? value.connectD : undefined,
    connectZ:
      typeof value.connectZ === 'number' && Number.isFinite(value.connectZ) ? value.connectZ : undefined,
    closed: readPositionTriplet(value.closed),
    open: readPositionTriplet(value.open),
    faceW: typeof value.faceW === 'number' && Number.isFinite(value.faceW) ? value.faceW : undefined,
    faceOffsetX:
      typeof value.faceOffsetX === 'number' && Number.isFinite(value.faceOffsetX)
        ? value.faceOffsetX
        : undefined,
    frontZ: typeof value.frontZ === 'number' && Number.isFinite(value.frontZ) ? value.frontZ : undefined,
  };
}

export function readInternalDrawerOp(value: unknown): InternalDrawerOpLike | null {
  if (!isRecord(value)) return null;
  const partId = typeof value.partId === 'string' ? value.partId : '';
  const width = readFinite(value.width, Number.NaN);
  const height = readFinite(value.height, Number.NaN);
  const depth = readFinite(value.depth, Number.NaN);
  if (!partId || !Number.isFinite(width) || !Number.isFinite(height) || !Number.isFinite(depth)) return null;
  return {
    partId,
    width,
    height,
    depth,
    moduleIndex: value.moduleIndex,
    dividerKey: typeof value.dividerKey === 'string' ? value.dividerKey : undefined,
    hasDivider: value.hasDivider === true,
    x: readFinite(value.x),
    y: readFinite(value.y),
    z: readFinite(value.z),
    openZ: typeof value.openZ === 'number' && Number.isFinite(value.openZ) ? value.openZ : undefined,
  };
}

export function readFinitePositive(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

export function resolveDrawerVisualState(
  cfg: DrawerConfig,
  partId: string,
  getPartColorValue: GetPartColorValueFn | null
): { isMirror: boolean; isGlass: boolean; curtainType: string | null | undefined } {
  if (!cfg.isMultiColorMode) return { isMirror: false, isGlass: false, curtainType: null };

  let isMirror = false;
  let isGlass = false;
  let curtainType = readCurtainType(cfg.curtainMap ? cfg.curtainMap[partId] : null);
  const special = cfg.doorSpecialMap ? cfg.doorSpecialMap[partId] : null;

  if (special === 'mirror') isMirror = true;
  else if (special === 'glass') isGlass = true;
  else if (getPartColorValue) {
    const value = getPartColorValue(partId);
    if (value === 'mirror') isMirror = true;
    else if (value === 'glass') isGlass = true;
  }

  if (!isMirror && !isGlass && curtainType && curtainType !== 'none') isGlass = true;
  if (isMirror) {
    isGlass = false;
    curtainType = null;
  }

  return { isMirror, isGlass, curtainType };
}
