import type { AppContainer, DrawerVisualEntryLike } from '../../../types';
import type { HitObjectLike } from './canvas_picking_engine.js';
import { getTools } from '../runtime/service_access.js';
import { getDrawersArray } from '../runtime/render_access.js';
import {
  captureDividerDrawerRebuildMotion,
  clearDividerDrawerClearanceStarted,
  clearDividerDrawerDoorHold,
  getDividerDrawerBlockingDoors,
  markDividerDrawerClearanceStarted,
  setDrawerRebuildIntent,
} from '../runtime/doors_access.js';
import { toggleDivider } from '../runtime/maps_access.js';
import { toggleDividerViaActions } from '../runtime/actions_access_mutations.js';
import { drawerVisualMatchesId } from '../runtime/drawer_visual_identity.js';
import { createCanvasPickingDrawerDividerStructuralMeta } from './canvas_picking_drawer_mode_divider_meta.js';
import { hasPartId, readDrawerIsInternal } from './canvas_picking_drawer_mode_flow_shared.js';

function isHitInsideObject(primaryHitObject: HitObjectLike | null, group: unknown): boolean {
  if (!primaryHitObject || !group) return false;
  let parent: HitObjectLike | null = primaryHitObject;
  while (parent) {
    if (parent === group) return true;
    parent = parent.parent || null;
  }
  return false;
}

function isDrawerDividerDirectDrawerHit(
  primaryHitObject: HitObjectLike | null,
  drawer: DrawerVisualEntryLike | null | undefined
): boolean {
  return !!(drawer && drawer.group && isHitInsideObject(primaryHitObject, drawer.group));
}

export function tryHandleDrawerDividerModeClick(args: {
  App: AppContainer;
  isDividerEditMode: boolean;
  foundDrawerId: string | null;
  foundPartId: string | null;
  primaryHitObject?: HitObjectLike | null;
}): boolean {
  const { App, isDividerEditMode, foundDrawerId, foundPartId, primaryHitObject = null } = args;
  if (!isDividerEditMode) return false;

  const drawersArray = getDrawersArray(App);
  let targetDrawerId = foundDrawerId;
  if (!targetDrawerId && foundPartId) {
    const matchedDrawer = drawersArray.find((d: DrawerVisualEntryLike) => hasPartId(d, foundPartId));
    if (matchedDrawer) targetDrawerId = matchedDrawer.id != null ? String(matchedDrawer.id) : null;
  }
  if (!targetDrawerId) return true;

  let clickedDrawer = drawersArray.find((d: DrawerVisualEntryLike) => hasPartId(d, String(targetDrawerId)));
  if (!clickedDrawer && foundPartId) {
    clickedDrawer = drawersArray.find((d: DrawerVisualEntryLike) => hasPartId(d, foundPartId));
  }

  if (!isDrawerDividerDirectDrawerHit(primaryHitObject, clickedDrawer)) return true;

  const dividerKey = clickedDrawer && clickedDrawer.dividerKey ? clickedDrawer.dividerKey : targetDrawerId;
  const tools = getTools(App);
  const currentOpenId = typeof tools.getDrawersOpenId === 'function' ? tools.getDrawersOpenId() : null;
  const sameDrawerSession = clickedDrawer
    ? drawerVisualMatchesId(clickedDrawer, currentOpenId)
    : currentOpenId != null && String(currentOpenId) === String(targetDrawerId);

  if (!sameDrawerSession) clearDividerDrawerDoorHold(App);
  const explicitIsInternal = readDrawerIsInternal(clickedDrawer);
  const isInternal =
    explicitIsInternal != null
      ? explicitIsInternal
      : clickedDrawer
        ? String(clickedDrawer.id).includes('int')
        : String(targetDrawerId).includes('int');
  if (!sameDrawerSession) {
    if (isInternal && clickedDrawer && getDividerDrawerBlockingDoors(App, clickedDrawer).length > 0) {
      markDividerDrawerClearanceStarted(App);
    } else {
      clearDividerDrawerClearanceStarted(App);
    }
  }

  if (!sameDrawerSession && typeof tools.setDrawersOpenId === 'function')
    tools.setDrawersOpenId(targetDrawerId);
  if (clickedDrawer) clickedDrawer.isOpen = true;
  const rebuildMotion =
    sameDrawerSession && clickedDrawer ? captureDividerDrawerRebuildMotion(App, clickedDrawer) : null;
  setDrawerRebuildIntent(App, targetDrawerId, {
    preserveMotion: sameDrawerSession,
    motion: rebuildMotion,
  });

  const dividerMeta = createCanvasPickingDrawerDividerStructuralMeta('divider:click');
  if (!toggleDividerViaActions(App, dividerKey, dividerMeta)) {
    toggleDivider(App, dividerKey, dividerMeta);
  }

  return true;
}
