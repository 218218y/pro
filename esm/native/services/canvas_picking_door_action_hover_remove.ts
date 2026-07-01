import type { UnknownRecord } from '../../../types';
import { stripDoorVisualSurfaceSuffix } from '../../shared/door_visual_key_contracts_shared.js';
import { getDoorsArray } from '../runtime/render_access.js';
import { __wp_map } from './canvas_picking_core_helpers.js';
import {
  isSketchBoxDoorSegmentPartId,
  parseSketchBoxDoorTarget,
  readSketchBoxDoorRecord,
} from './canvas_picking_door_sketch_box_edit.js';
import type { DoorActionHoverResolvedState } from './canvas_picking_door_action_hover_contracts.js';
import type { DoorActionHoverArgs } from './canvas_picking_door_hover_targets.js';
import { __asObject, __scopeCornerHoverPartKey } from './canvas_picking_door_hover_targets.js';
import {
  hasAnyDoorGrooveSegmentMapEntry,
  isDoorGrooveSegmentPartId,
  readDoorGrooveBasePartId,
  readDoorGrooveFullPartId,
  readDoorGrooveMapFlag,
} from './canvas_picking_door_groove_segments.js';

function readDoorActionHoverFamilyPartIds(args: {
  hoverArgs: DoorActionHoverArgs;
  state: DoorActionHoverResolvedState;
  clickedKey: string;
  fullId: string;
  base: string;
}): string[] {
  const { hoverArgs, state, clickedKey, fullId, base } = args;
  const out = new Set<string>([`${base}_top`, `${base}_bot`]);
  if (clickedKey && clickedKey !== fullId && clickedKey.startsWith(base + '_')) out.add(clickedKey);

  try {
    const doorsArray = getDoorsArray(hoverArgs.App);
    for (let i = 0; i < doorsArray.length; i++) {
      const g = doorsArray[i] && doorsArray[i].group;
      if (!g || !g.userData) continue;
      const gUserData = __asObject<UnknownRecord>(g.userData);
      const pidRaw = String(gUserData?.partId || '');
      if (!pidRaw) continue;
      const pid = hoverArgs.canonDoorPartKeyForMaps(__scopeCornerHoverPartKey(pidRaw, state.hitDoorStack));
      if (!pid || pid === fullId) continue;
      if (pid === base || pid.startsWith(base + '_')) out.add(pid);
    }
  } catch {
    // Hover preview should stay best-effort and never fail hard on runtime access.
  }

  try {
    const removedMap = __asObject<UnknownRecord>(__wp_map(hoverArgs.App, 'removedDoorsMap'));
    const keys = removedMap ? Object.keys(removedMap) : [];
    for (let i = 0; i < keys.length; i++) {
      const raw = keys[i];
      const pid0 = raw.indexOf('removed_') === 0 ? raw.slice(8) : raw;
      const pid = hoverArgs.canonDoorPartKeyForMaps(__scopeCornerHoverPartKey(pid0, state.hitDoorStack));
      if (!pid || pid === fullId) continue;
      if (pid === base || pid.startsWith(base + '_')) out.add(pid);
    }
  } catch {
    // ignore
  }

  return Array.from(out);
}

export function readDoorActionHoverWillRestore(args: {
  hoverArgs: DoorActionHoverArgs;
  state: DoorActionHoverResolvedState;
}): boolean {
  const { hoverArgs, state } = args;
  try {
    const clickedId = String(state.scopedHitDoorPid || '');
    const isSegmentedDoor =
      clickedId.endsWith('_top') ||
      clickedId.endsWith('_bot') ||
      clickedId.endsWith('_mid') ||
      clickedId.endsWith('_full') ||
      hoverArgs.isSegmentedDoorBaseId(clickedId);

    if (!isSegmentedDoor) return hoverArgs.isRemoved(hoverArgs.App, clickedId);

    const clickedKey = hoverArgs.canonDoorPartKeyForMaps(clickedId);
    const base = clickedKey.replace(/_(top|bot|mid\d*|full)$/i, '');
    const fullId = `${base}_full`;
    const familyPartIds = readDoorActionHoverFamilyPartIds({ hoverArgs, state, clickedKey, fullId, base });
    const isPart = clickedKey !== fullId && clickedKey.startsWith(base + '_');

    if (hoverArgs.isRemoved(hoverArgs.App, clickedKey)) return true;
    if (isPart) return hoverArgs.isRemoved(hoverArgs.App, fullId);
    if (hoverArgs.isRemoved(hoverArgs.App, fullId)) return true;
    for (let i = 0; i < familyPartIds.length; i++) {
      if (hoverArgs.isRemoved(hoverArgs.App, familyPartIds[i])) return true;
    }
    return false;
  } catch {
    return false;
  }
}

function normalizeGrooveHoverPartKey(args: {
  hoverArgs: DoorActionHoverArgs;
  state: DoorActionHoverResolvedState;
}): string {
  const { hoverArgs, state } = args;
  const scoped = String(state.scopedHitDoorPid || state.hitDoorPid || '');
  const canon = hoverArgs.canonDoorPartKeyForMaps(scoped);
  if (!canon) return '';
  return stripDoorVisualSurfaceSuffix(canon);
}

export function readDoorActionHoverWillRemoveGroove(args: {
  hoverArgs: DoorActionHoverArgs;
  state: DoorActionHoverResolvedState;
}): boolean {
  const { hoverArgs, state } = args;
  try {
    const partKey = normalizeGrooveHoverPartKey(args);
    const sketchTarget = parseSketchBoxDoorTarget(partKey || state.scopedHitDoorPid || state.hitDoorPid);
    const groovesMap = __asObject<UnknownRecord>(__wp_map(hoverArgs.App, 'groovesMap'));
    if (sketchTarget) {
      if (partKey && isSketchBoxDoorSegmentPartId(partKey)) {
        const segmentFlag = readDoorGrooveMapFlag(groovesMap, partKey);
        if (segmentFlag !== null) return segmentFlag;
        const basePartId = readDoorGrooveBasePartId(partKey);
        if (hasAnyDoorGrooveSegmentMapEntry(groovesMap, basePartId)) return false;
      }
      const sketchDoor = readSketchBoxDoorRecord(hoverArgs.App, sketchTarget, state.hitDoorStack);
      return sketchDoor?.groove === true;
    }

    if (!partKey) return false;
    if (!groovesMap) return false;
    const explicitFlag = readDoorGrooveMapFlag(groovesMap, partKey);
    if (explicitFlag !== null) return explicitFlag;
    if (isDoorGrooveSegmentPartId(partKey)) {
      const basePartId = readDoorGrooveBasePartId(partKey);
      if (hasAnyDoorGrooveSegmentMapEntry(groovesMap, basePartId)) return false;
      return readDoorGrooveMapFlag(groovesMap, readDoorGrooveFullPartId(partKey)) === true;
    }
    return false;
  } catch {
    return false;
  }
}

export function applyDoorActionHoverMarkerMaterial(args: {
  hoverArgs: DoorActionHoverArgs;
  state: DoorActionHoverResolvedState;
}): void {
  const { hoverArgs, state } = args;
  if (hoverArgs.isRemoveDoorMode) {
    const willRestore = readDoorActionHoverWillRestore({ hoverArgs, state });
    if (hoverArgs.doorMarker) {
      hoverArgs.doorMarker.material = willRestore ? state.markerUd.__matGroove : state.markerUd.__matRemove;
    }
    return;
  }

  if (hoverArgs.isGrooveEditMode) {
    const willRemoveGroove = readDoorActionHoverWillRemoveGroove({ hoverArgs, state });
    if (hoverArgs.doorMarker) {
      hoverArgs.doorMarker.material = willRemoveGroove
        ? state.markerUd.__matRemove || state.markerUd.__matGroove
        : state.markerUd.__matGroove;
    }
    return;
  }

  if (hoverArgs.doorMarker) hoverArgs.doorMarker.material = state.markerUd.__matGroove;
}
