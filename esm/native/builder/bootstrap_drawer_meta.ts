import { guardVoid, MODES } from '../runtime/api.js';
import { getDrawersArray } from '../runtime/render_access.js';
import { consumeDrawerRebuildIntent, getDrawerService } from '../runtime/doors_access.js';
import { runPlatformWakeupFollowThrough } from '../runtime/platform_access.js';
import { getTools } from '../runtime/service_access.js';
import { drawerVisualMatchesId, readDrawerVisualPrimaryId } from '../runtime/drawer_visual_identity.js';

import type {
  AppContainer,
  BuilderDrawerRebuildSnapshot,
  DrawerVisualEntryLike,
  DrawersOpenIdLike,
  Vec3Like,
} from '../../../types/index.js';
import { asRecord } from './bootstrap_shared.js';

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

function requireDrawerRebuildSnapshot(value: unknown): BuilderDrawerRebuildSnapshot {
  const snapshot = asRecord(value);
  const forcedOpenDrawerId = snapshot?.forcedOpenDrawerId;
  const intent = snapshot?.intent;
  const intentRecord = intent == null ? null : asRecord(intent);
  const intentVersion = intentRecord?.version;
  const validForcedOpenId =
    forcedOpenDrawerId == null ||
    typeof forcedOpenDrawerId === 'string' ||
    typeof forcedOpenDrawerId === 'number';
  const validIntent =
    intent == null ||
    !!(
      intentRecord &&
      (typeof intentRecord.targetId === 'string' || typeof intentRecord.targetId === 'number') &&
      typeof intentVersion === 'number' &&
      Number.isSafeInteger(intentVersion) &&
      intentVersion >= 0
    );
  if (!snapshot || typeof snapshot.primaryMode !== 'string' || !validForcedOpenId || !validIntent) {
    throw new TypeError('[builder/bootstrap.__rebuildDrawerMeta] drawer rebuild snapshot is required');
  }
  return value as BuilderDrawerRebuildSnapshot;
}

function sameDrawerId(left: DrawersOpenIdLike, right: DrawersOpenIdLike): boolean {
  if (left == null || right == null) return false;
  return String(left) === String(right);
}

function drawerMatchesId(drawer: DrawerVisualEntryLike | null | undefined, id: DrawersOpenIdLike): boolean {
  return drawerVisualMatchesId(drawer, id);
}

function readDrawerEntryId(drawer: DrawerVisualEntryLike | null | undefined): DrawersOpenIdLike {
  const id = readDrawerVisualPrimaryId(drawer);
  return id == null ? null : id;
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

function closeDrawerEntry(
  _App: AppContainer,
  drawer: DrawerVisualEntryLike,
  _drawerId: DrawersOpenIdLike
): void {
  drawer.isOpen = false;
}

function closeOtherDrawers(
  App: AppContainer,
  drawers: DrawerVisualEntryLike[],
  targetId: DrawersOpenIdLike
): void {
  for (const drawer of drawers) {
    if (!drawer) continue;
    const drawerId = readDrawerEntryId(drawer);
    if (drawerMatchesId(drawer, targetId)) continue;
    closeDrawerEntry(App, drawer, drawerId);
  }
}

function wakeupDrawerFollowThrough(App: AppContainer, targetId: DrawersOpenIdLike): void {
  const base = { where: 'builder/bootstrap.__rebuildDrawerMeta' };

  guardVoid(App, { ...base, op: 'platform.wakeupFollowThrough', drawerId: targetId, failFast: true }, () => {
    runPlatformWakeupFollowThrough(App);
  });
}

export function runRebuildDrawerMeta(App: AppContainer, rawSnapshot: BuilderDrawerRebuildSnapshot): void {
  const base = { where: 'builder/bootstrap.__rebuildDrawerMeta' };
  const snapshot = requireDrawerRebuildSnapshot(rawSnapshot);

  guardVoid(App, { ...base, op: 'drawer.rebuildMeta', failFast: true }, () => {
    const drawerSvc = getDrawerService(App);
    if (drawerSvc && typeof drawerSvc.rebuildMeta === 'function') drawerSvc.rebuildMeta();
  });

  const rawTargetId = consumeDrawerRebuildIntent(App, snapshot.intent);
  const targetId: DrawersOpenIdLike =
    typeof rawTargetId === 'string' || typeof rawTargetId === 'number' ? rawTargetId : null;
  if (targetId == null) return;

  const drawers = getDrawersArray(App);
  if (!Array.isArray(drawers)) return;
  const drawerEntries = drawers.map(asDrawerVisualEntry).filter((x): x is DrawerVisualEntryLike => !!x);
  const drawer = drawerEntries.find(x => drawerMatchesId(x, targetId));
  const forcedOpenId = snapshot.forcedOpenDrawerId;
  const keepDrawerForcedOpen =
    !!drawer && snapshot.primaryMode === readDividerModeKey() && drawerMatchesId(drawer, forcedOpenId);
  if (!drawer) {
    if (sameDrawerId(forcedOpenId, targetId)) setForcedDrawerOpenId(App, targetId, null);
    return;
  }

  if (!keepDrawerForcedOpen) {
    if (sameDrawerId(forcedOpenId, targetId)) setForcedDrawerOpenId(App, targetId, null);
    closeDrawerEntry(App, drawer, targetId);
    wakeupDrawerFollowThrough(App, targetId);
    return;
  }

  closeOtherDrawers(App, drawerEntries, targetId);
  setForcedDrawerOpenId(App, targetId, targetId);
  drawer.isOpen = true;
  wakeupDrawerFollowThrough(App, targetId);
}
