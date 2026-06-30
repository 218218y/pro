import type { AppContainer, UnknownRecord } from '../../../types';

import { cfgSetMap } from '../runtime/cfg_access.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import {
  readMirrorLayoutListForPart,
  buildDoorTrimCenterFromLocal,
  buildSnappedDoorTrimCenterFromLocal,
  createDoorTrimEntry,
  findDoorTrimMatchInRect,
  normalizeDoorTrimAxis,
  normalizeDoorTrimColor,
  normalizeDoorTrimSpan,
  resolveDoorTrimPlacementAvoidingMirror,
  mapDoorTrimSurfaceLocalPoint,
} from '../features/door_authoring/api.js';
import {
  readDoorLeafRectFromUserData,
  readPointXYZ,
  resolveDoorTrimTargetFromHitObject,
} from './canvas_picking_door_shared.js';
import { asRecord, readDoorTrimConfigMap, readDoorTrimModeOpts } from './canvas_picking_door_edit_shared.js';
import { createCanvasPickingDoorAuthoringStructuralMeta } from './canvas_picking_door_authoring_meta.js';
import { __wp_historyBatch, __wp_map } from './canvas_picking_core_helpers.js';

export interface CanvasDoorTrimClickArgs {
  App: AppContainer;
  effectiveDoorId: string | null;
  foundPartId: string | null;
  doorHitPoint: UnknownRecord | null;
  doorHitObject: UnknownRecord | null;
  doorHitGroup?: UnknownRecord | null;
}

export function handleCanvasDoorTrimClick(args: CanvasDoorTrimClickArgs): boolean {
  const { App, effectiveDoorId, foundPartId, doorHitObject, doorHitPoint, doorHitGroup = null } = args;
  const clickedPartId = String(effectiveDoorId || foundPartId || '');
  if (!clickedPartId) return false;

  const target = resolveDoorTrimTargetFromHitObject(App, doorHitObject, clickedPartId, doorHitGroup);
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

  const mappedLocal = mapDoorTrimSurfaceLocalPoint(userData, localPoint);
  const localX = mappedLocal.localX;
  const localY = mappedLocal.localY;
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
    const center = buildSnappedDoorTrimCenterFromLocal({ rect, localX, localY });
    const placement = resolveDoorTrimPlacementAvoidingMirror({
      rect,
      mirrorLayouts: trimMirrorLayouts,
      axis,
      color,
      span,
      sizeCm: sizeCmRaw,
      crossSizeCm: crossSizeCmRaw,
      centerXNorm: center.centerXNorm,
      centerYNorm: center.centerYNorm,
    });
    const adjustedCenter = buildDoorTrimCenterFromLocal({
      rect,
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
        centerXNorm: adjustedCenter.centerXNorm,
        centerYNorm: adjustedCenter.centerYNorm,
      })
    );
  }

  const nextMap: UnknownRecord = { ...trimsMap };
  if (nextList.length) nextMap[trimPartId] = nextList;
  else delete nextMap[trimPartId];

  const meta = createCanvasPickingDoorAuthoringStructuralMeta('doorTrim:click');
  __wp_historyBatch(App, meta, () => {
    cfgSetMap(App, 'doorTrimMap', nextMap, meta);
    return undefined;
  });
  return true;
}
