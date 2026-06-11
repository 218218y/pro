import type { AppContainer, DrawerVisualEntryLike, UnknownCallable, ThreeLike } from '../../../types';
import type { readDoorStyleMap } from '../features/door_style_overrides.js';

export type FnLike = UnknownCallable;
export type RegisterFn = (App: AppContainer, partId: unknown, obj: unknown, kind: unknown) => void;
export type WardrobeGroupFn = (App: AppContainer) => unknown;
export type DrawersArrayFn = (App: AppContainer) => DrawerVisualEntryLike[];
export type GetMirrorMaterialFn = (args: { App: AppContainer; THREE: ThreeLike }) => unknown;
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
