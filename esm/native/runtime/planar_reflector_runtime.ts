import type { Object3DLike, ThreeLike, UnknownRecord } from '../../../types/index.js';

import { readConfigBoolFromApp, readConfigNumberLooseFromApp } from './config_selectors.js';
import { getCamera, getRenderer, getScene } from './render_access_surface.js';
import { ensureRenderMetaArray } from './render_access_state_bags.js';

const DEFAULT_REFLECTOR_LONG_EDGE = 1024;
const DEFAULT_REFLECTOR_MIN_EDGE = 384;
const DEFAULT_REFLECTOR_MAX_COUNT = 8;
const DEFAULT_REFLECTOR_CLIP_BIAS = 0.003;
const DEFAULT_REFLECTOR_MULTISAMPLE = 4;
const DEFAULT_REFLECTOR_COLOR = 0x7f7f7f;
const DEFAULT_REFLECTOR_BRIGHTNESS = 1.04;
const DEFAULT_REFLECTOR_SURFACE_GAP_M = 0.004;
const DEFAULT_REFLECTOR_SURFACE_INSET_M = 0.006;
const DEFAULT_REFLECTOR_EDGE_FEATHER_UV = 0.012;
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
  gl_FragColor = vec4(reflectedColor, opacity * edgeAlpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <dithering_fragment>
}
`;

type PlanarReflectorState = UnknownRecord & {
  renderTarget: UnknownRecord;
  virtualCamera: UnknownRecord;
  textureMatrix: UnknownRecord;
  material: UnknownRecord;
  faceSign: number;
  normalSign: number;
  clipBias: number;
  updateCount: number;
  surfaceObject: UnknownRecord;
  reflectorWorldPosition: UnknownRecord;
  cameraWorldPosition: UnknownRecord;
  rotationMatrix: UnknownRecord;
  normal: UnknownRecord;
  view: UnknownRecord;
  targetVector: UnknownRecord;
  lookAtPosition: UnknownRecord;
  clipPlane: UnknownRecord;
  reflectorPlane: UnknownRecord;
  q: UnknownRecord;
};

export type PlanarMirrorRefreshResult = {
  refreshed: boolean;
  mirrorCount: number;
  planarCount: number;
  fallbackCount: number;
  skippedReason: string | null;
};

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

function call2(ctx: unknown, fn: unknown, a: unknown, b: unknown): unknown {
  return typeof fn === 'function' ? Reflect.apply(fn, ctx, [a, b]) : undefined;
}

function call3(ctx: unknown, fn: unknown, a: unknown, b: unknown, c: unknown): unknown {
  return typeof fn === 'function' ? Reflect.apply(fn, ctx, [a, b, c]) : undefined;
}

function call4(ctx: unknown, fn: unknown, a: unknown, b: unknown, c: unknown, d: unknown): unknown {
  return typeof fn === 'function' ? Reflect.apply(fn, ctx, [a, b, c, d]) : undefined;
}

function clampNumber(value: unknown, defaultValue: number, min: number, max: number): number {
  const num = typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;
  return Math.max(min, Math.min(max, num));
}

function readMirrorUserData(mirror: unknown): UnknownRecord | null {
  const rec = readRecord(mirror);
  return readRecord(rec?.userData);
}

function isTaggedMirrorSurface(mirror: unknown): boolean {
  return readMirrorUserData(mirror)?.__wpMirrorSurface === true;
}

function readPlanarReflectorState(mirror: unknown): PlanarReflectorState | null {
  const state = readRecord(readMirrorUserData(mirror)?.__wpPlanarReflector);
  if (!state) return null;
  if (!readRecord(state.renderTarget) || !readRecord(state.virtualCamera)) return null;
  if (!readRecord(state.textureMatrix) || !readRecord(state.material)) return null;
  return state as PlanarReflectorState;
}

export function isPlanarMirrorSurface(mirror: unknown): boolean {
  return !!readPlanarReflectorState(mirror);
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
  const raw = readConfigNumberLooseFromApp(App, 'MIRROR_REFLECTOR_COLOR', DEFAULT_REFLECTOR_COLOR);
  return Number.isFinite(raw) ? raw : DEFAULT_REFLECTOR_COLOR;
}

function readReflectorBrightness(App: unknown): number {
  return clampNumber(
    readConfigNumberLooseFromApp(App, 'MIRROR_REFLECTOR_BRIGHTNESS', DEFAULT_REFLECTOR_BRIGHTNESS),
    DEFAULT_REFLECTOR_BRIGHTNESS,
    0.85,
    1.15
  );
}

function resolveReflectorEdgeFeatherUv(App: unknown): number {
  return clampNumber(
    readConfigNumberLooseFromApp(App, 'MIRROR_REFLECTOR_EDGE_FEATHER_UV', DEFAULT_REFLECTOR_EDGE_FEATHER_UV),
    DEFAULT_REFLECTOR_EDGE_FEATHER_UV,
    0,
    0.04
  );
}

function resolveReflectorPolygonOffsetFactor(App: unknown): number {
  return clampNumber(
    readConfigNumberLooseFromApp(
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
    readConfigNumberLooseFromApp(
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
  textureMatrix: unknown
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
          edgeFeather: { value: resolveReflectorEdgeFeatherUv(App) },
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

function resolveReflectorLongEdge(App: unknown): number {
  const configuredLongEdge = readConfigNumberLooseFromApp(App, 'MIRROR_REFLECTOR_LONG_EDGE', NaN);
  const legacySquareSize = readConfigNumberLooseFromApp(App, 'MIRROR_REFLECTOR_SIZE', NaN);
  return Math.floor(
    clampNumber(
      Number.isFinite(configuredLongEdge)
        ? configuredLongEdge
        : Number.isFinite(legacySquareSize)
          ? legacySquareSize
          : DEFAULT_REFLECTOR_LONG_EDGE,
      DEFAULT_REFLECTOR_LONG_EDGE,
      256,
      1536
    )
  );
}

function resolveReflectorTargetSize(App: unknown, mirror: Object3DLike): { width: number; height: number } {
  const longEdge = resolveReflectorLongEdge(App);
  const minEdge = Math.min(
    longEdge,
    Math.floor(
      clampNumber(
        readConfigNumberLooseFromApp(App, 'MIRROR_REFLECTOR_MIN_EDGE', DEFAULT_REFLECTOR_MIN_EDGE),
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
      readConfigNumberLooseFromApp(App, 'MIRROR_REFLECTOR_MULTISAMPLE', DEFAULT_REFLECTOR_MULTISAMPLE),
      DEFAULT_REFLECTOR_MULTISAMPLE,
      0,
      8
    )
  );
}

function makeReflectorRenderTarget(
  App: unknown,
  THREE: ThreeLike,
  mirror: Object3DLike
): UnknownRecord | null {
  try {
    const size = resolveReflectorTargetSize(App, mirror);
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

function resolveReflectorSurfaceGapM(App: unknown): number {
  return clampNumber(
    readConfigNumberLooseFromApp(App, 'MIRROR_REFLECTOR_SURFACE_GAP_M', DEFAULT_REFLECTOR_SURFACE_GAP_M),
    DEFAULT_REFLECTOR_SURFACE_GAP_M,
    0.001,
    0.02
  );
}

function resolveReflectorSurfaceInsetM(App: unknown): number {
  return clampNumber(
    readConfigNumberLooseFromApp(App, 'MIRROR_REFLECTOR_SURFACE_INSET_M', DEFAULT_REFLECTOR_SURFACE_INSET_M),
    DEFAULT_REFLECTOR_SURFACE_INSET_M,
    0,
    0.03
  );
}

function makeBoxReflectorSurfacePlane(args: {
  App: unknown;
  THREE: ThreeLike;
  mirror: Object3DLike;
  material: UnknownRecord;
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
    const inset = Math.min(
      resolveReflectorSurfaceInsetM(App),
      Math.max(0, boxWidth / 2 - 0.001),
      Math.max(0, boxHeight / 2 - 0.001)
    );
    const surfaceWidth = Math.max(0.001, boxWidth - inset * 2);
    const surfaceHeight = Math.max(0.001, boxHeight - inset * 2);
    const geometry = new THREE.PlaneGeometry(surfaceWidth, surfaceHeight);
    const surface = readRecord(new THREE.Mesh(geometry, material));
    if (!surface) return null;

    surface.name = `${typeof mirror.name === 'string' && mirror.name ? mirror.name : 'mirror'}__planar_reflector_surface`;
    const surfaceUserData = readRecord(surface.userData) || {};
    surface.userData = surfaceUserData;
    surfaceUserData.__keepMaterial = true;
    surfaceUserData.__wpPlanarReflectorSurface = true;
    surface.raycast = function () {};
    writeStableBoxBackingMaterial(THREE, mirror);
    const sign = faceSign < 0 ? -1 : 1;
    const surfacePosition = readRecord(surface.position);
    call3(
      surfacePosition,
      surfacePosition?.set,
      0,
      0,
      sign * (boxDepth / 2 + resolveReflectorSurfaceGapM(App))
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
  faceSign: number;
}): { surfaceObject: UnknownRecord; normalSign: number } | null {
  const surfacePlane = makeBoxReflectorSurfacePlane(args);
  if (surfacePlane) return { surfaceObject: surfacePlane, normalSign: 1 };
  if (!writeMirrorMaterial(args.mirror, args.material, args.faceSign)) return null;
  return { surfaceObject: args.mirror, normalSign: args.faceSign < 0 ? -1 : 1 };
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
  if (!requiredReflectorConstructorsAvailable(THREE)) return false;

  const userData = readRecord(mirrorMesh.userData) || {};
  mirrorMesh.userData = userData;
  if (readPlanarReflectorState(mirrorMesh)) return true;

  const maxReflectors = Math.max(
    1,
    Math.floor(readConfigNumberLooseFromApp(App, 'MIRROR_REFLECTOR_MAX_COUNT', DEFAULT_REFLECTOR_MAX_COUNT))
  );
  if (countInstalledPlanarReflectors(App) >= maxReflectors) return false;

  const target = makeReflectorRenderTarget(App, THREE, mirrorMesh);
  if (!target) return false;

  const textureMatrix = readRecord(new THREE.Matrix4());
  const virtualCamera = readRecord(new THREE.PerspectiveCamera());
  if (!textureMatrix || !virtualCamera) return false;

  const material = createReflectorMaterial(App, THREE, target.texture, textureMatrix);
  if (!material) return false;
  const faceSign = opts?.faceSign === -1 ? -1 : 1;
  const surfaceInstall = installReflectorSurfaceMaterial({
    App,
    THREE,
    mirror: mirrorMesh,
    material,
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
    faceSign,
    normalSign: surfaceInstall.normalSign,
    clipBias: clampNumber(
      readConfigNumberLooseFromApp(App, 'MIRROR_REFLECTOR_CLIP_BIAS', DEFAULT_REFLECTOR_CLIP_BIAS),
      DEFAULT_REFLECTOR_CLIP_BIAS,
      0,
      0.05
    ),
    updateCount: 0,
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
  };

  userData.__wpPlanarReflector = state;
  userData.__wpMirrorSurface = true;
  return true;
}

function getMatrixWorld(obj: UnknownRecord | null): unknown {
  return obj ? obj.matrixWorld : null;
}

function setVector3(target: UnknownRecord | null, x: number, y: number, z: number): void {
  call3(target, target?.set, x, y, z);
}

function copyRecord(target: UnknownRecord | null, source: unknown): void {
  call1(target, target?.copy, source);
}

function invokeLookAt(camera: UnknownRecord | null, target: unknown): void {
  call1(camera, camera?.lookAt, target);
}

function writeReflectorTextureMatrix(textureMatrix: UnknownRecord): void {
  const set = textureMatrix.set;
  if (typeof set !== 'function') return;
  Reflect.apply(
    set,
    textureMatrix,
    [0.5, 0.0, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0, 1.0]
  );
}

function renderPlanarMirrorSurface(args: {
  mirror: UnknownRecord;
  state: PlanarReflectorState;
  renderer: UnknownRecord;
  scene: unknown;
  camera: UnknownRecord;
}): boolean {
  const { mirror, state, renderer, scene, camera } = args;
  const surface = readRecord(state.surfaceObject) || mirror;
  const mirrorVisibleBefore = mirror.visible;
  const rendererShadowMap = readRecord(renderer.shadowMap);
  const previousShadowAutoUpdate = rendererShadowMap ? rendererShadowMap.autoUpdate : undefined;
  const xr = readRecord(renderer.xr);
  const previousXrEnabled = xr ? xr.enabled : undefined;
  const getRenderTarget = readFn(renderer, 'getRenderTarget');
  const setRenderTarget = readFn(renderer, 'setRenderTarget');
  const clear = readFn(renderer, 'clear');
  const render = readFn(renderer, 'render');
  if (!setRenderTarget || !render) return false;
  let previousRenderTarget: unknown = null;
  let renderTargetChanged = false;

  try {
    call1(mirror, mirror.updateMatrixWorld, true);
    call1(surface, surface.updateMatrixWorld, true);
    call1(camera, camera.updateMatrixWorld, true);

    const reflectorWorldPosition = state.reflectorWorldPosition;
    const cameraWorldPosition = state.cameraWorldPosition;
    const rotationMatrix = state.rotationMatrix;
    const normal = state.normal;
    const view = state.view;
    const target = state.targetVector;
    const lookAtPosition = state.lookAtPosition;
    const clipPlane = state.clipPlane;
    const reflectorPlane = state.reflectorPlane;
    const q = state.q;
    const virtualCamera = state.virtualCamera;
    const textureMatrix = state.textureMatrix;

    call1(reflectorWorldPosition, reflectorWorldPosition.setFromMatrixPosition, getMatrixWorld(surface));
    call1(cameraWorldPosition, cameraWorldPosition.setFromMatrixPosition, getMatrixWorld(camera));
    call1(rotationMatrix, rotationMatrix.extractRotation, getMatrixWorld(surface));
    setVector3(normal, 0, 0, state.normalSign < 0 ? -1 : 1);
    call1(normal, normal.applyMatrix4, rotationMatrix);

    call2(view, view.subVectors, reflectorWorldPosition, cameraWorldPosition);
    const dot = typeof view.dot === 'function' ? Number(Reflect.apply(view.dot, view, [normal])) : NaN;
    if (Number.isFinite(dot) && dot > 0) return false;

    call1(view, view.reflect, normal);
    call0(view, view.negate);
    call1(view, view.add, reflectorWorldPosition);

    call1(rotationMatrix, rotationMatrix.extractRotation, getMatrixWorld(camera));
    setVector3(lookAtPosition, 0, 0, -1);
    call1(lookAtPosition, lookAtPosition.applyMatrix4, rotationMatrix);
    call1(lookAtPosition, lookAtPosition.add, cameraWorldPosition);

    call2(target, target.subVectors, reflectorWorldPosition, lookAtPosition);
    call1(target, target.reflect, normal);
    call0(target, target.negate);
    call1(target, target.add, reflectorWorldPosition);

    copyRecord(readRecord(virtualCamera.position), view);
    setVector3(readRecord(virtualCamera.up), 0, 1, 0);
    call1(readRecord(virtualCamera.up), readRecord(virtualCamera.up)?.applyMatrix4, rotationMatrix);
    call1(readRecord(virtualCamera.up), readRecord(virtualCamera.up)?.reflect, normal);
    invokeLookAt(virtualCamera, target);

    virtualCamera.far = camera.far;
    virtualCamera.near = camera.near;
    virtualCamera.aspect = camera.aspect;
    virtualCamera.fov = camera.fov;
    call0(virtualCamera, virtualCamera.updateProjectionMatrix);
    call1(virtualCamera, virtualCamera.updateMatrixWorld, true);
    call1(
      readRecord(virtualCamera.matrixWorldInverse),
      readRecord(virtualCamera.matrixWorldInverse)?.copy,
      virtualCamera.matrixWorld
    );
    call0(readRecord(virtualCamera.matrixWorldInverse), readRecord(virtualCamera.matrixWorldInverse)?.invert);
    call1(
      readRecord(virtualCamera.projectionMatrix),
      readRecord(virtualCamera.projectionMatrix)?.copy,
      camera.projectionMatrix
    );

    writeReflectorTextureMatrix(textureMatrix);
    call1(textureMatrix, textureMatrix.multiply, virtualCamera.projectionMatrix);
    call1(textureMatrix, textureMatrix.multiply, virtualCamera.matrixWorldInverse);
    call1(textureMatrix, textureMatrix.multiply, surface.matrixWorld);

    call2(reflectorPlane, reflectorPlane.setFromNormalAndCoplanarPoint, normal, reflectorWorldPosition);
    call1(reflectorPlane, reflectorPlane.applyMatrix4, virtualCamera.matrixWorldInverse);
    const planeNormal = readRecord(reflectorPlane.normal);
    if (!planeNormal || typeof reflectorPlane.constant !== 'number') return false;
    call4(clipPlane, clipPlane.set, planeNormal.x, planeNormal.y, planeNormal.z, reflectorPlane.constant);

    const projectionMatrix = readRecord(virtualCamera.projectionMatrix);
    const elements = Array.isArray(projectionMatrix?.elements)
      ? (projectionMatrix?.elements as unknown[])
      : null;
    if (!projectionMatrix || !elements) return false;
    const clipX = typeof clipPlane.x === 'number' ? clipPlane.x : 0;
    const clipY = typeof clipPlane.y === 'number' ? clipPlane.y : 0;
    call4(
      q,
      q.set,
      (Math.sign(clipX) + Number(elements[8] || 0)) / Number(elements[0] || 1),
      (Math.sign(clipY) + Number(elements[9] || 0)) / Number(elements[5] || 1),
      -1.0,
      (1.0 + Number(elements[10] || 0)) / Number(elements[14] || 1)
    );
    const denominator =
      typeof clipPlane.dot === 'function' ? Number(Reflect.apply(clipPlane.dot, clipPlane, [q])) : NaN;
    if (!Number.isFinite(denominator) || Math.abs(denominator) < 0.000001) return false;
    call1(clipPlane, clipPlane.multiplyScalar, 2.0 / denominator);
    elements[2] = clipPlane.x;
    elements[6] = clipPlane.y;
    elements[10] = Number(clipPlane.z || 0) + 1.0 - state.clipBias;
    elements[14] = clipPlane.w;

    previousRenderTarget = getRenderTarget ? call0(renderer, getRenderTarget) : null;
    mirror.visible = false;
    if (rendererShadowMap && typeof previousShadowAutoUpdate !== 'undefined') {
      rendererShadowMap.autoUpdate = false;
    }
    if (xr && typeof previousXrEnabled !== 'undefined') xr.enabled = false;
    call1(renderer, setRenderTarget, state.renderTarget);
    renderTargetChanged = true;
    const rendererState = readRecord(renderer.state);
    const depthBuffer = readRecord(readRecord(rendererState?.buffers)?.depth);
    call1(depthBuffer, depthBuffer?.setMask, true);
    call0(renderer, clear);
    call2(renderer, render, scene, virtualCamera);
    call1(renderer, setRenderTarget, previousRenderTarget);
    const viewport = camera.viewport;
    if (typeof viewport !== 'undefined') call1(rendererState, rendererState?.viewport, viewport);
    renderTargetChanged = false;
    state.updateCount += 1;
    return true;
  } catch {
    return false;
  } finally {
    if (renderTargetChanged) call1(renderer, setRenderTarget, previousRenderTarget);
    mirror.visible = mirrorVisibleBefore;
    if (rendererShadowMap && typeof previousShadowAutoUpdate !== 'undefined') {
      rendererShadowMap.autoUpdate = previousShadowAutoUpdate;
    }
    if (xr && typeof previousXrEnabled !== 'undefined') xr.enabled = previousXrEnabled;
  }
}

export function readTrackedPlanarMirrorStats(App: unknown): {
  mirrorCount: number;
  planarCount: number;
  fallbackCount: number;
} {
  const mirrors = ensureRenderMetaArray<UnknownRecord>(App, 'mirrors');
  let mirrorCount = 0;
  let planarCount = 0;
  let fallbackCount = 0;
  const seen = new Set<UnknownRecord>();
  for (let i = 0; i < mirrors.length; i += 1) {
    const mirror = readRecord(mirrors[i]);
    if (!mirror || seen.has(mirror)) continue;
    seen.add(mirror);
    if (!isTaggedMirrorSurface(mirror)) continue;
    mirrorCount += 1;
    if (readPlanarReflectorState(mirror)) planarCount += 1;
    else fallbackCount += 1;
  }
  return { mirrorCount, planarCount, fallbackCount };
}

export function refreshTrackedPlanarMirrorSurfacesNow(App: unknown): PlanarMirrorRefreshResult {
  const result: PlanarMirrorRefreshResult = {
    refreshed: false,
    mirrorCount: 0,
    planarCount: 0,
    fallbackCount: 0,
    skippedReason: null,
  };

  const renderer = readRecord(getRenderer(App));
  const scene = getScene(App);
  const camera = readRecord(getCamera(App));
  if (!renderer || !scene || !camera) {
    result.skippedReason = 'planar-reflector-surface-incomplete';
    return result;
  }

  const mirrors = ensureRenderMetaArray<UnknownRecord>(App, 'mirrors');
  const stats = readTrackedPlanarMirrorStats(App);
  result.mirrorCount = stats.mirrorCount;
  result.planarCount = stats.planarCount;
  result.fallbackCount = stats.fallbackCount;
  if (!result.planarCount) {
    result.skippedReason = 'no-planar-reflector-surfaces';
    return result;
  }

  let refreshedCount = 0;
  for (let i = 0; i < mirrors.length; i += 1) {
    const mirror = readRecord(mirrors[i]);
    if (!mirror || !isTaggedMirrorSurface(mirror)) continue;
    const state = readPlanarReflectorState(mirror);
    if (!state) continue;
    const ok = renderPlanarMirrorSurface({
      mirror,
      state,
      renderer,
      scene,
      camera,
    });
    if (ok) refreshedCount += 1;
  }

  if (refreshedCount > 0) {
    result.refreshed = true;
    return result;
  }
  result.skippedReason = 'planar-reflector-render-failed';
  return result;
}
