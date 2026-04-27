import type { AppContainer } from '../../../../types/app.js';
import { getUi } from '../store_access.js';
import {
  adjustCameraForChest,
  setViewportCameraPose,
  getDimsMFromPlatform,
  shouldFailFast,
} from '../../services/api.js';
import { getBooleanProp } from './export_canvas_core_shared.js';
import { _exportReportThrottled, _reportExportError } from './export_canvas_core_feedback.js';
import { getCameraControlsOrNull } from './export_canvas_viewport_shared.js';

function isChestModeEnabled(App: AppContainer): boolean {
  try {
    const ui = getUi(App) || {};
    const vIsChestMode = getBooleanProp(ui, 'isChestMode');
    const vChestMode = getBooleanProp(ui, 'chestMode');
    return typeof vIsChestMode !== 'undefined'
      ? !!vIsChestMode
      : typeof vChestMode !== 'undefined'
        ? !!vChestMode
        : false;
  } catch (e) {
    _exportReportThrottled(App, 'exportViewport.readChestMode', e, { throttleMs: 2000 });
    return false;
  }
}

function adjustChestCameraBestEffort(App: AppContainer, op: string): boolean {
  if (!isChestModeEnabled(App)) return false;
  try {
    adjustCameraForChest(App);
  } catch (e) {
    _exportReportThrottled(App, op, e, { throttleMs: 2000 });
  }
  return true;
}

export function snapCameraToFrontPreset(App: AppContainer): void {
  try {
    if (!getCameraControlsOrNull(App)) return;
    if (adjustChestCameraBestEffort(App, 'snapCameraToFrontPreset.adjustCameraForChest')) return;
    if (!setViewportCameraPose(App, { x: 0, y: 2.2, z: 5.5 }, { x: 0, y: 1.4, z: 0 })) {
      _exportReportThrottled(
        App,
        'snapCameraToFrontPreset.setViewportCameraPose',
        new Error('viewport pose unavailable'),
        { throttleMs: 2000 }
      );
    }
  } catch (e) {
    _exportReportThrottled(App, 'snapCameraToFrontPreset', e, { throttleMs: 2000 });
  }
}

export function autoZoomCamera(App: AppContainer): void {
  try {
    if (adjustChestCameraBestEffort(App, 'autoZoomCamera.adjustChest')) return;

    const dims = getDimsMFromPlatform(App);
    if (!dims) return;

    const cc = getCameraControlsOrNull(App);
    if (!cc) return;
    const { camera } = cc;

    const totalW = Number.isFinite(dims.w) ? dims.w : 1;
    const H = Number.isFinite(dims.h) ? dims.h : 1;

    const topMargin = 0.3;
    const bottomMargin = 0.2;
    const effectiveH = H + topMargin + bottomMargin;
    const fov = camera.fov * (Math.PI / 180);
    const requiredDistance = Math.max(totalW, effectiveH) / (2 * Math.tan(fov / 2));
    const finalZ = requiredDistance * 1.05;
    const targetY = H / 2 + (topMargin - bottomMargin) / 2;

    setViewportCameraPose(App, { x: 0, y: targetY, z: finalZ }, { x: 0, y: targetY, z: 0 });
  } catch (e) {
    _reportExportError(App, 'autoZoomCamera', e);
    if (shouldFailFast(App)) throw e;
  }
}
