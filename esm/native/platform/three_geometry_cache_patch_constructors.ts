import type {
  CacheTouchFn,
  GeometryCacheBucket,
  GeometryCacheMap,
  GeometryCacheStats,
  GeometryCtor,
  GeometryInstance,
  GeometryPatchThreeLike,
} from './three_geometry_cache_patch_contracts.js';

import {
  cacheGeometry,
  markCachedGeometry,
  normalizePositiveInt,
  readCachedGeometry,
  readGeometryInstance,
  readNumber,
  round6,
  touchMeta,
  trimColdCacheReferences,
  updateCacheHighWater,
  recordCacheHit,
  recordCacheMiss,
} from './three_geometry_cache_patch_contracts.js';

export type CachedCtorPlan = {
  key: string;
  args: unknown[];
  touchMeta?: boolean;
};

export type CachedCtorOptions = {
  cache: GeometryCacheMap;
  meta: Map<string, number>;
  touch: CacheTouchFn;
  normalize: (rawArgs: readonly unknown[]) => CachedCtorPlan;
  stats: GeometryCacheStats;
  bucket: GeometryCacheBucket;
  maxSize: number;
};

export function createCachedGeometryCtor(
  Orig: GeometryCtor<GeometryInstance>,
  options: CachedCtorOptions
): GeometryCtor<GeometryInstance> {
  return new Proxy(Orig, {
    construct(target, rawArgs, newTarget): GeometryInstance {
      const plan = options.normalize(rawArgs);
      const cached = readCachedGeometry(options.cache, plan.key);
      if (cached) {
        recordCacheHit(options.stats, options.bucket);
        if (plan.touchMeta !== false) touchMeta(options.touch, options.meta, plan.key);
        updateCacheHighWater(options.stats, options.bucket, options.cache.size);
        return cached;
      }

      recordCacheMiss(options.stats, options.bucket);
      const created = readGeometryInstance(Reflect.construct(target, plan.args, newTarget));
      if (options.maxSize <= 0) return created;
      if (plan.touchMeta !== false) touchMeta(options.touch, options.meta, plan.key);
      const cachedCreated = cacheGeometry(options.cache, plan.key, markCachedGeometry(created));
      trimColdCacheReferences(options.cache, options.meta, options.maxSize, options.stats, options.bucket);
      return cachedCreated;
    },
  });
}

function normalizeAngle(value: unknown, defaultValue: number): number {
  return round6(readNumber(value, defaultValue));
}

function normalizeSegments(value: unknown, defaultValue: number, min: number = 1): number {
  return normalizePositiveInt(value, defaultValue, min);
}

export type InstallGeometryCtorPatchesArgs = {
  THREE: GeometryPatchThreeLike;
  geometryCache: GeometryCacheMap;
  geometryMeta: Map<string, number>;
  geometryLimit: number;
  edgesGeometryCache: GeometryCacheMap;
  edgesMeta: Map<string, number>;
  edgesLimit: number;
  stats: GeometryCacheStats;
  touch: CacheTouchFn;
};

export function installGeometryCtorPatches(args: InstallGeometryCtorPatchesArgs): void {
  const {
    THREE,
    geometryCache,
    geometryMeta,
    geometryLimit,
    edgesGeometryCache,
    edgesMeta,
    edgesLimit,
    stats,
    touch,
  } = args;

  THREE.BoxGeometry = createCachedGeometryCtor(THREE.BoxGeometry, {
    cache: geometryCache,
    meta: geometryMeta,
    touch,
    stats,
    bucket: 'geometry',
    maxSize: geometryLimit,
    normalize(rawArgs) {
      const [w, h, d, sw, sh, sd] = rawArgs;
      const width = round6(readNumber(w, 1));
      const height = round6(readNumber(h, 1));
      const depth = round6(readNumber(d, 1));
      const segW = normalizeSegments(sw, 1);
      const segH = normalizeSegments(sh, 1);
      const segD = normalizeSegments(sd, 1);
      return {
        key: `box:${width}:${height}:${depth}:${segW}:${segH}:${segD}`,
        args: [width, height, depth, segW, segH, segD],
      };
    },
  });

  THREE.PlaneGeometry = createCachedGeometryCtor(THREE.PlaneGeometry, {
    cache: geometryCache,
    meta: geometryMeta,
    touch,
    stats,
    bucket: 'geometry',
    maxSize: geometryLimit,
    normalize(rawArgs) {
      const [w, h, sw, sh] = rawArgs;
      const width = round6(readNumber(w, 1));
      const height = round6(readNumber(h, 1));
      const segW = normalizeSegments(sw, 1);
      const segH = normalizeSegments(sh, 1);
      return {
        key: `plane:${width}:${height}:${segW}:${segH}`,
        args: [width, height, segW, segH],
      };
    },
  });

  THREE.CylinderGeometry = createCachedGeometryCtor(THREE.CylinderGeometry, {
    cache: geometryCache,
    meta: geometryMeta,
    touch,
    stats,
    bucket: 'geometry',
    maxSize: geometryLimit,
    normalize(rawArgs) {
      const [
        radiusTop,
        radiusBottom,
        height,
        radialSegments,
        heightSegments,
        openEnded,
        thetaStart,
        thetaLength,
      ] = rawArgs;
      const top = round6(readNumber(radiusTop, 1));
      const bottom = round6(readNumber(radiusBottom, 1));
      const cylinderHeight = round6(readNumber(height, 1));
      const radialSegs = normalizeSegments(radialSegments, 8, 3);
      const heightSegs = normalizeSegments(heightSegments, 1);
      const isOpenEnded = !!openEnded;
      const thetaStartNorm = normalizeAngle(thetaStart, 0);
      const thetaLengthNorm = normalizeAngle(thetaLength, Math.PI * 2);
      return {
        key: `cyl:${top}:${bottom}:${cylinderHeight}:${radialSegs}:${heightSegs}:${isOpenEnded ? 1 : 0}:${thetaStartNorm}:${thetaLengthNorm}`,
        args: [
          top,
          bottom,
          cylinderHeight,
          radialSegs,
          heightSegs,
          isOpenEnded,
          thetaStartNorm,
          thetaLengthNorm,
        ],
      };
    },
  });

  THREE.SphereGeometry = createCachedGeometryCtor(THREE.SphereGeometry, {
    cache: geometryCache,
    meta: geometryMeta,
    touch,
    stats,
    bucket: 'geometry',
    maxSize: geometryLimit,
    normalize(rawArgs) {
      const [radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength] = rawArgs;
      const sphereRadius = round6(readNumber(radius, 1));
      const widthSegs = normalizeSegments(widthSegments, 32, 3);
      const heightSegs = normalizeSegments(heightSegments, 16, 2);
      const phiStartNorm = normalizeAngle(phiStart, 0);
      const phiLengthNorm = normalizeAngle(phiLength, Math.PI * 2);
      const thetaStartNorm = normalizeAngle(thetaStart, 0);
      const thetaLengthNorm = normalizeAngle(thetaLength, Math.PI);
      return {
        key: `sphere:${sphereRadius}:${widthSegs}:${heightSegs}:${phiStartNorm}:${phiLengthNorm}:${thetaStartNorm}:${thetaLengthNorm}`,
        args: [
          sphereRadius,
          widthSegs,
          heightSegs,
          phiStartNorm,
          phiLengthNorm,
          thetaStartNorm,
          thetaLengthNorm,
        ],
      };
    },
  });

  if (typeof THREE.RoundedBoxGeometry !== 'undefined') {
    THREE.RoundedBoxGeometry = createCachedGeometryCtor(THREE.RoundedBoxGeometry, {
      cache: geometryCache,
      meta: geometryMeta,
      touch,
      stats,
      bucket: 'geometry',
      maxSize: geometryLimit,
      normalize(rawArgs) {
        const [w, h, d, segments, radius] = rawArgs;
        const width = round6(readNumber(w, 1));
        const height = round6(readNumber(h, 1));
        const depth = round6(readNumber(d, 1));
        const segs = normalizeSegments(segments, 1);
        const cornerRadius = round6(readNumber(radius, 0.05));
        return {
          key: `rbox:${width}:${height}:${depth}:${segs}:${cornerRadius}`,
          args: [width, height, depth, segs, cornerRadius],
        };
      },
    });
  }

  THREE.EdgesGeometry = createCachedGeometryCtor(THREE.EdgesGeometry, {
    cache: edgesGeometryCache,
    meta: edgesMeta,
    touch,
    stats,
    bucket: 'edges',
    maxSize: edgesLimit,
    normalize(rawArgs) {
      const geometry = readGeometryInstance(rawArgs[0]);
      const angle = normalizeAngle(rawArgs[1], 1);
      return {
        key: `edges:${geometry.uuid || 'nogeo'}:${angle}`,
        args: [geometry, angle],
      };
    },
  });
}
