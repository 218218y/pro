import { assertApp, runPerfPhase } from '../runtime/api.js';
import { ensureBuilderService } from '../runtime/builder_service_access.js';
import { assertThreeViaDeps } from '../runtime/three_access.js';
import {
  intersectAxisAlignedBoxes,
  resolveActiveRoomColumnCutObstacle,
} from './room_architecture_geometry.js';

import type {
  AppContainer,
  BuilderOutlineFn,
  BuilderAddFoldedClothesFn,
  BuilderAddHangingClothesFn,
  BuilderAddRealisticHangerFn,
  BuilderContentsRenderPolicy,
  BuilderContentsVisibilityPolicy,
  BuilderFoldedContentsPolicy,
  BuilderHangerContentsPolicy,
  BuilderHangingContentsPolicy,
  GeometryLike,
  MaterialLike,
  RoomArchitecturePlan,
  ThreeLike,
  UnknownRecord,
  VisualContentGeometryCacheCounterLike,
  VisualContentGeometryCacheStatsLike,
} from '../../../types/index.js';

export type AppAwareAddHangingClothesFn = (
  App: AppContainer,
  ...args: Parameters<BuilderAddHangingClothesFn>
) => ReturnType<BuilderAddHangingClothesFn>;

export type AppAwareAddFoldedClothesFn = (
  App: AppContainer,
  ...args: Parameters<BuilderAddFoldedClothesFn>
) => ReturnType<BuilderAddFoldedClothesFn>;

export type AppAwareAddRealisticHangerFn = (
  App: AppContainer,
  ...args: Parameters<BuilderAddRealisticHangerFn>
) => ReturnType<BuilderAddRealisticHangerFn>;

function isClientVisualContentsBuild(): boolean {
  return typeof __WP_BUILD_CLIENT__ !== 'undefined' && __WP_BUILD_CLIENT__ === true;
}

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

export function asObject(value: unknown): UnknownRecord | null {
  return readRecord(value);
}

export function ensureVisualsContentsApp(passed: unknown): AppContainer {
  const App = assertApp(passed, 'native/builder/visuals_contents.app');
  const builder = ensureBuilderService(App, 'native/builder/visuals_contents');
  builder.modules = asObject(builder.modules) || {};
  builder.contents = asObject(builder.contents) || {};
  return App;
}

export function ensureVisualsContentsTHREE(passedApp: unknown): ThreeLike {
  const App = ensureVisualsContentsApp(passedApp);
  return assertThreeViaDeps(App, 'native/builder/visuals_contents.THREE');
}

export function runVisualContentsPerfPhase<T>(App: AppContainer, name: string, run: () => T): T {
  return runPerfPhase(App, name, 'builder-contents', run);
}

export function visualObjectIntersectsRoomColumnCut(
  roomArchitecturePlan: RoomArchitecturePlan,
  THREE: ThreeLike,
  object: unknown
): boolean {
  const obstacle = resolveActiveRoomColumnCutObstacle(roomArchitecturePlan);
  if (!obstacle || !object || typeof THREE.Box3 !== 'function') return false;

  try {
    const bounds = new THREE.Box3().setFromObject(object);
    const min = bounds?.min;
    const max = bounds?.max;
    const minX = typeof min?.x === 'number' && Number.isFinite(min.x) ? min.x : null;
    const minY = typeof min?.y === 'number' && Number.isFinite(min.y) ? min.y : null;
    const minZ = typeof min?.z === 'number' && Number.isFinite(min.z) ? min.z : null;
    const maxX = typeof max?.x === 'number' && Number.isFinite(max.x) ? max.x : null;
    const maxY = typeof max?.y === 'number' && Number.isFinite(max.y) ? max.y : null;
    const maxZ = typeof max?.z === 'number' && Number.isFinite(max.z) ? max.z : null;
    if (minX == null || minY == null || minZ == null || maxX == null || maxY == null || maxZ == null) {
      return false;
    }
    return !!intersectAxisAlignedBoxes({ minX, maxX, minY, maxY, minZ, maxZ }, obstacle);
  } catch {
    // Detached previews and lightweight tests may not expose full THREE bounds machinery.
    return false;
  }
}

export function requireContentsRenderPolicy(policy: unknown): BuilderContentsRenderPolicy {
  if (!isRecord(policy) || typeof policy.sketchMode !== 'boolean') {
    throw new TypeError('[visuals_contents] sketchMode policy is required');
  }
  if (policy.addOutlines !== null && typeof policy.addOutlines !== 'function') {
    throw new TypeError('[visuals_contents] addOutlines policy must be a function or null');
  }
  return policy as BuilderContentsRenderPolicy;
}

export function resolveContentsOutline(policy: BuilderContentsRenderPolicy): BuilderOutlineFn | null {
  const renderPolicy = requireContentsRenderPolicy(policy);
  return renderPolicy.sketchMode ? renderPolicy.addOutlines : null;
}

function requireContentsVisibilityPolicy(
  policy: BuilderContentsVisibilityPolicy
): BuilderContentsVisibilityPolicy {
  if (!isRecord(policy) || typeof policy.showContentsEnabled !== 'boolean') {
    throw new TypeError('[visuals_contents] showContentsEnabled policy is required');
  }
  return policy;
}

export function resolveShowContents(policy: BuilderContentsVisibilityPolicy): boolean {
  const visibilityPolicy = requireContentsVisibilityPolicy(policy);
  requireContentsRenderPolicy(policy);
  return visibilityPolicy.showContentsEnabled;
}

export function resolveLibraryContents(policy: BuilderFoldedContentsPolicy): boolean {
  requireContentsVisibilityPolicy(policy);
  const cfgSnapshot = policy.cfgSnapshot;
  if (!isRecord(cfgSnapshot)) {
    throw new TypeError('[visuals_contents] cfgSnapshot is required');
  }
  return cfgSnapshot.isLibraryMode === true;
}

export function resolveContentsDoorStyle(policy: BuilderHangingContentsPolicy): string {
  requireContentsVisibilityPolicy(policy);
  if (typeof policy.doorStyle !== 'string') {
    throw new TypeError('[visuals_contents] doorStyle policy is required');
  }
  return policy.doorStyle;
}

export function resolveShowHanger(policy: BuilderHangerContentsPolicy): boolean {
  if (!isRecord(policy) || typeof policy.showHangerEnabled !== 'boolean') {
    throw new TypeError('[visuals_contents] showHangerEnabled is required');
  }
  requireContentsRenderPolicy(policy);
  return policy.showHangerEnabled;
}

export const seededRandom = (function () {
  let _seed = 1234;
  return {
    setSeed(s: number) {
      _seed = s % 2147483647;
      if (_seed <= 0) _seed += 2147483646;
    },
    random() {
      _seed = (_seed * 16807) % 2147483647;
      return (_seed - 1) / 2147483646;
    },
  };
})();

export const CLOTH_COLORS = [
  0x2c3e50, 0x8e44ad, 0x27ae60, 0xc0392b, 0xd35400, 0x7f8c8d, 0xbdc3c7, 0xf5f5dc, 0x1abc9c, 0x34495e,
  0xecf0f1,
];

export function getRandomClothColor() {
  const r = typeof seededRandom.random === 'function' ? seededRandom.random() : Math.random();
  return CLOTH_COLORS[Math.floor(r * CLOTH_COLORS.length)] ?? CLOTH_COLORS[0] ?? 0x2c3e50;
}

export const BOOK_COLORS = [
  0x7a3e2e, 0x2f5d7c, 0x476a34, 0x8a6f2a, 0x5a3f7a, 0x8c3d4b, 0x36454f, 0xb08d57, 0x6b4e31, 0x1f4e5f,
  0x9a4f2f, 0x3f6f5f,
];

export const BOOK_SET_PALETTES = Object.freeze([
  Object.freeze([0x5a2f24, 0x6f3b2d, 0x7a3e2e]),
  Object.freeze([0x1f4e5f, 0x2f5d7c, 0x24485f]),
  Object.freeze([0x476a34, 0x3f6f5f, 0x31542f]),
  Object.freeze([0x6b4e31, 0x8a6f2a, 0xb08d57]),
  Object.freeze([0x36454f, 0x4a5562, 0x5a3f7a]),
  Object.freeze([0x8c3d4b, 0x9a4f2f, 0x6a2f3a]),
]);

export const BOOK_SPINE_BAND_COLORS = Object.freeze([0xd6b45d, 0xc8a64f, 0xe8d9a5, 0xf2ead2]);

export function getRandomBookColor() {
  const r = typeof seededRandom.random === 'function' ? seededRandom.random() : Math.random();
  return BOOK_COLORS[Math.floor(r * BOOK_COLORS.length)] ?? BOOK_COLORS[0] ?? 0x8b5a2b;
}

export function getRandomBookSetPalette(): readonly number[] {
  const r = typeof seededRandom.random === 'function' ? seededRandom.random() : Math.random();
  return BOOK_SET_PALETTES[Math.floor(r * BOOK_SET_PALETTES.length)] || BOOK_COLORS;
}

export function getBookSetColor(palette: readonly number[], volumeIndex: number): number {
  if (!palette.length) return getRandomBookColor();
  const accentRoll = typeof seededRandom.random === 'function' ? seededRandom.random() : Math.random();
  const paletteIndex = accentRoll > 0.88 ? (volumeIndex + 1) % palette.length : 0;
  return palette[paletteIndex] ?? palette[0] ?? getRandomBookColor();
}

export function getRandomBookSpineBandColor(): number {
  const r = typeof seededRandom.random === 'function' ? seededRandom.random() : Math.random();
  return BOOK_SPINE_BAND_COLORS[Math.floor(r * BOOK_SPINE_BAND_COLORS.length)] || 0xd6b45d;
}

type ThreeCacheHost = object;

const GEOMETRY_CACHE_BY_THREE = new WeakMap<ThreeCacheHost, Map<string, GeometryLike>>();
const MATERIAL_CACHE_BY_THREE = new WeakMap<ThreeCacheHost, Map<string, MaterialLike>>();
const GEOMETRY_CACHE_PERF_STATS_BY_THREE = new WeakMap<ThreeCacheHost, MutableGeometryCachePerfStats>();
const VISUAL_CONTENT_GEOMETRY_CACHE_LIMIT = 1200;
const VISUAL_CONTENT_MATERIAL_CACHE_LIMIT = 320;
const VISUAL_CONTENT_GEOMETRY_BUCKET_M = 0.001;

type MutableGeometryCacheCounter = {
  lookups: number;
  hits: number;
  misses: number;
  uniqueKeys: Set<string>;
};

type MutableGeometryCachePerfStats = {
  geometryCacheSizeAtReset: number;
  box: MutableGeometryCacheCounter;
  roundedBox: MutableGeometryCacheCounter;
  byUsage: Map<string, MutableGeometryCacheCounter>;
};

function createGeometryCacheCounter(): MutableGeometryCacheCounter {
  return { lookups: 0, hits: 0, misses: 0, uniqueKeys: new Set<string>() };
}

function createGeometryCachePerfStats(geometryCacheSizeAtReset: number): MutableGeometryCachePerfStats {
  return {
    geometryCacheSizeAtReset,
    box: createGeometryCacheCounter(),
    roundedBox: createGeometryCacheCounter(),
    byUsage: new Map<string, MutableGeometryCacheCounter>(),
  };
}

function readGeometryCachePerfStats(THREE: ThreeLike): MutableGeometryCachePerfStats {
  const host = readThreeCacheHost(THREE);
  let stats = GEOMETRY_CACHE_PERF_STATS_BY_THREE.get(host);
  if (!stats) {
    stats = createGeometryCachePerfStats(readGeometryCache(THREE).size);
    GEOMETRY_CACHE_PERF_STATS_BY_THREE.set(host, stats);
  }
  return stats;
}

function recordGeometryCacheLookup(
  THREE: ThreeLike,
  kind: 'box' | 'roundedBox',
  key: string,
  hit: boolean,
  usage?: string
): void {
  if (isClientVisualContentsBuild()) return;
  const stats = readGeometryCachePerfStats(THREE);
  const counters = [stats[kind]];
  const normalizedUsage = typeof usage === 'string' ? usage.trim() : '';
  if (normalizedUsage) {
    let usageCounter = stats.byUsage.get(normalizedUsage);
    if (!usageCounter) {
      usageCounter = createGeometryCacheCounter();
      stats.byUsage.set(normalizedUsage, usageCounter);
    }
    counters.push(usageCounter);
  }
  for (const counter of counters) {
    counter.lookups += 1;
    if (hit) counter.hits += 1;
    else counter.misses += 1;
    counter.uniqueKeys.add(key);
  }
}

function snapshotGeometryCacheCounter(
  counter: MutableGeometryCacheCounter
): VisualContentGeometryCacheCounterLike {
  return {
    lookups: counter.lookups,
    hits: counter.hits,
    misses: counter.misses,
    uniqueKeys: counter.uniqueKeys.size,
  };
}

export function getVisualContentGeometryCachePerfStats(
  App: AppContainer
): VisualContentGeometryCacheStatsLike | null {
  if (isClientVisualContentsBuild()) return null;
  const THREE = ensureVisualsContentsTHREE(App);
  const stats = readGeometryCachePerfStats(THREE);
  return {
    geometryCacheSize: readGeometryCache(THREE).size,
    geometryCacheSizeAtReset: stats.geometryCacheSizeAtReset,
    materialCacheSize: readMaterialCache(THREE).size,
    box: snapshotGeometryCacheCounter(stats.box),
    roundedBox: snapshotGeometryCacheCounter(stats.roundedBox),
    byUsage: Object.fromEntries(
      Array.from(stats.byUsage.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([usage, counter]) => [usage, snapshotGeometryCacheCounter(counter)])
    ),
  };
}

export function resetVisualContentGeometryCachePerfStats(
  App: AppContainer
): VisualContentGeometryCacheStatsLike | null {
  if (isClientVisualContentsBuild()) return null;
  const THREE = ensureVisualsContentsTHREE(App);
  const before = getVisualContentGeometryCachePerfStats(App);
  GEOMETRY_CACHE_PERF_STATS_BY_THREE.set(
    readThreeCacheHost(THREE),
    createGeometryCachePerfStats(readGeometryCache(THREE).size)
  );
  return before;
}

function readThreeCacheHost(THREE: ThreeLike): ThreeCacheHost {
  return THREE as unknown as ThreeCacheHost;
}

function readGeometryCache(THREE: ThreeLike): Map<string, GeometryLike> {
  const host = readThreeCacheHost(THREE);
  let cache = GEOMETRY_CACHE_BY_THREE.get(host);
  if (!cache) {
    cache = new Map<string, GeometryLike>();
    GEOMETRY_CACHE_BY_THREE.set(host, cache);
  }
  return cache;
}

function readMaterialCache(THREE: ThreeLike): Map<string, MaterialLike> {
  const host = readThreeCacheHost(THREE);
  let cache = MATERIAL_CACHE_BY_THREE.get(host);
  if (!cache) {
    cache = new Map<string, MaterialLike>();
    MATERIAL_CACHE_BY_THREE.set(host, cache);
  }
  return cache;
}

export function quantizeVisualContentMetric(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const sign = value < 0 ? -1 : 1;
  const absValue = Math.abs(value);
  const bucketed = Math.floor(absValue / VISUAL_CONTENT_GEOMETRY_BUCKET_M) * VISUAL_CONTENT_GEOMETRY_BUCKET_M;
  return (sign * Math.round(bucketed * 1_000_000)) / 1_000_000;
}

function geometryKey(kind: string, ...values: Array<number | string | boolean | undefined>): string {
  return `${kind}:${values
    .map(value => (typeof value === 'number' ? quantizeVisualContentMetric(value) : String(value)))
    .join(':')}`;
}

function putBoundedCacheValue<T>(cache: Map<string, T>, key: string, value: T, limit: number): T {
  if (cache.size >= limit && !cache.has(key)) {
    const oldestKey = cache.keys().next().value;
    if (typeof oldestKey === 'string') cache.delete(oldestKey);
  }
  cache.set(key, value);
  return value;
}

export function getCachedMeshStandardMaterial(
  THREE: ThreeLike,
  key: string,
  opts: UnknownRecord
): MaterialLike {
  const cache = readMaterialCache(THREE);
  const fullKey = `std:${key}`;
  const cached = cache.get(fullKey);
  if (cached) return cached;
  const material = new THREE.MeshStandardMaterial(opts);
  material.userData = material.userData || {};
  material.userData.__sharedVisualContentMaterial = true;
  return putBoundedCacheValue(cache, fullKey, material, VISUAL_CONTENT_MATERIAL_CACHE_LIMIT);
}

export function getCachedBoxGeometry(
  THREE: ThreeLike,
  width: number,
  height: number,
  depth: number,
  usage?: string
): GeometryLike {
  const cache = readGeometryCache(THREE);
  const key = geometryKey('box', width, height, depth);
  const cached = cache.get(key);
  recordGeometryCacheLookup(THREE, 'box', key, !!cached, usage);
  if (cached) return cached;
  const geometry = new THREE.BoxGeometry(
    quantizeVisualContentMetric(width),
    quantizeVisualContentMetric(height),
    quantizeVisualContentMetric(depth)
  );
  geometry.userData = geometry.userData || {};
  geometry.userData.__sharedVisualContentGeometry = true;
  return putBoundedCacheValue(cache, key, geometry, VISUAL_CONTENT_GEOMETRY_CACHE_LIMIT);
}

export function getCachedRoundedBoxGeometry(
  THREE: ThreeLike,
  width: number,
  height: number,
  depth: number,
  segments: number,
  radius: number,
  usage?: string
): GeometryLike {
  if (typeof THREE.RoundedBoxGeometry === 'undefined')
    return getCachedBoxGeometry(THREE, width, height, depth, usage);
  const cache = readGeometryCache(THREE);
  const key = geometryKey('roundedBox', width, height, depth, segments, radius);
  const cached = cache.get(key);
  recordGeometryCacheLookup(THREE, 'roundedBox', key, !!cached, usage);
  if (cached) return cached;
  const geometry = new THREE.RoundedBoxGeometry(
    quantizeVisualContentMetric(width),
    quantizeVisualContentMetric(height),
    quantizeVisualContentMetric(depth),
    segments,
    quantizeVisualContentMetric(radius)
  );
  geometry.userData = geometry.userData || {};
  geometry.userData.__sharedVisualContentGeometry = true;
  return putBoundedCacheValue(cache, key, geometry, VISUAL_CONTENT_GEOMETRY_CACHE_LIMIT);
}

export function getCachedCylinderGeometry(
  THREE: ThreeLike,
  radiusTop: number,
  radiusBottom: number,
  height: number,
  radialSegments: number
): GeometryLike {
  const cache = readGeometryCache(THREE);
  const key = geometryKey('cylinder', radiusTop, radiusBottom, height, radialSegments);
  const cached = cache.get(key);
  if (cached) return cached;
  const geometry = new THREE.CylinderGeometry(
    quantizeVisualContentMetric(radiusTop),
    quantizeVisualContentMetric(radiusBottom),
    quantizeVisualContentMetric(height),
    radialSegments
  );
  geometry.userData = geometry.userData || {};
  geometry.userData.__sharedVisualContentGeometry = true;
  return putBoundedCacheValue(cache, key, geometry, VISUAL_CONTENT_GEOMETRY_CACHE_LIMIT);
}

export function getCachedTorusGeometry(
  THREE: ThreeLike,
  radius: number,
  tube: number,
  radialSegments: number,
  tubularSegments: number,
  arc: number
): GeometryLike {
  const cache = readGeometryCache(THREE);
  const key = geometryKey('torus', radius, tube, radialSegments, tubularSegments, arc);
  const cached = cache.get(key);
  if (cached) return cached;
  const geometry = new THREE.TorusGeometry(
    quantizeVisualContentMetric(radius),
    quantizeVisualContentMetric(tube),
    radialSegments,
    tubularSegments,
    quantizeVisualContentMetric(arc)
  );
  geometry.userData = geometry.userData || {};
  geometry.userData.__sharedVisualContentGeometry = true;
  return putBoundedCacheValue(cache, key, geometry, VISUAL_CONTENT_GEOMETRY_CACHE_LIMIT);
}

export function getCachedExtrudeGeometry(
  THREE: ThreeLike,
  key: string,
  createShape: () => unknown,
  opts: UnknownRecord
): GeometryLike {
  const cache = readGeometryCache(THREE);
  const fullKey = `extrude:${key}`;
  const cached = cache.get(fullKey);
  if (cached) return cached;
  const geometry = new THREE.ExtrudeGeometry(createShape(), opts);
  geometry.userData = geometry.userData || {};
  geometry.userData.__sharedVisualContentGeometry = true;
  return putBoundedCacheValue(cache, fullKey, geometry, VISUAL_CONTENT_GEOMETRY_CACHE_LIMIT);
}
