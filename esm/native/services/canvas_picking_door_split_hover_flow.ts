import type { UnknownRecord } from '../../../types';
import { DOOR_SYSTEM_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import {
  type MarkerLike,
  type MarkerUserDataLike,
  type SplitDoorHoverArgs,
  type TransformNodeLike,
  __asObject,
  __getDoorHoverAnchorX,
  __isReusableQuaternionLike,
  __isReusableVectorLike,
  __readHoverThree,
  __resolveHoverHit,
  __reuseValue,
} from './canvas_picking_door_hover_targets.js';

export function tryHandleSplitDoorHover(args: SplitDoorHoverArgs): boolean {
  const {
    App,
    marker,
    cutMarker,
    splitVariant,
    normalizeDoorBaseKey,
    readSplitHoverDoorBounds,
    getCanvasPickingRuntime,
    readSplitPosList,
    getRegularSplitPreviewLineY,
    reportPickingIssue,
  } = args;

  const hit = __resolveHoverHit(args, args.isDoorLikePartId);

  if (marker) marker.visible = false;
  const isSplitCustom = splitVariant === 'custom';
  const activeMarker: MarkerLike | null = (isSplitCustom ? cutMarker : marker) || null;

  if (!hit || !activeMarker) {
    if (marker) marker.visible = false;
    if (cutMarker) cutMarker.visible = false;
    return false;
  }

  if (isSplitCustom) {
    if (marker) marker.visible = false;
  } else if (cutMarker) {
    cutMarker.visible = false;
  }

  const { hitDoorPid, hitDoorGroup, hitY, wardrobeGroup } = hit;

  let doorBaseKey = hitDoorPid;
  try {
    doorBaseKey = normalizeDoorBaseKey(App, hitDoorGroup, hitDoorPid);
  } catch (err) {
    reportPickingIssue(App, err, {
      where: 'canvasPicking',
      op: 'hover.normalizeDoorBaseKey',
      throttleMs: 1000,
    });
    doorBaseKey = hitDoorPid;
  }

  const bounds = readSplitHoverDoorBounds(App, String(doorBaseKey || ''));
  const minY = bounds ? bounds.minY : Infinity;
  const maxY = bounds ? bounds.maxY : -Infinity;
  const splitHoverDims = DOOR_SYSTEM_DIMENSIONS.hinged.split;

  if (
    !isFinite(minY) ||
    !isFinite(maxY) ||
    maxY - minY < splitHoverDims.hoverMinDoorHeightM ||
    typeof hitY !== 'number'
  ) {
    activeMarker.visible = false;
    return false;
  }

  const groupRec = __asObject<TransformNodeLike>(hitDoorGroup);
  const userData = groupRec ? __asObject<UnknownRecord>(groupRec.userData) : null;
  const w =
    userData && typeof userData.__doorWidth === 'number'
      ? userData.__doorWidth
      : splitHoverDims.hoverFallbackDoorWidthM;
  const hingeLeft = userData && typeof userData.__hingeLeft === 'boolean' ? !!userData.__hingeLeft : true;
  const anchorX = __getDoorHoverAnchorX(hitDoorGroup, userData, w, hingeLeft);

  let regionH: number = splitHoverDims.hoverRegionMinHeightM;
  let regionCenterY = (minY + maxY) / 2;
  let material: unknown = null;
  let standardLineY: number | null = null;
  let standardLineH = 0.02;

  if (!isSplitCustom) {
    const threshold = minY + (maxY - minY) / 3;
    const isBottom = hitY <= threshold;
    const regionMinY = isBottom ? minY : threshold;
    const regionMaxY = isBottom ? threshold : maxY;
    regionH = Math.max(splitHoverDims.hoverRegionMinHeightM, regionMaxY - regionMinY);
    regionCenterY = (regionMinY + regionMaxY) / 2;
    material = isBottom ? marker?.userData?.__matBottom : marker?.userData?.__matTop;
    standardLineY = getRegularSplitPreviewLineY({
      App,
      hitDoorGroup,
      bounds: { minY, maxY },
      isBottomRegion: isBottom,
    });
    standardLineH = Math.max(
      splitHoverDims.hoverStandardLineMinHeightM,
      Math.min(
        splitHoverDims.hoverStandardLineMaxHeightM,
        (maxY - minY) * splitHoverDims.hoverStandardLineHeightRatio
      )
    );
  } else {
    const H = maxY - minY;
    const padAbs = splitHoverDims.hoverCustomEdgePadM;
    const yAbs = Math.max(minY + padAbs, Math.min(maxY - padAbs, hitY));
    const prevList = readSplitPosList(App, doorBaseKey);
    const tolAbs = Math.max(
      splitHoverDims.hoverCustomRemoveToleranceMinM,
      Math.min(
        splitHoverDims.hoverCustomRemoveToleranceMaxM,
        H * splitHoverDims.hoverCustomRemoveToleranceRatio
      )
    );

    let nearestAbs = NaN;
    let nearestDy = Infinity;
    for (let i = 0; i < prevList.length; i++) {
      const n = prevList[i];
      if (!Number.isFinite(n)) continue;
      let y0 = minY + Math.max(0, Math.min(1, n)) * H;
      y0 = Math.max(minY + padAbs, Math.min(maxY - padAbs, y0));
      const dy = Math.abs(y0 - yAbs);
      if (dy < nearestDy) {
        nearestDy = dy;
        nearestAbs = y0;
      }
    }

    const isRemove = Number.isFinite(nearestAbs) && nearestDy <= tolAbs;
    const yUse = isRemove && Number.isFinite(nearestAbs) ? nearestAbs : yAbs;
    regionCenterY = yUse;
    regionH = Math.max(
      splitHoverDims.hoverCustomMarkerMinHeightM,
      Math.min(splitHoverDims.hoverCustomMarkerMaxHeightM, H * splitHoverDims.hoverCustomMarkerHeightRatio)
    );
    const activeUd = __asObject<MarkerUserDataLike>(activeMarker.userData) || {};
    material = isRemove ? activeUd.__matRemove : activeUd.__matAdd;
  }

  try {
    const THREE = getThreeMaybe(App);
    const T3 = __readHoverThree(THREE);
    if (!T3) {
      activeMarker.visible = false;
      return false;
    }

    const picking = getCanvasPickingRuntime(App);
    const local = __reuseValue(
      picking,
      '__splitHoverMarkerLocalV3',
      __isReusableVectorLike,
      () => new T3.Vector3()
    );
    const hgWp = __reuseValue(
      picking,
      '__splitHoverMarkerWorldPosV3',
      __isReusableVectorLike,
      () => new T3.Vector3()
    );
    const wq = __reuseValue(
      picking,
      '__splitHoverMarkerWorldQuat',
      __isReusableQuaternionLike,
      () => new T3.Quaternion()
    );

    const zSign = userData && typeof userData.__handleZSign === 'number' ? Number(userData.__handleZSign) : 1;
    const zOff = splitHoverDims.hoverMarkerZOffsetM * (zSign === -1 ? -1 : 1);

    local.set(anchorX, 0, zOff);
    groupRec?.getWorldPosition?.(hgWp);
    local.y = regionCenterY - hgWp.y;
    groupRec?.localToWorld?.(local);
    __asObject<TransformNodeLike>(wardrobeGroup)?.worldToLocal?.(local);
    activeMarker.position?.copy?.(local);

    groupRec?.getWorldQuaternion?.(wq);
    activeMarker.quaternion?.copy?.(wq);

    if (!isSplitCustom && cutMarker) {
      if (Number.isFinite(standardLineY)) {
        local.set(anchorX, 0, zOff);
        local.y = Number(standardLineY) - hgWp.y;
        groupRec?.localToWorld?.(local);
        __asObject<TransformNodeLike>(wardrobeGroup)?.worldToLocal?.(local);
        cutMarker.position?.copy?.(local);
        cutMarker.quaternion?.copy?.(wq);
        const cutUd = __asObject<MarkerUserDataLike>(cutMarker.userData);
        cutMarker.material = cutUd && cutUd.__matRemove ? cutUd.__matRemove : cutMarker.material;
        cutMarker.scale?.set?.(
          Math.max(splitHoverDims.hoverMarkerScaleMinM, w - splitHoverDims.hoverMarkerWidthClearanceM),
          Math.max(splitHoverDims.hoverMarkerScaleMinM, standardLineH),
          1
        );
        cutMarker.visible = true;
      } else {
        cutMarker.visible = false;
      }
    }
  } catch (err) {
    reportPickingIssue(App, err, {
      where: 'canvasPicking',
      op: 'hover.markerTransformWorldToLocal',
      throttleMs: 1000,
    });
    activeMarker.visible = false;
    if (cutMarker) cutMarker.visible = false;
    return false;
  }

  activeMarker.visible = true;
  if (material) activeMarker.material = material;
  activeMarker.scale?.set?.(
    Math.max(splitHoverDims.hoverMarkerScaleMinM, w - splitHoverDims.hoverMarkerWidthClearanceM),
    Math.max(splitHoverDims.hoverMarkerScaleMinM, regionH - splitHoverDims.hoverMarkerHeightClearanceM),
    1
  );
  return true;
}
