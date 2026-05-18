import { guardVoid, MODES } from '../runtime/api.js';
import { getDrawersArray } from '../runtime/render_access.js';
import { consumeDrawerRebuildIntent, getDrawerService } from '../runtime/doors_access.js';
import { runPlatformWakeupFollowThrough } from '../runtime/platform_access.js';
import { getTools } from '../runtime/service_access.js';
import { readModeStateFromApp } from '../runtime/root_state_access.js';

import type {
  AppContainer,
  DrawerVisualEntryLike,
  DrawersOpenIdLike,
  ModeStateLike,
  Object3DLike,
  Vec3Like,
} from '../../../types/index.js';
import { asRecord } from './bootstrap_shared.js';

type PositionCopyLike = { copy: (value: Vec3Like) => unknown };
type PositionedObjectLike = Object3DLike & { position?: PositionCopyLike | null };

function readDividerModeKey(): string {
  const modes = asRecord(MODES);
  const divider = modes && modes.DIVIDER;
  return typeof divider === 'string' && divider ? divider : 'divider';
}

function asOpenVector(value: unknown): Vec3Like | null {
  const rec = asRecord(value);
  if (!rec) return null;
  return typeof rec.x === 'number' && typeof rec.y === 'number' && typeof rec.z === 'number'
    ? { x: rec.x, y: rec.y, z: rec.z }
    : null;
}

function asDrawerVisualEntry(value: unknown): DrawerVisualEntryLike | null {
  const rec = asRecord(value);
  const open = asOpenVector(rec?.open);
  const closed = asOpenVector(rec?.closed);
  return rec && open && closed ? (value as DrawerVisualEntryLike) : null;
}

function isPositionCopyLike(value: unknown): value is PositionCopyLike {
  const rec = asRecord(value);
  return !!(rec && typeof rec.copy === 'function');
}

function isPositionedObjectLike(value: unknown): value is PositionedObjectLike {
  const rec = asRecord(value);
  return !!(rec && isPositionCopyLike(rec.position));
}

function readPositionedObject(value: unknown): PositionedObjectLike | null {
  return isPositionedObjectLike(value) ? value : null;
}

function isDividerModeActive(App: AppContainer): boolean {
  const modeState: ModeStateLike = readModeStateFromApp(App);
  const primaryMode = typeof modeState.primary === 'string' ? modeState.primary : null;
  return (primaryMode || '') === String(readDividerModeKey());
}

function setForcedDrawerOpenId(
  App: AppContainer,
  targetId: DrawersOpenIdLike,
  nextOpenId: DrawersOpenIdLike
): void {
  const base = { where: 'builder/bootstrap.__rebuildDrawerMeta' };

  guardVoid(App, { ...base, op: 'tools.setDrawersOpenId', drawerId: targetId, failFast: true }, () => {
    const tools = getTools(App);
    if (typeof tools.setDrawersOpenId === 'function') tools.setDrawersOpenId(nextOpenId);
  });
}

function snapDrawerPosition(
  App: AppContainer,
  drawer: DrawerVisualEntryLike,
  targetId: DrawersOpenIdLike,
  position: Vec3Like,
  op: string
): void {
  const base = { where: 'builder/bootstrap.__rebuildDrawerMeta' };
  const group = readPositionedObject(drawer.group);
  if (targetId == null || !group) return;

  guardVoid(App, { ...base, op, drawerId: targetId, failFast: true }, () => {
    group.position?.copy(position);
  });
}

function wakeupDrawerFollowThrough(App: AppContainer, targetId: DrawersOpenIdLike): void {
  const base = { where: 'builder/bootstrap.__rebuildDrawerMeta' };

  guardVoid(App, { ...base, op: 'platform.wakeupFollowThrough', drawerId: targetId, failFast: true }, () => {
    runPlatformWakeupFollowThrough(App);
  });
}

export function runRebuildDrawerMeta(App: AppContainer): void {
  const base = { where: 'builder/bootstrap.__rebuildDrawerMeta' };

  guardVoid(App, { ...base, op: 'drawer.rebuildMeta', failFast: true }, () => {
    const drawerSvc = getDrawerService(App);
    if (drawerSvc && typeof drawerSvc.rebuildMeta === 'function') drawerSvc.rebuildMeta();
  });

  const rawTargetId = consumeDrawerRebuildIntent(App);
  const targetId: DrawersOpenIdLike =
    typeof rawTargetId === 'string' || typeof rawTargetId === 'number' ? rawTargetId : null;
  if (targetId == null) return;

  const drawers = getDrawersArray(App);
  if (!Array.isArray(drawers)) return;
  const drawer = drawers.map(asDrawerVisualEntry).find(x => x && String(x.id) === String(targetId));
  const keepDrawerForcedOpen = isDividerModeActive(App);
  if (!drawer) {
    if (!keepDrawerForcedOpen) setForcedDrawerOpenId(App, targetId, null);
    return;
  }

  setForcedDrawerOpenId(App, targetId, keepDrawerForcedOpen ? targetId : null);

  if (!keepDrawerForcedOpen) {
    drawer.isOpen = false;
    const closedPosition = asOpenVector(drawer.closed);
    if (closedPosition) snapDrawerPosition(App, drawer, targetId, closedPosition, 'snapDrawerClosedPosition');
    wakeupDrawerFollowThrough(App, targetId);
    return;
  }

  drawer.isOpen = true;
  const openPosition = asOpenVector(drawer.open);
  if (openPosition) snapDrawerPosition(App, drawer, targetId, openPosition, 'snapDrawerOpenPosition');

  wakeupDrawerFollowThrough(App, targetId);
}
