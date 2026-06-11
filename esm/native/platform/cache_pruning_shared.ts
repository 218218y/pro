import type { UnknownRecord } from '../../../types';

import {
  ensurePlatformRootSurface,
  ensurePlatformUtil,
  getPlatformUtil,
} from '../runtime/platform_access.js';
import { readConfigNumberLooseFromApp } from '../runtime/config_selectors.js';
import { ensureRenderNamespace, getRenderSlot, setRenderSlot } from '../runtime/render_access.js';

export type CacheLimitKey = 'textures' | 'materials' | 'dimLabels' | 'edges' | 'geometries';
export type CacheLimits = Record<CacheLimitKey, number>;

export type CacheKey = unknown;

export type CacheMapLike<K = CacheKey, V = unknown> = {
  size: number;
  keys: () => Iterable<K>;
  get: (key: K) => V | undefined;
  delete: (key: K) => unknown;
};

export type CacheMetaLike<K = CacheKey> = {
  set: (key: K, value: number) => unknown;
  get: (key: K) => number | undefined;
  delete: (key: K) => unknown;
};

export type DisposableLike = { dispose?: () => void };
export type TextureLike = DisposableLike & { isTexture?: boolean };
export type MaterialLike = DisposableLike & {
  map?: TextureLike | null;
  visible?: boolean;
  opacity?: number;
  [k: string]: unknown;
};
export type GeometryLike = DisposableLike;
export type DimLabelCacheEntryLike = { mat?: MaterialLike | null; texture?: TextureLike | null };

export type SceneObjectLike = {
  geometry?: GeometryLike | null;
  material?: MaterialLike | MaterialLike[] | null;
  traverse?: (visitor: (obj: SceneObjectLike) => void) => void;
};

export type UsedSceneResources = {
  usedMaterials: Set<MaterialLike>;
  usedTextures: Set<TextureLike>;
  usedGeometries: Set<GeometryLike>;
};

export type RenderMetaLike = {
  texture?: CacheMetaLike<TextureLike> | null;
  material?: CacheMetaLike<MaterialLike> | null;
  dimLabel?: CacheMetaLike<DimLabelCacheEntryLike> | null;
  edges?: CacheMetaLike<GeometryLike> | null;
  geometry?: CacheMetaLike<GeometryLike> | null;
};

export type RenderCacheLike = {
  textureCache?: CacheMapLike<TextureLike, TextureLike> | null;
  materialCache?: CacheMapLike<MaterialLike, MaterialLike> | null;
  edgesGeometryCache?: CacheMapLike<GeometryLike, GeometryLike> | null;
  geometryCache?: CacheMapLike<GeometryLike, GeometryLike> | null;
};

export type RenderNamespaceLike = UnknownRecord & {
  cacheClock?: number;
  cache?: RenderCacheLike | null;
  meta?: RenderMetaLike | null;
  scene?: SceneObjectLike | null;
  lastPruneAt?: number;
};

export type PlatformUtilLike = UnknownRecord & {
  cacheLimits?: CacheLimits;
  cacheTouch?: (metaMap: CacheMetaLike | null, key: CacheKey) => void;
  collectUsedSceneResources?: (rootNode: SceneObjectLike | null | undefined) => UsedSceneResources;
  pruneOneCache?: <K, V>(
    map: CacheMapLike<K, V> | null | undefined,
    meta: CacheMetaLike<K> | null | undefined,
    maxSize: number,
    isUsedFn?: ((value: V, key: K) => boolean) | null,
    disposeFn?: ((value: V, key: K) => void) | null
  ) => number;
  pruneCachesSafe?: (rootScene: SceneObjectLike | null | undefined) => void;
  dimLabelCache?: CacheMapLike<DimLabelCacheEntryLike, DimLabelCacheEntryLike> | null;
};

export type PlatformNamespaceLike = UnknownRecord & {
  util?: PlatformUtilLike;
};

export type CachePruningAppLike = UnknownRecord & {
  platform?: PlatformNamespaceLike;
  render?: RenderNamespaceLike;
  config?: UnknownRecord | null;
};

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object';
}

export function isCacheMapLike<K = CacheKey, V = unknown>(value: unknown): value is CacheMapLike<K, V> {
  return !!(
    isRecord(value) &&
    typeof value.size === 'number' &&
    typeof value.keys === 'function' &&
    typeof value.get === 'function' &&
    typeof value.delete === 'function'
  );
}

export function isRenderCacheLike(value: unknown): value is RenderCacheLike {
  return isRecord(value);
}

export function isRenderMetaLike(value: unknown): value is RenderMetaLike {
  return isRecord(value);
}

export function isSceneObjectLike(value: unknown): value is SceneObjectLike {
  return isRecord(value);
}

export function asPlatformUtil(value: unknown): PlatformUtilLike {
  return isRecord(value) ? value : {};
}

function asMaterial(value: unknown): MaterialLike | null {
  return isRecord(value) ? value : null;
}

function asTexture(value: unknown): TextureLike | null {
  return isRecord(value) ? value : null;
}

export function isCacheMetaLike(value: unknown): value is CacheMetaLike {
  return !!(
    isRecord(value) &&
    typeof value.set === 'function' &&
    typeof value.get === 'function' &&
    typeof value.delete === 'function'
  );
}

export function assertCachePruningApp(app: unknown): asserts app is CachePruningAppLike {
  if (!app || typeof app !== 'object') {
    throw new Error('[WardrobePro][ESM] installCachePruning(app) requires an app object');
  }
}

export function ensureCachePruningSlots(app: CachePruningAppLike): void {
  const platform = ensurePlatformRootSurface(app);
  platform.util = ensurePlatformUtil(app);
  ensureRenderNamespace(app);
}

export function applyCacheLimitsFromApp(merged: CacheLimits, app: CachePruningAppLike): void {
  const configKeys: Array<[string, CacheLimitKey]> = [
    ['TEXTURE_CACHE_MAX', 'textures'],
    ['MATERIAL_CACHE_MAX', 'materials'],
    ['DIM_LABEL_CACHE_MAX', 'dimLabels'],
    ['EDGES_CACHE_MAX', 'edges'],
    ['GEOMETRY_CACHE_MAX', 'geometries'],
    ['textures', 'textures'],
    ['materials', 'materials'],
    ['dimLabels', 'dimLabels'],
    ['edges', 'edges'],
    ['geometries', 'geometries'],
  ];
  for (const [sourceKey, targetKey] of configKeys) {
    const num = readConfigNumberLooseFromApp(app, sourceKey, Number.NaN);
    if (Number.isFinite(num)) merged[targetKey] = Math.max(0, num | 0);
  }
}

export function touchCacheClock(
  root: CachePruningAppLike,
  metaMap: CacheMetaLike | null,
  key: CacheKey
): void {
  try {
    if (!metaMap) return;
    const currentClock = getRenderSlot<number>(root, 'cacheClock');
    if (typeof currentClock !== 'number') {
      metaMap.set(key, Date.now());
      return;
    }
    metaMap.set(key, currentClock);
    setRenderSlot(root, 'cacheClock', currentClock + 1);
  } catch {
    // ignore
  }
}

export function collectUsedSceneResources(rootNode: SceneObjectLike | null | undefined): UsedSceneResources {
  const usedMaterials = new Set<MaterialLike>();
  const usedTextures = new Set<TextureLike>();
  const usedGeometries = new Set<GeometryLike>();
  if (!rootNode || typeof rootNode.traverse !== 'function') {
    return { usedMaterials, usedTextures, usedGeometries };
  }

  rootNode.traverse((obj: SceneObjectLike) => {
    try {
      if (obj.geometry) usedGeometries.add(obj.geometry);

      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of mats) {
          const material = asMaterial(mat);
          if (!material) continue;
          usedMaterials.add(material);
          if (material.map) usedTextures.add(material.map);

          for (const key of Object.keys(material)) {
            const texture = asTexture(material[key]);
            if (texture?.isTexture) usedTextures.add(texture);
          }
        }
      }
    } catch {
      // best-effort collector
    }
  });

  return { usedMaterials, usedTextures, usedGeometries };
}

export function pruneOneCache<K, V>(
  map: CacheMapLike<K, V> | null | undefined,
  meta: CacheMetaLike<K> | null | undefined,
  maxSize: number,
  isUsedFn?: ((value: V, key: K) => boolean) | null,
  disposeFn?: ((value: V, key: K) => void) | null
): number {
  try {
    if (!map || !meta || typeof map.size !== 'number' || map.size <= maxSize) return 0;
    const keys = Array.from(map.keys());
    keys.sort((a, b) => (meta.get(a) || 0) - (meta.get(b) || 0));

    let removed = 0;
    for (const key of keys) {
      if (map.size <= maxSize) break;
      const value = map.get(key);
      if (!value) {
        map.delete(key);
        meta.delete(key);
        continue;
      }
      if (isUsedFn && isUsedFn(value, key)) continue;

      map.delete(key);
      meta.delete(key);
      if (disposeFn) disposeFn(value, key);
      removed += 1;
    }
    return removed;
  } catch {
    return 0;
  }
}

export function hasCachePressure(
  cache: RenderCacheLike,
  dimLabelCache: CacheMapLike<DimLabelCacheEntryLike, DimLabelCacheEntryLike> | null,
  limits: CacheLimits
): boolean {
  return !!(
    (cache.textureCache && cache.textureCache.size > limits.textures) ||
    (cache.materialCache && cache.materialCache.size > limits.materials) ||
    (cache.edgesGeometryCache && cache.edgesGeometryCache.size > limits.edges) ||
    (cache.geometryCache && cache.geometryCache.size > limits.geometries) ||
    (dimLabelCache && dimLabelCache.size > limits.dimLabels)
  );
}

export function readPlatformUtil(app: CachePruningAppLike): PlatformUtilLike {
  return asPlatformUtil(getPlatformUtil(app));
}
