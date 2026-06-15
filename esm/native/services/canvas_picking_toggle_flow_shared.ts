import type { AppContainer, UnknownRecord } from '../../../types';

import type { HitObjectLike } from './canvas_picking_engine.js';
import { getTools } from '../runtime/service_access.js';
import { getDoorsArray, getDrawersArray } from '../runtime/render_access.js';
import { toggleDoorsViaService, writeDoorsRuntimeNumber } from '../runtime/doors_access.js';
import { patchRuntime } from '../runtime/runtime_write_access.js';
import { __wp_reportPickingIssue, __wp_str } from './canvas_picking_core_helpers.js';
import { runPlatformActivityRenderTouch } from '../runtime/platform_access.js';
import { __isDoorRuntimeRef } from './canvas_picking_local_helpers_shared.js';

export type CanvasDirectDoorToggleArgs = {
  App: AppContainer;
  primaryHitObject: HitObjectLike | null;
  effectiveDoorId: string | null;
};

export function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? Object(value) : null;
}

export function asAppBag(App: AppContainer): AppContainer & UnknownRecord {
  return App;
}

export function ensureChildRecord(owner: UnknownRecord, key: string): UnknownRecord {
  const existing = asRecord(owner[key]);
  if (existing) return existing;
  const next: UnknownRecord = {};
  owner[key] = next;
  return next;
}

export function readStringRecord(value: unknown, key: string): string | null {
  const rec = asRecord(value);
  const raw = rec ? rec[key] : undefined;
  return raw == null ? null : String(raw);
}

export function readFiniteNumber(value: unknown): number | null {
  const num = typeof value === 'number' ? value : value != null ? Number(value) : NaN;
  return Number.isFinite(num) ? num : null;
}

export function toggleDoorsState(App: AppContainer): void {
  toggleDoorsViaService(App);
  const __tools_end = getTools(App);
  if (typeof __tools_end.setDrawersOpenId === 'function') __tools_end.setDrawersOpenId(null);
  runPlatformActivityRenderTouch(App, { updateShadows: true });
}

export function markLocalDoorMotion(App: AppContainer): void {
  const now = Date.now();
  writeDoorsRuntimeNumber(App, 'lastToggleTime', now);
  runPlatformActivityRenderTouch(App, {
    updateShadows: false,
    ensureRenderLoopAfterTrigger: true,
  });
}

function isHitInsideObject(primaryHitObject: HitObjectLike | null, group: unknown): boolean {
  let parent: HitObjectLike | null = primaryHitObject;
  while (parent) {
    if (parent === group) return true;
    parent = parent.parent || null;
  }
  return false;
}

function findSlidingDoorForClick(
  doorsArray: ReturnType<typeof getDoorsArray>,
  primaryHitObject: HitObjectLike | null,
  effectiveDoorId: string | null
) {
  let matchedById: ReturnType<typeof getDoorsArray>[number] | null = null;
  for (let d of doorsArray) {
    const dg = d ? d.group : null;
    if (!d || d.type !== 'sliding' || !dg) continue;

    // Prefer the actual raycast object ancestry over the promoted/effective id.
    // Sliding doors overlap by design, and the generic hit-promotion path can carry
    // the opposite leaf id after a type switch or when lanes overlap. The object
    // ancestry is the only deterministic signal for the clicked leaf.
    if (isHitInsideObject(primaryHitObject, dg)) return d;

    if (effectiveDoorId && dg.userData && dg.userData.partId === effectiveDoorId) matchedById = d;
  }
  return matchedById;
}

function resetSlidingDoorLocalOpenMarkers(door: UnknownRecord): void {
  door.noGlobalOpen = false;
  door.slidingOpenMode = undefined;
  door.__slidingOpenMode = undefined;
  door.slidingTrackOpenSide = undefined;
  door.__slidingTrackOpenSide = undefined;
}

function hasOpenSlidingTrackDoor(doorsArray: ReturnType<typeof getDoorsArray>): boolean {
  return doorsArray.some(
    sd =>
      !!sd &&
      sd.type === 'sliding' &&
      sd.isOpen === true &&
      ((sd as UnknownRecord).slidingOpenMode === 'track' ||
        (sd as UnknownRecord).__slidingOpenMode === 'track')
  );
}

function readSlidingDoorIndex(door: ReturnType<typeof getDoorsArray>[number]): number | null {
  const raw = (door as UnknownRecord | null | undefined)?.index;
  const num = readFiniteNumber(raw);
  return num == null ? null : num;
}

function findDefaultSlidingDoorForCabinetClick(
  doorsArray: ReturnType<typeof getDoorsArray>
): ReturnType<typeof getDoorsArray>[number] | null {
  let fallback: ReturnType<typeof getDoorsArray>[number] | null = null;
  let fallbackIndex = Number.POSITIVE_INFINITY;

  for (const door of doorsArray) {
    if (!door || door.type !== 'sliding' || !door.group) continue;

    const idx = readSlidingDoorIndex(door);
    if (!fallback || (idx != null && idx < fallbackIndex)) {
      fallback = door;
      fallbackIndex = idx == null ? fallbackIndex : idx;
    }
  }

  return fallback;
}

function closeSlidingTrackDoors(App: AppContainer, doorsArray: ReturnType<typeof getDoorsArray>): void {
  for (const sd of doorsArray) {
    if (!sd || sd.type !== 'sliding') continue;
    resetSlidingDoorLocalOpenMarkers(sd as UnknownRecord);
    sd.isOpen = false;
  }

  try {
    patchRuntime(App, { doorsOpen: false, doorsLastToggleTime: Date.now() });
  } catch (_e) {
    __wp_reportPickingIssue(App, _e, {
      where: 'canvasPicking',
      op: 'slidingTrackDoorToggle.close.patchRuntime',
      throttleMs: 1000,
    });
  }

  const __tools_end = getTools(App);
  if (typeof __tools_end.setDrawersOpenId === 'function') __tools_end.setDrawersOpenId(null);
  markLocalDoorMotion(App);
}

export function tryCloseOpenSlidingTrackDoors(App: AppContainer): boolean {
  const doorsArray = getDoorsArray(App);
  if (!hasOpenSlidingTrackDoor(doorsArray)) return false;
  closeSlidingTrackDoors(App, doorsArray);
  return true;
}

function openSlidingDoorInTrackMode(
  App: AppContainer,
  doorsArray: ReturnType<typeof getDoorsArray>,
  clickedDoor: ReturnType<typeof getDoorsArray>[number]
): void {
  for (const sd of doorsArray) {
    if (!sd || sd.type !== 'sliding') continue;
    const rec = sd as UnknownRecord;
    resetSlidingDoorLocalOpenMarkers(rec);
    sd.isOpen = false;
  }

  clickedDoor.isOpen = true;
  const rec = clickedDoor as UnknownRecord;
  rec.noGlobalOpen = true;
  rec.slidingOpenMode = 'track';
  rec.__slidingOpenMode = 'track';

  try {
    patchRuntime(App, { doorsOpen: false, doorsLastToggleTime: Date.now() });
  } catch (_e) {
    __wp_reportPickingIssue(App, _e, {
      where: 'canvasPicking',
      op: 'slidingTrackDoorToggle.patchRuntime',
      throttleMs: 1000,
    });
  }

  const __tools_end = getTools(App);
  if (typeof __tools_end.setDrawersOpenId === 'function') __tools_end.setDrawersOpenId(null);
  markLocalDoorMotion(App);
}

export function tryHandleSlidingTrackDoorToggle(args: CanvasDirectDoorToggleArgs): boolean {
  const { App, primaryHitObject, effectiveDoorId } = args;
  const doorsArray = getDoorsArray(App);
  const clickedDoor = findSlidingDoorForClick(doorsArray, primaryHitObject, effectiveDoorId);
  if (!clickedDoor) return false;

  if (hasOpenSlidingTrackDoor(doorsArray)) {
    closeSlidingTrackDoors(App, doorsArray);
    return true;
  }

  openSlidingDoorInTrackMode(App, doorsArray, clickedDoor);
  return true;
}

export function tryHandleSlidingCabinetFallbackToggle(App: AppContainer): boolean {
  const doorsArray = getDoorsArray(App);
  const fallbackDoor = findDefaultSlidingDoorForCabinetClick(doorsArray);
  if (!fallbackDoor) return false;

  openSlidingDoorInTrackMode(App, doorsArray, fallbackDoor);
  return true;
}

export function resolveCanvasToggleClickedId(
  App: AppContainer,
  primaryHitObject: HitObjectLike | null,
  effectiveDoorId: string | null,
  foundPartId: string | null
): string {
  try {
    if (effectiveDoorId) return __wp_str(App, effectiveDoorId);
    if (foundPartId) return __wp_str(App, foundPartId);
    let cur = primaryHitObject;
    while (cur) {
      if (cur.userData && cur.userData.partId) return __wp_str(App, cur.userData.partId);
      cur = cur.parent || null;
    }
  } catch (_e) {
    __wp_reportPickingIssue(App, _e, {
      where: 'canvasPicking',
      op: 'globalToggle.cornerPent.resolveClickedId',
      throttleMs: 1000,
    });
  }
  return '';
}

export function tryHandleGlobalCornerPentToggle(
  App: AppContainer,
  primaryHitObject: HitObjectLike | null,
  effectiveDoorId: string | null,
  foundPartId: string | null
): boolean {
  try {
    const __clickedId = resolveCanvasToggleClickedId(App, primaryHitObject, effectiveDoorId, foundPartId);
    if (!(__clickedId && __clickedId.startsWith('corner_pent_'))) return false;
    const doorsArray = getDoorsArray(App);
    const allDoors = doorsArray.filter(__isDoorRuntimeRef);
    const list1 = allDoors.filter(d =>
      String(d.group?.userData?.partId ?? '').startsWith('corner_pent_door_1')
    );
    const list2 = allDoors.filter(d =>
      String(d.group?.userData?.partId ?? '').startsWith('corner_pent_door_2')
    );
    const cur = !!(list1.some(d => !!d.isOpen) || list2.some(d => !!d.isOpen));
    const next = !cur;
    list1.forEach(d => {
      d.isOpen = next;
    });
    list2.forEach(d => {
      d.isOpen = next;
    });

    markLocalDoorMotion(App);
    return true;
  } catch (_e) {
    __wp_reportPickingIssue(App, _e, {
      where: 'canvasPicking',
      op: 'globalToggle.cornerPent.only',
      throttleMs: 1000,
    });
  }
  return false;
}

export function tryHandleDirectDoorOrDrawerToggle(args: CanvasDirectDoorToggleArgs): boolean {
  const { App, primaryHitObject, effectiveDoorId } = args;
  const doorsArray = getDoorsArray(App);

  for (let d of doorsArray) {
    const dg = d ? d.group : null;
    if (!dg) continue;

    if (effectiveDoorId && dg.userData && dg.userData.partId === effectiveDoorId) {
      if (d.type === 'sliding') return tryHandleSlidingTrackDoorToggle(args);
      d.isOpen = !d.isOpen;
      markLocalDoorMotion(App);
      return true;
    }
    let parent: HitObjectLike | null = primaryHitObject;
    while (parent) {
      if (parent === dg) {
        if (d.type === 'sliding') return tryHandleSlidingTrackDoorToggle(args);
        d.isOpen = !d.isOpen;
        markLocalDoorMotion(App);
        return true;
      }
      parent = parent.parent || null;
    }
  }

  const drawersArray = getDrawersArray(App);
  for (let dr of drawersArray) {
    let parent: HitObjectLike | null = primaryHitObject;
    while (parent) {
      if (parent === dr.group) {
        dr.isOpen = !dr.isOpen;
        markLocalDoorMotion(App);
        return true;
      }
      parent = parent.parent || null;
    }
  }

  return false;
}
