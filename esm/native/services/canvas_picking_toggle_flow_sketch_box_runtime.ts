import type { AppContainer, UnknownRecord } from '../../../types';

import { getDoorsArray } from '../runtime/render_access.js';
import type { SketchBoxDoorTarget } from './canvas_picking_toggle_flow_sketch_box_contracts.js';
import {
  asAppBag,
  asRecord,
  ensureChildRecord,
  readFiniteNumber,
  readStringRecord,
} from './canvas_picking_toggle_flow_shared.js';

export const __SKETCH_BOX_DOOR_MOTION_SEED_KEY = '__wpSketchBoxDoorMotionSeed';
const __SKETCH_BOX_DOOR_PENDING_STATE_KEY = '__wpSketchBoxDoorPendingState';

function getSketchBoxDoorPendingStateStore(App: AppContainer): UnknownRecord {
  return ensureChildRecord(asAppBag(App), __SKETCH_BOX_DOOR_PENDING_STATE_KEY);
}

function getSketchBoxDoorMotionSeedStore(App: AppContainer): UnknownRecord {
  return ensureChildRecord(asAppBag(App), __SKETCH_BOX_DOOR_MOTION_SEED_KEY);
}

function getSketchBoxDoorPendingStateKey(moduleKey: string | null | undefined, boxId: string): string {
  const scope = moduleKey == null || moduleKey === '' ? '__free__' : String(moduleKey);
  return `${scope}::${String(boxId)}`;
}

function getSketchBoxDoorMotionSeedKey(
  moduleKey: string | null | undefined,
  boxId: string,
  doorId?: string | null
): string {
  const scope = moduleKey == null || moduleKey === '' ? '__free__' : String(moduleKey);
  const suffix = doorId != null && doorId !== '' ? `::${String(doorId)}` : '';
  return `${scope}::${String(boxId)}${suffix}`;
}

export function setPendingSketchBoxDoorState(
  App: AppContainer,
  target: SketchBoxDoorTarget,
  nextOpen: boolean
): void {
  const key = getSketchBoxDoorPendingStateKey(target.moduleKey, target.boxId);
  const store = getSketchBoxDoorPendingStateStore(App);
  store[key] = { open: !!nextOpen };
}

export function seedSketchBoxDoorMotion(
  App: AppContainer,
  target: SketchBoxDoorTarget,
  nextOpen: boolean
): void {
  const targetKey = getSketchBoxDoorMotionSeedKey(target.moduleKey, target.boxId, target.doorId);
  const doors = getDoorsArray(App);
  for (let i = 0; i < doors.length; i++) {
    const doorRec = asRecord(doors[i]);
    const group = asRecord(doorRec?.group);
    const userData = asRecord(group?.userData);
    const boxId = readStringRecord(userData, '__wpSketchBoxId');
    if (!boxId) continue;
    const moduleKey = readStringRecord(userData, '__wpSketchModuleKey');
    const doorId = readStringRecord(userData, '__wpSketchBoxDoorId');
    if (getSketchBoxDoorMotionSeedKey(moduleKey, boxId, doorId) !== targetKey) continue;
    const rotY = readFiniteNumber(asRecord(group?.rotation)?.y);
    if (rotY == null) return;
    const store = getSketchBoxDoorMotionSeedStore(App);
    store[targetKey] = { rotationY: rotY, nextOpen };
    return;
  }
}

function findSketchBoxDoorRuntime(App: AppContainer, target: SketchBoxDoorTarget): UnknownRecord | null {
  const targetKey = getSketchBoxDoorMotionSeedKey(target.moduleKey, target.boxId, target.doorId);
  const doors = getDoorsArray(App);
  for (let i = 0; i < doors.length; i++) {
    const doorRec = asRecord(doors[i]);
    const group = asRecord(doorRec?.group);
    const userData = asRecord(group?.userData);
    const boxId = readStringRecord(userData, '__wpSketchBoxId');
    if (!boxId) continue;
    const moduleKey = readStringRecord(userData, '__wpSketchModuleKey');
    const doorId = readStringRecord(userData, '__wpSketchBoxDoorId');
    if (getSketchBoxDoorMotionSeedKey(moduleKey, boxId, doorId) !== targetKey) continue;
    return doorRec;
  }
  return null;
}

function applySketchBoxDoorRuntimeState(
  App: AppContainer,
  target: SketchBoxDoorTarget,
  nextOpen: boolean
): boolean {
  const doorRec = findSketchBoxDoorRuntime(App, target);
  if (!doorRec) return false;
  doorRec.isOpen = !!nextOpen;
  doorRec.noGlobalOpen = true;
  const group = asRecord(doorRec.group);
  const userData = asRecord(group?.userData);
  if (userData) userData.noGlobalOpen = true;
  return true;
}

export function applySketchBoxDoorRuntimeStateForBox(
  App: AppContainer,
  target: SketchBoxDoorTarget,
  nextOpen: boolean
): number {
  const targetKey = getSketchBoxDoorPendingStateKey(target.moduleKey, target.boxId);
  const doors = getDoorsArray(App);
  let matched = 0;
  for (let i = 0; i < doors.length; i++) {
    const doorRec = asRecord(doors[i]);
    const group = asRecord(doorRec?.group);
    const userData = asRecord(group?.userData);
    const boxId = readStringRecord(userData, '__wpSketchBoxId');
    if (!boxId) continue;
    const moduleKey = readStringRecord(userData, '__wpSketchModuleKey');
    if (getSketchBoxDoorPendingStateKey(moduleKey, boxId) !== targetKey) continue;
    const doorId = readStringRecord(userData, '__wpSketchBoxDoorId');
    if (!applySketchBoxDoorRuntimeState(App, { moduleKey, boxId, doorId }, nextOpen)) continue;
    matched += 1;
  }
  if (matched === 0 && target.doorId) return applySketchBoxDoorRuntimeState(App, target, nextOpen) ? 1 : 0;
  return matched;
}
