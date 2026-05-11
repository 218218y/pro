import { getDrawersArray } from '../runtime/render_access.js';
import {
  type AppLike,
  type CaptureLocalOpenOptions,
  type DrawerId,
  ensureDoorsRuntimeDefaults,
  isGlobalClickMode,
  reportDoorsRuntimeNonFatal,
  touchDoorsRuntimeRender,
} from './doors_runtime_shared.js';
import { applyAllDoors, applySnapshot, captureSnapshot } from './doors_runtime_lifecycle_shared.js';

export function closeAllLocal(App: AppLike): void {
  if (!App || typeof App !== 'object') return;
  applyAllDoors(App, false);
  touchDoorsRuntimeRender(App);
}

export function closeDrawerById(App: AppLike, id: DrawerId): void {
  if (!App || typeof App !== 'object') return;
  if (id === null || typeof id === 'undefined') return;

  const sid = String(id);
  const arr = getDrawersArray(App);

  for (let i = 0; i < arr.length; i++) {
    const drawer = arr[i];
    if (!drawer) continue;

    let drawerId = '';
    try {
      if (drawer.id !== undefined && drawer.id !== null) drawerId = String(drawer.id);
      else if (drawer.drawerId !== undefined && drawer.drawerId !== null) drawerId = String(drawer.drawerId);
    } catch (_) {
      reportDoorsRuntimeNonFatal(App, 'L529', _);
    }

    let match = drawerId && drawerId === sid;
    if (!match) {
      try {
        const partId = drawer.group && drawer.group.userData ? drawer.group.userData.partId : null;
        if (partId !== undefined && partId !== null && String(partId) === sid) match = true;
      } catch (_) {
        reportDoorsRuntimeNonFatal(App, 'L537', _);
      }
    }

    if (match) drawer.isOpen = false;
  }

  touchDoorsRuntimeRender(App);
}

export function captureLocalOpenStateBeforeBuild(App: AppLike, opts?: CaptureLocalOpenOptions): void {
  if (!App || typeof App !== 'object') return;
  const safeOpts = opts && typeof opts === 'object' ? opts : {};
  const includeDrawers = typeof safeOpts.includeDrawers === 'boolean' ? safeOpts.includeDrawers : true;

  if (isGlobalClickMode(App)) return;

  const runtime = ensureDoorsRuntimeDefaults(App);
  runtime.localOpenSnapshot = captureSnapshot(App, includeDrawers);
}

export function applyLocalOpenStateAfterBuild(App: AppLike): void {
  if (!App || typeof App !== 'object') return;
  if (isGlobalClickMode(App)) return;

  const runtime = ensureDoorsRuntimeDefaults(App);
  const snapshot = runtime.localOpenSnapshot;
  if (!snapshot) return;

  applySnapshot(App, snapshot);
  runtime.localOpenSnapshot = null;
  touchDoorsRuntimeRender(App);
}
