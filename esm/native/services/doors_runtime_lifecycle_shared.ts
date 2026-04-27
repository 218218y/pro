import type { DoorVisualEntryLike, DrawerVisualEntryLike } from '../../../types';

import { getDoorsArray, getDrawersArray } from '../runtime/render_access.js';
import {
  type AppLike,
  type DoorsSnapshot,
  createBooleanMap,
  reportDoorsRuntimeNonFatal,
} from './doors_runtime_shared.js';

export function doorKey(d: DoorVisualEntryLike, idx: number): string {
  try {
    if (d && (d.id || d.doorId)) return String(d.id || d.doorId);
    if (d && d.group && d.group.userData && d.group.userData.partId) return String(d.group.userData.partId);
    if (d && d.group && typeof d.group.name === 'string' && d.group.name) return String(d.group.name);
  } catch (_) {
    reportDoorsRuntimeNonFatal('L339', _);
  }
  return `idx:${idx}`;
}

export function drawerKey(d: DrawerVisualEntryLike, idx: number): string {
  try {
    if (d && (d.id || d.drawerId)) return String(d.id || d.drawerId);
    if (d && d.group && d.group.userData && d.group.userData.partId) return String(d.group.userData.partId);
    if (d && d.group && typeof d.group.name === 'string' && d.group.name) return String(d.group.name);
  } catch (_) {
    reportDoorsRuntimeNonFatal('L348', _);
  }
  return `idx:${idx}`;
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
    snap.doors[doorKey(d, i)] = !!d.isOpen;
  }

  if (includeDrawers) {
    const drawers = snap.drawers;
    if (drawers) {
      const entries = getDrawersArray(App);
      for (let i = 0; i < entries.length; i++) {
        const drawer = entries[i];
        if (!drawer) continue;
        drawers[drawerKey(drawer, i)] = !!drawer.isOpen;
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
    const key = doorKey(d, i);
    if (key in snap.doors) d.isOpen = !!snap.doors[key];
  }

  if (snap.drawers) {
    const arr2 = getDrawersArray(App);
    for (let i = 0; i < arr2.length; i++) {
      const drawer = arr2[i];
      if (!drawer) continue;
      const key = drawerKey(drawer, i);
      if (key in snap.drawers) drawer.isOpen = !!snap.drawers[key];
    }
  }
}
