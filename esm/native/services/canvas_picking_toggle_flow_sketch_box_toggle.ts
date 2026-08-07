import type { AppContainer, UnknownRecord } from '../../../types';
import { formatIdentityValue, readIdentityValue } from '../../shared/identity_value_shared.js';

import type { SketchBoxDoorTarget } from './canvas_picking_toggle_flow_sketch_box_contracts.js';
import { resolveSketchBoxPatchTargets } from './canvas_picking_toggle_flow_sketch_box_target.js';
import {
  applySketchBoxDoorRuntimeStateForBox,
  seedSketchBoxDoorMotion,
  setPendingSketchBoxDoorState,
} from './canvas_picking_toggle_flow_sketch_box_runtime.js';
import { asRecord, ensureChildRecord, markLocalDoorMotion } from './canvas_picking_toggle_flow_shared.js';
import { createCanvasPickingModulesMotionPatchMeta } from './canvas_picking_modules_patch_meta.js';
import {
  commitCanvasModuleStructuralPatch,
  readCanvasModuleConfigForStack,
} from './canvas_picking_structural_commit.js';

export function toggleSketchBoxDoor(
  App: AppContainer,
  target: SketchBoxDoorTarget | null,
  preferredStack?: string | null
): boolean {
  if (!target) return false;
  const { boxId, moduleKey } = target;
  const patchTargets = resolveSketchBoxPatchTargets(App, target, preferredStack);
  for (const patchTarget of patchTargets) {
    const stack = patchTarget.stack;
    const cfg = readCanvasModuleConfigForStack({
      App,
      stack,
      moduleKey: patchTarget.moduleKey,
      op: 'sketchBoxDoorToggle.target',
    });
    const cfgRec = asRecord(cfg);
    const extra = asRecord(cfgRec?.sketchExtras);
    const boxes = Array.isArray(extra?.boxes) ? extra?.boxes : null;
    if (!boxes) continue;
    const exists = boxes.some(box => {
      const rec = asRecord(box);
      return !!rec && formatIdentityValue(readIdentityValue(rec.id)) === boxId;
    });
    if (!exists) continue;

    let changed = false;
    let nextOpen: boolean | null = null;
    let toggledDoorCount = 0;
    const runtimeModuleKey = patchTarget.moduleKey != null ? String(patchTarget.moduleKey) : moduleKey;
    const outcome = commitCanvasModuleStructuralPatch({
      App,
      stack,
      moduleKey: patchTarget.moduleKey,
      mutate: (cfgPatch: UnknownRecord) => {
        const extraRec = ensureChildRecord(cfgPatch, 'sketchExtras');
        const list = Array.isArray(extraRec.boxes) ? extraRec.boxes : (extraRec.boxes = []);
        for (let i = 0; i < list.length; i++) {
          const boxRec = asRecord(list[i]);
          if (!boxRec || formatIdentityValue(readIdentityValue(boxRec.id)) !== boxId) continue;
          const doors = Array.isArray(boxRec.doors) ? boxRec.doors.slice() : [];
          const enabledDoors: Array<{ index: number; door: UnknownRecord; doorId: string }> = [];
          for (let di = 0; di < doors.length; di++) {
            const currentDoor = asRecord(doors[di]);
            if (!(currentDoor && currentDoor.enabled !== false)) continue;
            const currentDoorId =
              formatIdentityValue(readIdentityValue(currentDoor.id)) || `sketch_box_door_${di}`;
            enabledDoors.push({ index: di, door: currentDoor, doorId: currentDoorId });
          }
          if (!enabledDoors.length) return false;

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
          return true;
        }
        return false;
      },
      meta: createCanvasPickingModulesMotionPatchMeta('sketchBoxDoorToggle'),
      op: 'sketchBoxDoorToggle.patch',
    });

    if (!outcome.committed) return false;
    if (outcome.changed && changed) {
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
