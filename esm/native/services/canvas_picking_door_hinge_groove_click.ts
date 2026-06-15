import type { AppContainer, DoorVisualEntryLike } from '../../../types';

import { setDoorsOpenViaService } from '../runtime/doors_access.js';
import { getDoorsArray } from '../runtime/render_access.js';
import { toggleGrooveKey, writeHinge } from '../runtime/maps_access.js';
import { callDoorsAction, hasDoorsAction } from '../runtime/actions_access_domains.js';
import { toggleGrooveViaActions } from '../runtime/actions_access_mutations.js';
import { cfgSetMap } from '../runtime/cfg_access.js';
import {
  createCanvasPickingDoorAuthoringRefreshGatedMeta,
  createCanvasPickingDoorAuthoringStructuralMeta,
} from './canvas_picking_door_authoring_meta.js';
import {
  normalizeGrooveLinesCount,
  readGrooveLinesCountOverride,
  resolvePendingGrooveLinesCount,
} from '../runtime/groove_lines_access.js';
import { readDoorPartIdFromHitObject, readDoorWidthFromHitObject } from './canvas_picking_door_shared.js';
import {
  asRecord,
  readGrooveLinesCountMap,
  writePendingGrooveLinesCountForPart,
} from './canvas_picking_door_edit_shared.js';
import {
  isSketchBoxDoorSegmentPartId,
  parseSketchBoxDoorTarget,
  patchSketchBoxDoor,
  readSketchBoxDoorRecord,
  stripSketchBoxDoorVisualSuffix,
} from './canvas_picking_door_sketch_box_edit.js';
import { requestDoorAuthoringImmediateRefresh } from './canvas_picking_door_authoring_burst.js';
import {
  hasAnyDoorGrooveSegmentMapEntry,
  isDoorGrooveSegmentPartId,
  readDoorGrooveBasePartId,
  readDoorGrooveFullPartId,
  readDoorGrooveLinesCountForPart,
  readDoorGrooveMapFlag,
  readDoorGrooveVisualMapFlag,
} from './canvas_picking_door_groove_segments.js';
import { readDoorVisualSiblingSegmentPartIds } from './canvas_picking_door_segment_materialization.js';
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
    callDoorsAction(
      App,
      'setHinge',
      hingeKey,
      nextHinge,
      createCanvasPickingDoorAuthoringStructuralMeta('hinge:click')
    );
  } else {
    writeHinge(App, hingeKey, nextHinge, createCanvasPickingDoorAuthoringStructuralMeta('hinge:click'));
  }
  requestDoorAuthoringImmediateRefresh(App, 'hinge:click');
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
  const targetId = stripSketchBoxDoorVisualSuffix(
    __wp_canonDoorPartKeyForMaps(__wp_scopeCornerPartKeyForStack(targetIdRaw, activeStack))
  );
  const clickedDoorWidth = readDoorWidthFromHitObject(doorHitRecord);
  const grooveLinesCountForClick = resolvePendingGrooveLinesCount(App, clickedDoorWidth, undefined, targetId);
  const explicitGrooveLinesCountForClick = readGrooveLinesCountOverride(App);

  const sketchTarget = parseSketchBoxDoorTarget(targetId || effectiveDoorId || foundPartId);
  const isSketchBoxSegmentTarget = isSketchBoxDoorSegmentPartId(targetId || effectiveDoorId || foundPartId);
  if (sketchTarget && !isSketchBoxSegmentTarget) {
    const patchedSketchDoor = patchSketchBoxDoor(
      App,
      sketchTarget,
      foundModuleStack,
      current => {
        if (!(current && current.enabled !== false)) return current;
        const currentGrooveOn = current.groove === true;
        const currentGrooveLinesCount = normalizeGrooveLinesCount(current.grooveLinesCount);
        if (
          currentGrooveOn &&
          explicitGrooveLinesCountForClick !== null &&
          currentGrooveLinesCount !== grooveLinesCountForClick
        ) {
          return {
            ...current,
            groove: true,
            grooveLinesCount: grooveLinesCountForClick,
          };
        }
        const nextGroove = !currentGrooveOn;
        if (!nextGroove) return { ...current, groove: false, grooveLinesCount: null };
        return {
          ...current,
          groove: true,
          grooveLinesCount: grooveLinesCountForClick,
        };
      },
      { source: 'groove:click' }
    );
    if (patchedSketchDoor) return true;
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
    const grooveLinesCountMap = readGrooveLinesCountMap(App);
    const targetGrooveFlag = readDoorGrooveMapFlag(groovesMap, targetId);
    const sketchSegmentBasePartId = isSketchBoxSegmentTarget ? readDoorGrooveBasePartId(targetId) : '';
    const sketchSegmentDoor =
      isSketchBoxSegmentTarget && sketchTarget
        ? readSketchBoxDoorRecord(App, sketchTarget, foundModuleStack)
        : null;
    const hasExplicitSketchSegmentGrooveState = hasAnyDoorGrooveSegmentMapEntry(
      groovesMap,
      sketchSegmentBasePartId
    );
    const isInheritedSketchSegmentGrooveOn =
      isSketchBoxSegmentTarget &&
      !hasExplicitSketchSegmentGrooveState &&
      (sketchSegmentDoor?.groove === true || readDoorGrooveVisualMapFlag(groovesMap, targetId) === true);
    const regularSegmentBasePartId =
      !isSketchBoxSegmentTarget && isDoorGrooveSegmentPartId(targetId)
        ? readDoorGrooveBasePartId(targetId)
        : '';
    const regularSegmentFullPartId = regularSegmentBasePartId ? readDoorGrooveFullPartId(targetId) : '';
    const isInheritedRegularSegmentGrooveOn =
      !!regularSegmentFullPartId &&
      targetGrooveFlag === null &&
      readDoorGrooveVisualMapFlag(groovesMap, targetId) === true;
    const isGrooveOn =
      targetGrooveFlag === true || isInheritedSketchSegmentGrooveOn || isInheritedRegularSegmentGrooveOn;
    const inheritedSketchSegmentGrooveLinesCount = isInheritedSketchSegmentGrooveOn
      ? (readDoorGrooveLinesCountForPart(grooveLinesCountMap, targetId) ??
        normalizeGrooveLinesCount(sketchSegmentDoor?.grooveLinesCount))
      : null;
    const inheritedRegularSegmentGrooveLinesCount = isInheritedRegularSegmentGrooveOn
      ? readDoorGrooveLinesCountForPart(grooveLinesCountMap, regularSegmentFullPartId)
      : null;
    const inheritedGrooveLinesCount = isInheritedSketchSegmentGrooveOn
      ? inheritedSketchSegmentGrooveLinesCount
      : inheritedRegularSegmentGrooveLinesCount;
    const currentGrooveLinesCount =
      isInheritedSketchSegmentGrooveOn || isInheritedRegularSegmentGrooveOn
        ? inheritedGrooveLinesCount
        : readDoorGrooveLinesCountForPart(grooveLinesCountMap, targetId);
    const shouldUpdateExistingGrooveLinesCount =
      isGrooveOn &&
      explicitGrooveLinesCountForClick !== null &&
      currentGrooveLinesCount !== grooveLinesCountForClick;
    const nextGrooveOn = shouldUpdateExistingGrooveLinesCount || !isGrooveOn;
    const nextGrooveLinesCountMap = { ...grooveLinesCountMap };
    const siblingSketchSegmentPartIds = isInheritedSketchSegmentGrooveOn
      ? readDoorVisualSiblingSegmentPartIds({
          App,
          basePartId: sketchSegmentBasePartId,
          clickedPartId: targetId,
        })
      : [];
    const siblingRegularSegmentPartIds = isInheritedRegularSegmentGrooveOn
      ? readDoorVisualSiblingSegmentPartIds({
          App,
          basePartId: regularSegmentBasePartId,
          clickedPartId: targetId,
        })
      : [];
    if (isInheritedSketchSegmentGrooveOn || isInheritedRegularSegmentGrooveOn) {
      const siblingPartIds = isInheritedSketchSegmentGrooveOn
        ? siblingSketchSegmentPartIds
        : siblingRegularSegmentPartIds;
      for (let i = 0; i < siblingPartIds.length; i += 1) {
        const siblingPartId = siblingPartIds[i];
        if (!siblingPartId || siblingPartId === targetId) continue;
        if (inheritedGrooveLinesCount != null) {
          nextGrooveLinesCountMap[siblingPartId] = inheritedGrooveLinesCount;
        }
      }
    }
    if (isInheritedSketchSegmentGrooveOn && sketchSegmentBasePartId) {
      delete nextGrooveLinesCountMap[sketchSegmentBasePartId];
      delete nextGrooveLinesCountMap[`groove_${sketchSegmentBasePartId}`];
      delete nextGrooveLinesCountMap[`${sketchSegmentBasePartId}_full`];
      delete nextGrooveLinesCountMap[`groove_${sketchSegmentBasePartId}_full`];
    }
    if (isInheritedRegularSegmentGrooveOn && regularSegmentFullPartId) {
      delete nextGrooveLinesCountMap[regularSegmentFullPartId];
      delete nextGrooveLinesCountMap[`groove_${regularSegmentFullPartId}`];
    }
    if (nextGrooveOn && grooveLinesCountForClick != null)
      nextGrooveLinesCountMap[targetId] = grooveLinesCountForClick;
    else delete nextGrooveLinesCountMap[targetId];

    const grooveStructuralMeta = createCanvasPickingDoorAuthoringStructuralMeta('groove:click');
    const grooveRefreshGatedMeta = createCanvasPickingDoorAuthoringRefreshGatedMeta(
      App,
      'groove:click',
      grooveStructuralMeta
    );
    const grooveCountRefreshGatedMeta = createCanvasPickingDoorAuthoringRefreshGatedMeta(
      App,
      'groove:click:count'
    );

    __wp_historyBatch(App, grooveStructuralMeta, () => {
      writePendingGrooveLinesCountForPart(
        App,
        targetId,
        nextGrooveOn && grooveLinesCountForClick != null ? grooveLinesCountForClick : null,
        'groove:click:pendingCount'
      );
      cfgSetMap(App, 'grooveLinesCountMap', nextGrooveLinesCountMap, grooveCountRefreshGatedMeta);
      if (isSketchBoxSegmentTarget || isInheritedRegularSegmentGrooveOn) {
        const nextGroovesMap = { ...groovesMap };
        const siblingPartIds = isInheritedSketchSegmentGrooveOn
          ? siblingSketchSegmentPartIds
          : siblingRegularSegmentPartIds;
        if (isInheritedSketchSegmentGrooveOn && sketchSegmentBasePartId) {
          delete nextGroovesMap[`groove_${sketchSegmentBasePartId}`];
          delete nextGroovesMap[sketchSegmentBasePartId];
          delete nextGroovesMap[`groove_${sketchSegmentBasePartId}_full`];
          delete nextGroovesMap[`${sketchSegmentBasePartId}_full`];
        }
        if (isInheritedRegularSegmentGrooveOn && regularSegmentFullPartId) {
          delete nextGroovesMap[`groove_${regularSegmentFullPartId}`];
          delete nextGroovesMap[regularSegmentFullPartId];
        }
        if (isInheritedSketchSegmentGrooveOn || isInheritedRegularSegmentGrooveOn) {
          for (let i = 0; i < siblingPartIds.length; i += 1) {
            const siblingPartId = siblingPartIds[i];
            if (!siblingPartId || siblingPartId === targetId) continue;
            nextGroovesMap[`groove_${siblingPartId}`] = true;
          }
        }
        if (isSketchBoxSegmentTarget) {
          nextGroovesMap[grooveKey] = nextGrooveOn;
          delete nextGroovesMap[targetId];
        } else if (nextGrooveOn) {
          nextGroovesMap[grooveKey] = true;
        } else {
          delete nextGroovesMap[grooveKey];
          delete nextGroovesMap[targetId];
        }
        cfgSetMap(App, 'groovesMap', nextGroovesMap, grooveRefreshGatedMeta);
      } else if (!shouldUpdateExistingGrooveLinesCount) {
        if (!toggleGrooveViaActions(App, grooveKey, grooveRefreshGatedMeta)) {
          toggleGrooveKey(App, grooveKey, grooveRefreshGatedMeta);
        }
      }
      return undefined;
    });
    requestDoorAuthoringImmediateRefresh(App, 'groove:click');
  }
  return true;
}
