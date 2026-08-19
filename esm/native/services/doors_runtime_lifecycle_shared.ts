import type { DoorVisualEntryLike, DrawerVisualEntryLike } from '../../../types';
import { formatIdentityValue, readIdentityValue } from '../../shared/identity_value_shared.js';

import { getDoorsArray, getDrawersArray } from '../runtime/render_access.js';
import { isSlidingDoorTrackOpenMode } from '../runtime/sliding_door_motion.js';
import {
  type AppLike,
  type DoorsSnapshot,
  createBooleanMap,
  reportDoorsRuntimeNonFatal,
} from './doors_runtime_shared.js';

export function doorKey(d: DoorVisualEntryLike, idx: number, App?: AppLike): string {
  try {
    const directId = formatIdentityValue(readIdentityValue(d?.id ?? d?.doorId));
    if (directId) return directId;
    const partId = formatIdentityValue(readIdentityValue(d?.group?.userData?.partId));
    if (partId) return partId;
    if (d && d.group && typeof d.group.name === 'string' && d.group.name) return String(d.group.name);
  } catch (_) {
    reportDoorsRuntimeNonFatal(App, 'L339', _);
  }
  return `idx:${idx}`;
}

export function readDoorRuntimeEntries(App: AppLike) {
  return getDoorsArray(App);
}

export function readDrawerRuntimeEntries(App: AppLike) {
  return getDrawersArray(App);
}

export function drawerKey(d: DrawerVisualEntryLike, idx: number, App?: AppLike): string {
  try {
    const directId = formatIdentityValue(readIdentityValue(d?.id ?? d?.drawerId));
    if (directId) return directId;
    const partId = formatIdentityValue(readIdentityValue(d?.group?.userData?.partId));
    if (partId) return partId;
    if (d && d.group && typeof d.group.name === 'string' && d.group.name) return String(d.group.name);
  } catch (_) {
    reportDoorsRuntimeNonFatal(App, 'L348', _);
  }
  return `idx:${idx}`;
}

function setSlidingTrackSnapshotMarkers(door: DoorVisualEntryLike, open: boolean): void {
  if (!door || door.type !== 'sliding') return;
  const rec = door as DoorVisualEntryLike & {
    noGlobalOpen?: boolean;
    slidingOpenMode?: unknown;
    __slidingOpenMode?: unknown;
    slidingTrackOpenSide?: unknown;
    __slidingTrackOpenSide?: unknown;
  };

  if (open) {
    rec.noGlobalOpen = true;
    rec.slidingOpenMode = 'track';
    rec.__slidingOpenMode = 'track';
    return;
  }

  if (isSlidingDoorTrackOpenMode(rec)) {
    rec.noGlobalOpen = false;
    delete rec.slidingOpenMode;
    delete rec.__slidingOpenMode;
    delete rec.slidingTrackOpenSide;
    delete rec.__slidingTrackOpenSide;
  }
}

export function captureSnapshot(App: AppLike, includeDrawers: boolean): DoorsSnapshot {
  const snap: DoorsSnapshot = {
    doors: createBooleanMap(),
    drawers: includeDrawers ? createBooleanMap() : null,
  };

  const doors = getDoorsArray(App);
  for (let i = 0; i < doors.length; i++) {
    const d = doors[i];
    if (!d) continue;
    snap.doors[doorKey(d, i, App)] = !!d.isOpen;
  }

  if (includeDrawers) {
    const drawers = snap.drawers;
    if (drawers) {
      const entries = getDrawersArray(App);
      for (let i = 0; i < entries.length; i++) {
        const drawer = entries[i];
        if (!drawer) continue;
        drawers[drawerKey(drawer, i, App)] = !!drawer.isOpen;
      }
    }
  }

  return snap;
}

export function applyAllDoors(App: AppLike, open: boolean): void {
  const arr = getDoorsArray(App);
  for (let i = 0; i < arr.length; i++) {
    const d = arr[i];
    if (!d) continue;
    d.isOpen = !!open;
  }
}

export function applyAllDrawers(App: AppLike, open: boolean): void {
  const arr = getDrawersArray(App);
  for (let i = 0; i < arr.length; i++) {
    const d = arr[i];
    if (!d) continue;
    d.isOpen = !!open;
  }
}

export function applySnapshot(App: AppLike, snap: DoorsSnapshot | null): void {
  if (!snap || typeof snap !== 'object') return;

  const arr = getDoorsArray(App);
  for (let i = 0; i < arr.length; i++) {
    const d = arr[i];
    if (!d) continue;
    const key = doorKey(d, i, App);
    if (key in snap.doors) {
      const open = !!snap.doors[key];
      d.isOpen = open;
      if (snap.kind === 'slidingTrack') setSlidingTrackSnapshotMarkers(d, open);
    }
  }

  if (snap.drawers) {
    const arr2 = getDrawersArray(App);
    for (let i = 0; i < arr2.length; i++) {
      const drawer = arr2[i];
      if (!drawer) continue;
      const key = drawerKey(drawer, i, App);
      if (key in snap.drawers) drawer.isOpen = !!snap.drawers[key];
    }
  }
}
