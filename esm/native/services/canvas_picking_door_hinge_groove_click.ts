import type { AppContainer, DoorVisualEntryLike } from '../../../types';

import { setDoorsOpenViaService } from '../runtime/doors_access.js';
import { getDoorsArray } from '../runtime/render_access.js';
import { toggleGrooveKey, writeHinge } from '../runtime/maps_access.js';
import { callDoorsAction, hasDoorsAction } from '../runtime/actions_access_domains.js';
import { toggleGrooveViaActions } from '../runtime/actions_access_mutations.js';
import { cfgSetMap } from '../runtime/cfg_access.js';
import { resolvePendingGrooveLinesCount } from '../runtime/groove_lines_access.js';
import { readDoorPartIdFromHitObject, readDoorWidthFromHitObject } from './canvas_picking_door_shared.js';
import {
  asRecord,
  readGrooveLinesCountMap,
  writePendingGrooveLinesCountForPart,
} from './canvas_picking_door_edit_shared.js';
import { parseSketchBoxDoorTarget, patchSketchBoxDoor } from './canvas_picking_door_sketch_box_edit.js';
import { requestDoorAuthoringBurstRefresh } from './canvas_picking_door_authoring_burst.js';
import {
  __wp_str,
  __wp_hingeDir,
  __wp_map,
  __wp_isMultiMode,
  __wp_colorGet,
  __wp_toast,
  __wp_canonDoorPartKeyForMaps,
  __wp_scopeCornerPartKeyForStack,
  __wp_historyBatch,
  __wp_metaNoBuild,
} from './canvas_picking_core_helpers.js';

export interface CanvasDoorHingeClickArgs {
  App: AppContainer;
  effectiveDoorId: string;
}

export function handleCanvasDoorHingeClick(args: CanvasDoorHingeClickArgs): boolean {
  const { App, effectiveDoorId } = args;
  const doorIdStr = __wp_str(App, effectiveDoorId);
  let hingeKey: string;

  if (doorIdStr.startsWith('d')) {
    const parts = doorIdStr.split('_');
    const doorIdRaw = parts[0].replace('d', '');
    hingeKey = `door_hinge_${doorIdRaw}`;
  } else {
    const parts = doorIdStr.split('_');
    hingeKey = `${parts[0]}_${parts[1]}_${parts[2]}_hinge`;
  }

  const doorsArray = getDoorsArray(App);
  const relatedDoor = doorsArray.find((door: DoorVisualEntryLike) => {
    const pid = door && door.group && door.group.userData ? door.group.userData.partId : null;
    return pid === doorIdStr || (pid && doorIdStr.includes(String(pid)));
  });

  let currentDir: 'left' | 'right' = 'left';
  if (relatedDoor && (relatedDoor.hingeSide === 'left' || relatedDoor.hingeSide === 'right')) {
    currentDir = relatedDoor.hingeSide;
  } else {
    currentDir = __wp_hingeDir(App, hingeKey, 'left');
  }

  const nextHinge = currentDir === 'left' ? 'right' : 'left';
  if (hasDoorsAction(App, 'setHinge')) {
    callDoorsAction(App, 'setHinge', hingeKey, nextHinge, {
      immediate: true,
      source: 'hinge:click',
    });
  } else {
    writeHinge(App, hingeKey, nextHinge, { immediate: true });
  }
  setDoorsOpenViaService(App, false, { forceUpdate: true });
  return true;
}

export interface CanvasDoorGrooveClickArgs {
  App: AppContainer;
  effectiveDoorId: string | null;
  foundPartId: string | null;
  activeStack: 'top' | 'bottom';
  foundModuleStack: 'top' | 'bottom';
  doorHitObject: unknown;
}

export function handleCanvasDoorGrooveClick(args: CanvasDoorGrooveClickArgs): boolean {
  const { App, effectiveDoorId, foundPartId, activeStack, foundModuleStack, doorHitObject } = args;
  const doorHitRecord = asRecord(doorHitObject);
  const targetIdRaw = readDoorPartIdFromHitObject(doorHitRecord) || effectiveDoorId || foundPartId;
  const targetId = __wp_canonDoorPartKeyForMaps(__wp_scopeCornerPartKeyForStack(targetIdRaw, activeStack));
  const clickedDoorWidth = readDoorWidthFromHitObject(doorHitRecord);
  const grooveLinesCountForClick = resolvePendingGrooveLinesCount(App, clickedDoorWidth, undefined, targetId);

  const sketchTarget = parseSketchBoxDoorTarget(targetId || effectiveDoorId || foundPartId);
  if (sketchTarget) {
    patchSketchBoxDoor(App, sketchTarget, foundModuleStack, current => {
      if (!(current && current.enabled !== false)) return current;
      const nextGroove = !(current.groove === true);
      if (!nextGroove) return { ...current, groove: false, grooveLinesCount: null };
      return {
        ...current,
        groove: true,
        grooveLinesCount: grooveLinesCountForClick,
      };
    });
    return true;
  }

  if (targetId) {
    if (__wp_isMultiMode(App)) {
      const matType = __wp_colorGet(App, targetId);
      if (matType === 'mirror' || matType === 'glass') {
        __wp_toast(App, 'לא ניתן לבצע חריטה על זכוכית או מראה', 'error');
        return true;
      }
    }

    const grooveKey = `groove_${targetId}`;
    const groovesMap = __wp_map(App, 'groovesMap');
    const isGrooveOn = groovesMap[grooveKey] != null;
    const nextGrooveOn = !isGrooveOn;
    const grooveLinesCountMap = readGrooveLinesCountMap(App);
    const nextGrooveLinesCountMap = { ...grooveLinesCountMap };
    if (nextGrooveOn && grooveLinesCountForClick != null)
      nextGrooveLinesCountMap[targetId] = grooveLinesCountForClick;
    else delete nextGrooveLinesCountMap[targetId];

    __wp_historyBatch(App, { source: 'groove:click', immediate: true }, () => {
      writePendingGrooveLinesCountForPart(
        App,
        targetId,
        nextGrooveOn && grooveLinesCountForClick != null ? grooveLinesCountForClick : null,
        'groove:click:pendingCount'
      );
      cfgSetMap(
        App,
        'grooveLinesCountMap',
        nextGrooveLinesCountMap,
        __wp_metaNoBuild(App, 'groove:click:count', {
          immediate: true,
          source: 'groove:click:count',
        })
      );
      if (
        !toggleGrooveViaActions(
          App,
          grooveKey,
          __wp_metaNoBuild(App, 'groove:click', {
            immediate: true,
            source: 'groove:click',
          })
        )
      ) {
        toggleGrooveKey(
          App,
          grooveKey,
          __wp_metaNoBuild(App, 'groove:click', {
            immediate: true,
            source: 'groove:click',
          })
        );
      }
      return undefined;
    });
    requestDoorAuthoringBurstRefresh(App, 'groove:click');
  }
  return true;
}
