import type { AppContainer, UnknownRecord } from '../../../types';

import type { HitObjectLike } from './canvas_picking_engine.js';
import { getModulesActions } from '../runtime/actions_access_domains.js';
import { readConfigNumberLooseFromApp } from '../runtime/config_selectors.js';
import { getDoorsArray, getDrawersArray } from '../runtime/render_access.js';
import {
  type SketchFreeBoxMotionScope,
  isSketchFreeBoxInternalDrawerEntry,
  isSketchFreeBoxMotionScopeMatch,
  readSketchFreeBoxMotionScopeFromPartId,
  readSketchFreeBoxMotionScopeFromUserData,
} from '../runtime/sketch_free_box_motion_identity.js';
import { recordSketchFreeBoxMotionToggle } from '../runtime/sketch_free_box_motion_state.js';
import { resolveSketchBoxPatchTargets } from './canvas_picking_toggle_flow_sketch_box_target.js';
import { asRecord, ensureChildRecord, markLocalDoorMotion } from './canvas_picking_toggle_flow_shared.js';

export type { SketchFreeBoxMotionScope } from '../runtime/sketch_free_box_motion_identity.js';

export function resolveSketchFreeBoxToggleScope(
  primaryHitObject: HitObjectLike | null,
  foundPartId?: string | null
): SketchFreeBoxMotionScope | null {
  let cur = primaryHitObject;
  while (cur) {
    const userData = asRecord(cur.userData);
    const byUserData = readSketchFreeBoxMotionScopeFromUserData(userData);
    if (byUserData) return byUserData;

    const partId = userData && userData.partId != null ? String(userData.partId) : null;
    const byPartId = readSketchFreeBoxMotionScopeFromPartId(partId);
    if (byPartId) return byPartId;
    cur = cur.parent || null;
  }

  return readSketchFreeBoxMotionScopeFromPartId(foundPartId || null);
}

function patchSketchFreeBoxDoorOpenState(
  App: AppContainer,
  scope: SketchFreeBoxMotionScope,
  nextOpen: boolean,
  preferredStack?: string | null
): void {
  if (!scope.boxId) return;
  const mods = getModulesActions(App);
  if (!mods || typeof mods.patchForStack !== 'function') return;
  const ensureForStack = typeof mods.ensureForStack === 'function' ? mods.ensureForStack : null;
  const patchTargets = resolveSketchBoxPatchTargets(
    App,
    { moduleKey: scope.moduleKey, boxId: scope.boxId, doorId: null },
    preferredStack
  );

  for (const patchTarget of patchTargets) {
    const cfg = ensureForStack ? ensureForStack(patchTarget.stack, patchTarget.moduleKey) : null;
    const cfgRec = asRecord(cfg);
    const extra = asRecord(cfgRec?.sketchExtras);
    const boxes = Array.isArray(extra?.boxes) ? extra?.boxes : null;
    if (!boxes) continue;
    const exists = boxes.some(box => {
      const rec = asRecord(box);
      return !!rec && rec.id != null && String(rec.id) === scope.boxId && rec.freePlacement === true;
    });
    if (!exists) continue;

    mods.patchForStack(
      patchTarget.stack,
      patchTarget.moduleKey,
      (cfgPatch: UnknownRecord) => {
        const extraRec = ensureChildRecord(cfgPatch, 'sketchExtras');
        const list = Array.isArray(extraRec.boxes) ? extraRec.boxes : (extraRec.boxes = []);
        for (let i = 0; i < list.length; i++) {
          const boxRec = asRecord(list[i]);
          if (!boxRec || boxRec.id == null || String(boxRec.id) !== scope.boxId) continue;
          if (boxRec.freePlacement !== true) continue;
          const doors = Array.isArray(boxRec.doors) ? boxRec.doors.slice() : [];
          if (!doors.length) return;
          for (let doorIndex = 0; doorIndex < doors.length; doorIndex++) {
            const doorRec = asRecord(doors[doorIndex]);
            if (!(doorRec && doorRec.enabled !== false)) continue;
            const doorId =
              doorRec.id != null && String(doorRec.id) ? String(doorRec.id) : `sketch_box_door_${doorIndex}`;
            doors[doorIndex] = { ...doorRec, id: doorId, enabled: true, open: !!nextOpen };
          }
          boxRec.doors = doors;
          delete boxRec.door;
          return;
        }
      },
      {
        source: 'sketchFreeBoxGlobalToggle',
        immediate: false,
        noBuild: true,
        noHistory: true,
      }
    );
  }
}

function setDoorLocalOpenState(door: UnknownRecord, nextOpen: boolean): void {
  door.isOpen = !!nextOpen;
  door.noGlobalOpen = true;
  const group = asRecord(door.group);
  const userData = asRecord(group?.userData);
  if (userData) userData.noGlobalOpen = true;
}

function setDrawerLocalOpenState(drawer: UnknownRecord, nextOpen: boolean): void {
  drawer.isOpen = !!nextOpen;
  drawer.noGlobalOpen = true;
  const group = asRecord(drawer.group);
  const userData = asRecord(group?.userData);
  if (userData) userData.noGlobalOpen = true;
}

export function toggleSketchFreeBoxOpen(
  App: AppContainer,
  scope: SketchFreeBoxMotionScope | null,
  preferredStack?: string | null
): boolean {
  if (!scope?.prefix || !scope.boxId) return false;

  const matchedDoors = getDoorsArray(App).filter(door => isSketchFreeBoxMotionScopeMatch(door, scope));
  const matchedDrawers = getDrawersArray(App).filter(drawer =>
    isSketchFreeBoxMotionScopeMatch(drawer, scope)
  );

  // Clicking a free box surface must never fall through to the main wardrobe global toggle,
  // even if the box currently has no fronts to animate.
  if (!matchedDoors.length && !matchedDrawers.length) return true;

  const currentlyOpen =
    matchedDoors.some(door => !!asRecord(door)?.isOpen) ||
    matchedDrawers.some(drawer => !!asRecord(drawer)?.isOpen);
  const nextOpen = !currentlyOpen;

  const hasInternalDrawers = matchedDrawers.some(drawer => isSketchFreeBoxInternalDrawerEntry(drawer));

  recordSketchFreeBoxMotionToggle(App, scope, nextOpen, {
    hasInternalDrawers,
    delayMs: readConfigNumberLooseFromApp(App, 'DOOR_DELAY_MS', 600),
  });
  patchSketchFreeBoxDoorOpenState(App, scope, nextOpen, preferredStack);

  for (const door of matchedDoors) {
    const rec = asRecord(door);
    if (rec) setDoorLocalOpenState(rec, nextOpen);
  }
  for (const drawer of matchedDrawers) {
    const rec = asRecord(drawer);
    if (rec) setDrawerLocalOpenState(rec, nextOpen);
  }

  markLocalDoorMotion(App);
  return true;
}
