import { getDrawersArray, getDoorsArray } from '../runtime/render_access.js';
import {
  type AppLike,
  type SyncVisualsOptions,
  getDoorsOpen,
  getGroupUserData,
  isGlobalClickMode,
  isSketchIntDrawersEditActive,
  reportDoorsRuntimeNonFatal,
  shouldForceSketchFreeBoxDoorsOpen,
} from './doors_runtime_shared.js';
import {
  readDoorsTotalWidth,
  readInteriorManualTool,
  reportSlidingDoorZFailure,
  resolveDoorPartId,
  resolveSlidingDoorClosedState,
  resolveSlidingDoorOpenPosition,
} from './doors_runtime_visuals_shared.js';
import { snapDrawersToTargets } from './doors_runtime_visuals_drawers.js';

export function forceUpdatePerState(App: AppLike): void {
  if (!App || typeof App !== 'object') return;

  const totalW = readDoorsTotalWidth(App);
  const doors = getDoorsArray(App);
  for (let i = 0; i < doors.length; i++) {
    const door = doors[i];
    if (!door || !door.group) continue;

    const open = !!door.isOpen;

    if (door.type === 'hinged') {
      let baseRot = door.hingeSide === 'left' ? -Math.PI / 2.1 : Math.PI / 2.1;
      let openDirSign = 1;

      try {
        const group = door.group;
        const userData = getGroupUserData(group);
        const partId = userData && userData.partId != null ? String(userData.partId) : '';
        const isCornerPent =
          !!(
            userData &&
            (userData.__wpCornerPentDoor || userData.__wpCornerPentDoorPair === 'corner_pent_pair')
          ) ||
          (partId && partId.startsWith('corner_pent_door'));

        if (isCornerPent && userData) {
          const dir = Number(userData.__wpDoorOpenDirSign);
          if (dir === 1 || dir === -1) {
            openDirSign = dir;
          } else {
            const zSign = Number(userData.__wpDoorOpenZSign);
            if (zSign === 1 || zSign === -1) openDirSign = zSign;
            else {
              const handleSign = Number(userData.__handleZSign);
              if (handleSign === 1 || handleSign === -1) openDirSign = -handleSign;
            }
          }
        }
      } catch (_e) {
        reportDoorsRuntimeNonFatal(App, 'L615', _e);
      }

      door.group.rotation.y = open ? baseRot * openDirSign : 0;
      continue;
    }

    if (door.type !== 'sliding') continue;

    const { closedX, closedZ, doorW, outerZ } = resolveSlidingDoorClosedState(door, totalW);
    let finalX = closedX;
    let finalZ = closedZ;

    if (open) {
      const next = resolveSlidingDoorOpenPosition(door, totalW, doorW, outerZ);
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
    forceUpdatePerState(App);
    if (includeDrawers) snapDrawersToTargets(App);
    return;
  }

  const isOpen = typeof safeOpts.open === 'boolean' ? !!safeOpts.open : !!getDoorsOpen(App);
  const totalW = readDoorsTotalWidth(App);
  const manualTool = readInteriorManualTool(App);
  const sketchIntDrawersEditActive = isSketchIntDrawersEditActive(App);

  const doors = getDoorsArray(App);
  for (let i = 0; i < doors.length; i++) {
    const door = doors[i];
    if (!door || !door.group) continue;

    if (door.type === 'hinged') {
      let targetOpen = !!isOpen;
      const group = door.group;
      const partId = resolveDoorPartId(group);

      let noGlobal = !!door.noGlobalOpen;
      let userData = null;
      try {
        userData = getGroupUserData(group);
        if (!noGlobal && userData) {
          noGlobal = !!(
            userData.noGlobalOpen ||
            userData.__wpCornerPentDoor ||
            userData.__wpCornerPentDoorPair === 'corner_pent_pair' ||
            userData.__wpCornerPentFront === true ||
            userData.__wpCornerPentagon === true
          );
        }
      } catch (_e) {
        reportDoorsRuntimeNonFatal(App, 'syncVisualsNow.noGlobalOpen', _e);
      }

      const allowSketchFreeBoxOpen =
        sketchIntDrawersEditActive && shouldForceSketchFreeBoxDoorsOpen(manualTool, userData);

      if (!allowSketchFreeBoxOpen && !noGlobal && partId && partId.startsWith('corner_pent_door'))
        noGlobal = true;

      if (isOpen && noGlobal && !allowSketchFreeBoxOpen) {
        targetOpen = !!door.isOpen;
        door.noGlobalOpen = true;
      } else if (!isOpen) {
        targetOpen = false;
      }

      let baseRot = targetOpen ? (door.hingeSide === 'left' ? -Math.PI / 2.1 : Math.PI / 2.1) : 0;

      try {
        const userData = getGroupUserData(group);
        const isCornerPent =
          (partId && partId.startsWith('corner_pent_door')) ||
          !!(
            userData &&
            (userData.__wpCornerPentDoor || userData.__wpCornerPentDoorPair === 'corner_pent_pair')
          );

        if (isCornerPent && targetOpen && userData) {
          let openDirSign = 1;
          const dir = Number(userData.__wpDoorOpenDirSign);
          if (dir === 1 || dir === -1) {
            openDirSign = dir;
          } else {
            const zSign = Number(userData.__wpDoorOpenZSign);
            if (zSign === 1 || zSign === -1) openDirSign = zSign;
            else {
              const handleSign = Number(userData.__handleZSign);
              if (handleSign === 1 || handleSign === -1) openDirSign = handleSign;
            }
          }
          baseRot *= openDirSign;
        }
      } catch (_e) {
        reportDoorsRuntimeNonFatal(App, 'syncVisualsNow.cornerPentSign', _e);
      }

      try {
        const invert = !!door.invertSwing || !!getGroupUserData(group)?.__invertSwing;
        if (invert) baseRot = -baseRot;
      } catch (_e) {
        reportDoorsRuntimeNonFatal(App, 'syncVisualsNow.invertSwing', _e);
      }

      door.group.rotation.y = baseRot;
      continue;
    }

    if (door.type !== 'sliding') continue;

    const { closedX, closedZ, doorW, outerZ } = resolveSlidingDoorClosedState(door, totalW);
    let finalX = closedX;
    let finalZ = closedZ;

    if (isOpen) {
      const next = resolveSlidingDoorOpenPosition(door, totalW, doorW, outerZ);
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
