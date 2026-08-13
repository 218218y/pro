import type {
  AppContainer,
  BuilderDrawerRebuildMotionSnapshot,
  DoorVisualEntryLike,
  DrawerVisualEntryLike,
  UnknownRecord,
} from '../../../types';

import { drawerVisualMatchesId } from './drawer_visual_identity.js';
import { getDoorsRuntime, readDoorsRuntimeNumber, writeDoorsRuntimeNumber } from './doors_access_services.js';
import { MODES } from './modes_constants.js';
import { getDoorsArray, getDrawersArray } from './render_access.js';
import { readModeStateFromApp } from './root_state_access.js';

const DIVIDER_DRAWER_CLEARANCE_STARTED_AT_KEY = 'dividerDrawerClearanceStartedAt';
const DIVIDER_DRAWER_DOOR_HOLD_ID_KEY = 'dividerDrawerDoorHoldId';
const FRONT_PROJECTION_OVERLAP_EPSILON_M = 1e-4;

type Rect2 = Readonly<{ minX: number; maxX: number; minY: number; maxY: number }>;

type GroupLike = {
  parent?: unknown;
  name?: unknown;
  visible?: unknown;
  position?: { x?: unknown; y?: unknown; z?: unknown; copy?: unknown } | null;
  rotation?: { y?: unknown } | null;
  userData?: UnknownRecord | null;
};

type Vec3Snapshot = Readonly<{ x: number; y: number; z: number }>;

function readFinite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readPositive(value: unknown): number | null {
  const n = readFinite(value);
  return n !== null && n > 0 ? n : null;
}

function readIdentityKey(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function normalizeModuleKey(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string' && value) return value;
  return null;
}

function readGroup(value: unknown): GroupLike | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as GroupLike) : null;
}

function readUserData(group: GroupLike | null): UnknownRecord | null {
  const value = group?.userData;
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function readDoorModuleKey(door: DoorVisualEntryLike | null | undefined): string | null {
  return normalizeModuleKey(readUserData(readGroup(door?.group))?.moduleIndex);
}

function readDrawerModuleKey(drawer: DrawerVisualEntryLike | null | undefined): string | null {
  return normalizeModuleKey(readUserData(readGroup(drawer?.group))?.moduleIndex);
}

function readVec3(value: unknown): Vec3Snapshot | null {
  const rec = value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
  const x = readFinite(rec?.x);
  const y = readFinite(rec?.y);
  const z = readFinite(rec?.z);
  return x === null || y === null || z === null ? null : Object.freeze({ x, y, z });
}

function writeVec3(target: unknown, value: Vec3Snapshot): boolean {
  const rec =
    target && typeof target === 'object' && !Array.isArray(target) ? (target as UnknownRecord) : null;
  if (!rec) return false;
  if (typeof rec.copy === 'function') {
    rec.copy.call(target, value);
    return true;
  }
  rec.x = value.x;
  rec.y = value.y;
  rec.z = value.z;
  return true;
}

function readDoorMotionKey(door: DoorVisualEntryLike, index: number): string {
  const group = readGroup(door.group);
  const userData = readUserData(group);
  const candidates = [door.id, door.doorId, door.partId, userData?.partId, userData?.__wpSketchBoxDoorId];
  for (const candidate of candidates) {
    const key = readIdentityKey(candidate);
    if (key) return key;
  }
  const name = typeof group?.name === 'string' ? group.name : '';
  return name || `idx:${index}`;
}

function readEntryRect(entry: DoorVisualEntryLike | DrawerVisualEntryLike, drawer: boolean): Rect2 | null {
  const group = readGroup(entry.group);
  const position = group?.position;
  const userData = readUserData(group);
  const centerX0 = readFinite(position?.x);
  const centerY = readFinite(position?.y);
  const width = readPositive(userData?.__doorWidth ?? entry.width);
  const height = readPositive(userData?.__doorHeight ?? entry.height);
  if (centerX0 === null || centerY === null || width === null || height === null) return null;

  const offsetX = drawer
    ? (readFinite(userData?.__wpFaceOffsetX) ?? 0)
    : (readFinite(userData?.__doorMeshOffsetX) ?? 0);
  const centerX = centerX0 + offsetX;
  return {
    minX: centerX - width / 2,
    maxX: centerX + width / 2,
    minY: centerY - height / 2,
    maxY: centerY + height / 2,
  };
}

function rangesOverlap(aMin: number, aMax: number, bMin: number, bMax: number): boolean {
  return Math.min(aMax, bMax) - Math.max(aMin, bMin) > FRONT_PROJECTION_OVERLAP_EPSILON_M;
}

function rectsOverlap(a: Rect2, b: Rect2): boolean {
  return rangesOverlap(a.minX, a.maxX, b.minX, b.maxX) && rangesOverlap(a.minY, a.maxY, b.minY, b.maxY);
}

function isInternalDrawer(drawer: DrawerVisualEntryLike | null | undefined): boolean {
  if (!drawer) return false;
  if (drawer.isInternal === true) return true;
  if (drawer.isInternal === false) return false;
  const candidates = [drawer.id, drawer.partId, drawer.dividerKey];
  return candidates.some(value => typeof value === 'string' && value.includes('int'));
}

function isRemovedDoor(door: DoorVisualEntryLike | null | undefined): boolean {
  const group = readGroup(door?.group);
  const userData = readUserData(group);
  return userData?.__wpDoorRemoved === true;
}

function groupsShareProjectionSpace(door: DoorVisualEntryLike, drawer: DrawerVisualEntryLike): boolean {
  const doorGroup = readGroup(door.group);
  const drawerGroup = readGroup(drawer.group);
  return !!(doorGroup && drawerGroup && doorGroup.parent === drawerGroup.parent);
}

export function resolveDividerDrawerClearanceTarget(
  App: AppContainer,
  forcedOpenDrawerId: unknown
): DrawerVisualEntryLike | null {
  if (forcedOpenDrawerId == null) return null;
  const mode = readModeStateFromApp(App);
  if (mode.primary !== MODES.DIVIDER) return null;

  const drawer = getDrawersArray(App).find(entry => drawerVisualMatchesId(entry, forcedOpenDrawerId)) || null;
  return isInternalDrawer(drawer) ? drawer : null;
}

export function doorBlocksDividerDrawer(
  door: DoorVisualEntryLike | null | undefined,
  drawer: DrawerVisualEntryLike | null | undefined
): boolean {
  if (!door || !drawer || !door.group || !drawer.group || isRemovedDoor(door)) return false;

  const doorModuleKey = readDoorModuleKey(door);
  const drawerModuleKey = readDrawerModuleKey(drawer);
  if (doorModuleKey && drawerModuleKey && doorModuleKey !== drawerModuleKey) return false;
  const sameModule = !!(doorModuleKey && drawerModuleKey && doorModuleKey === drawerModuleKey);

  // Local X/Y projection is comparable only when both visuals live under the same parent.
  // If a builder variant wraps a door or drawer in another group, same-module ownership is
  // the reliable fallback; comparing unrelated local coordinates would create false misses.
  if (!groupsShareProjectionSpace(door, drawer)) return sameModule;

  const doorRect = readEntryRect(door, false);
  const drawerRect = readEntryRect(drawer, true);
  if (doorRect && drawerRect) return rectsOverlap(doorRect, drawerRect);

  // Same-module ownership is authoritative when older/special visuals do not expose
  // enough projection geometry. It is safer to open the module door than let an
  // internal drawer animate through a front that cannot be measured reliably.
  return sameModule;
}

export function getDividerDrawerBlockingDoors(
  App: AppContainer,
  drawer: DrawerVisualEntryLike | null | undefined
): DoorVisualEntryLike[] {
  if (!isInternalDrawer(drawer)) return [];
  return getDoorsArray(App).filter(door => doorBlocksDividerDrawer(door, drawer));
}

export function captureDividerDrawerRebuildMotion(
  App: AppContainer,
  drawer: DrawerVisualEntryLike | null | undefined
): BuilderDrawerRebuildMotionSnapshot | null {
  if (!drawer) return null;
  try {
    const current = readVec3(readGroup(drawer.group)?.position);
    const closed = readVec3(drawer.closed);
    const drawerOffset =
      current && closed
        ? Object.freeze({ x: current.x - closed.x, y: current.y - closed.y, z: current.z - closed.z })
        : null;

    const allDoors = getDoorsArray(App);
    const blockingDoors = getDividerDrawerBlockingDoors(App, drawer).flatMap(door => {
      const index = allDoors.indexOf(door);
      const group = readGroup(door.group);
      const position = readVec3(group?.position);
      if (!position) return [];
      const rotationY = readFinite(group?.rotation?.y);
      const visible = typeof group?.visible === 'boolean' ? group.visible : null;
      return [
        Object.freeze({
          key: readDoorMotionKey(door, index),
          index,
          position,
          rotationY,
          visible,
        }),
      ];
    });

    return Object.freeze({ drawerOffset, blockingDoors: Object.freeze(blockingDoors) });
  } catch {
    return null;
  }
}

function findMatchingBlockingDoor(
  blockers: DoorVisualEntryLike[],
  allDoors: DoorVisualEntryLike[],
  key: string,
  index: number
): DoorVisualEntryLike | null {
  const keyed = blockers.find(door => readDoorMotionKey(door, allDoors.indexOf(door)) === key);
  if (keyed) return keyed;
  const indexed = index >= 0 && index < allDoors.length ? allDoors[index] : null;
  return indexed && blockers.includes(indexed) ? indexed : null;
}

export function restoreDividerDrawerRebuildMotion(
  App: AppContainer,
  targetId: unknown,
  motion: BuilderDrawerRebuildMotionSnapshot | null | undefined
): boolean {
  if (!motion || (typeof targetId !== 'string' && typeof targetId !== 'number')) return false;
  try {
    const drawer = getDrawersArray(App).find(entry => drawerVisualMatchesId(entry, targetId)) || null;
    if (!drawer) return false;

    if (motion.drawerOffset) {
      const closed = readVec3(drawer.closed);
      if (closed) {
        writeVec3(readGroup(drawer.group)?.position, {
          x: closed.x + motion.drawerOffset.x,
          y: closed.y + motion.drawerOffset.y,
          z: closed.z + motion.drawerOffset.z,
        });
      }
    }

    if (motion.blockingDoors.length > 0) {
      const allDoors = getDoorsArray(App);
      const blockers = getDividerDrawerBlockingDoors(App, drawer);
      for (const saved of motion.blockingDoors) {
        const door = findMatchingBlockingDoor(blockers, allDoors, saved.key, saved.index);
        if (!door) continue;
        const group = readGroup(door.group);
        writeVec3(group?.position, saved.position);
        if (group?.rotation && saved.rotationY !== null) group.rotation.y = saved.rotationY;
        if (group && saved.visible !== null) group.visible = saved.visible;
      }
    }
    return true;
  } catch {
    return false;
  }
}

function readDividerDrawerDoorHoldId(App: AppContainer): string | number | null {
  const value = getDoorsRuntime(App)[DIVIDER_DRAWER_DOOR_HOLD_ID_KEY];
  return typeof value === 'string' || typeof value === 'number' ? value : null;
}

export function clearDividerDrawerDoorHold(App: AppContainer): void {
  getDoorsRuntime(App)[DIVIDER_DRAWER_DOOR_HOLD_ID_KEY] = null;
}

export function holdDividerDrawerDoorClearanceForClose(App: AppContainer, drawerId: unknown): void {
  if (typeof drawerId !== 'string' && typeof drawerId !== 'number') {
    clearDividerDrawerDoorHold(App);
    return;
  }

  const drawer = getDrawersArray(App).find(entry => drawerVisualMatchesId(entry, drawerId)) || null;
  if (!isInternalDrawer(drawer) || getDividerDrawerBlockingDoors(App, drawer).length === 0) {
    clearDividerDrawerDoorHold(App);
    return;
  }
  getDoorsRuntime(App)[DIVIDER_DRAWER_DOOR_HOLD_ID_KEY] = drawerId;
}

export function resolveDividerDrawerDoorClearanceTarget(
  App: AppContainer,
  forcedOpenDrawerId: unknown
): DrawerVisualEntryLike | null {
  const activeTarget = resolveDividerDrawerClearanceTarget(App, forcedOpenDrawerId);
  if (activeTarget) return activeTarget;

  const holdId = readDividerDrawerDoorHoldId(App);
  if (holdId == null) return null;
  const drawer = getDrawersArray(App).find(entry => drawerVisualMatchesId(entry, holdId)) || null;
  return isInternalDrawer(drawer) ? drawer : null;
}

export function clearDividerDrawerDoorHoldForDrawer(
  App: AppContainer,
  drawer: DrawerVisualEntryLike | null | undefined
): void {
  const holdId = readDividerDrawerDoorHoldId(App);
  if (holdId != null && drawerVisualMatchesId(drawer, holdId)) clearDividerDrawerDoorHold(App);
}

export function readDividerDrawerClearanceStartedAt(App: AppContainer): number {
  return readDoorsRuntimeNumber(App, DIVIDER_DRAWER_CLEARANCE_STARTED_AT_KEY, 0);
}

export function markDividerDrawerClearanceStarted(App: AppContainer, now = Date.now()): number {
  return writeDoorsRuntimeNumber(App, DIVIDER_DRAWER_CLEARANCE_STARTED_AT_KEY, now);
}

export function clearDividerDrawerClearanceStarted(App: AppContainer): void {
  writeDoorsRuntimeNumber(App, DIVIDER_DRAWER_CLEARANCE_STARTED_AT_KEY, 0);
}
