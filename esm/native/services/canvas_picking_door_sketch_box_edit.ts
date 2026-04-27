import type { AppContainer, UnknownRecord } from '../../../types';

import { getModulesActions } from '../runtime/actions_access_domains.js';
import { readRootState } from '../runtime/root_state_access.js';
import { asRecord, ensureRecordSlot } from './canvas_picking_door_edit_shared.js';

export type SketchBoxDoorTarget = {
  moduleKey: string | null;
  boxId: string;
  doorId: string | null;
};

export function parseSketchBoxDoorTarget(partId: string | null | undefined): SketchBoxDoorTarget | null {
  const pid = String(partId || '');
  if (!pid) return null;
  let match =
    /^sketch_box_free_(.+)_(sb(?:f)?_[a-z0-9]+)_door_([a-z0-9_]+?)(?:_(?:accent|groove)_(?:top|bottom|left|right))?$/i.exec(
      pid
    );
  if (match?.[2]) {
    return {
      moduleKey: match[1] ? String(match[1]) : null,
      boxId: String(match[2]),
      doorId: match[3] ? String(match[3]) : null,
    };
  }
  match =
    /^sketch_box_(.+)_(sb(?:f)?_[a-z0-9]+)_door_([a-z0-9_]+?)(?:_(?:accent|groove)_(?:top|bottom|left|right))?$/i.exec(
      pid
    );
  if (match?.[2]) {
    return {
      moduleKey: match[1] ? String(match[1]) : null,
      boxId: String(match[2]),
      doorId: match[3] ? String(match[3]) : null,
    };
  }
  match =
    /^sketch_box_free_(sb(?:f)?_[a-z0-9]+)_door_([a-z0-9_]+?)(?:_(?:accent|groove)_(?:top|bottom|left|right))?$/i.exec(
      pid
    );
  if (match?.[1])
    return { moduleKey: null, boxId: String(match[1]), doorId: match[2] ? String(match[2]) : null };
  match =
    /^sketch_box_(sb(?:f)?_[a-z0-9]+)_door_([a-z0-9_]+?)(?:_(?:accent|groove)_(?:top|bottom|left|right))?$/i.exec(
      pid
    );
  if (match?.[1])
    return { moduleKey: null, boxId: String(match[1]), doorId: match[2] ? String(match[2]) : null };
  return null;
}

function resolveSketchBoxDoorPatchTargets(
  App: AppContainer,
  target: SketchBoxDoorTarget | null,
  preferredStack: 'top' | 'bottom'
): Array<{ stack: 'top' | 'bottom'; moduleKey: string }> {
  if (!target?.boxId) return [];
  const orderedStacks: Array<'top' | 'bottom'> =
    preferredStack === 'bottom' ? ['bottom', 'top'] : ['top', 'bottom'];
  const out: Array<{ stack: 'top' | 'bottom'; moduleKey: string }> = [];
  const seen = new Set<string>();

  const pushCandidate = (stack: 'top' | 'bottom', moduleKey: unknown) => {
    if (moduleKey == null || moduleKey === '') return;
    const key = `${stack}::${String(moduleKey)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ stack, moduleKey: String(moduleKey) });
  };

  if (target.moduleKey) {
    for (const stack of orderedStacks) pushCandidate(stack, target.moduleKey);
    return out;
  }

  const state = asRecord(readRootState(App));
  for (const stack of orderedStacks) {
    const bucketKey = stack === 'bottom' ? 'stackSplitLowerModulesConfiguration' : 'modulesConfiguration';
    const modules = Array.isArray(state?.[bucketKey]) ? state[bucketKey] : [];
    for (let i = 0; i < modules.length; i++) {
      const cfgRec = asRecord(modules[i]);
      const extra = asRecord(cfgRec?.sketchExtras);
      const boxes = Array.isArray(extra?.boxes) ? extra?.boxes : [];
      const found = boxes.some(box => {
        const boxRec = asRecord(box);
        return !!boxRec && boxRec.id != null && String(boxRec.id) === target.boxId;
      });
      if (found) pushCandidate(stack, i);
    }
  }

  return out;
}

export function patchSketchBoxDoor(
  App: AppContainer,
  target: SketchBoxDoorTarget | null,
  preferredStack: 'top' | 'bottom',
  mutate: (door: UnknownRecord | null) => UnknownRecord | null
): boolean {
  if (!target) return false;
  const { boxId, doorId: rawDoorId } = target;
  const mods = getModulesActions(App);
  if (!mods || typeof mods.patchForStack !== 'function') return false;
  const ensureForStack = typeof mods.ensureForStack === 'function' ? mods.ensureForStack.bind(mods) : null;
  const patchTargets = resolveSketchBoxDoorPatchTargets(App, target, preferredStack);
  for (const patchTarget of patchTargets) {
    const stack = patchTarget.stack;
    const cfg = ensureForStack ? ensureForStack(stack, patchTarget.moduleKey) : null;
    const cfgRec = asRecord(cfg);
    const extra = asRecord(cfgRec?.sketchExtras);
    const boxes = Array.isArray(extra?.boxes) ? extra?.boxes : null;
    if (!boxes) continue;
    let changed = false;
    mods.patchForStack(
      stack,
      patchTarget.moduleKey,
      (cfgPatch: UnknownRecord) => {
        const extraRec = ensureRecordSlot(cfgPatch, 'sketchExtras');
        const list = Array.isArray(extraRec.boxes) ? extraRec.boxes : (extraRec.boxes = []);
        for (let i = 0; i < list.length; i++) {
          const boxRec = asRecord(list[i]);
          if (!boxRec || boxRec.id == null || String(boxRec.id) !== boxId) continue;
          const doorId = rawDoorId != null && String(rawDoorId) ? String(rawDoorId) : '';
          const doors = Array.isArray(boxRec.doors) ? boxRec.doors.filter(it => !!asRecord(it)) : [];
          const nextDoors: UnknownRecord[] = [];
          let matched = false;
          for (let di = 0; di < doors.length; di++) {
            const currentDoor = asRecord(doors[di]);
            if (!currentDoor) continue;
            const currentId = currentDoor.id != null ? String(currentDoor.id) : '';
            if (doorId && currentId !== doorId) {
              nextDoors.push(currentDoor);
              continue;
            }
            const nextDoor = mutate(currentDoor);
            if (nextDoor) nextDoors.push(nextDoor);
            matched = true;
            if (doorId) {
              for (let dj = di + 1; dj < doors.length; dj++) {
                const later = asRecord(doors[dj]);
                if (later) nextDoors.push(later);
              }
              break;
            }
          }
          if (!matched && !doorId) {
            const nextDoor = mutate(null);
            if (nextDoor) nextDoors.push(nextDoor);
            matched = nextDoor != null;
          }
          if (nextDoors.length) boxRec.doors = nextDoors;
          else delete boxRec.doors;
          delete boxRec.door;
          changed = matched;
          return;
        }
      },
      { source: 'sketchBoxDoorEdit', immediate: true }
    );
    if (changed) return true;
  }
  return false;
}
