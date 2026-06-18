import { assertApp } from '../runtime/api.js';
import { getBuildUIFromPlatform } from '../runtime/platform_access.js';
import { ensureBuilderService, getBuilderAddOutlines } from '../runtime/builder_service_access.js';
import { readRuntimeScalarOrDefaultFromApp } from '../runtime/runtime_selectors.js';
import { assertThreeViaDeps } from '../runtime/three_access.js';

import type {
  AppContainer,
  BuilderOutlineFn,
  BuilderAddFoldedClothesFn,
  BuilderAddHangingClothesFn,
  BuilderAddRealisticHangerFn,
  ConfigStateLike,
  GeometryLike,
  MaterialLike,
  ThreeLike,
  UnknownRecord,
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

export function getVisualsContentsBuildUI(passedApp: unknown): UnknownRecord {
  try {
    const App = asObject(passedApp) ? ensureVisualsContentsApp(passedApp) : null;
    if (!App) return {};
    return getBuildUIFromPlatform(App);
  } catch {
    return {};
  }
}

export function getVisualsContentsAddOutlines(passedApp: unknown): BuilderOutlineFn | null {
  try {
    const App = asObject(passedApp) ? ensureVisualsContentsApp(passedApp) : null;
    return App ? getBuilderAddOutlines(App) : null;
  } catch {
    return null;
  }
}

export function addVisualsContentsOutlines(mesh: unknown, passedApp: unknown) {
  const fn = getVisualsContentsAddOutlines(passedApp);
  if (fn) return fn(mesh);
}

export function readVisualsContentsSketchMode(App: AppContainer): boolean {
  return !!readRuntimeScalarOrDefaultFromApp(App, 'sketchMode', false);
}

export function resolveShowContents(buildUI: UnknownRecord, showContentsOverride?: unknown): boolean {
  if (typeof showContentsOverride !== 'undefined') return !!showContentsOverride;
  if (buildUI && typeof buildUI.showContents !== 'undefined') return !!buildUI.showContents;
  return false;
}

export function resolveLibraryContents(cfgSnapshot: ConfigStateLike): boolean {
  if (!isRecord(cfgSnapshot)) {
    throw new TypeError('[visuals_contents] cfgSnapshot is required');
  }
  return cfgSnapshot.isLibraryMode === true;
}

export function resolveShowHanger(showHangerEnabled: boolean): boolean {
  if (typeof showHangerEnabled !== 'boolean') {
    throw new TypeError('[visuals_contents] showHangerEnabled is required');
  }
  return showHangerEnabled;
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
  return CLOTH_COLORS[Math.floor(r * CLOTH_COLORS.length)];
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
  return BOOK_COLORS[Math.floor(r * BOOK_COLORS.length)];
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
const VISUAL_CONTENT_GEOMETRY_CACHE_LIMIT = 1200;
const VISUAL_CONTENT_MATERIAL_CACHE_LIMIT = 320;
const VISUAL_CONTENT_GEOMETRY_BUCKET_M = 0.001;

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
  return sign * Number(bucketed.toFixed(6));
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
  depth: number
): GeometryLike {
  const cache = readGeometryCache(THREE);
  const key = geometryKey('box', width, height, depth);
  const cached = cache.get(key);
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
  radius: number
): GeometryLike {
  if (typeof THREE.RoundedBoxGeometry === 'undefined')
    return getCachedBoxGeometry(THREE, width, height, depth);
  const cache = readGeometryCache(THREE);
  const key = geometryKey('roundedBox', width, height, depth, segments, radius);
  const cached = cache.get(key);
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
