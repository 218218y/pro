import type { Object3DLike, ThreeLike, UnknownRecord } from '../../../types/index.js';

import { readConfigBoolFromApp } from './config_selectors.js';
import { readRuntimeConfigNumberFromApp } from './runtime_config_selectors.js';
import { getDoorsArray, getRenderSlot, setRenderSlot } from './render_access_surface.js';
import { getUiFeedback } from './service_access.js';
import { ensureRenderMetaArray } from './render_access_state_bags.js';
import type { PlanarReflectorState } from './planar_reflector_contracts.js';
import {
  isPlanarMirrorSurface,
  isPlanarReflectorBudgetSurface,
  readPlanarReflectorCacheKey,
  readPlanarReflectorMirrorUserData,
  readPlanarReflectorState,
} from './planar_reflector_state.js';
import { readTrackedPlanarMirrorStats } from './planar_reflector_refresh_runtime.js';
import {
  consumePlanarReflectorWarmCacheEntry,
  copyPlanarReflectorWarmTextureMatrix,
} from './planar_reflector_warm_cache.js';

export type { PlanarMirrorRefreshOptions, PlanarMirrorRefreshResult } from './planar_reflector_contracts.js';
export {
  readTrackedPlanarMirrorStats,
  refreshTrackedPlanarMirrorSurfacesNow,
} from './planar_reflector_refresh_runtime.js';
export {
  capturePlanarReflectorWarmCache,
  finalizePlanarReflectorWarmCache,
} from './planar_reflector_warm_cache.js';
export { isPlanarMirrorSurface } from './planar_reflector_state.js';

const DEFAULT_REFLECTOR_LONG_EDGE = 1024;
const DEFAULT_REFLECTOR_MIN_EDGE = 384;
const DEFAULT_REFLECTOR_SMALL_LONG_EDGE = 512;
const DEFAULT_REFLECTOR_MEDIUM_LONG_EDGE = 768;
const DEFAULT_REFLECTOR_SHARED_LONG_EDGE = 640;
const DEFAULT_REFLECTOR_MAX_COUNT = 8;
const DEFAULT_REFLECTOR_CLIP_BIAS = 0.003;
const DEFAULT_REFLECTOR_MULTISAMPLE = 4;
const DEFAULT_REFLECTOR_COLOR = 0xa3a3a3;
const DEFAULT_REFLECTOR_BRIGHTNESS = 1.04;
const DEFAULT_REFLECTOR_SURFACE_GAP_M = 0.004;
const DEFAULT_REFLECTOR_SURFACE_INSET_M = 0.006;
const DEFAULT_REFLECTOR_EDGE_FEATHER_UV = 0.012;
const DEFAULT_REFLECTOR_SLIDING_INNER_SURFACE_GAP_M = 0.006;
const DEFAULT_REFLECTOR_SLIDING_INNER_SURFACE_INSET_X_M = 0.032;
const DEFAULT_REFLECTOR_SLIDING_INNER_EDGE_FEATHER_UV = 0.012;
const DEFAULT_REFLECTOR_SLIDING_OCCLUSION_CLEARANCE_M = 0.024;
const DEFAULT_REFLECTOR_SLIDING_OCCLUSION_FEATHER_UV = 0.01;
const DEFAULT_REFLECTOR_POLYGON_OFFSET_FACTOR = -2;
const DEFAULT_REFLECTOR_POLYGON_OFFSET_UNITS = -8;
const DEFAULT_REFLECTOR_BACKING_COLOR = 0x6f7f88;

const REFLECTOR_VERTEX_SHADER = `
uniform mat4 textureMatrix;
varying vec4 vUv;
varying vec2 vMirrorUv;
#include <common>
#include <logdepthbuf_pars_vertex>
void main() {
  vUv = textureMatrix * vec4(position, 1.0);
  vMirrorUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  #include <logdepthbuf_vertex>
}
`;

const REFLECTOR_FRAGMENT_SHADER = `
uniform vec3 color;
uniform sampler2D tDiffuse;
uniform float opacity;
uniform float brightness;
uniform float edgeFeather;
uniform float clipLeftUv;
uniform float clipRightUv;
uniform float occlusionFeather;
varying vec4 vUv;
varying vec2 vMirrorUv;
#include <common>
#include <logdepthbuf_pars_fragment>
float blendOverlay(float base, float blend) {
  return base < 0.5
    ? (2.0 * base * blend)
    : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend));
}
vec3 blendOverlay(vec3 base, vec3 blend) {
  return vec3(
    blendOverlay(base.r, blend.r),
    blendOverlay(base.g, blend.g),
    blendOverlay(base.b, blend.b)
  );
}
void main() {
  #include <logdepthbuf_fragment>
  vec4 reflected = texture2DProj(tDiffuse, vUv);
  vec3 reflectedColor = blendOverlay(reflected.rgb, color) * brightness;
  vec2 edgeUv = min(vMirrorUv, 1.0 - vMirrorUv);
  float edgeMask = min(edgeUv.x, edgeUv.y);
  float edgeAlpha = smoothstep(0.0, max(edgeFeather, 0.0001), edgeMask);
  float clipFeather = max(occlusionFeather, 0.0001);
  float clipLeftAlpha = smoothstep(clipLeftUv, clipLeftUv + clipFeather, vMirrorUv.x);
  float clipRightAlpha = 1.0 - smoothstep(clipRightUv - clipFeather, clipRightUv, vMirrorUv.x);
  float clipAlpha = clamp(clipLeftAlpha * clipRightAlpha, 0.0, 1.0);
  gl_FragColor = vec4(reflectedColor, opacity * edgeAlpha * clipAlpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <dithering_fragment>
}
`;

const PLANAR_CUBE_MODE_RENDER_SLOT = '__mirrorPlanarCubeMode';
const PLANAR_CUBE_MODE_NOTIFIED_RENDER_SLOT = '__mirrorPlanarCubeModeNotified';

function hasNotifiedPlanarReflectorCubeMode(App: unknown): boolean {
  return getRenderSlot<boolean>(App, PLANAR_CUBE_MODE_NOTIFIED_RENDER_SLOT) === true;
}

function setPlanarReflectorCubeModeNotified(App: unknown, value: boolean): void {
  setRenderSlot(App, PLANAR_CUBE_MODE_NOTIFIED_RENDER_SLOT, value === true);
}

function notifyPlanarReflectorCubeMode(App: unknown): void {
  if (hasNotifiedPlanarReflectorCubeMode(App)) return;
  setPlanarReflectorCubeModeNotified(App, true);
  try {
    getUiFeedback(App).toast(
      'כל המראות הועברו זמנית למראה פשוטה (cube) כדי לשמור על ביצועים. כשהכמות לא תחרוג מהמגבלה, הן יחזרו למראה ממשית.',
      'info'
    );
  } catch {
    // User feedback is best-effort; the render path is already safe.
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function readFn<T extends (...args: never[]) => unknown>(obj: UnknownRecord | null, key: string): T | null {
  const fn = obj ? obj[key] : null;
  return typeof fn === 'function' ? (fn as T) : null;
}

function call0(ctx: unknown, fn: unknown): unknown {
  return typeof fn === 'function' ? Reflect.apply(fn, ctx, []) : undefined;
}

function call1(ctx: unknown, fn: unknown, a: unknown): unknown {
  return typeof fn === 'function' ? Reflect.apply(fn, ctx, [a]) : undefined;
}

function call3(ctx: unknown, fn: unknown, a: unknown, b: unknown, c: unknown): unknown {
  return typeof fn === 'function' ? Reflect.apply(fn, ctx, [a, b, c]) : undefined;
}

function clampNumber(value: unknown, defaultValue: number, min: number, max: number): number {
  const num = typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;
  return Math.max(min, Math.min(max, num));
}

function readMirrorSlidingLane(mirror: unknown): 'inner' | 'outer' | null {
  const lane = readPlanarReflectorMirrorUserData(mirror)?.__wpMirrorSlidingLane;
  return lane === 'inner' ? 'inner' : lane === 'outer' ? 'outer' : null;
}

function isSlidingInnerMirrorSurface(mirror: unknown): boolean {
  return readMirrorSlidingLane(mirror) === 'inner';
}

function countInstalledPlanarReflectors(App: unknown): number {
  const mirrors = ensureRenderMetaArray<UnknownRecord>(App, 'mirrors');
  let count = 0;
  const seen = new Set<UnknownRecord>();
  for (let i = 0; i < mirrors.length; i += 1) {
    const mirror = readRecord(mirrors[i]);
    if (!mirror || seen.has(mirror)) continue;
    seen.add(mirror);
    if (isPlanarMirrorSurface(mirror)) count += 1;
  }
  return count;
}

function countTrackedMirrorSurfaces(App: unknown): number {
  const mirrors = ensureRenderMetaArray<UnknownRecord>(App, 'mirrors');
  let count = 0;
  const seen = new Set<UnknownRecord>();
  for (let i = 0; i < mirrors.length; i += 1) {
    const mirror = readRecord(mirrors[i]);
    if (!mirror || seen.has(mirror)) continue;
    seen.add(mirror);
    if (isPlanarReflectorBudgetSurface(mirror)) count += 1;
  }
  return count;
}

function resolveMaxPlanarReflectors(App: unknown): number {
  return Math.max(
    1,
    Math.floor(readRuntimeConfigNumberFromApp(App, 'MIRROR_REFLECTOR_MAX_COUNT', DEFAULT_REFLECTOR_MAX_COUNT))
  );
}

function disablePlanarReflectorCubeMode(
  App: unknown,
  opts?: { markDirty?: boolean | null; resetNotification?: boolean | null }
): boolean {
  if (!isPlanarReflectorCubeMode(App)) return false;
  setRenderSlot(App, PLANAR_CUBE_MODE_RENDER_SLOT, false);
  if (opts?.resetNotification === true) setPlanarReflectorCubeModeNotified(App, false);
  if (opts?.markDirty !== false) {
    setRenderSlot(App, '__mirrorDirty', true);
    setRenderSlot(App, '__mirrorWorkPending', true);
    setRenderSlot(App, '__mirrorPlanarBatchPending', false);
    setRenderSlot(App, '__mirrorPlanarInitialBatchPending', false);
    setRenderSlot(App, '__mirrorPlanarCursorIndex', 0);
  }
  return true;
}

function recoverPlanarReflectorCubeModeIfAffordable(App: unknown, maxReflectors: number): boolean {
  if (!isPlanarReflectorCubeMode(App)) return false;
  if (countTrackedMirrorSurfaces(App) > maxReflectors) return false;
  return disablePlanarReflectorCubeMode(App, { markDirty: false });
}

export function finalizePlanarReflectorCubeModeRecovery(App: unknown): boolean {
  const maxReflectors = resolveMaxPlanarReflectors(App);
  const stats = readTrackedPlanarMirrorStats(App);
  if (stats.mirrorCount > maxReflectors) return false;

  if (isPlanarReflectorCubeMode(App)) {
    return disablePlanarReflectorCubeMode(App, {
      markDirty: stats.mirrorCount > 0,
      resetNotification: true,
    });
  }

  if (hasNotifiedPlanarReflectorCubeMode(App)) {
    setPlanarReflectorCubeModeNotified(App, false);
    return true;
  }
  return false;
}

function requiredReflectorConstructorsAvailable(THREE: ThreeLike): boolean {
  return (
    typeof THREE.WebGLRenderTarget === 'function' &&
    typeof THREE.PerspectiveCamera === 'function' &&
    typeof THREE.ShaderMaterial === 'function' &&
    typeof THREE.Matrix4 === 'function' &&
    typeof THREE.Vector3 === 'function' &&
    typeof THREE.Vector4 === 'function' &&
    typeof THREE.Plane === 'function'
  );
}

function readColorOption(App: unknown): unknown {
  const raw = readRuntimeConfigNumberFromApp(App, 'MIRROR_REFLECTOR_COLOR', DEFAULT_REFLECTOR_COLOR);
  return Number.isFinite(raw) ? raw : DEFAULT_REFLECTOR_COLOR;
}

function readReflectorBrightness(App: unknown): number {
  return clampNumber(
    readRuntimeConfigNumberFromApp(App, 'MIRROR_REFLECTOR_BRIGHTNESS', DEFAULT_REFLECTOR_BRIGHTNESS),
    DEFAULT_REFLECTOR_BRIGHTNESS,
    0.85,
    1.15
  );
}

function resolveReflectorEdgeFeatherUv(App: unknown, mirror?: unknown): number {
  const defaultValue = isSlidingInnerMirrorSurface(mirror)
    ? DEFAULT_REFLECTOR_SLIDING_INNER_EDGE_FEATHER_UV
    : DEFAULT_REFLECTOR_EDGE_FEATHER_UV;
  const configKey = isSlidingInnerMirrorSurface(mirror)
    ? 'MIRROR_REFLECTOR_SLIDING_INNER_EDGE_FEATHER_UV'
    : 'MIRROR_REFLECTOR_EDGE_FEATHER_UV';
  return clampNumber(readRuntimeConfigNumberFromApp(App, configKey, defaultValue), defaultValue, 0, 0.04);
}

function resolveSlidingOcclusionClearanceM(App: unknown): number {
  return clampNumber(
    readRuntimeConfigNumberFromApp(
      App,
      'MIRROR_REFLECTOR_SLIDING_OCCLUSION_CLEARANCE_M',
      DEFAULT_REFLECTOR_SLIDING_OCCLUSION_CLEARANCE_M
    ),
    DEFAULT_REFLECTOR_SLIDING_OCCLUSION_CLEARANCE_M,
    0,
    0.04
  );
}

function resolveSlidingOcclusionFeatherUv(App: unknown): number {
  return clampNumber(
    readRuntimeConfigNumberFromApp(
      App,
      'MIRROR_REFLECTOR_SLIDING_OCCLUSION_FEATHER_UV',
      DEFAULT_REFLECTOR_SLIDING_OCCLUSION_FEATHER_UV
    ),
    DEFAULT_REFLECTOR_SLIDING_OCCLUSION_FEATHER_UV,
    0,
    0.04
  );
}

function resolveReflectorPolygonOffsetFactor(App: unknown): number {
  return clampNumber(
    readRuntimeConfigNumberFromApp(
      App,
      'MIRROR_REFLECTOR_POLYGON_OFFSET_FACTOR',
      DEFAULT_REFLECTOR_POLYGON_OFFSET_FACTOR
    ),
    DEFAULT_REFLECTOR_POLYGON_OFFSET_FACTOR,
    -8,
    0
  );
}

function resolveReflectorPolygonOffsetUnits(App: unknown): number {
  return clampNumber(
    readRuntimeConfigNumberFromApp(
      App,
      'MIRROR_REFLECTOR_POLYGON_OFFSET_UNITS',
      DEFAULT_REFLECTOR_POLYGON_OFFSET_UNITS
    ),
    DEFAULT_REFLECTOR_POLYGON_OFFSET_UNITS,
    -32,
    0
  );
}

function createReflectorMaterial(
  App: unknown,
  THREE: ThreeLike,
  texture: unknown,
  textureMatrix: unknown,
  mirror?: unknown
): UnknownRecord | null {
  try {
    const material = readRecord(
      new THREE.ShaderMaterial({
        name: 'WardrobeProPlanarReflector',
        uniforms: {
          color: { value: new THREE.Color(readColorOption(App)) },
          tDiffuse: { value: texture },
          textureMatrix: { value: textureMatrix },
          opacity: { value: 1.0 },
          brightness: { value: readReflectorBrightness(App) },
          edgeFeather: { value: resolveReflectorEdgeFeatherUv(App, mirror) },
          clipLeftUv: { value: 0.0 },
          clipRightUv: { value: 1.0 },
          occlusionFeather: { value: 0.0 },
        },
        vertexShader: REFLECTOR_VERTEX_SHADER,
        fragmentShader: REFLECTOR_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: resolveReflectorPolygonOffsetFactor(App),
        polygonOffsetUnits: resolveReflectorPolygonOffsetUnits(App),
        side: THREE.FrontSide,
      })
    );
    if (!material) return null;
    material.userData = readRecord(material.userData) || {};
    (material.userData as UnknownRecord).__keepMaterial = true;
    (material.userData as UnknownRecord).__wpPlanarReflectorMaterial = true;
    return material;
  } catch {
    return null;
  }
}

function readMirrorDimensionM(mirror: Object3DLike, axis: 'width' | 'height'): number {
  const userData = readRecord(mirror.userData);
  const userKey = axis === 'width' ? '__mirrorWidthM' : '__mirrorHeightM';
  const userValue = userData?.[userKey];
  if (typeof userValue === 'number' && Number.isFinite(userValue) && userValue > 0) return userValue;

  const meshRecord = readRecord(mirror);
  const geometry = readRecord(meshRecord?.geometry);
  const parameters = readRecord(geometry?.parameters);
  const parameterKey = axis === 'width' ? 'width' : 'height';
  const parameterValue = parameters?.[parameterKey];
  return typeof parameterValue === 'number' && Number.isFinite(parameterValue) && parameterValue > 0
    ? parameterValue
    : 1;
}

function resolveConfiguredReflectorLongEdge(App: unknown): number {
  const configuredLongEdge = readRuntimeConfigNumberFromApp(
    App,
    'MIRROR_REFLECTOR_LONG_EDGE',
    DEFAULT_REFLECTOR_LONG_EDGE
  );
  return Math.floor(clampNumber(configuredLongEdge, DEFAULT_REFLECTOR_LONG_EDGE, 256, 1536));
}

function resolveReflectorLongEdge(App: unknown, mirror: Object3DLike, installedPlanarCount: number): number {
  const configuredLongEdge = resolveConfiguredReflectorLongEdge(App);
  const mirrorWidth = readMirrorDimensionM(mirror, 'width');
  const mirrorHeight = readMirrorDimensionM(mirror, 'height');
  const mirrorLongM = Math.max(mirrorWidth, mirrorHeight);
  const mirrorAreaM2 = mirrorWidth * mirrorHeight;
  let adaptiveLongEdge = configuredLongEdge;

  if (mirrorLongM <= 0.75 || mirrorAreaM2 <= 0.45) {
    adaptiveLongEdge = Math.min(adaptiveLongEdge, DEFAULT_REFLECTOR_SMALL_LONG_EDGE);
  } else if (mirrorLongM <= 1.45 || mirrorAreaM2 <= 1.2) {
    adaptiveLongEdge = Math.min(adaptiveLongEdge, DEFAULT_REFLECTOR_MEDIUM_LONG_EDGE);
  }

  if (installedPlanarCount >= 4) {
    adaptiveLongEdge = Math.min(adaptiveLongEdge, DEFAULT_REFLECTOR_SHARED_LONG_EDGE);
  } else if (installedPlanarCount >= 2) {
    adaptiveLongEdge = Math.min(adaptiveLongEdge, DEFAULT_REFLECTOR_MEDIUM_LONG_EDGE);
  }

  return Math.floor(clampNumber(adaptiveLongEdge, configuredLongEdge, 256, 1536));
}

function resolveReflectorTargetSize(
  App: unknown,
  mirror: Object3DLike,
  installedPlanarCount: number
): { width: number; height: number } {
  const longEdge = resolveReflectorLongEdge(App, mirror, installedPlanarCount);
  const minEdge = Math.min(
    longEdge,
    Math.floor(
      clampNumber(
        readRuntimeConfigNumberFromApp(App, 'MIRROR_REFLECTOR_MIN_EDGE', DEFAULT_REFLECTOR_MIN_EDGE),
        DEFAULT_REFLECTOR_MIN_EDGE,
        128,
        768
      )
    )
  );
  const mirrorWidth = readMirrorDimensionM(mirror, 'width');
  const mirrorHeight = readMirrorDimensionM(mirror, 'height');
  const aspect = mirrorWidth / Math.max(0.001, mirrorHeight);
  const width = aspect >= 1 ? longEdge : Math.max(minEdge, Math.round(longEdge * Math.max(0.1, aspect)));
  const height = aspect >= 1 ? Math.max(minEdge, Math.round(longEdge / Math.max(0.1, aspect))) : longEdge;
  return {
    width: Math.max(128, Math.min(1536, width)),
    height: Math.max(128, Math.min(1536, height)),
  };
}

function resolveReflectorMultisample(App: unknown): number {
  return Math.floor(
    clampNumber(
      readRuntimeConfigNumberFromApp(App, 'MIRROR_REFLECTOR_MULTISAMPLE', DEFAULT_REFLECTOR_MULTISAMPLE),
      DEFAULT_REFLECTOR_MULTISAMPLE,
      0,
      8
    )
  );
}

function makeReflectorRenderTarget(
  App: unknown,
  THREE: ThreeLike,
  mirror: Object3DLike,
  installedPlanarCount: number
): UnknownRecord | null {
  try {
    const size = resolveReflectorTargetSize(App, mirror, installedPlanarCount);
    const options: UnknownRecord = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      generateMipmaps: false,
      samples: resolveReflectorMultisample(App),
    };
    if (THREE.HalfFloatType) options.type = THREE.HalfFloatType;
    const target = readRecord(new THREE.WebGLRenderTarget(size.width, size.height, options));
    const texture = readRecord(target?.texture);
    if (texture) texture.name = 'WardrobePro.PlanarMirrorReflector';
    return target;
  } catch {
    return null;
  }
}

function readBoxGeometryParameters(mirror: Object3DLike): UnknownRecord | null {
  const meshRecord = readRecord(mirror);
  const geometry = readRecord(meshRecord?.geometry);
  const parameters = readRecord(geometry?.parameters);
  return typeof parameters?.width === 'number' &&
    typeof parameters?.height === 'number' &&
    typeof parameters?.depth === 'number'
    ? parameters
    : null;
}

function readEdgeMaterial(original: unknown, defaultMaterial: UnknownRecord): unknown {
  if (Array.isArray(original)) {
    for (let i = 0; i < original.length; i += 1) {
      const material = readRecord(original[i]);
      if (material && readRecord(material.userData)?.__wpPlanarReflectorMaterial !== true) return material;
    }
  }
  return readRecord(original) || defaultMaterial;
}

function cloneStableMirrorBackingMaterial(THREE: ThreeLike, original: unknown): UnknownRecord | null {
  const source = readEdgeMaterial(original, {});
  let material: UnknownRecord | null = null;
  try {
    const clone = readFn<() => unknown>(readRecord(source), 'clone');
    material = readRecord(clone ? call0(source, clone) : null);
  } catch {
    material = null;
  }

  if (!material && typeof THREE.MeshBasicMaterial === 'function') {
    try {
      material = readRecord(new THREE.MeshBasicMaterial({ color: DEFAULT_REFLECTOR_BACKING_COLOR }));
    } catch {
      material = null;
    }
  }

  if (!material) return null;
  const userData = readRecord(material.userData) || {};
  material.userData = userData;
  userData.__keepMaterial = true;
  userData.__wpPlanarReflectorBackingMaterial = true;

  try {
    if ('envMap' in material) material.envMap = null;
    if ('reflectivity' in material) material.reflectivity = 0;
    if ('metalness' in material) material.metalness = 0;
    if ('roughness' in material) material.roughness = 1;
    if ('clearcoat' in material) material.clearcoat = 0;
    if ('clearcoatRoughness' in material) material.clearcoatRoughness = 1;
    if ('opacity' in material) material.opacity = 1;
    if ('transparent' in material) material.transparent = false;
    if ('depthWrite' in material) material.depthWrite = true;
    if ('polygonOffset' in material) material.polygonOffset = false;
    if (THREE.FrontSide && 'side' in material) material.side = THREE.FrontSide;
    const color = readRecord(material.color);
    if (color && typeof color.set === 'function') call1(color, color.set, DEFAULT_REFLECTOR_BACKING_COLOR);
    const needsUpdate = 'needsUpdate' in material;
    if (needsUpdate) material.needsUpdate = true;
  } catch {
    // Keep the cloned material as a stable non-reflector backing even if some optional fields are read-only.
  }

  return material;
}

function writeStableBoxBackingMaterial(THREE: ThreeLike, mirror: Object3DLike): boolean {
  if (!readBoxGeometryParameters(mirror)) return false;
  try {
    const originalMaterial = Reflect.get(mirror, 'material');
    const backingMaterial = cloneStableMirrorBackingMaterial(THREE, originalMaterial);
    if (!backingMaterial) return false;
    Reflect.set(mirror, 'material', [
      backingMaterial,
      backingMaterial,
      backingMaterial,
      backingMaterial,
      backingMaterial,
      backingMaterial,
    ]);
    return true;
  } catch {
    return false;
  }
}

function readFiniteNumber(value: unknown): number | null {
  const num = typeof value === 'number' ? value : value != null ? Number(value) : NaN;
  return Number.isFinite(num) ? num : null;
}

function readPositionAxis(obj: UnknownRecord | null, axis: 'x' | 'y' | 'z'): number {
  const position = readRecord(obj?.position);
  const value = position ? readFiniteNumber(position[axis]) : null;
  return value == null ? 0 : value;
}

function readWorldAxisPosition(obj: unknown, axis: 'x' | 'y' | 'z'): number {
  let cursor = readRecord(obj);
  let total = 0;
  let guard = 0;
  while (cursor && guard < 64) {
    total += readPositionAxis(cursor, axis);
    cursor = readRecord(cursor.parent);
    guard += 1;
  }
  return total;
}

function findSlidingDoorRoot(obj: unknown): UnknownRecord | null {
  let cursor = readRecord(obj);
  let guard = 0;
  while (cursor && guard < 64) {
    const userData = readRecord(cursor.userData);
    if (userData?.__doorType === 'sliding') return cursor;
    cursor = readRecord(cursor.parent);
    guard += 1;
  }
  return null;
}

function readDoorEntryGroup(entry: unknown): UnknownRecord | null {
  return readRecord(readRecord(entry)?.group);
}

function findSlidingDoorEntryForGroup(App: unknown, group: UnknownRecord | null): UnknownRecord | null {
  if (!group) return null;
  const doors = getDoorsArray(App);
  for (let i = 0; i < doors.length; i += 1) {
    const entry = readRecord(doors[i]);
    if (!entry || entry.type !== 'sliding') continue;
    if (readDoorEntryGroup(entry) === group) return entry;
  }
  return null;
}

function readSlidingDoorEntryWidth(entry: UnknownRecord): number | null {
  const direct = readFiniteNumber(entry.width);
  if (direct != null && direct > 0) return direct;
  const groupUserData = readRecord(readDoorEntryGroup(entry)?.userData);
  const fromGroup = readFiniteNumber(groupUserData?.__doorWidth);
  return fromGroup != null && fromGroup > 0 ? fromGroup : null;
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function writeReflectorClipUniforms(
  state: PlanarReflectorState,
  clipLeftUv: number,
  clipRightUv: number,
  occlusionFeather: number
): void {
  const uniforms = readRecord(state.material.uniforms);
  const leftUniform = readRecord(uniforms?.clipLeftUv);
  const rightUniform = readRecord(uniforms?.clipRightUv);
  const featherUniform = readRecord(uniforms?.occlusionFeather);
  if (leftUniform) leftUniform.value = clipLeftUv;
  if (rightUniform) rightUniform.value = clipRightUv;
  if (featherUniform) featherUniform.value = occlusionFeather;
}

function readReflectorSurfaceWidthM(state: PlanarReflectorState, mirror: Object3DLike): number {
  const surfaceUserData = readRecord(readRecord(state.surfaceObject)?.userData);
  const fromSurface = readFiniteNumber(surfaceUserData?.__wpPlanarReflectorSurfaceWidthM);
  if (fromSurface != null && fromSurface > 0) return fromSurface;
  return Math.max(0.001, readMirrorDimensionM(mirror, 'width'));
}

function syncSlidingInnerReflectorOcclusionClip(
  App: unknown,
  mirror: Object3DLike,
  state: PlanarReflectorState
): void {
  if (!isSlidingInnerMirrorSurface(mirror)) {
    writeReflectorClipUniforms(state, 0, 1, 0);
    return;
  }

  const innerGroup = findSlidingDoorRoot(mirror);
  const innerEntry = findSlidingDoorEntryForGroup(App, innerGroup);
  if (!innerGroup || !innerEntry) {
    writeReflectorClipUniforms(state, 0, 1, 0);
    return;
  }

  const surface = readRecord(state.surfaceObject) || readRecord(mirror);
  const surfaceWidth = readReflectorSurfaceWidthM(state, mirror);
  if (!(surfaceWidth > 0)) {
    writeReflectorClipUniforms(state, 0, 1, 0);
    return;
  }

  const mirrorCenterX = readWorldAxisPosition(surface, 'x');
  const surfaceMinX = mirrorCenterX - surfaceWidth / 2;
  const surfaceMaxX = mirrorCenterX + surfaceWidth / 2;
  const innerZ = readWorldAxisPosition(innerGroup, 'z');
  const clearance = resolveSlidingOcclusionClearanceM(App);

  let visibleMinX = surfaceMinX;
  let visibleMaxX = surfaceMaxX;
  let clipped = false;
  const doors = getDoorsArray(App);

  for (let i = 0; i < doors.length; i += 1) {
    const candidate = readRecord(doors[i]);
    if (!candidate || candidate === innerEntry || candidate.type !== 'sliding') continue;
    const candidateGroup = readDoorEntryGroup(candidate);
    if (!candidateGroup || candidateGroup === innerGroup || candidateGroup.visible === false) continue;
    const candidateUserData = readRecord(candidateGroup.userData);
    if (candidateUserData?.__wpDoorRemoved === true) continue;

    const candidateZ = readWorldAxisPosition(candidateGroup, 'z');
    if (!(candidateZ > innerZ + 0.001)) continue;

    const candidateWidth = readSlidingDoorEntryWidth(candidate);
    if (!(candidateWidth != null && candidateWidth > 0)) continue;
    const candidateCenterX = readWorldAxisPosition(candidateGroup, 'x');
    const candidateMinX = candidateCenterX - candidateWidth / 2;
    const candidateMaxX = candidateCenterX + candidateWidth / 2;
    const overlapMinX = Math.max(surfaceMinX, candidateMinX);
    const overlapMaxX = Math.min(surfaceMaxX, candidateMaxX);
    if (!(overlapMaxX > overlapMinX + 0.001)) continue;

    clipped = true;
    if (candidateCenterX >= mirrorCenterX) {
      visibleMaxX = Math.min(visibleMaxX, overlapMinX - clearance);
    } else {
      visibleMinX = Math.max(visibleMinX, overlapMaxX + clearance);
    }
  }

  if (!clipped) {
    const surfaceObject = readRecord(state.surfaceObject);
    if (surfaceObject) surfaceObject.visible = true;
    writeReflectorClipUniforms(state, 0, 1, 0);
    return;
  }

  const clipLeftUv = clamp01((visibleMinX - surfaceMinX) / surfaceWidth);
  const clipRightUv = clamp01((visibleMaxX - surfaceMinX) / surfaceWidth);
  const surfaceObject = readRecord(state.surfaceObject);
  if (surfaceObject) surfaceObject.visible = clipRightUv > clipLeftUv + 0.002;
  writeReflectorClipUniforms(state, clipLeftUv, clipRightUv, resolveSlidingOcclusionFeatherUv(App));
}

function writeMirrorMaterial(mirror: Object3DLike, material: UnknownRecord, faceSign: number): boolean {
  try {
    const originalMaterial = Reflect.get(mirror, 'material');
    if (readBoxGeometryParameters(mirror)) {
      const edgeMaterial = readEdgeMaterial(originalMaterial, material);
      Reflect.set(mirror, 'material', [
        edgeMaterial,
        edgeMaterial,
        edgeMaterial,
        edgeMaterial,
        faceSign < 0 ? edgeMaterial : material,
        faceSign < 0 ? material : edgeMaterial,
      ]);
      return true;
    }
    Reflect.set(mirror, 'material', material);
    return true;
  } catch {
    return false;
  }
}

function resolveReflectorSurfaceGapM(App: unknown, mirror?: unknown): number {
  const defaultValue = isSlidingInnerMirrorSurface(mirror)
    ? DEFAULT_REFLECTOR_SLIDING_INNER_SURFACE_GAP_M
    : DEFAULT_REFLECTOR_SURFACE_GAP_M;
  const configKey = isSlidingInnerMirrorSurface(mirror)
    ? 'MIRROR_REFLECTOR_SLIDING_INNER_SURFACE_GAP_M'
    : 'MIRROR_REFLECTOR_SURFACE_GAP_M';
  return clampNumber(readRuntimeConfigNumberFromApp(App, configKey, defaultValue), defaultValue, 0.001, 0.02);
}

function resolveReflectorSurfaceInsetM(App: unknown, mirror?: unknown, axis: 'x' | 'y' = 'x'): number {
  const defaultValue =
    isSlidingInnerMirrorSurface(mirror) && axis === 'x'
      ? DEFAULT_REFLECTOR_SLIDING_INNER_SURFACE_INSET_X_M
      : DEFAULT_REFLECTOR_SURFACE_INSET_M;
  const configKey =
    isSlidingInnerMirrorSurface(mirror) && axis === 'x'
      ? 'MIRROR_REFLECTOR_SLIDING_INNER_SURFACE_INSET_X_M'
      : 'MIRROR_REFLECTOR_SURFACE_INSET_M';
  return clampNumber(readRuntimeConfigNumberFromApp(App, configKey, defaultValue), defaultValue, 0, 0.06);
}

function makeBoxReflectorSurfacePlane(args: {
  App: unknown;
  THREE: ThreeLike;
  mirror: Object3DLike;
  material: UnknownRecord;
  originalMaterial?: unknown;
  faceSign: number;
}): UnknownRecord | null {
  const { App, THREE, mirror, material, faceSign } = args;
  const parameters = readBoxGeometryParameters(mirror);
  if (!parameters || typeof THREE.PlaneGeometry !== 'function' || typeof THREE.Mesh !== 'function')
    return null;
  const boxWidth = Number(parameters.width);
  const boxHeight = Number(parameters.height);
  const boxDepth = Number(parameters.depth);
  if (!Number.isFinite(boxWidth) || !Number.isFinite(boxHeight) || !Number.isFinite(boxDepth)) return null;
  if (boxWidth <= 0 || boxHeight <= 0 || boxDepth <= 0) return null;

  try {
    const insetX = Math.min(
      resolveReflectorSurfaceInsetM(App, mirror, 'x'),
      Math.max(0, boxWidth / 2 - 0.001)
    );
    const insetY = Math.min(
      resolveReflectorSurfaceInsetM(App, mirror, 'y'),
      Math.max(0, boxHeight / 2 - 0.001)
    );
    const surfaceWidth = Math.max(0.001, boxWidth - insetX * 2);
    const surfaceHeight = Math.max(0.001, boxHeight - insetY * 2);
    const geometry = new THREE.PlaneGeometry(surfaceWidth, surfaceHeight);
    const surface = readRecord(new THREE.Mesh(geometry, material));
    if (!surface) return null;

    surface.name = `${typeof mirror.name === 'string' && mirror.name ? mirror.name : 'mirror'}__planar_reflector_surface`;
    const surfaceUserData = readRecord(surface.userData) || {};
    surface.userData = surfaceUserData;
    surfaceUserData.__keepMaterial = true;
    surfaceUserData.__wpPlanarReflectorSurface = true;
    surfaceUserData.__wpPlanarReflectorSurfaceWidthM = surfaceWidth;
    surfaceUserData.__wpPlanarReflectorSurfaceHeightM = surfaceHeight;
    surfaceUserData.__wpPlanarReflectorSurfaceInsetXM = insetX;
    surfaceUserData.__wpPlanarReflectorSurfaceInsetYM = insetY;
    surface.raycast = function () {};
    writeStableBoxBackingMaterial(THREE, mirror);
    const sign = faceSign < 0 ? -1 : 1;
    const surfacePosition = readRecord(surface.position);
    call3(
      surfacePosition,
      surfacePosition?.set,
      0,
      0,
      sign * (boxDepth / 2 + resolveReflectorSurfaceGapM(App, mirror))
    );
    const surfaceRotation = readRecord(surface.rotation);
    if (sign < 0 && surfaceRotation) surfaceRotation.y = Math.PI;
    if (typeof mirror.renderOrder === 'number') surface.renderOrder = mirror.renderOrder + 0.001;
    call1(mirror, mirror.add, surface);
    return surface;
  } catch {
    return null;
  }
}

function installReflectorSurfaceMaterial(args: {
  App: unknown;
  THREE: ThreeLike;
  mirror: Object3DLike;
  material: UnknownRecord;
  originalMaterial?: unknown;
  faceSign: number;
}): { surfaceObject: UnknownRecord; normalSign: number } | null {
  const surfacePlane = makeBoxReflectorSurfacePlane(args);
  if (surfacePlane) return { surfaceObject: surfacePlane, normalSign: 1 };
  if (!writeMirrorMaterial(args.mirror, args.material, args.faceSign)) return null;
  return { surfaceObject: args.mirror, normalSign: args.faceSign < 0 ? -1 : 1 };
}

function isPlanarReflectorCubeMode(App: unknown): boolean {
  return getRenderSlot<boolean>(App, PLANAR_CUBE_MODE_RENDER_SLOT) === true;
}

function callDispose(value: unknown): void {
  const record = readRecord(value);
  const dispose = readFn<() => unknown>(record, 'dispose');
  if (dispose) call0(record, dispose);
}

function detachReflectorSurface(mirror: UnknownRecord, surface: UnknownRecord): void {
  if (surface === mirror) return;
  const parent = readRecord(surface.parent) || mirror;
  const remove = readFn<(object: unknown) => unknown>(parent, 'remove');
  if (remove) call1(parent, remove, surface);
}

function restoreCubeMirrorMaterial(mirror: UnknownRecord, state: PlanarReflectorState): void {
  const userData = readRecord(mirror.userData);
  const surface = readRecord(state.surfaceObject);
  if (surface) detachReflectorSurface(mirror, surface);
  if (Object.prototype.hasOwnProperty.call(state, 'originalMaterial')) {
    try {
      Reflect.set(mirror, 'material', state.originalMaterial);
    } catch {
      // The cube updater can still refresh any material already present on the mirror mesh.
    }
  }
  if (userData) delete userData.__wpPlanarReflector;
  callDispose(state.renderTarget);
  callDispose(state.material);
  callDispose(readRecord(surface?.geometry));
}

export function enablePlanarReflectorCubeMode(App: unknown, opts?: { notify?: boolean | null }): boolean {
  setRenderSlot(App, PLANAR_CUBE_MODE_RENDER_SLOT, true);
  const mirrors = ensureRenderMetaArray<UnknownRecord>(App, 'mirrors');
  let changed = false;
  const seen = new Set<UnknownRecord>();
  for (let i = 0; i < mirrors.length; i += 1) {
    const mirror = readRecord(mirrors[i]);
    if (!mirror || seen.has(mirror)) continue;
    seen.add(mirror);
    const state = readPlanarReflectorState(mirror);
    if (!state) continue;
    restoreCubeMirrorMaterial(mirror, state);
    changed = true;
  }
  setRenderSlot(App, '__mirrorDirty', true);
  setRenderSlot(App, '__mirrorWorkPending', true);
  setRenderSlot(App, '__mirrorPlanarBatchPending', false);
  setRenderSlot(App, '__mirrorPlanarInitialBatchPending', false);
  if (opts?.notify === true) notifyPlanarReflectorCubeMode(App);
  return changed;
}

export function installPlanarMirrorReflector(
  App: unknown,
  THREE: ThreeLike,
  mirrorMesh: Object3DLike,
  opts?: {
    faceSign?: number | null;
    sketchMode?: boolean | null;
  }
): boolean {
  if (!mirrorMesh || opts?.sketchMode === true) return false;
  if (!readConfigBoolFromApp(App, 'MIRROR_REFLECTOR_ENABLED', true)) return false;
  const maxReflectors = resolveMaxPlanarReflectors(App);
  recoverPlanarReflectorCubeModeIfAffordable(App, maxReflectors);
  if (isPlanarReflectorCubeMode(App)) return false;
  if (!requiredReflectorConstructorsAvailable(THREE)) return false;

  const userData = readRecord(mirrorMesh.userData) || {};
  mirrorMesh.userData = userData;
  if (readPlanarReflectorState(mirrorMesh)) return true;

  const installedPlanarCount = countInstalledPlanarReflectors(App);
  if (installedPlanarCount >= maxReflectors) {
    enablePlanarReflectorCubeMode(App, { notify: true });
    return false;
  }

  const originalMaterial = Reflect.get(mirrorMesh, 'material');
  const cacheKey = readPlanarReflectorCacheKey(mirrorMesh);
  const warmed = consumePlanarReflectorWarmCacheEntry(App, cacheKey);
  const target =
    readRecord(warmed?.renderTarget) ||
    makeReflectorRenderTarget(App, THREE, mirrorMesh, installedPlanarCount);
  if (!target) return false;

  const textureMatrix = readRecord(new THREE.Matrix4());
  const virtualCamera = readRecord(new THREE.PerspectiveCamera());
  if (!textureMatrix || !virtualCamera) return false;
  const restoredWarmTextureMatrix = warmed
    ? copyPlanarReflectorWarmTextureMatrix(textureMatrix, warmed.textureMatrix)
    : false;

  const material = createReflectorMaterial(App, THREE, target.texture, textureMatrix, mirrorMesh);
  if (!material) return false;
  const faceSign = opts?.faceSign === -1 ? -1 : 1;
  const surfaceInstall = installReflectorSurfaceMaterial({
    App,
    THREE,
    mirror: mirrorMesh,
    material,
    originalMaterial,
    faceSign,
  });
  if (!surfaceInstall) return false;

  const reflectorWorldPosition = readRecord(new THREE.Vector3());
  const cameraWorldPosition = readRecord(new THREE.Vector3());
  const rotationMatrix = readRecord(new THREE.Matrix4());
  const normal = readRecord(new THREE.Vector3());
  const view = readRecord(new THREE.Vector3());
  const targetVector = readRecord(new THREE.Vector3());
  const lookAtPosition = readRecord(new THREE.Vector3(0, 0, -1));
  const clipPlane = readRecord(new THREE.Vector4());
  const reflectorPlane = readRecord(new THREE.Plane());
  const q = readRecord(new THREE.Vector4());
  if (
    !reflectorWorldPosition ||
    !cameraWorldPosition ||
    !rotationMatrix ||
    !normal ||
    !view ||
    !targetVector ||
    !lookAtPosition ||
    !clipPlane ||
    !reflectorPlane ||
    !q
  ) {
    return false;
  }

  const state: PlanarReflectorState = {
    renderTarget: target,
    virtualCamera,
    textureMatrix,
    material,
    originalMaterial,
    faceSign,
    normalSign: surfaceInstall.normalSign,
    clipBias: clampNumber(
      readRuntimeConfigNumberFromApp(App, 'MIRROR_REFLECTOR_CLIP_BIAS', DEFAULT_REFLECTOR_CLIP_BIAS),
      DEFAULT_REFLECTOR_CLIP_BIAS,
      0,
      0.05
    ),
    updateCount:
      warmed && restoredWarmTextureMatrix ? Math.max(1, Math.floor(Number(warmed.updateCount) || 1)) : 0,
    surfaceObject: surfaceInstall.surfaceObject,
    reflectorWorldPosition,
    cameraWorldPosition,
    rotationMatrix,
    normal,
    view,
    targetVector,
    lookAtPosition,
    clipPlane,
    reflectorPlane,
    q,
    ...(cacheKey ? { cacheKey } : {}),
  };

  const surfaceObject = readRecord(surfaceInstall.surfaceObject);
  if (surfaceObject) {
    surfaceObject.onBeforeRender = function () {
      syncSlidingInnerReflectorOcclusionClip(App, mirrorMesh, state);
    };
  }
  syncSlidingInnerReflectorOcclusionClip(App, mirrorMesh, state);

  userData.__wpPlanarReflector = state;
  userData.__wpMirrorSurface = true;
  return true;
}
