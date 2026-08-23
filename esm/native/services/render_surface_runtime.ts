import type {
  AppContainer,
  CameraLike,
  ControlsLike,
  Object3DLike,
  RenderCameraControlsLike,
  RenderCoreSurfaceLike,
} from '../../../types';
import {
  ensureRenderNamespace,
  ensureRenderRuntimeState,
  getBrowserTimers,
  getWindowMaybe,
  runPerfPhase,
} from '../runtime/api.js';
import { ensureRenderBag as ensureRenderCoreBag } from '../runtime/render_access_shared.js';
import {
  readRuntimeConfigBooleanFromApp,
  readRuntimeConfigNumberFromApp,
} from '../runtime/runtime_config_selectors.js';
import { assertThreeViaDeps } from '../runtime/three_access.js';
import { scheduleAdhesiveGlassStandardShaderWarmupAtStartup } from '../runtime/adhesive_glass_shader_warmup.js';
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
import { reportServiceNonFatal } from './service_error_observability.js';
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

function reportRenderSurfaceNonFatal(App: AppLike, op: string, error: unknown): void {
  reportServiceNonFatal(App as AppContainer, error, { where: 'renderSurface', op }, { consoleOutput: false });
}

function renderSurfaceOperationError(op: string, detail: string): Error {
  return new Error(`[WardrobePro][renderSurface] ${op}: ${detail}`);
}

function restoreCameraPoseBestEffort(
  camera: CameraLike,
  controls: ControlsLike,
  position: { x: number; y: number; z: number },
  target: { x: number; y: number; z: number } | null
): void {
  writeVec3(readCameraPosition(camera), position.x, position.y, position.z);
  if (target) writeVec3(readControlsTarget(controls), target.x, target.y, target.z);
  updateCameraAndControls(camera, controls);
}

function readConfigNumber(
  App: AppLike,
  key: 'MIRROR_CUBE_SIZE' | 'PIXEL_RATIO_MAX',
  defaultValue: number
): number {
  const value = readRuntimeConfigNumberFromApp(App, key, defaultValue);
  if (key === 'MIRROR_CUBE_SIZE') return clampNumber(value, defaultValue, 64, 1024);
  return clampNumber(value, defaultValue, 0.75, 2);
}

function readConfigBoolean(
  App: AppLike,
  key: 'RENDER_ANTIALIAS' | 'RENDER_SHADOWS_ENABLED',
  defaultValue: boolean
): boolean {
  return readRuntimeConfigBooleanFromApp(App, key, defaultValue);
}

function getRenderBag(App: AppLike): RenderBag {
  ensureRenderNamespace(App);
  ensureRenderRuntimeState(App);
  return ensureRenderCoreBag(App);
}
function getTHREE(App: AppLike): ThreeRuntime {
  return assertThreeViaDeps(App, 'services/render_surface_runtime.THREE');
}
export function getViewportAnimationTimers(App: AppLike): ReturnType<typeof getBrowserTimers> {
  return getBrowserTimers(App);
}

export function getViewportThree(App: AppLike): ThreeRuntime | null {
  try {
    return getTHREE(App);
  } catch (error) {
    reportRenderSurfaceNonFatal(App, 'readTHREE', error);
    return null;
  }
}
export function getViewportRenderCore(App: AppLike): RenderCoreSurfaceLike | null {
  try {
    const render = getRenderBag(App);
    return render.renderer && render.scene ? { renderer: render.renderer, scene: render.scene } : null;
  } catch (error) {
    reportRenderSurfaceNonFatal(App, 'readCore', error);
    return null;
  }
}
export function getViewportCamera(App: AppLike): CameraLike | null {
  try {
    return getRenderBag(App).camera || null;
  } catch (error) {
    reportRenderSurfaceNonFatal(App, 'readCamera', error);
    return null;
  }
}
export function getViewportCameraControls(App: AppLike): RenderCameraControlsLike | null {
  try {
    const render = getRenderBag(App);
    return render.camera && render.controls ? { camera: render.camera, controls: render.controls } : null;
  } catch (error) {
    reportRenderSurfaceNonFatal(App, 'readCameraControls', error);
    return null;
  }
}
export function getViewportWardrobeGroup(App: AppLike): Object3DLike | null {
  try {
    return getRenderBag(App).wardrobeGroup || null;
  } catch (error) {
    reportRenderSurfaceNonFatal(App, 'readWardrobeGroup', error);
    return null;
  }
}
export function getViewportRoomGroup(App: AppLike): Object3DLike | null {
  try {
    return getRenderBag(App).roomGroup || null;
  } catch (error) {
    reportRenderSurfaceNonFatal(App, 'readRoomGroup', error);
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
  } catch (error) {
    reportRenderSurfaceNonFatal(App, 'stampMirrorLastUpdate', error);
    return false;
  }
}
export function snapshotViewportCameraPose(App: AppLike): CameraPoseLike | null {
  try {
    const cc = getViewportCameraControls(App);
    if (!cc) return null;
    const position = cloneVec3Like(readCameraPosition(cc.camera));
    const target = cloneVec3Like(readControlsTarget(cc.controls));
    if (!position || !target) {
      reportRenderSurfaceNonFatal(
        App,
        'snapshotCameraPose',
        renderSurfaceOperationError('snapshotCameraPose', 'camera position or controls target is unreadable')
      );
      return null;
    }
    return { position, target };
  } catch (error) {
    reportRenderSurfaceNonFatal(App, 'snapshotCameraPose', error);
    return null;
  }
}
export function setViewportCameraPose(
  App: AppLike,
  position: { x: number; y: number; z: number },
  target?: { x: number; y: number; z: number } | null
): boolean {
  const cc = getViewportCameraControls(App);
  if (!cc) return false;

  const previousPosition = cloneVec3Like(readCameraPosition(cc.camera));
  const previousTarget = target ? cloneVec3Like(readControlsTarget(cc.controls)) : null;
  if (!previousPosition || (target && !previousTarget)) {
    reportRenderSurfaceNonFatal(
      App,
      'setCameraPose.snapshot',
      renderSurfaceOperationError('setCameraPose.snapshot', 'cannot capture rollback pose')
    );
    return false;
  }

  try {
    const posOk = writeVec3(readCameraPosition(cc.camera), position.x, position.y, position.z);
    const tgtOk = target ? writeVec3(readControlsTarget(cc.controls), target.x, target.y, target.z) : true;
    if (!posOk || !tgtOk) {
      throw renderSurfaceOperationError(
        'setCameraPose.write',
        'camera position or controls target rejected the write'
      );
    }
    if (!updateCameraAndControls(cc.camera, cc.controls)) {
      throw renderSurfaceOperationError('setCameraPose.update', 'camera or controls update failed');
    }
    return true;
  } catch (error) {
    restoreCameraPoseBestEffort(cc.camera, cc.controls, previousPosition, previousTarget);
    reportRenderSurfaceNonFatal(App, 'setCameraPose', error);
    return false;
  }
}
export function restoreViewportCameraPose(App: AppLike, pose: CameraPoseLike | null | undefined): boolean {
  if (!pose || !pose.position) return false;
  return setViewportCameraPose(App, pose.position, pose.target || null);
}
export function scaleViewportCameraDistance(App: AppLike, factor: number): boolean {
  if (!Number.isFinite(factor)) return false;
  const cc = getViewportCameraControls(App);
  if (!cc) return false;
  const previousPosition = cloneVec3Like(readCameraPosition(cc.camera));
  if (!previousPosition) {
    reportRenderSurfaceNonFatal(
      App,
      'scaleCameraDistance.snapshot',
      renderSurfaceOperationError('scaleCameraDistance.snapshot', 'cannot capture rollback position')
    );
    return false;
  }

  try {
    const changed = scalePositionAroundTarget(
      readCameraPosition(cc.camera),
      readControlsTarget(cc.controls),
      factor
    );
    if (!changed) return false;
    if (!updateCameraAndControls(cc.camera, cc.controls)) {
      throw renderSurfaceOperationError('scaleCameraDistance.update', 'camera or controls update failed');
    }
    return true;
  } catch (error) {
    writeVec3(readCameraPosition(cc.camera), previousPosition.x, previousPosition.y, previousPosition.z);
    updateCameraAndControls(cc.camera, cc.controls);
    reportRenderSurfaceNonFatal(App, 'scaleCameraDistance', error);
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
  const OrbitControls = THREE.OrbitControls;
  if (typeof OrbitControls !== 'function')
    throw new Error('[WardrobePro][render_surface_runtime] THREE.OrbitControls is not available');
  const width =
    typeof container.clientWidth === 'number' && container.clientWidth > 0 ? container.clientWidth : 1;
  const height =
    typeof container.clientHeight === 'number' && container.clientHeight > 0 ? container.clientHeight : 1;
  const perfApp = App as AppContainer;
  const scene = runPerfPhase(perfApp, 'boot.ui.viewport.scene', 'boot.ui.viewport.create', () =>
    THREE.Scene ? readObject3DLike(new THREE.Scene()) : null
  );
  if (!scene) throw new Error('[WardrobePro][render_surface_runtime] THREE.Scene is not available');
  render.scene = scene;
  const mirrorCubeSize = readConfigNumber(App, 'MIRROR_CUBE_SIZE', DEFAULT_MIRROR_CUBE_SIZE);
  const WebGLCubeRenderTarget = THREE.WebGLCubeRenderTarget;
  const CubeCamera = THREE.CubeCamera;
  const PerspectiveCamera = THREE.PerspectiveCamera;
  const WebGLRenderer = THREE.WebGLRenderer;
  const Group = THREE.Group;
  if (!WebGLCubeRenderTarget || !CubeCamera || !PerspectiveCamera || !WebGLRenderer || !Group)
    throw new Error(
      '[WardrobePro][render_surface_runtime] required THREE surface constructors are not available'
    );
  const mirrorRenderTarget = runPerfPhase(
    perfApp,
    'boot.ui.viewport.mirror-target',
    'boot.ui.viewport.create',
    () =>
      readWebGLRenderTargetLike(
        new WebGLCubeRenderTarget(mirrorCubeSize, {
          generateMipmaps: false,
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          format: THREE.RGBAFormat,
        })
      )
  );
  if (!mirrorRenderTarget)
    throw new Error(
      '[WardrobePro][render_surface_runtime] THREE.WebGLCubeRenderTarget did not return a render-target-like instance'
    );
  render.mirrorRenderTarget = mirrorRenderTarget;
  const mirrorCubeCamera = runPerfPhase(
    perfApp,
    'boot.ui.viewport.mirror-camera',
    'boot.ui.viewport.create',
    () => readObject3DLike(new CubeCamera(0.1, 100, render.mirrorRenderTarget))
  );
  if (!mirrorCubeCamera)
    throw new Error(
      '[WardrobePro][render_surface_runtime] THREE.CubeCamera did not return an Object3D-like instance'
    );
  render.mirrorCubeCamera = mirrorCubeCamera;
  if (!addNode(scene, render.mirrorCubeCamera))
    throw renderSurfaceOperationError('createSurface.mirrorCamera', 'cannot attach mirror camera to scene');
  if (!writeVec3(readObject3DWritable(render.mirrorCubeCamera)?.position, 0, 1.5, 3.0))
    throw renderSurfaceOperationError(
      'createSurface.mirrorCamera',
      'cannot initialize mirror camera position'
    );
  const camera = runPerfPhase(perfApp, 'boot.ui.viewport.camera', 'boot.ui.viewport.create', () =>
    readCameraLike(new PerspectiveCamera(45, width / height, 0.1, 100))
  );
  if (!camera)
    throw new Error(
      '[WardrobePro][render_surface_runtime] THREE.PerspectiveCamera did not return a camera-like instance'
    );
  render.camera = camera;
  if (!writeVec3(readCameraPosition(camera), 0, 2.2, 5.5))
    throw renderSurfaceOperationError('createSurface.camera', 'cannot initialize camera position');
  const renderer = runPerfPhase(perfApp, 'boot.ui.viewport.webgl-renderer', 'boot.ui.viewport.create', () =>
    readRendererLike(
      new WebGLRenderer({
        antialias: readConfigBoolean(App, 'RENDER_ANTIALIAS', DEFAULT_RENDER_ANTIALIAS),
        preserveDrawingBuffer: false,
        alpha: true,
      })
    )
  );
  if (!renderer)
    throw new Error(
      '[WardrobePro][render_surface_runtime] THREE.WebGLRenderer did not return a renderer-like instance'
    );
  render.renderer = renderer;
  try {
    runPerfPhase(perfApp, 'boot.ui.viewport.renderer-setup', 'boot.ui.viewport.create', () => {
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
    });
  } catch (error) {
    reportRenderSurfaceNonFatal(App, 'createSurface.rendererSetup', error);
    throw error;
  }
  const domElement = readRendererWritable(renderer)?.domElement;
  const controls = runPerfPhase(perfApp, 'boot.ui.viewport.controls', 'boot.ui.viewport.create', () =>
    readControlsLike(new OrbitControls(camera, domElement))
  );
  if (!controls)
    throw new Error(
      '[WardrobePro][render_surface_runtime] THREE.OrbitControls did not return a controls-like instance'
    );
  render.controls = controls;
  if (!setControlsEnableDamping(controls, true))
    throw renderSurfaceOperationError('createSurface.controls', 'cannot enable damping');
  if (!writeVec3(readControlsTarget(controls), 0, 1.4, 0))
    throw renderSurfaceOperationError('createSurface.controls', 'cannot initialize controls target');
  if (!updateCameraAndControls(camera, controls))
    throw renderSurfaceOperationError('createSurface.controls', 'camera or controls update failed');
  const wardrobeGroup = runPerfPhase(
    perfApp,
    'boot.ui.viewport.scene-groups',
    'boot.ui.viewport.create',
    () => {
      let nextWardrobeGroup = render.wardrobeGroup;
      if (!nextWardrobeGroup) {
        nextWardrobeGroup = readObject3DLike(new Group());
        if (!nextWardrobeGroup) {
          throw new Error(
            '[WardrobePro][render_surface_runtime] THREE.Group did not return an Object3D-like instance'
          );
        }
        render.wardrobeGroup = nextWardrobeGroup;
      }
      if (readObject3DWritable(nextWardrobeGroup)?.parent !== scene && !addNode(scene, nextWardrobeGroup)) {
        throw renderSurfaceOperationError(
          'createSurface.wardrobeGroup',
          'cannot attach wardrobe group to scene'
        );
      }
      return nextWardrobeGroup;
    }
  );
  try {
    runPerfPhase(perfApp, 'boot.ui.viewport.shader-warmup-schedule', 'boot.ui.viewport.create', () =>
      scheduleAdhesiveGlassStandardShaderWarmupAtStartup(App, THREE)
    );
  } catch {
    // Shader warmup is an optimization only; viewport creation must stay resilient.
  }
  return {
    scene,
    camera,
    renderer,
    controls,
    wardrobeGroup,
    roomGroup: readObject3DLike(render.roomGroup) || null,
  };
}
