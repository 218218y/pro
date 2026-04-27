import type { AppContainer, UnknownRecord } from '../../../types';

import { cfgSetMap } from '../runtime/cfg_access.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import { readMirrorLayoutListForPart } from '../features/mirror_layout.js';
import {
  buildDoorTrimCenterFromLocal,
  buildSnappedDoorTrimCenterFromLocal,
  createDoorTrimEntry,
  findDoorTrimMatchInRect,
  normalizeDoorTrimAxis,
  normalizeDoorTrimColor,
  normalizeDoorTrimSpan,
  resolveDoorTrimPlacementAvoidingMirror,
} from '../features/door_trim.js';
import {
  readDoorLeafRectFromUserData,
  readPointXYZ,
  resolveDoorTrimTargetFromHitObject,
} from './canvas_picking_door_shared.js';
import { asRecord, readDoorTrimConfigMap, readDoorTrimModeOpts } from './canvas_picking_door_edit_shared.js';
import { __wp_historyBatch, __wp_map } from './canvas_picking_core_helpers.js';

export interface CanvasDoorTrimClickArgs {
  App: AppContainer;
  effectiveDoorId: string | null;
  foundPartId: string | null;
  doorHitPoint: UnknownRecord | null;
  doorHitObject: UnknownRecord | null;
}

export function handleCanvasDoorTrimClick(args: CanvasDoorTrimClickArgs): boolean {
  const { App, effectiveDoorId, foundPartId, doorHitObject, doorHitPoint } = args;
  const clickedPartId = String(effectiveDoorId || foundPartId || '');
  if (!clickedPartId) return false;

  const target = resolveDoorTrimTargetFromHitObject(App, doorHitObject, clickedPartId);
  const trimPartId = target?.partId || clickedPartId;
  const doorGroup = target?.group || null;
  const userData = asRecord(doorGroup?.userData);
  const rect = readDoorLeafRectFromUserData(userData);
  const hitPoint = readPointXYZ(doorHitPoint);
  const opts = readDoorTrimModeOpts(App);
  const axis = normalizeDoorTrimAxis(opts.trimAxis, 'horizontal');
  const color = normalizeDoorTrimColor(opts.trimColor, 'nickel');
  const span = normalizeDoorTrimSpan(opts.trimSpan, 'full');
  const sizeCmRaw =
    typeof opts.trimSizeCm === 'number' && Number.isFinite(opts.trimSizeCm)
      ? Number(opts.trimSizeCm)
      : undefined;
  const crossSizeCmRaw =
    typeof opts.trimCrossSizeCm === 'number' && Number.isFinite(opts.trimCrossSizeCm)
      ? Number(opts.trimCrossSizeCm)
      : undefined;

  const doorGroupRec = asRecord(doorGroup);
  const worldToLocal =
    doorGroupRec && typeof doorGroupRec.worldToLocal === 'function' ? doorGroupRec.worldToLocal : null;
  const THREE = getThreeMaybe(App);
  if (!doorGroup || !rect || !hitPoint || !worldToLocal || !THREE || typeof THREE.Vector3 !== 'function')
    return true;

  const localPoint = new THREE.Vector3(hitPoint.x, hitPoint.y, hitPoint.z);
  try {
    worldToLocal.call(doorGroup, localPoint);
  } catch {
    return true;
  }

  const localX = typeof localPoint.x === 'number' ? Number(localPoint.x) : 0;
  const localY = typeof localPoint.y === 'number' ? Number(localPoint.y) : 0;
  const trimsMap = readDoorTrimConfigMap(App);
  const currentList = trimsMap[trimPartId] || [];
  const mirrorLayoutMap = __wp_map(App, 'mirrorLayoutMap');
  const trimMirrorLayouts = readMirrorLayoutListForPart({
    map: mirrorLayoutMap,
    partId: trimPartId,
    scopedPartId: trimPartId,
  });
  const match = findDoorTrimMatchInRect({ rect, trims: currentList, axis, localX, localY });

  const nextList = currentList.slice();
  if (match) nextList.splice(match.index, 1);
  else {
    const center = buildSnappedDoorTrimCenterFromLocal({ rect, axis, localX, localY });
    const placement = resolveDoorTrimPlacementAvoidingMirror({
      rect,
      mirrorLayouts: trimMirrorLayouts,
      axis,
      color,
      span,
      sizeCm: sizeCmRaw,
      crossSizeCm: crossSizeCmRaw,
      centerNorm: center.centerNorm,
      centerXNorm: center.centerXNorm,
      centerYNorm: center.centerYNorm,
    });
    const adjustedCenter = buildDoorTrimCenterFromLocal({
      rect,
      axis,
      localX: placement.centerX,
      localY: placement.centerY,
    });
    nextList.push(
      createDoorTrimEntry({
        axis,
        color,
        span,
        sizeCm: sizeCmRaw,
        crossSizeCm: crossSizeCmRaw,
        centerNorm: adjustedCenter.centerNorm,
        centerXNorm: adjustedCenter.centerXNorm,
        centerYNorm: adjustedCenter.centerYNorm,
      })
    );
  }

  const nextMap: UnknownRecord = { ...trimsMap };
  if (nextList.length) nextMap[trimPartId] = nextList;
  else delete nextMap[trimPartId];

  __wp_historyBatch(App, { source: 'doorTrim:click', immediate: true }, () => {
    cfgSetMap(App, 'doorTrimMap', nextMap, { source: 'doorTrim:click', immediate: true });
    return undefined;
  });
  return true;
}
