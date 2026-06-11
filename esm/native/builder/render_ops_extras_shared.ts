import { assertApp, assertTHREE } from '../runtime/api.js';
import {
  bindLegacyRenderCompatRefs,
  ensureRenderCacheMaps,
  ensureRenderMaterialSlots,
  ensureRenderMetaMaps,
  getWardrobeGroup,
} from '../runtime/render_access.js';
import { ensureBuilderService } from '../runtime/builder_service_access.js';
import {
  ensurePlatformRootSurface,
  ensurePlatformUtil,
  getPlatformUtil,
} from '../runtime/platform_access.js';

import type {
  AppContainer,
  Object3DLike,
  RenderCacheMapsLike,
  RenderMaterialSlotsLike,
  RenderMetaMapsLike,
  RenderOpsLike,
  ThreeLike,
  Vec3Like,
} from '../../../types/index.js';

export type ValueRecord = Record<string, unknown>;
export type LabelShiftLike = Partial<Record<'x' | 'y' | 'z', number>>;

export type CacheTouchMetaLike = Map<string, unknown> | ValueRecord | undefined;
export type CacheTouchFn = (meta: CacheTouchMetaLike, key: string) => unknown;
export type PlatformUtilLike = ValueRecord & {
  dimLabelCache?: Map<string, DimLabelEntryLike>;
  cacheTouch?: CacheTouchFn;
};

export type CacheMapsLike = RenderCacheMapsLike &
  ValueRecord & {
    edgesGeometryCache: Map<string, unknown>;
  };

export type MetaMapsLike = RenderMetaMapsLike &
  ValueRecord & {
    dimLabel: Map<string, number>;
    edges: Map<string, number>;
  };

export type MaterialSlotsLike = RenderMaterialSlotsLike & ValueRecord;
export type AppLike = AppContainer & ValueRecord;

export type RenderOpsRuntime = {
  App: AppLike;
  platform: ValueRecord & { util: PlatformUtilLike };
  renderCache: CacheMapsLike;
  renderMaterials: MaterialSlotsLike;
  renderMeta: MetaMapsLike;
};

export type Canvas2DContextLike = {
  fillStyle: string;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  fillRect: (x: number, y: number, width: number, height: number) => void;
  fillText: (text: string, x: number, y: number) => void;
};

export type CanvasLike = {
  width: number;
  height: number;
  getContext: (kind: '2d') => Canvas2DContextLike | null;
};

export type TextureLike = ValueRecord & { userData?: ValueRecord };
export type MaterialLike = ValueRecord & { userData?: ValueRecord };
export type GeometryLike = ValueRecord & { uuid?: string; userData?: ValueRecord };

export type PointLike = Vec3Like & {
  clone: () => PointLike;
  add: (v: Vec3Like) => PointLike;
};

export type VectorLike = PointLike & {
  copy: (v: Vec3Like) => VectorLike;
  multiplyScalar: (value: number) => VectorLike;
  addVectors: (a: Vec3Like, b: Vec3Like) => VectorLike;
};

export type SpriteLike = Object3DLike & {
  position: VectorLike;
  scale: { set: (x: number, y: number, z: number) => unknown };
};

export type MeshUserDataLike = ValueRecord & {
  __wpHasOutline?: boolean;
};

export type MeshLike = Object3DLike & {
  geometry?: GeometryLike | null;
  material?: unknown;
  userData?: MeshUserDataLike;
  add: (obj: unknown) => unknown;
};

export type DimLabelEntryLike = {
  texture: TextureLike;
  mat: MaterialLike;
};

export type RenderOpsExtrasSurface = RenderOpsLike &
  ValueRecord & {
    __esm_extras_v1?: boolean;
    addDimensionLine?: import('../../../types/index.js').BuilderDimensionLineFn;
    __addOutlinesImpl?: (mesh: unknown) => unknown;
    addOutlines?: (mesh: unknown) => unknown;
  };

export function isRecord(value: unknown): value is ValueRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function readRecord(value: unknown): ValueRecord | null {
  return isRecord(value) ? value : null;
}

export function readRenderOpsSurface(value: unknown): RenderOpsExtrasSurface | null {
  const rec = readRecord(value);
  return rec ? rec : null;
}

export function ensureRenderOpsExtrasApp(value: unknown): AppLike {
  return assertApp(value, 'native/builder/render_ops_extras.app');
}

export function readRenderOpsExtrasContextApp(ctx: unknown): AppLike {
  return ensureRenderOpsExtrasApp(readRecord(ctx)?.App);
}

export function ensureRenderOpsExtrasTHREE(App: AppLike): ThreeLike {
  return assertTHREE(App, 'native/builder/render_ops_extras.THREE');
}

export function isObject3DLike(value: unknown): value is Object3DLike {
  const rec = readRecord(value);
  return !!(
    rec &&
    Array.isArray(rec.children) &&
    readRecord(rec.userData) &&
    readRecord(rec.position) &&
    readRecord(rec.rotation) &&
    readRecord(rec.scale) &&
    typeof rec.add === 'function' &&
    typeof rec.remove === 'function'
  );
}

export function readObject3DLike(value: unknown): Object3DLike | null {
  return isObject3DLike(value) ? value : null;
}

export function isPlatformUtilLike(value: unknown): value is PlatformUtilLike {
  const rec = readRecord(value);
  return !!(rec && (!('cacheTouch' in rec) || typeof rec.cacheTouch === 'function'));
}

export function readPlatformUtil(value: unknown): PlatformUtilLike | null {
  return isPlatformUtilLike(value) ? value : null;
}

export function getRenderOpsExtrasPlatformUtil(App: AppLike): PlatformUtilLike {
  return readPlatformUtil(getPlatformUtil(App)) || {};
}

export function ensureRenderMetaMapsLike(App: AppLike): MetaMapsLike {
  const meta = ensureRenderMetaMaps(App);
  if (!(meta.dimLabel instanceof Map)) meta.dimLabel = new Map<string, number>();
  if (!(meta.edges instanceof Map)) meta.edges = new Map<string, number>();
  return Object.assign(meta, { dimLabel: meta.dimLabel, edges: meta.edges });
}

export function ensureRenderCacheMapsLike(App: AppLike): CacheMapsLike {
  const cache = ensureRenderCacheMaps(App);
  if (!(cache.edgesGeometryCache instanceof Map)) cache.edgesGeometryCache = new Map<string, unknown>();
  return Object.assign(cache, { edgesGeometryCache: cache.edgesGeometryCache });
}

export function ensureRenderOpsExtrasPlatformSurface(
  App: AppLike,
  util: PlatformUtilLike
): ValueRecord & { util: PlatformUtilLike } {
  const platform = ensurePlatformRootSurface(App);
  platform.util = util;
  return Object.assign(platform, { util });
}

export function ensureRenderOpsExtrasRuntime(App: AppLike): RenderOpsRuntime {
  const util = readPlatformUtil(ensurePlatformUtil(App)) || {};
  bindLegacyRenderCompatRefs(App);

  const builder = ensureBuilderService(App, 'native/builder/render_ops_extras.ensure');
  const renderOps = readRenderOpsSurface(builder.renderOps);
  builder.renderOps = renderOps || Object.create(null);

  const renderMeta = ensureRenderMetaMapsLike(App);
  const renderCache = ensureRenderCacheMapsLike(App);
  const renderMaterials: MaterialSlotsLike = ensureRenderMaterialSlots(App);
  const platform = ensureRenderOpsExtrasPlatformSurface(App, util);

  if (!(util.dimLabelCache instanceof Map)) util.dimLabelCache = new Map<string, DimLabelEntryLike>();

  return {
    App,
    platform,
    renderMeta,
    renderCache,
    renderMaterials,
  };
}

export function touchRenderOpsMeta(App: AppLike, meta: CacheTouchMetaLike, key: string): void {
  const util = getRenderOpsExtrasPlatformUtil(App);
  try {
    if (typeof util.cacheTouch === 'function') util.cacheTouch(meta, key);
    else if (meta instanceof Map) meta.set(key, Date.now());
  } catch {
    // ignore cache-touch errors
  }
}

export function toFiniteNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function isCanvasLike(value: unknown): value is CanvasLike {
  const rec = readRecord(value);
  return !!(
    rec &&
    typeof rec.getContext === 'function' &&
    typeof rec.width === 'number' &&
    typeof rec.height === 'number'
  );
}

export function readCanvas(value: unknown): CanvasLike | null {
  return isCanvasLike(value) ? value : null;
}

export function isPointLike(value: unknown): value is PointLike {
  const rec = readRecord(value);
  return !!(rec && typeof rec.clone === 'function' && typeof rec.add === 'function');
}

export function readPoint(value: unknown): PointLike | null {
  return isPointLike(value) ? value : null;
}

export function isVec3Like(value: unknown): value is Vec3Like {
  const rec = readRecord(value);
  return !!(rec && typeof rec.x === 'number' && typeof rec.y === 'number' && typeof rec.z === 'number');
}

export function readVector(value: unknown): Vec3Like | null {
  return isVec3Like(value) ? value : null;
}

export function readLabelShift(value: unknown): LabelShiftLike | undefined {
  const rec = readRecord(value);
  return rec || undefined;
}

export function isMeshLike(value: unknown): value is MeshLike {
  const rec = readRecord(value);
  return !!(rec && typeof rec.add === 'function');
}

export function readMeshLike(value: unknown): MeshLike | null {
  return isMeshLike(value) ? value : null;
}

export function readWardrobeGroup(App: AppLike): Object3DLike | null {
  const group = getWardrobeGroup(App);
  return readObject3DLike(group);
}
