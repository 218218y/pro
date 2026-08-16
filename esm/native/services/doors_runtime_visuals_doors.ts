import { getDrawersArray, getDoorsArray } from '../runtime/render_access.js';
import {
  type AppLike,
  type SyncVisualsOptions,
  getDoorsOpen,
  getGroupUserData,
  isGlobalClickMode,
  isInteriorDoorEditModeActive,
  isSketchEditActive,
  isSketchExtDrawersEditActive,
  isSketchIntDrawersEditActive,
  reportDoorsRuntimeNonFatal,
  readHingedDoorMotionMetadata,
  resolveHingedDoorMotionFrameX,
  resolveHingedDoorTargetRotationY,
  shouldForceSketchFreeBoxDoorsOpen,
} from './doors_runtime_shared.js';
import {
  readDoorsTotalWidth,
  readInteriorManualTool,
  isSlidingDoorTrackOpenMode,
  reportSlidingDoorZFailure,
  resolveSlidingDoorClosedState,
  resolveSlidingDoorTrackOpenPosition,
} from './doors_runtime_visuals_shared.js';
import { getSketchFreeBoxMotionScopeFromEntry } from '../runtime/sketch_free_box_motion_identity.js';
import { shouldHoldSketchFreeBoxDoorsDuringClose } from '../runtime/sketch_free_box_motion_state.js';
import { readRuntimeConfigNumberFromApp } from '../runtime/runtime_config_selectors.js';
import { snapDrawersToTargets } from './doors_runtime_visuals_drawers.js';
import { setSlidingDoorHiddenForOpenState } from '../runtime/sliding_door_visibility.js';

type SlidingDoorHideOpenPolicy = {
  hideOpenSlidingDoors: boolean;
  preserveTrackOpenDoors: boolean;
};

function resolveSlidingDoorHideOpenPolicy(
  App: AppLike,
  opts?: SyncVisualsOptions
): SlidingDoorHideOpenPolicy {
  const rec = opts && typeof opts === 'object' ? opts : null;
  if (rec && rec.slidingHideOpen === true) {
    return { hideOpenSlidingDoors: true, preserveTrackOpenDoors: false };
  }

  try {
    const hideForInteractiveEditContext =
      isInteriorDoorEditModeActive(App) ||
      isSketchEditActive(App) ||
      isSketchExtDrawersEditActive(App) ||
      isSketchIntDrawersEditActive(App);
    return {
      hideOpenSlidingDoors: hideForInteractiveEditContext,
      preserveTrackOpenDoors: false,
    };
  } catch (_e) {
    reportDoorsRuntimeNonFatal(App, 'slidingDoorHideOpen.context', _e);
    return { hideOpenSlidingDoors: false, preserveTrackOpenDoors: false };
  }
}

export function forceUpdatePerState(App: AppLike, opts?: SyncVisualsOptions): void {
  if (!App || typeof App !== 'object') return;

  const totalW = readDoorsTotalWidth(App);
  const slidingHidePolicy = resolveSlidingDoorHideOpenPolicy(App, opts);
  const doors = getDoorsArray(App);
  for (let i = 0; i < doors.length; i++) {
    const door = doors[i];
    if (!door || !door.group) continue;

    const open = !!door.isOpen;

    if (door.type === 'hinged') {
      const targetRotationY = resolveHingedDoorTargetRotationY(door, open);
      door.group.rotation.y = targetRotationY;
      const targetX = resolveHingedDoorMotionFrameX(door, doors, targetRotationY);
      if (targetX !== null) door.group.position.x = targetX;
      continue;
    }

    if (door.type !== 'sliding') continue;

    const { closedX, closedZ, doorW } = resolveSlidingDoorClosedState(door, totalW);
    let finalX = closedX;
    let finalZ = closedZ;

    const hideSlidingDoor =
      open &&
      slidingHidePolicy.hideOpenSlidingDoors &&
      !(slidingHidePolicy.preserveTrackOpenDoors && isSlidingDoorTrackOpenMode(door));
    setSlidingDoorHiddenForOpenState(door, hideSlidingDoor);

    if (open && !hideSlidingDoor) {
      const next = resolveSlidingDoorTrackOpenPosition(door, totalW, doorW, closedZ);
      finalX = next.finalX;
      finalZ = next.finalZ;
    }

    door.group.position.x = finalX;
    try {
      door.group.position.z = finalZ;
    } catch (_e) {
      reportSlidingDoorZFailure(App, _e);
    }
  }

  const drawers = getDrawersArray(App);
  for (let i = 0; i < drawers.length; i++) {
    const drawer = drawers[i];
    if (!drawer || !drawer.group) continue;

    const target = drawer.isOpen ? drawer.open : drawer.closed;
    if (target && drawer.group.position && typeof drawer.group.position.copy === 'function') {
      drawer.group.position.copy(target);
    }
  }
}

export function syncVisualsNow(App: AppLike, opts?: SyncVisualsOptions): void {
  if (!App || typeof App !== 'object') return;

  const safeOpts = opts && typeof opts === 'object' ? opts : {};
  const includeDrawers = typeof safeOpts.includeDrawers === 'boolean' ? safeOpts.includeDrawers : true;

  if (!isGlobalClickMode(App)) {
    forceUpdatePerState(App, safeOpts);
    if (includeDrawers) snapDrawersToTargets(App);
    return;
  }

  const isOpen = typeof safeOpts.open === 'boolean' ? !!safeOpts.open : !!getDoorsOpen(App);
  const totalW = readDoorsTotalWidth(App);
  const slidingHidePolicy = resolveSlidingDoorHideOpenPolicy(App, safeOpts);
  const manualTool = readInteriorManualTool(App);
  const interiorDoorEditActive = isInteriorDoorEditModeActive(App);
  const doorDelayMs = readRuntimeConfigNumberFromApp(App, 'DOOR_DELAY_MS', 600);

  const doors = getDoorsArray(App);
  for (let i = 0; i < doors.length; i++) {
    const door = doors[i];
    if (!door || !door.group) continue;

    if (door.type === 'hinged') {
      let targetOpen = !!isOpen;
      const group = door.group;
      let noGlobal = !!door.noGlobalOpen;
      let userData = null;
      try {
        userData = getGroupUserData(group);
        if (!noGlobal) noGlobal = readHingedDoorMotionMetadata(door).noGlobalOpen;
      } catch (_e) {
        reportDoorsRuntimeNonFatal(App, 'syncVisualsNow.noGlobalOpen', _e);
      }

      const allowSketchFreeBoxOpen = shouldForceSketchFreeBoxDoorsOpen(manualTool, userData, {
        interiorDoorEditActive,
      });

      if (noGlobal) {
        targetOpen = allowSketchFreeBoxOpen && isOpen ? true : !!door.isOpen;
        door.noGlobalOpen = true;
      } else if (!isOpen) {
        targetOpen = false;
      }

      const sketchFreeBoxScope = getSketchFreeBoxMotionScopeFromEntry(door);
      if (
        !targetOpen &&
        sketchFreeBoxScope &&
        shouldHoldSketchFreeBoxDoorsDuringClose(App, sketchFreeBoxScope, doorDelayMs)
      ) {
        targetOpen = true;
      }

      const targetRotationY = resolveHingedDoorTargetRotationY(door, targetOpen);
      door.group.rotation.y = targetRotationY;
      const targetX = resolveHingedDoorMotionFrameX(door, doors, targetRotationY);
      if (targetX !== null) door.group.position.x = targetX;
      continue;
    }

    if (door.type !== 'sliding') continue;

    const { closedX, closedZ, doorW } = resolveSlidingDoorClosedState(door, totalW);
    let finalX = closedX;
    let finalZ = closedZ;

    let targetOpen = !!isOpen;
    if (!targetOpen && door.noGlobalOpen) targetOpen = !!door.isOpen;

    const hideSlidingDoor =
      targetOpen &&
      slidingHidePolicy.hideOpenSlidingDoors &&
      !(slidingHidePolicy.preserveTrackOpenDoors && isSlidingDoorTrackOpenMode(door));
    setSlidingDoorHiddenForOpenState(door, hideSlidingDoor);

    if (targetOpen && !hideSlidingDoor) {
      const next = resolveSlidingDoorTrackOpenPosition(door, totalW, doorW, closedZ);
      finalX = next.finalX;
      finalZ = next.finalZ;
    }

    door.group.position.x = finalX;
    try {
      door.group.position.z = finalZ;
    } catch (_e) {
      reportSlidingDoorZFailure(App, _e);
    }
  }

  if (includeDrawers) snapDrawersToTargets(App);
}
