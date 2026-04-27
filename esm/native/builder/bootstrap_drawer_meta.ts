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

function isObject3DLike(value: unknown): value is Object3DLike {
  const rec = asRecord(value);
  return !!(
    rec &&
    Array.isArray(rec.children) &&
    asRecord(rec.userData) &&
    asRecord(rec.position) &&
    asRecord(rec.rotation) &&
    asRecord(rec.scale) &&
    typeof rec.add === 'function' &&
    typeof rec.remove === 'function'
  );
}

function asDrawerVisualEntry(value: unknown): DrawerVisualEntryLike | null {
  const rec = asRecord(value);
  const open = asOpenVector(rec?.open);
  const closed = asOpenVector(rec?.closed);
  const group = isObject3DLike(rec?.group) ? rec.group : null;
  return rec && open && closed ? { ...rec, group, open, closed } : null;
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
  if (!drawer) return;

  drawer.isOpen = true;

  guardVoid(App, { ...base, op: 'tools.setDrawersOpenId', drawerId: targetId, failFast: true }, () => {
    const modeState: ModeStateLike = readModeStateFromApp(App);
    const primaryMode = typeof modeState.primary === 'string' ? modeState.primary : null;
    const keepDrawerForcedOpen = (primaryMode || '') === String(readDividerModeKey());

    const tools = getTools(App);
    if (typeof tools.setDrawersOpenId === 'function') {
      if (keepDrawerForcedOpen) tools.setDrawersOpenId(targetId);
      else tools.setDrawersOpenId(null);
    }
  });

  const group = readPositionedObject(drawer.group);
  const openPosition = asOpenVector(drawer.open);
  if (targetId != null && group && openPosition) {
    guardVoid(App, { ...base, op: 'snapDrawerPosition', drawerId: targetId, failFast: true }, () => {
      group.position?.copy(openPosition);
    });
  }

  guardVoid(App, { ...base, op: 'platform.wakeupFollowThrough', drawerId: targetId, failFast: true }, () => {
    runPlatformWakeupFollowThrough(App);
  });
}
