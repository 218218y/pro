import { ensureRenderNamespace, getRenderSlot, getScene, setRenderSlot } from '../runtime/render_access.js';
import {
  asPlatformUtil,
  collectUsedSceneResources,
  hasCachePressure,
  isCacheMapLike,
  isRenderCacheLike,
  isRenderMetaLike,
  pruneOneCache,
  type CacheLimits,
  type CachePruningAppLike,
  type DimLabelCacheEntryLike,
  type GeometryLike,
  type MaterialLike,
  type SceneObjectLike,
  type TextureLike,
} from './cache_pruning_shared.js';

function disposeTexture(texture: TextureLike): void {
  try {
    texture.dispose?.();
  } catch {
    // ignore
  }
}

function disposeGeometry(geometry: GeometryLike): void {
  try {
    geometry.dispose?.();
  } catch {
    // ignore
  }
}

function disposeMaterial(material: MaterialLike, usedTextures: Set<TextureLike>): void {
  try {
    if (material.map && !usedTextures.has(material.map)) {
      material.map.dispose?.();
    }
    material.dispose?.();
  } catch {
    // ignore
  }
}

function disposeDimLabelEntry(entry: DimLabelCacheEntryLike): void {
  try {
    entry.mat?.dispose?.();
  } catch {
    // ignore
  }
  try {
    entry.texture?.dispose?.();
  } catch {
    // ignore
  }
}

function resolveCacheLimits(utilCacheLimits?: CacheLimits | null): CacheLimits {
  return (
    utilCacheLimits || {
      textures: 64,
      materials: 128,
      dimLabels: 24,
      edges: 128,
      geometries: 256,
    }
  );
}

export function pruneCachesSafe(
  root: CachePruningAppLike,
  rootScene: SceneObjectLike | null | undefined
): void {
  try {
    const render = ensureRenderNamespace(root);
    const cache = isRenderCacheLike(render.cache) ? render.cache : null;
    const meta = isRenderMetaLike(render.meta) ? render.meta : null;
    const util = asPlatformUtil(root.platform?.util);
    if (!cache || !meta || !util) return;
    const dimLabelCache = isCacheMapLike<DimLabelCacheEntryLike, DimLabelCacheEntryLike>(util.dimLabelCache)
      ? util.dimLabelCache
      : null;

    const limits = resolveCacheLimits(util.cacheLimits);
    if (!hasCachePressure(cache, dimLabelCache, limits)) return;

    const now = Date.now();
    const lastPruneAt = getRenderSlot<number>(root, 'lastPruneAt');
    if (typeof lastPruneAt === 'number' && now - lastPruneAt < 800) return;
    setRenderSlot(root, 'lastPruneAt', now);

    const rootNode = rootScene || getScene(root) || null;
    const { usedMaterials, usedTextures, usedGeometries } = collectUsedSceneResources(rootNode);

    if (cache.textureCache && meta.texture) {
      pruneOneCache(
        cache.textureCache,
        meta.texture,
        limits.textures,
        (texture: TextureLike) => usedTextures.has(texture),
        disposeTexture
      );
    }

    if (cache.materialCache && meta.material) {
      pruneOneCache(
        cache.materialCache,
        meta.material,
        limits.materials,
        (material: MaterialLike) => usedMaterials.has(material),
        (material: MaterialLike) => disposeMaterial(material, usedTextures)
      );
    }

    if (dimLabelCache && dimLabelCache.size > limits.dimLabels && meta.dimLabel) {
      pruneOneCache(
        dimLabelCache,
        meta.dimLabel,
        limits.dimLabels,
        (entry: DimLabelCacheEntryLike) =>
          !!(
            (entry.mat && usedMaterials.has(entry.mat)) ||
            (entry.texture && usedTextures.has(entry.texture))
          ),
        disposeDimLabelEntry
      );
    }

    if (cache.edgesGeometryCache && meta.edges) {
      pruneOneCache(
        cache.edgesGeometryCache,
        meta.edges,
        limits.edges,
        (geometry: GeometryLike) => usedGeometries.has(geometry),
        disposeGeometry
      );
    }

    if (cache.geometryCache && meta.geometry) {
      pruneOneCache(
        cache.geometryCache,
        meta.geometry,
        limits.geometries,
        (geometry: GeometryLike) => usedGeometries.has(geometry),
        disposeGeometry
      );
    }
  } catch {
    // ignore
  }
}
