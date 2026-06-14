import { getDoorsArray, getDrawersArray } from '../runtime/render_access.js';
import { isSlidingDoorTrackOpenMode } from '../runtime/sliding_door_motion.js';
import {
  type AppLike,
  type CaptureLocalOpenOptions,
  type DrawerId,
  type CloseDrawerOptions,
  ensureDoorsRuntimeDefaults,
  isGlobalClickMode,
  reportDoorsRuntimeNonFatal,
  touchDoorsRuntimeRender,
  vecCopy,
} from './doors_runtime_shared.js';
import { applyAllDoors, applySnapshot, captureSnapshot } from './doors_runtime_lifecycle_shared.js';

export function closeAllLocal(App: AppLike): void {
  if (!App || typeof App !== 'object') return;
  applyAllDoors(App, false);
  touchDoorsRuntimeRender(App);
}

function hasOpenSlidingTrackDoor(App: AppLike): boolean {
  try {
    return getDoorsArray(App).some(
      door => !!door && door.type === 'sliding' && door.isOpen === true && isSlidingDoorTrackOpenMode(door)
    );
  } catch (_) {
    reportDoorsRuntimeNonFatal(App, 'captureLocalOpenStateBeforeBuild.readSlidingTrackDoors', _);
    return false;
  }
}

function drawerMatchesCloseId(App: AppLike, drawer: Record<string, unknown>, sid: string): boolean {
  let drawerId = '';
  try {
    if (drawer.id !== undefined && drawer.id !== null) drawerId = String(drawer.id);
    else if (drawer.drawerId !== undefined && drawer.drawerId !== null) drawerId = String(drawer.drawerId);
    else if (drawer.dividerKey !== undefined && drawer.dividerKey !== null)
      drawerId = String(drawer.dividerKey);
  } catch (_) {
    reportDoorsRuntimeNonFatal(App, 'closeDrawerById.readId', _);
  }

  if (drawerId && drawerId === sid) return true;

  try {
    const group = drawer.group as { userData?: Record<string, unknown> } | null | undefined;
    const partId = group && group.userData ? group.userData.partId : null;
    if (partId !== undefined && partId !== null && String(partId) === sid) return true;
  } catch (_) {
    reportDoorsRuntimeNonFatal(App, 'closeDrawerById.readPartId', _);
  }

  return false;
}

export function closeDrawerById(App: AppLike, id: DrawerId, opts?: CloseDrawerOptions): void {
  if (!App || typeof App !== 'object') return;
  if (id === null || typeof id === 'undefined') return;

  const sid = String(id);
  const snap = !(opts && typeof opts === 'object' && opts.snap === false);
  const arr = getDrawersArray(App);

  for (let i = 0; i < arr.length; i++) {
    const drawer = arr[i];
    if (!drawer || !drawerMatchesCloseId(App, drawer as Record<string, unknown>, sid)) continue;

    drawer.isOpen = false;
    if (!snap) continue;

    try {
      if (drawer.group?.position && drawer.closed) vecCopy(drawer.group.position, drawer.closed);
    } catch (_) {
      reportDoorsRuntimeNonFatal(App, 'closeDrawerById.snapClosed', _);
    }
  }

  touchDoorsRuntimeRender(App);
}

export function captureLocalOpenStateBeforeBuild(App: AppLike, opts?: CaptureLocalOpenOptions): void {
  if (!App || typeof App !== 'object') return;
  const safeOpts = opts && typeof opts === 'object' ? opts : {};
  const includeDrawers = typeof safeOpts.includeDrawers === 'boolean' ? safeOpts.includeDrawers : true;
  const includeSlidingTrackDoors = safeOpts.includeSlidingTrackDoors === true;
  const globalClickMode = isGlobalClickMode(App);
  const captureGlobalSlidingTrack =
    globalClickMode && includeSlidingTrackDoors && hasOpenSlidingTrackDoor(App);

  if (globalClickMode && !captureGlobalSlidingTrack) return;

  const runtime = ensureDoorsRuntimeDefaults(App);
  const snapshot = captureSnapshot(App, includeDrawers);
  if (captureGlobalSlidingTrack) snapshot.kind = 'slidingTrack';
  runtime.localOpenSnapshot = snapshot;
}

export function applyLocalOpenStateAfterBuild(App: AppLike): void {
  if (!App || typeof App !== 'object') return;

  const runtime = ensureDoorsRuntimeDefaults(App);
  const snapshot = runtime.localOpenSnapshot;
  if (!snapshot) return;
  if (isGlobalClickMode(App) && snapshot.kind !== 'slidingTrack') return;

  applySnapshot(App, snapshot);
  runtime.localOpenSnapshot = null;
  touchDoorsRuntimeRender(App);
}
