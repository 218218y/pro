import type { DoorVisualEntryLike, DrawerVisualEntryLike } from '../../../types';

import { readConfigScalarOrDefaultFromApp } from './config_selectors.js';
import { getPlatformPerf } from './platform_access.js';
import { getDoorsArray, getDrawersArray } from './render_access.js';
import {
  type AppLike,
  type DoorUserDataLike,
  normalizeModuleKey,
  isRecord,
  readNumber,
  readRecord,
} from './doors_runtime_support_shared.js';

function isDoorUserDataLike(value: unknown): value is DoorUserDataLike {
  return isRecord(value);
}

export function getGroupUserData(
  group: DoorVisualEntryLike['group'] | DrawerVisualEntryLike['group'] | null
): DoorUserDataLike | null {
  const userData = group?.userData ?? null;
  return isDoorUserDataLike(userData) ? userData : null;
}

export function getDoorModuleKey(door: DoorVisualEntryLike | null | undefined): string | null {
  const userData = getGroupUserData(door?.group || null);
  return normalizeModuleKey(userData?.moduleIndex);
}

export function getDrawerModuleKey(drawer: DrawerVisualEntryLike | null | undefined): string | null {
  const userData = getGroupUserData(drawer?.group || null);
  return normalizeModuleKey(userData?.moduleIndex);
}

export function hasAnyOpenDoor(App: AppLike): boolean {
  try {
    const arr = getDoorsArray(App);
    return arr.some((d: DoorVisualEntryLike | null | undefined) => !!d?.isOpen);
  } catch {
    return false;
  }
}

export function getOpenDoorModuleKeys(App: AppLike): Set<string> {
  const modules = new Set<string>();
  try {
    const arr = getDoorsArray(App);
    for (let i = 0; i < arr.length; i++) {
      const door = arr[i];
      if (!door || !door.isOpen) continue;
      const moduleKey = getDoorModuleKey(door);
      if (moduleKey) modules.add(moduleKey);
    }
  } catch {
    // ignore
  }
  return modules;
}

export function wardrobeType(App: AppLike): string | null {
  try {
    const value = readConfigScalarOrDefaultFromApp(App, 'wardrobeType', null);
    return typeof value === 'string' && value ? value : null;
  } catch {
    return null;
  }
}

function isDrawerEntryInternal(App: AppLike, drawer: DrawerVisualEntryLike | null | undefined): boolean {
  if (!drawer) return false;

  const userData = getGroupUserData(drawer.group || null);
  const isExtDrawer = !!(userData && userData.__wpType === 'extDrawer');
  const type = wardrobeType(App);
  let isInternal = !isExtDrawer;

  if (!isInternal && type === 'sliding') {
    isInternal = true;
  } else if (isInternal) {
    if (typeof drawer.isInternal !== 'undefined') isInternal = !!drawer.isInternal;
    else isInternal = !!(drawer.id && String(drawer.id).includes('int'));
    if (drawer.isInternal === false && isExtDrawer) isInternal = false;
  }

  return !!isInternal;
}

function isDrawerVisiblyOpen(drawer: DrawerVisualEntryLike | null | undefined): boolean {
  if (!drawer || !drawer.group || !drawer.closed) return !!drawer?.isOpen;
  if (drawer.isOpen === true) return true;

  const pos = readRecord(drawer.group.position);
  const closed = readRecord(drawer.closed);
  if (!pos || !closed) return false;

  const dx = Math.abs(readNumber(pos, 'x', 0) - readNumber(closed, 'x', 0));
  const dy = Math.abs(readNumber(pos, 'y', 0) - readNumber(closed, 'y', 0));
  const dz = Math.abs(readNumber(pos, 'z', 0) - readNumber(closed, 'z', 0));
  return dx > 1e-3 || dy > 1e-3 || dz > 1e-3;
}

export function hasInternalDrawers(App: AppLike): boolean {
  try {
    const perf = getPlatformPerf(App);
    if (perf && typeof perf.hasInternalDrawers !== 'undefined') return !!perf.hasInternalDrawers;
  } catch {
    // ignore
  }

  try {
    const arr = getDrawersArray(App);
    return arr.some(d => isDrawerEntryInternal(App, d));
  } catch {
    return false;
  }
}

export function getVisibleOpenInternalDrawerModuleKeys(App: AppLike): Set<string> {
  const modules = new Set<string>();
  try {
    const arr = getDrawersArray(App);
    for (let i = 0; i < arr.length; i++) {
      const drawer = arr[i];
      if (!drawer || !isDrawerEntryInternal(App, drawer) || !isDrawerVisiblyOpen(drawer)) continue;
      const moduleKey = getDrawerModuleKey(drawer);
      if (moduleKey) modules.add(moduleKey);
    }
  } catch {
    // ignore
  }
  return modules;
}

export function hasOpenInternalDrawers(App: AppLike): boolean {
  try {
    const arr = getDrawersArray(App);
    return arr.some(d => isDrawerEntryInternal(App, d) && isDrawerVisiblyOpen(d));
  } catch {
    return false;
  }
}
