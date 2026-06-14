import {
  cmToM,
  DOOR_SYSTEM_DIMENSIONS,
  WARDROBE_DEFAULTS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { AppContainer } from '../../../types';

import { getBuildUIFromPlatform, getDimsMFromPlatform } from '../runtime/platform_access.js';
import { getDoorsArray } from '../runtime/render_access.js';
import { readFiniteNumber, readFiniteNumberOrNull } from '../runtime/render_runtime_primitives.js';
import { shouldForceSketchFreeBoxDoorsOpen } from '../runtime/doors_runtime_support.js';
import { getSketchFreeBoxMotionScopeFromEntry } from '../runtime/sketch_free_box_motion_identity.js';
import { shouldHoldSketchFreeBoxDoorsDuringClose } from '../runtime/sketch_free_box_motion_state.js';
import { resolveSlidingDoorTrackOpenPosition } from '../runtime/sliding_door_motion.js';
import { setSlidingDoorHiddenForOpenState } from '../runtime/sliding_door_visibility.js';

import type { MotionFrameState } from './render_loop_motion_shared.js';
import {
  ROTATION_SETTLED_EPSILON,
  asDoorMotion,
  asRecordOrNull,
  hasNumberMotionRemaining,
  readMotionUserData,
} from './render_loop_motion_shared.js';

function shouldHideOpenSlidingDoorsForFrame(frame: MotionFrameState): boolean {
  return !!(
    frame.interiorDoorEditActive ||
    frame.sketchEditActive ||
    frame.sketchIntDrawersEditActive ||
    frame.sketchExtDrawersEditActive
  );
}

export function updateRenderLoopDoorMotions(App: AppContainer, frame: MotionFrameState): boolean {
  let hasActiveDoorMotion = false;
  const doors = getDoorsArray(App);
  const hideOpenSlidingDoors = shouldHideOpenSlidingDoorsForFrame(frame);
  for (let i = 0; i < doors.length; i++) {
    const d = asDoorMotion(doors[i]);
    if (!d) continue;
    let targetOpen = frame.globalClickMode ? frame.doorsShouldBeOpen : !!d.isOpen;
    const g = d.group;
    if (!g) continue;

    if (!frame.globalClickMode && !targetOpen && frame.timeSinceToggle < frame.delayTime) {
      const moduleKey = readMotionUserData(g)['moduleIndex'];
      const normalizedModuleKey =
        typeof moduleKey === 'number' && Number.isFinite(moduleKey)
          ? String(moduleKey)
          : typeof moduleKey === 'string' && moduleKey
            ? moduleKey
            : null;
      const shouldHoldDoorOpen = normalizedModuleKey
        ? frame.visibleOpenInternalDrawerModules.has(normalizedModuleKey)
        : frame.visibleOpenInternalDrawerModules.size > 0;
      if (shouldHoldDoorOpen) targetOpen = true;
    }

    const allowSketchFreeBoxOpen = shouldForceSketchFreeBoxDoorsOpen(
      frame.manualTool,
      readMotionUserData(g),
      { interiorDoorEditActive: frame.interiorDoorEditActive }
    );

    if (frame.globalClickMode && d.noGlobalOpen) {
      targetOpen = allowSketchFreeBoxOpen && frame.doorsShouldBeOpen ? true : !!d.isOpen;
    }

    const sketchFreeBoxScope = getSketchFreeBoxMotionScopeFromEntry(d);
    if (
      !targetOpen &&
      sketchFreeBoxScope &&
      shouldHoldSketchFreeBoxDoorsDuringClose(App, sketchFreeBoxScope, frame.delayTime)
    ) {
      targetOpen = true;
    }

    if (d.type === 'hinged') {
      let targetRot = targetOpen ? (d.hingeSide === 'left' ? -Math.PI / 2.1 : Math.PI / 2.1) : 0;

      const ud = readMotionUserData(g);
      const pid = ud && ud.partId != null ? String(ud.partId) : '';
      const isCornerPent =
        !!(ud && (ud.__wpCornerPentDoor || ud.__wpCornerPentDoorPair === 'corner_pent_pair')) ||
        (pid && pid.startsWith('corner_pent_door'));

      if (isCornerPent && ud) {
        let openDirSign = 1;
        const vDir = Number(ud['__wpDoorOpenDirSign']);
        if (vDir === 1 || vDir === -1) {
          openDirSign = vDir;
        } else {
          const vZ = Number(ud['__wpDoorOpenZSign']);
          if (vZ === 1 || vZ === -1) openDirSign = vZ;
          else {
            const vH = Number(ud['__handleZSign']);
            if (vH === 1 || vH === -1) openDirSign = -vH;
          }
        }
        targetRot *= openDirSign;
      }

      const inv = !!d.invertSwing || !!readMotionUserData(g)['__invertSwing'];
      if (inv) targetRot = -targetRot;

      g.rotation.y += (targetRot - g.rotation.y) * 0.1;
      if (hasNumberMotionRemaining(g.rotation.y, targetRot, ROTATION_SETTLED_EPSILON)) {
        hasActiveDoorMotion = true;
      }
      continue;
    }

    if (d.type !== 'sliding') continue;

    const overlap = DOOR_SYSTEM_DIMENSIONS.sliding.overlapM;
    let doorsCount = Number.isFinite(d.total) ? d.total : NaN;
    if (!Number.isFinite(doorsCount)) {
      const ui = asRecordOrNull(getBuildUIFromPlatform(App));
      const rawUi = asRecordOrNull(ui ? ui['raw'] : null) ?? ui;
      let value: unknown = null;
      if (rawUi && typeof rawUi['doors'] !== 'undefined') value = rawUi['doors'];
      else if (ui && typeof ui['doors'] !== 'undefined') value = ui['doors'];
      const parsed = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10);
      if (Number.isFinite(parsed)) doorsCount = parsed;
    }
    doorsCount =
      (Number.isFinite(doorsCount) ? doorsCount : DOOR_SYSTEM_DIMENSIONS.sliding.defaultDoorsCount) ||
      DOOR_SYSTEM_DIMENSIONS.sliding.defaultDoorsCount;
    const idx = readFiniteNumber(d.index, 0);

    const dimsRec = frame.platformDimsFrame;
    const widthFromDims = dimsRec ? dimsRec['w'] : undefined;
    const totalW =
      readFiniteNumberOrNull(widthFromDims) !== null
        ? readFiniteNumber(widthFromDims, cmToM(WARDROBE_DEFAULTS.widthCm))
        : (() => {
            const dim = asRecordOrNull(getDimsMFromPlatform(App));
            return readFiniteNumber(dim ? dim['w'] : undefined, cmToM(WARDROBE_DEFAULTS.widthCm));
          })();
    const doorW =
      readFiniteNumberOrNull(d.width) !== null
        ? readFiniteNumber(d.width, 0)
        : (totalW + (doorsCount - 1) * overlap) / doorsCount;

    if (d.originalX === undefined || d.originalX === null || Number.isNaN(d.originalX)) {
      d.originalX = idx * (doorW - overlap) - totalW / 2 + doorW / 2;
    }
    if (d.originalZ === undefined || d.originalZ === null || !Number.isFinite(d.originalZ)) {
      d.originalZ = g.position ? g.position.z : 0;
    }

    const originalX = readFiniteNumber(d.originalX, 0);
    const originalZ = readFiniteNumber(d.originalZ, 0);
    let targetX = originalX;
    let targetZ = originalZ;

    const hideSlidingDoor = targetOpen && hideOpenSlidingDoors;
    if (setSlidingDoorHiddenForOpenState(d, hideSlidingDoor)) {
      hasActiveDoorMotion = true;
    }

    if (targetOpen && !hideSlidingDoor) {
      const next = resolveSlidingDoorTrackOpenPosition(d, totalW, doorW, originalZ);
      targetX = next.finalX;
      targetZ = next.finalZ;
    }

    g.position.x += (targetX - g.position.x) * 0.08;
    g.position.z += (targetZ - g.position.z) * 0.08;
    if (hasNumberMotionRemaining(g.position.x, targetX) || hasNumberMotionRemaining(g.position.z, targetZ)) {
      hasActiveDoorMotion = true;
    }
  }
  return hasActiveDoorMotion;
}
