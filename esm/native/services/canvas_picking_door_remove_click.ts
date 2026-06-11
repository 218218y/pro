import type { AppContainer, DoorVisualEntryLike } from '../../../types';

import { getDoorsArray } from '../runtime/render_access.js';
import { callDoorsAction, hasDoorsAction } from '../runtime/actions_access_domains.js';
import { asRecord } from './canvas_picking_door_edit_shared.js';
import { parseSketchBoxDoorTarget, patchSketchBoxDoor } from './canvas_picking_door_sketch_box_edit.js';
import { requestDoorAuthoringBurstRefresh } from './canvas_picking_door_authoring_burst.js';
import {
  __wp_metaNoBuild,
  __wp_reportPickingIssue,
  __wp_isRemoved,
  __wp_canonDoorPartKeyForMaps,
  __wp_scopeCornerPartKeyForStack,
  __wp_isSegmentedDoorBaseId,
  __wp_historyBatch,
  __wp_map,
} from './canvas_picking_core_helpers.js';

export interface CanvasDoorRemoveClickArgs {
  App: AppContainer;
  effectiveDoorId: string;
  foundPartId: string | null;
  foundModuleStack: 'top' | 'bottom';
}

function isDoorVisualEntryLike(value: unknown): value is DoorVisualEntryLike {
  const rec = asRecord(value);
  return !!rec && 'group' in rec;
}

export function handleCanvasDoorRemoveClick(args: CanvasDoorRemoveClickArgs): boolean {
  const { App, effectiveDoorId, foundPartId, foundModuleStack } = args;
  const sketchTarget = parseSketchBoxDoorTarget(effectiveDoorId || foundPartId);
  if (sketchTarget) {
    patchSketchBoxDoor(App, sketchTarget, foundModuleStack, current => {
      if (!(current && current.enabled !== false)) return current;
      return { ...current, enabled: false, open: false };
    });
    return true;
  }

  const clickedIdRaw = String(effectiveDoorId || '');
  const clickedId = __wp_scopeCornerPartKeyForStack(clickedIdRaw, foundModuleStack);
  if (!clickedId) return true;

  const meta = __wp_metaNoBuild(App, 'removeDoors:smart', { immediate: true });

  const hasRemoved = (pid: string): boolean => {
    try {
      return __wp_isRemoved(App, pid);
    } catch (err) {
      __wp_reportPickingIssue(App, err, {
        where: 'canvasPicking',
        op: 'removeDoor.readRemovedState',
        throttleMs: 1000,
      });
      return false;
    }
  };

  const setRemoved = (pid: string, on: boolean): unknown => {
    try {
      if (!pid) return;
      if (hasDoorsAction(App, 'setRemoved')) {
        return callDoorsAction(App, 'setRemoved', pid, !!on, meta);
      }
    } catch (error) {
      __wp_reportPickingIssue(App, error, { where: 'canvasPicking', op: 'removeDoor.setRemovedCall' });
    }

    const err = new Error('[WardrobePro] Missing doors.setRemoved action (domain API not loaded)');
    __wp_reportPickingIssue(
      App,
      err,
      { where: 'canvasPicking', op: 'removeDoor.missingDomainApi' },
      { failFast: true }
    );
  };

  const del = (pid: string): void => {
    setRemoved(pid, false);
  };
  const set = (pid: string, on: boolean): void => {
    setRemoved(pid, !!on);
  };

  const isSegmentedDoor =
    clickedId.endsWith('_top') ||
    clickedId.endsWith('_bot') ||
    clickedId.endsWith('_mid') ||
    clickedId.endsWith('_full') ||
    __wp_isSegmentedDoorBaseId(clickedId);

  if (!isSegmentedDoor) {
    __wp_historyBatch(App, { source: 'removeDoors:smart', immediate: true }, () => {
      const now = hasRemoved(clickedId);
      set(clickedId, !now);
      return undefined;
    });

    requestDoorAuthoringBurstRefresh(App, 'removeDoors:smart');
    return true;
  }

  const clickedKey = __wp_canonDoorPartKeyForMaps(clickedId);
  const base = clickedKey.replace(/_(top|bot|mid\d*|full)$/i, '');
  const topId = `${base}_top`;
  const botId = `${base}_bot`;
  const fullId = `${base}_full`;

  const familyPartIds = (() => {
    const out = new Set<string>([topId, botId]);
    if (clickedKey && clickedKey !== fullId && clickedKey.startsWith(base + '_')) out.add(clickedKey);

    try {
      const doorsArray = getDoorsArray(App);
      for (let i = 0; i < doorsArray.length; i++) {
        const entry = doorsArray[i];
        if (!isDoorVisualEntryLike(entry)) continue;
        const g = entry && entry.group;
        if (!g || !g.userData) continue;
        const userData = asRecord(g.userData) || {};
        const pidRaw = String(userData.partId || '');
        if (!pidRaw) continue;
        const pid = __wp_canonDoorPartKeyForMaps(__wp_scopeCornerPartKeyForStack(pidRaw, foundModuleStack));
        if (!pid || pid === fullId) continue;
        if (pid === base || pid.startsWith(base + '_')) out.add(pid);
      }
    } catch (err) {
      __wp_reportPickingIssue(App, err, {
        where: 'canvasPicking',
        op: 'removeDoor.collectFamilyPartIds.scene',
        throttleMs: 1000,
      });
    }

    try {
      const removedMap = __wp_map(App, 'removedDoorsMap');
      const keys = removedMap ? Object.keys(removedMap) : [];
      for (let i = 0; i < keys.length; i++) {
        const raw = keys[i];
        const pid0 = raw.indexOf('removed_') === 0 ? raw.slice(8) : raw;
        const pid = __wp_canonDoorPartKeyForMaps(__wp_scopeCornerPartKeyForStack(pid0, foundModuleStack));
        if (!pid || pid === fullId) continue;
        if (pid === base || pid.startsWith(base + '_')) out.add(pid);
      }
    } catch (err) {
      __wp_reportPickingIssue(App, err, {
        where: 'canvasPicking',
        op: 'removeDoor.collectFamilyPartIds.map',
        throttleMs: 1000,
      });
    }

    return Array.from(out);
  })();

  const isPart = clickedKey !== fullId && clickedKey.startsWith(base + '_');
  const perceivedRemoved = (() => {
    if (hasRemoved(clickedKey)) return true;
    if (isPart) return hasRemoved(fullId);
    if (hasRemoved(fullId)) return true;
    for (let i = 0; i < familyPartIds.length; i++) {
      if (hasRemoved(familyPartIds[i])) return true;
    }
    return false;
  })();

  __wp_historyBatch(App, { source: 'removeDoors:smart', immediate: true }, () => {
    if (isPart) {
      const fullRemoved = hasRemoved(fullId);
      if (fullRemoved) {
        del(fullId);
        for (let i = 0; i < familyPartIds.length; i++) del(familyPartIds[i]);
        del(clickedKey);
      } else {
        const now = hasRemoved(clickedKey);
        set(clickedKey, !now);
      }
    } else if (perceivedRemoved) {
      del(fullId);
      for (let i = 0; i < familyPartIds.length; i++) del(familyPartIds[i]);
      del(clickedKey);
    } else {
      set(fullId, true);
      for (let i = 0; i < familyPartIds.length; i++) set(familyPartIds[i], true);
      if (clickedKey !== fullId && !familyPartIds.includes(clickedKey)) set(clickedKey, true);
    }

    return undefined;
  });

  requestDoorAuthoringBurstRefresh(App, 'removeDoors:smart');
  return true;
}
