import type {
  CameraLike,
  Object3DLike,
  RenderCameraControlsLike,
  RenderCoreSurfaceLike,
} from '../../../types';
import { ensureRenderNamespace, ensureRenderRuntimeState, getWindowMaybe } from '../runtime/api.js';
import { ensureRenderBag as ensureRenderCoreBag } from '../runtime/render_access_shared.js';
import { readConfigLooseScalarFromApp } from '../runtime/config_selectors.js';
import { assertThreeViaDeps } from '../runtime/three_access.js';
import {
  addNode,
  clampNumber,
  cloneVec3Like,
  ensureRendererShadowMap,
  readCameraLike,
  readCameraPosition,
  readControlsLike,
  readControlsTarget,
  readObject3DLike,
  readObject3DWritable,
  readRendererLike,
  readRendererWritable,
  readWebGLRenderTargetLike,
  scalePositionAroundTarget,
  setControlsEnableDamping,
  updateCameraAndControls,
  writeVec3,
} from './render_surface_runtime_support.js';
import type {
  AppLike,
  CameraPoseLike,
  RenderBag,
  SurfaceRecord,
  ThreeRuntime,
  ViewportContainerLike,
} from './render_surface_runtime_support.js';

const DEFAULT_MIRROR_CUBE_SIZE = 256;
const DEFAULT_MAX_PIXEL_RATIO = 1.5;
const DEFAULT_RENDER_ANTIALIAS = true;
const DEFAULT_RENDER_SHADOWS_ENABLED = true;

function readConfigNumber(
  App: AppLike,
  key: 'MIRROR_CUBE_SIZE' | 'PIXEL_RATIO_MAX',
  defaultValue: number
): number {
  const value = readConfigLooseScalarFromApp(App, key, defaultValue);
  if (key === 'MIRROR_CUBE_SIZE') return clampNumber(value, defaultValue, 64, 1024);
  return clampNumber(value, defaultValue, 0.75, 2);
}

function readConfigBoolean(App: AppLike, key: string, defaultValue: boolean): boolean {
  const value = readConfigLooseScalarFromApp(App, key, defaultValue);
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on')
      return true;
    if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off')
      return false;
  }
  return defaultValue;
}

function getRenderBag(App: AppLike): RenderBag {
  ensureRenderNamespace(App);
  ensureRenderRuntimeState(App);
  return ensureRenderCoreBag(App);
}
function getTHREE(App: AppLike): ThreeRuntime {
  return assertThreeViaDeps(App, 'services/render_surface_runtime.THREE');
}
export function getViewportRenderCore(App: AppLike): RenderCoreSurfaceLike | null {
  try {
    const render = getRenderBag(App);
    return render.renderer && render.scene ? { renderer: render.renderer, scene: render.scene } : null;
  } catch {
    return null;
  }
}
export function getViewportCamera(App: AppLike): CameraLike | null {
  try {
    return getRenderBag(App).camera || null;
  } catch {
    return null;
  }
}
export function getViewportCameraControls(App: AppLike): RenderCameraControlsLike | null {
  try {
    const render = getRenderBag(App);
    return render.camera && render.controls ? { camera: render.camera, controls: render.controls } : null;
  } catch {
    return null;
  }
}
export function getViewportWardrobeGroup(App: AppLike): Object3DLike | null {
  try {
    return getRenderBag(App).wardrobeGroup || null;
  } catch {
    return null;
  }
}
export function getViewportRoomGroup(App: AppLike): Object3DLike | null {
  try {
    return getRenderBag(App).roomGroup || null;
  } catch {
    return null;
  }
}
export function stampMirrorLastUpdate(App: AppLike, stampMs?: number): boolean {
  try {
    const render = getRenderBag(App);
    render.__mirrorLastUpdateMs =
      typeof stampMs === 'number' && Number.isFinite(stampMs)
        ? stampMs
        : typeof performance !== 'undefined' && typeof performance.now === 'function'
          ? performance.now()
          : Date.now();
    return true;
  } catch {
    return false;
  }
}
export function snapshotViewportCameraPose(App: AppLike): CameraPoseLike | null {
  try {
    const cc = getViewportCameraControls(App);
    if (!cc) return null;
    return {
      position: cloneVec3Like(readCameraPosition(cc.camera)),
      target: cloneVec3Like(readControlsTarget(cc.controls)),
    };
  } catch {
    return null;
  }
}
export function setViewportCameraPose(
  App: AppLike,
  position: { x: number; y: number; z: number },
  target?: { x: number; y: number; z: number } | null
): boolean {
  try {
    const cc = getViewportCameraControls(App);
    if (!cc) return false;
    const posOk = writeVec3(readCameraPosition(cc.camera), position.x, position.y, position.z);
    const tgtOk = target ? writeVec3(readControlsTarget(cc.controls), target.x, target.y, target.z) : true;
    updateCameraAndControls(cc.camera, cc.controls);
    return !!(posOk && tgtOk);
  } catch {
    return false;
  }
}
export function restoreViewportCameraPose(App: AppLike, pose: CameraPoseLike | null | undefined): boolean {
  if (!pose || !pose.position) return false;
  return setViewportCameraPose(App, pose.position, pose.target || null);
}
export function scaleViewportCameraDistance(App: AppLike, factor: number): boolean {
  try {
    if (!Number.isFinite(factor)) return false;
    const cc = getViewportCameraControls(App);
    if (!cc) return false;
    const changed = scalePositionAroundTarget(
      readCameraPosition(cc.camera),
      readControlsTarget(cc.controls),
      factor
    );
    if (!changed) return false;
    updateCameraAndControls(cc.camera, cc.controls);
    return true;
  } catch {
    return false;
  }
}
export function createViewportSurface(
  App: AppLike,
  opts: { container: ViewportContainerLike }
): SurfaceRecord {
  const container = opts?.container;
  if (!container) throw new Error('[WardrobePro][render_surface_runtime] container is required');
  const render = getRenderBag(App);
  const THREE = getTHREE(App);
  if (typeof THREE.OrbitControls !== 'function')
    throw new Error('[WardrobePro][render_surface_runtime] THREE.OrbitControls is not available');
  const width =
    typeof container.clientWidth === 'number' && container.clientWidth > 0 ? container.clientWidth : 1;
  const height =
    typeof container.clientHeight === 'number' && container.clientHeight > 0 ? container.clientHeight : 1;
  const scene = THREE.Scene ? readObject3DLike(new THREE.Scene()) : null;
  if (!scene) throw new Error('[WardrobePro][render_surface_runtime] THREE.Scene is not available');
  render.scene = scene;
  const mirrorCubeSize = readConfigNumber(App, 'MIRROR_CUBE_SIZE', DEFAULT_MIRROR_CUBE_SIZE);
  if (
    !THREE.WebGLCubeRenderTarget ||
    !THREE.CubeCamera ||
    !THREE.PerspectiveCamera ||
    !THREE.WebGLRenderer ||
    !THREE.Group
  )
    throw new Error(
      '[WardrobePro][render_surface_runtime] required THREE surface constructors are not available'
    );
  const mirrorRenderTarget = readWebGLRenderTargetLike(
    new THREE.WebGLCubeRenderTarget(mirrorCubeSize, {
      generateMipmaps: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    })
  );
  if (!mirrorRenderTarget)
    throw new Error(
      '[WardrobePro][render_surface_runtime] THREE.WebGLCubeRenderTarget did not return a render-target-like instance'
    );
  render.mirrorRenderTarget = mirrorRenderTarget;
  const mirrorCubeCamera = readObject3DLike(new THREE.CubeCamera(0.1, 100, render.mirrorRenderTarget));
  if (!mirrorCubeCamera)
    throw new Error(
      '[WardrobePro][render_surface_runtime] THREE.CubeCamera did not return an Object3D-like instance'
    );
  render.mirrorCubeCamera = mirrorCubeCamera;
  addNode(scene, render.mirrorCubeCamera);
  writeVec3(readObject3DWritable(render.mirrorCubeCamera)?.position, 0, 1.5, 3.0);
  const camera = readCameraLike(new THREE.PerspectiveCamera(45, width / height, 0.1, 100));
  if (!camera)
    throw new Error(
      '[WardrobePro][render_surface_runtime] THREE.PerspectiveCamera did not return a camera-like instance'
    );
  render.camera = camera;
  writeVec3(readCameraPosition(camera), 0, 2.2, 5.5);
  const renderer = readRendererLike(
    new THREE.WebGLRenderer({
      antialias: readConfigBoolean(App, 'RENDER_ANTIALIAS', DEFAULT_RENDER_ANTIALIAS),
      preserveDrawingBuffer: false,
      alpha: true,
    })
  );
  if (!renderer)
    throw new Error(
      '[WardrobePro][render_surface_runtime] THREE.WebGLRenderer did not return a renderer-like instance'
    );
  render.renderer = renderer;
  try {
    const rr = readRendererWritable(renderer);
    if (rr?.setClearColor) rr.setClearColor(0x000000, 0);
    if (rr?.setSize) rr.setSize(width, height);
    const win = getWindowMaybe(App);
    const dpr = win && typeof win.devicePixelRatio === 'number' ? Number(win.devicePixelRatio) : 1;
    const maxPixelRatio = readConfigNumber(App, 'PIXEL_RATIO_MAX', DEFAULT_MAX_PIXEL_RATIO);
    if (rr?.setPixelRatio) rr.setPixelRatio(Math.min(dpr, maxPixelRatio));
    const shadowsEnabled = readConfigBoolean(App, 'RENDER_SHADOWS_ENABLED', DEFAULT_RENDER_SHADOWS_ENABLED);
    ensureRendererShadowMap(renderer, THREE.PCFShadowMap, shadowsEnabled);
    if (typeof container.appendChild === 'function' && rr?.domElement) container.appendChild(rr.domElement);
  } catch {}
  const domElement = readRendererWritable(renderer)?.domElement;
  const controls = readControlsLike(new THREE.OrbitControls(camera, domElement));
  if (!controls)
    throw new Error(
      '[WardrobePro][render_surface_runtime] THREE.OrbitControls did not return a controls-like instance'
    );
  render.controls = controls;
  setControlsEnableDamping(controls, true);
  writeVec3(readControlsTarget(controls), 0, 1.4, 0);
  updateCameraAndControls(camera, controls);
  let wardrobeGroup = render.wardrobeGroup;
  if (!wardrobeGroup) {
    wardrobeGroup = readObject3DLike(new THREE.Group());
    if (!wardrobeGroup)
      throw new Error(
        '[WardrobePro][render_surface_runtime] THREE.Group did not return an Object3D-like instance'
      );
    render.wardrobeGroup = wardrobeGroup;
  }
  if (readObject3DWritable(wardrobeGroup)?.parent !== scene) addNode(scene, wardrobeGroup);
  return {
    scene,
    camera,
    renderer,
    controls,
    wardrobeGroup,
    roomGroup: readObject3DLike(render.roomGroup) || null,
  };
}
