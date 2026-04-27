import { assertApp } from '../runtime/api.js';
import {
  type AppLike,
  getDimsSafe,
  getRAF,
  getRenderCameraAccess,
  getTHREE,
  lerpVectorsSafe,
  nowMs,
  safeCloneVec,
} from './camera_shared.js';

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
    case 'front':
      finalTarget.set(0, 1.4, 0);
      finalPos.set(0, 2.2, 5.5);
      break;

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

  const startPos = safeCloneVec(THREE, cam.position);
  const startTarget = safeCloneVec(THREE, controls.target);
  const duration = 800;

  const raf = getRAF(app);
  const gen = ++moveGeneration;
  const startTime = nowMs(app);

  function step() {
    if (gen !== moveGeneration) return;

    const progress = Math.min(1, (nowMs(app) - startTime) / duration);
    const ease = 1 - Math.pow(1 - progress, 3);

    try {
      lerpVectorsSafe(cam.position, startPos, finalPos, ease);
      lerpVectorsSafe(controls.target, startTarget, finalTarget, ease);
      if (typeof controls.update === 'function') controls.update();
    } catch (_) {}

    if (progress < 1) raf(step);
  }

  raf(step);
}
