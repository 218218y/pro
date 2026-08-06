import { assertApp } from '../runtime/api.js';
import { resolveCurrentDefaultCameraPresetPose } from './camera_presets.js';
import {
  type AppLike,
  clearCameraMoveRenderingActive,
  createCameraClock,
  createCameraVectorInterpolator,
  getDimsSafe,
  getRAF,
  getRenderCameraAccess,
  getTHREE,
  markCameraMoveRenderingActive,
  reportCameraNonFatal,
  safeCloneVec,
  wakeCameraRenderLoop,
} from './camera_shared.js';

const CAMERA_MOVE_DURATION_MS = 800;
const CAMERA_MOVE_RENDER_SETTLE_MS = 96;

let moveGeneration = 0;

export function cancelCameraMove(): void {
  moveGeneration++;
}

export function moveCamera(App: AppLike, view: string): void {
  const app = assertApp(App, 'native/services/camera.moveCamera');
  const access = getRenderCameraAccess(app);
  if (!access) {
    throw new Error(
      '[WardrobePro][ESM] render/camera/controls not initialized (native/services/camera.moveCamera)'
    );
  }

  const { camera: cam, controls } = access;
  const THREE = getTHREE(app);
  if (!THREE || !THREE.Vector3) {
    throw new Error('[WardrobePro][ESM] THREE.Vector3 is missing (native/services/camera.moveCamera)');
  }

  const dims = getDimsSafe(app);
  const w = dims.w;
  const h = dims.h;

  const targetY = h / 2;
  const finalTarget = new THREE.Vector3(0, targetY, 0);
  const finalPos = new THREE.Vector3();

  switch (view) {
    case 'front': {
      const preset = resolveCurrentDefaultCameraPresetPose(app);
      finalTarget.set(preset.target.x, preset.target.y, preset.target.z);
      finalPos.set(preset.pos.x, preset.pos.y, preset.pos.z);
      break;
    }

    case 'front-zoom': {
      const distZoom = Math.max(w, h) * 0.85 + 0.5;
      finalPos.set(0, targetY, distZoom);
      break;
    }

    case 'perspective': {
      const distPersp = Math.max(w, h) * 1.2 + 1.0;
      finalPos.set(w * 0.8 + 1.0, h * 0.8 + 0.5, distPersp);
      break;
    }

    case 'perspective-left': {
      const distPerspL = Math.max(w, h) * 1.2 + 1.0;
      finalPos.set(-(w * 0.8 + 1.0), h * 0.8 + 0.5, distPerspL);
      break;
    }

    default:
      return;
  }

  const startPos = safeCloneVec(app, THREE, cam.position, 'move.startPosition');
  const startTarget = safeCloneVec(app, THREE, controls.target, 'move.startTarget');
  const interpolatePosition = createCameraVectorInterpolator(app, cam.position, 'move.position');
  const interpolateTarget = createCameraVectorInterpolator(app, controls.target, 'move.target');
  const duration = CAMERA_MOVE_DURATION_MS;

  const raf = getRAF(app);
  const now = createCameraClock(app);
  const gen = ++moveGeneration;
  const startTime = now();
  const renderUntilMs = startTime + duration + CAMERA_MOVE_RENDER_SETTLE_MS;
  markCameraMoveRenderingActive(app, renderUntilMs);

  function finishMove(): void {
    clearCameraMoveRenderingActive(app);
    wakeCameraRenderLoop(app);
  }

  function step() {
    if (gen !== moveGeneration) return;

    const progress = Math.min(1, Math.max(0, (now() - startTime) / duration));
    const ease = 1 - Math.pow(1 - progress, 3);

    const positionUpdated = interpolatePosition(startPos, finalPos, ease);
    const targetUpdated = interpolateTarget(startTarget, finalTarget, ease);
    if (!positionUpdated || !targetUpdated) {
      finishMove();
      return;
    }

    try {
      controls.update();
    } catch (error) {
      reportCameraNonFatal(app, 'native/services/camera_motion', 'move.controlsUpdate', error);
      finishMove();
      return;
    }

    wakeCameraRenderLoop(app);

    if (progress < 1) {
      raf(step);
      return;
    }

    finishMove();
  }

  raf(step);
  wakeCameraRenderLoop(app);
}
