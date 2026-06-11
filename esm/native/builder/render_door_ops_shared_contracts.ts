import type {
  AppContainer,
  BuilderHandleMeshOptionsLike,
  DoorVisualEntryLike,
  Object3DLike,
} from '../../../types';
import type { readDoorStyleMap } from '../features/door_style_overrides.js';

export type HandleMeshFactory = (
  type: string,
  w: number,
  h: number,
  isLeftHinge: boolean,
  opts?: BuilderHandleMeshOptionsLike | null
) => Object3DLike | null;
export type RegisterFn = (App: AppContainer, partId: unknown, obj: unknown, kind: unknown) => void;
export type WardrobeGroupFn = (App: AppContainer) => unknown;
export type DoorsArrayFn = (App: AppContainer) => DoorVisualEntryLike[];
export type MarkDirtyFn = (App: AppContainer) => void;
export type TagMirrorSurfaceFn = (App: AppContainer, rootObj: unknown, mirrorMat: unknown) => number;
export type GetMirrorMaterialFn = (args: {
  App: AppContainer;
  THREE: import('../../../types').ThreeLike;
}) => unknown;
export type GetMaterialFn = (partId: unknown, kind?: unknown) => unknown;
export type GetPartMaterialFn = (partId: string) => unknown;
export type GetPartColorValueFn = (partId: string) => unknown;
export type GetHandleTypeFn = (partId: string) => unknown;

export type BuilderRenderDoorDeps = {
  __isFn?: (value: unknown) => boolean;
  __app: (ctx: unknown) => AppContainer;
  __ops: (App: AppContainer) => unknown;
  __wardrobeGroup: WardrobeGroupFn;
  __reg: RegisterFn;
  __doors: DoorsArrayFn;
  __markSplitHoverPickablesDirty: MarkDirtyFn;
  __tagAndTrackMirrorSurfaces: TagMirrorSurfaceFn;
  getMirrorMaterial: GetMirrorMaterialFn;
};

export type SlidingUiState = {
  groovesEnabled?: boolean;
  slidingTracksColor?: string;
};

export type SlidingDoorConfig = {
  groovesMap?: Record<string, unknown>;
  doorSpecialMap?: Record<string, string | null | undefined>;
  doorStyleMap?: ReturnType<typeof readDoorStyleMap>;
  curtainMap?: Record<string, unknown>;
  mirrorLayoutMap?: Record<string, unknown>;
  doorTrimMap?: Record<string, unknown>;
  handlesMap?: Record<string, unknown>;
  isMultiColorMode?: boolean;
  slidingDoorHandlesEnabled?: boolean;
};

export type SlidingTrackPalette = {
  hex: number;
  lineHex: number;
  metalness: number;
  roughness: number;
  emissiveHex: number;
  emissiveIntensity: number;
};

export type SlidingDoorVisualState = {
  isMirror: boolean;
  isGlass: boolean;
  curtain: string | null | undefined;
};

export type SlidingRailLike = {
  width: number;
  height: number;
  depth: number;
  lineOffsetY: number;
  lineOffsetZ: number;
  topY: number;
  bottomY: number;
  z: number;
};

export type SlidingDoorOpLike = {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  partId: string;
  isOuter: boolean;
  index?: number;
  total?: number;
  minX?: number;
  maxX?: number;
};

export type HingedDoorOpLike = {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  thickness?: number;
  partId: string;
  isLeftHinge: boolean;
  openAngle?: number;
  isRemoved: boolean;
  isMirror: boolean;
  hasGroove: boolean;
  moduleIndex?: unknown;
  pivotX?: number;
  meshOffsetX?: number;
  style?: string;
  curtain?: unknown;
  handleAbsY?: number;
  allowHandle?: boolean;
};
