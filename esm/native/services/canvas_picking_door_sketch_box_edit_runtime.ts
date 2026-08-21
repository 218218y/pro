import type { AppContainer, UnknownRecord } from '../../../types';
import { formatIdentityValue, readIdentityValue } from '../../shared/identity_value_shared.js';

import { readRootState } from '../runtime/root_state_access.js';
import { asRecord, ensureRecordSlot } from './canvas_picking_door_edit_shared.js';
import type {
  SketchBoxDoorEditCapabilities,
  SketchBoxDoorModuleSnapshot,
  SketchBoxDoorPatchOptions,
  SketchBoxDoorPatchRequest,
  SketchBoxDoorRecord,
  SketchBoxDoorStateSnapshot,
  SketchBoxDoorTarget,
} from './canvas_picking_door_sketch_box_edit.js';
import {
  patchSketchBoxDoorWithCapabilities,
  readSketchBoxDoorRecordWithCapabilities,
} from './canvas_picking_door_sketch_box_edit.js';
import { createCanvasPickingModulesStructuralPatchMeta } from './canvas_picking_modules_patch_meta.js';
import {
  commitCanvasModuleStructuralPatch,
  readCanvasModuleConfigForStack,
} from './canvas_picking_structural_commit.js';

const capabilitiesByApp = new WeakMap<AppContainer, SketchBoxDoorEditCapabilities>();

function readIdentity(value: unknown): string {
  return formatIdentityValue(readIdentityValue(value));
}

function readTargetDoorFromModule(
  cfg: UnknownRecord,
  target: SketchBoxDoorTarget
): { hasTargetBox: boolean; targetDoor: SketchBoxDoorRecord | null } {
  const extra = asRecord(cfg.sketchExtras);
  const boxes = Array.isArray(extra?.boxes) ? extra.boxes : [];
  for (const box of boxes) {
    const boxRec = asRecord(box);
    if (!boxRec || readIdentity(boxRec.id) !== target.boxId) continue;
    const doors = Array.isArray(boxRec.doors) ? boxRec.doors : [];
    const doorId = target.doorId != null && String(target.doorId) ? String(target.doorId) : null;
    for (const door of doors) {
      const doorRec = asRecord(door);
      if (!doorRec) continue;
      if (doorId && readIdentity(doorRec.id) !== doorId) continue;
      return { hasTargetBox: true, targetDoor: doorRec };
    }
    return { hasTargetBox: true, targetDoor: null };
  }
  return { hasTargetBox: false, targetDoor: null };
}

function captureModulesForStack(
  state: UnknownRecord | null,
  stack: 'top' | 'bottom',
  target: SketchBoxDoorTarget
): readonly SketchBoxDoorModuleSnapshot[] {
  const bucketKey = stack === 'bottom' ? 'stackSplitLowerModulesConfiguration' : 'modulesConfiguration';
  const modules = Array.isArray(state?.[bucketKey]) ? state[bucketKey] : [];
  const out: SketchBoxDoorModuleSnapshot[] = [];
  for (let sourceIndex = 0; sourceIndex < modules.length; sourceIndex += 1) {
    const cfg = asRecord(modules[sourceIndex]);
    if (!cfg) continue;
    const identities = [cfg.id, cfg.moduleKey, cfg.key].map(readIdentity).filter(Boolean);
    const targetState = readTargetDoorFromModule(cfg, target);
    out.push(
      Object.freeze({
        lookupIndex: out.length,
        patchModuleKey: String(sourceIndex),
        identities: Object.freeze([...new Set(identities)]),
        hasTargetBox: targetState.hasTargetBox,
        targetDoor: targetState.targetDoor,
      })
    );
  }
  return Object.freeze(out);
}

export function captureSketchBoxDoorTargetSnapshot(
  App: AppContainer,
  target: SketchBoxDoorTarget
): SketchBoxDoorStateSnapshot {
  const state = asRecord(readRootState(App));
  return Object.freeze({
    top: captureModulesForStack(state, 'top', target),
    bottom: captureModulesForStack(state, 'bottom', target),
  });
}

function commitSketchBoxDoorPatch(App: AppContainer, request: SketchBoxDoorPatchRequest) {
  const cfg = readCanvasModuleConfigForStack({
    App,
    stack: request.stack,
    moduleKey: request.moduleKey,
    op: 'sketchBoxDoorEdit.target',
  });
  const cfgRec = asRecord(cfg);
  const extra = asRecord(cfgRec?.sketchExtras);
  const boxes = Array.isArray(extra?.boxes) ? extra.boxes : null;
  if (!boxes) return { committed: true, changed: false };

  let changed = false;
  const outcome = commitCanvasModuleStructuralPatch({
    App,
    stack: request.stack,
    moduleKey: request.moduleKey,
    mutate: (cfgPatch: UnknownRecord) => {
      const extraRec = ensureRecordSlot(cfgPatch, 'sketchExtras');
      const list = Array.isArray(extraRec.boxes) ? extraRec.boxes : (extraRec.boxes = []);
      for (let index = 0; index < list.length; index += 1) {
        const boxRec = asRecord(list[index]);
        if (!boxRec || readIdentity(boxRec.id) !== request.boxId) continue;
        const doors = Array.isArray(boxRec.doors) ? boxRec.doors.filter(item => !!asRecord(item)) : [];
        const nextDoors: SketchBoxDoorRecord[] = [];
        let matched = false;
        for (let doorIndex = 0; doorIndex < doors.length; doorIndex += 1) {
          const currentDoor = asRecord(doors[doorIndex]);
          if (!currentDoor) continue;
          const currentId = readIdentity(currentDoor.id);
          if (request.doorId && currentId !== request.doorId) {
            nextDoors.push(currentDoor);
            continue;
          }
          const nextDoor = request.mutate(currentDoor);
          if (nextDoor) nextDoors.push(nextDoor);
          matched = true;
          if (request.doorId) {
            for (let laterIndex = doorIndex + 1; laterIndex < doors.length; laterIndex += 1) {
              const later = asRecord(doors[laterIndex]);
              if (later) nextDoors.push(later);
            }
            break;
          }
        }
        if (!matched && !request.doorId) {
          const nextDoor = request.mutate(null);
          if (nextDoor) nextDoors.push(nextDoor);
          matched = nextDoor != null;
        }
        if (nextDoors.length) boxRec.doors = nextDoors;
        else delete boxRec.doors;
        delete boxRec.door;
        changed = matched;
        return;
      }
      return changed;
    },
    meta: createCanvasPickingModulesStructuralPatchMeta(request.source),
    op: 'sketchBoxDoorEdit.patch',
  });

  return { committed: outcome.committed, changed: outcome.changed && changed };
}

export function createSketchBoxDoorEditCapabilities(App: AppContainer): SketchBoxDoorEditCapabilities {
  const cached = capabilitiesByApp.get(App);
  if (cached) return cached;
  const capabilities: SketchBoxDoorEditCapabilities = {
    readTargetSnapshot: target => captureSketchBoxDoorTargetSnapshot(App, target),
    commitDoorPatch: request => commitSketchBoxDoorPatch(App, request),
  };
  capabilitiesByApp.set(App, capabilities);
  return capabilities;
}

export function readSketchBoxDoorRecord(
  App: AppContainer,
  target: SketchBoxDoorTarget | null,
  preferredStack: 'top' | 'bottom'
): SketchBoxDoorRecord | null {
  return readSketchBoxDoorRecordWithCapabilities(
    createSketchBoxDoorEditCapabilities(App),
    target,
    preferredStack
  );
}

export function patchSketchBoxDoor(
  App: AppContainer,
  target: SketchBoxDoorTarget | null,
  preferredStack: 'top' | 'bottom',
  mutate: (door: SketchBoxDoorRecord | null) => SketchBoxDoorRecord | null,
  options?: SketchBoxDoorPatchOptions | null
): boolean {
  return patchSketchBoxDoorWithCapabilities(
    createSketchBoxDoorEditCapabilities(App),
    target,
    preferredStack,
    mutate,
    options
  );
}
