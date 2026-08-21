import type { UnknownRecord } from '../../../types';

import { asRecord, ensureChildRecord, readStringRecord } from './canvas_picking_toggle_flow_shared.js';

export type SketchBoxDoorOpenMutationOptions = {
  boxId: string;
  nextOpen?: boolean | null;
  requireFreePlacement?: boolean;
};

export type SketchBoxDoorOpenMutationResult = {
  matchedBox: boolean;
  changed: boolean;
  nextOpen: boolean | null;
  doorIds: readonly string[];
};

function matchesTargetBox(boxRec: UnknownRecord, boxId: string, requireFreePlacement: boolean): boolean {
  if (readStringRecord(boxRec, 'id') !== boxId) return false;
  return !requireFreePlacement || boxRec.freePlacement === true;
}

function readBoxesFromConfig(cfg: UnknownRecord): unknown[] {
  const extra = asRecord(cfg.sketchExtras);
  return Array.isArray(extra?.boxes) ? extra.boxes : [];
}

export function hasSketchBoxDoorOpenTarget(
  cfg: unknown,
  options: Pick<SketchBoxDoorOpenMutationOptions, 'boxId' | 'requireFreePlacement'>
): boolean {
  const cfgRec = asRecord(cfg);
  if (!cfgRec || !options.boxId) return false;
  const requireFreePlacement = options.requireFreePlacement === true;
  return readBoxesFromConfig(cfgRec).some(box => {
    const boxRec = asRecord(box);
    return !!boxRec && matchesTargetBox(boxRec, options.boxId, requireFreePlacement);
  });
}

export function mutateSketchBoxDoorOpenState(
  cfgPatch: UnknownRecord,
  options: SketchBoxDoorOpenMutationOptions
): SketchBoxDoorOpenMutationResult {
  if (!options.boxId) {
    return { matchedBox: false, changed: false, nextOpen: null, doorIds: [] };
  }

  const extraRec = ensureChildRecord(cfgPatch, 'sketchExtras');
  const list = Array.isArray(extraRec.boxes) ? extraRec.boxes : (extraRec.boxes = []);
  const requireFreePlacement = options.requireFreePlacement === true;

  for (let boxIndex = 0; boxIndex < list.length; boxIndex += 1) {
    const boxRec = asRecord(list[boxIndex]);
    if (!boxRec || !matchesTargetBox(boxRec, options.boxId, requireFreePlacement)) continue;

    const doors = Array.isArray(boxRec.doors) ? boxRec.doors.slice() : [];
    const enabledDoors: Array<{ index: number; door: UnknownRecord; doorId: string }> = [];
    for (let doorIndex = 0; doorIndex < doors.length; doorIndex += 1) {
      const doorRec = asRecord(doors[doorIndex]);
      if (!(doorRec && doorRec.enabled !== false)) continue;
      const doorId = readStringRecord(doorRec, 'id') || `sketch_box_door_${doorIndex}`;
      enabledDoors.push({ index: doorIndex, door: doorRec, doorId });
    }

    if (!enabledDoors.length) {
      return { matchedBox: true, changed: false, nextOpen: null, doorIds: [] };
    }

    const nextOpen =
      typeof options.nextOpen === 'boolean'
        ? options.nextOpen
        : !enabledDoors.some(entry => entry.door.open === true);
    for (const entry of enabledDoors) {
      doors[entry.index] = {
        ...entry.door,
        id: entry.doorId,
        enabled: true,
        open: nextOpen,
      };
    }

    boxRec.doors = doors;
    delete boxRec.door;
    return {
      matchedBox: true,
      changed: true,
      nextOpen,
      doorIds: enabledDoors.map(entry => entry.doorId),
    };
  }

  return { matchedBox: false, changed: false, nextOpen: null, doorIds: [] };
}
