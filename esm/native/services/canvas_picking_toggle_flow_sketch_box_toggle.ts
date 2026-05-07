import type { AppContainer, UnknownRecord } from '../../../types';

import { getModulesActions } from '../runtime/actions_access_domains.js';
import type { SketchBoxDoorTarget } from './canvas_picking_toggle_flow_sketch_box_contracts.js';
import { resolveSketchBoxPatchTargets } from './canvas_picking_toggle_flow_sketch_box_target.js';
import {
  applySketchBoxDoorRuntimeStateForBox,
  seedSketchBoxDoorMotion,
  setPendingSketchBoxDoorState,
} from './canvas_picking_toggle_flow_sketch_box_runtime.js';
import { asRecord, ensureChildRecord, markLocalDoorMotion } from './canvas_picking_toggle_flow_shared.js';

export function toggleSketchBoxDoor(
  App: AppContainer,
  target: SketchBoxDoorTarget | null,
  preferredStack?: string | null
): boolean {
  if (!target) return false;
  const { boxId, moduleKey } = target;
  const mods = getModulesActions(App);
  if (!mods || typeof mods.patchForStack !== 'function') return false;
  const ensureForStack = typeof mods.ensureForStack === 'function' ? mods.ensureForStack : null;
  const patchTargets = resolveSketchBoxPatchTargets(App, target, preferredStack);
  for (const patchTarget of patchTargets) {
    const stack = patchTarget.stack;
    const cfg = ensureForStack ? ensureForStack(stack, patchTarget.moduleKey) : null;
    const cfgRec = asRecord(cfg);
    const extra = asRecord(cfgRec?.sketchExtras);
    const boxes = Array.isArray(extra?.boxes) ? extra?.boxes : null;
    if (!boxes) continue;
    const exists = boxes.some(box => {
      const rec = asRecord(box);
      return !!rec && rec.id != null && String(rec.id) === boxId;
    });
    if (!exists) continue;

    let changed = false;
    let nextOpen: boolean | null = null;
    let toggledDoorCount = 0;
    const runtimeModuleKey = patchTarget.moduleKey != null ? String(patchTarget.moduleKey) : moduleKey;
    mods.patchForStack(
      stack,
      patchTarget.moduleKey,
      (cfgPatch: UnknownRecord) => {
        const extraRec = ensureChildRecord(cfgPatch, 'sketchExtras');
        const list = Array.isArray(extraRec.boxes) ? extraRec.boxes : (extraRec.boxes = []);
        for (let i = 0; i < list.length; i++) {
          const boxRec = asRecord(list[i]);
          if (!boxRec || boxRec.id == null || String(boxRec.id) !== boxId) continue;
          const doors = Array.isArray(boxRec.doors) ? boxRec.doors.slice() : [];
          const enabledDoors: Array<{ index: number; door: UnknownRecord; doorId: string }> = [];
          for (let di = 0; di < doors.length; di++) {
            const currentDoor = asRecord(doors[di]);
            if (!(currentDoor && currentDoor.enabled !== false)) continue;
            const currentDoorId =
              currentDoor.id != null && String(currentDoor.id)
                ? String(currentDoor.id)
                : `sketch_box_door_${di}`;
            enabledDoors.push({ index: di, door: currentDoor, doorId: currentDoorId });
          }
          if (!enabledDoors.length) return;

          nextOpen = !enabledDoors.some(entry => entry.door.open === true);
          toggledDoorCount = enabledDoors.length;
          for (let di = 0; di < enabledDoors.length; di++) {
            const entry = enabledDoors[di];
            const runtimeTarget: SketchBoxDoorTarget = {
              moduleKey: runtimeModuleKey,
              boxId,
              doorId: entry.doorId,
            };
            seedSketchBoxDoorMotion(App, runtimeTarget, nextOpen);
            doors[entry.index] = { ...entry.door, id: entry.doorId, enabled: true, open: nextOpen };
          }
          boxRec.doors = doors;
          delete boxRec.door;
          changed = true;
          return;
        }
      },
      {
        source: 'sketchBoxDoorToggle',
        immediate: false,
        noBuild: true,
        noHistory: true,
      }
    );

    if (changed) {
      const runtimeTarget: SketchBoxDoorTarget = { moduleKey: runtimeModuleKey, boxId, doorId: null };
      const appliedCount =
        nextOpen != null ? applySketchBoxDoorRuntimeStateForBox(App, runtimeTarget, nextOpen) : 0;
      if (nextOpen != null && appliedCount < toggledDoorCount) {
        setPendingSketchBoxDoorState(App, runtimeTarget, nextOpen);
      }
      markLocalDoorMotion(App);
      return true;
    }
  }
  return false;
}
