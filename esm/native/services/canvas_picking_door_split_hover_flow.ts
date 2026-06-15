import type { UnknownRecord } from '../../../types';
import { DOOR_SYSTEM_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  hasCanvasDoorCustomSplitHeightAlignment,
  setCanvasDoorCustomSplitHoverMeasurements,
} from './canvas_picking_door_split_hover_feedback.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import { resolveCanvasDoorSplitPointerWorldY } from './canvas_picking_door_split_pointer_y.js';
import { validateCanvasDoorCustomSplitAdd } from './canvas_picking_door_split_click_custom.js';
import {
  resolveCanvasDoorCustomSplitRemoveTarget,
  resolveCanvasDoorCustomSplitRemoveTolerance,
  resolveCanvasDoorCustomSplitScreenRemoveCandidate,
  type CanvasDoorCustomSplitScreenRemoveCandidate,
} from './canvas_picking_door_split_remove_target.js';
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
import type { HitObjectLike } from './canvas_picking_engine.js';

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
    getSplitHoverRaycastRoots,
    getRegularSplitPreviewLineY,
    reportPickingIssue,
    setSketchPreview,
  } = args;

  if (marker) marker.visible = false;
  const isSplitCustom = splitVariant === 'custom';
  const activeMarker: MarkerLike | null = (isSplitCustom ? cutMarker : marker) || null;
  const hit = __resolveHoverHit(args, args.isDoorLikePartId);
  let screenRemoveCandidate: CanvasDoorCustomSplitScreenRemoveCandidate | null = null;
  if (!hit && isSplitCustom) {
    screenRemoveCandidate = resolveCanvasDoorCustomSplitScreenRemoveCandidate({
      App,
      roots: getSplitHoverRaycastRoots(App),
      ndcX: args.ndcX,
      ndcY: args.ndcY,
      camera: args.getViewportRoots(App).camera,
      readBounds: readSplitHoverDoorBounds,
      readPosList: readSplitPosList,
      normalizeDoorBaseKey,
    });
  }

  if ((!hit && !screenRemoveCandidate) || !activeMarker) {
    if (marker) marker.visible = false;
    if (cutMarker) cutMarker.visible = false;
    return false;
  }

  if (isSplitCustom) {
    if (marker) marker.visible = false;
  } else if (cutMarker) {
    cutMarker.visible = false;
  }

  const viewportRoots = args.getViewportRoots(App);
  const hitDoorPid = hit ? hit.hitDoorPid : screenRemoveCandidate?.doorBaseKey || '';
  const hitDoorGroup: HitObjectLike | null = hit
    ? hit.hitDoorGroup
    : screenRemoveCandidate?.hitDoorGroup || null;
  const wardrobeGroup = hit ? hit.wardrobeGroup : viewportRoots.wardrobeGroup;
  const hitY = screenRemoveCandidate
    ? screenRemoveCandidate.target.yAbs
    : resolveCanvasDoorSplitPointerWorldY({
        App,
        raycaster: args.raycaster,
        mouse: args.mouse,
        camera: viewportRoots.camera,
        ndcX: args.ndcX,
        ndcY: args.ndcY,
        hitDoorGroup,
        referenceY: hit ? hit.hitY : null,
      });

  let doorBaseKey = screenRemoveCandidate?.doorBaseKey || hitDoorPid;
  if (!screenRemoveCandidate && hit) {
    try {
      doorBaseKey = normalizeDoorBaseKey(App, hit.hitDoorGroup, hitDoorPid);
    } catch (err) {
      reportPickingIssue(App, err, {
        where: 'canvasPicking',
        op: 'hover.normalizeDoorBaseKey',
        throttleMs: 1000,
      });
      doorBaseKey = hitDoorPid;
    }
  }

  const bounds = screenRemoveCandidate?.bounds || readSplitHoverDoorBounds(App, String(doorBaseKey || ''));
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
      : splitHoverDims.hoverDefaultDoorWidthM;
  const hingeLeft = userData && typeof userData.__hingeLeft === 'boolean' ? !!userData.__hingeLeft : true;
  const anchorX = __getDoorHoverAnchorX(hitDoorGroup, userData, w, hingeLeft);

  let regionH: number = splitHoverDims.hoverRegionMinHeightM;
  let regionCenterY = (minY + maxY) / 2;
  let material: unknown = null;
  let standardLineY: number | null = null;
  let standardLineH = 0.02;
  let customIsRemove = false;
  let customIsBlocked = false;

  if (!isSplitCustom) {
    if (!hit) {
      activeMarker.visible = false;
      return false;
    }
    const threshold = minY + (maxY - minY) / 3;
    const isBottom = hitY <= threshold;
    const regionMinY = isBottom ? minY : threshold;
    const regionMaxY = isBottom ? threshold : maxY;
    regionH = Math.max(splitHoverDims.hoverRegionMinHeightM, regionMaxY - regionMinY);
    regionCenterY = (regionMinY + regionMaxY) / 2;
    material = isBottom ? marker?.userData?.__matBottom : marker?.userData?.__matTop;
    standardLineY = getRegularSplitPreviewLineY({
      App,
      hitDoorGroup: hit.hitDoorGroup,
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
    const prevList = readSplitPosList(App, doorBaseKey);
    const pointerY = Number(hitY);
    const removeTarget =
      screenRemoveCandidate?.target ||
      resolveCanvasDoorCustomSplitRemoveTarget({
        App,
        bounds: { minY, maxY },
        prevList,
        pointerY,
        ndcX: args.ndcX,
        ndcY: args.ndcY,
        camera: viewportRoots.camera,
        hitDoorGroup,
        toleranceAbs: resolveCanvasDoorCustomSplitRemoveTolerance({ minY, maxY }),
      });

    const isRemove = !!removeTarget;
    let isBlocked = false;
    let hasAlignedCut = false;
    let yUse = removeTarget ? removeTarget.yAbs : Math.max(minY, Math.min(maxY, pointerY));
    if (!isRemove) {
      const addValidation = validateCanvasDoorCustomSplitAdd({
        bounds: { minY, maxY },
        prevList,
        pointerY,
      });
      yUse = addValidation.yAbs;
      isBlocked = !addValidation.canAdd;
      hasAlignedCut =
        !isBlocked &&
        hasCanvasDoorCustomSplitHeightAlignment({
          App,
          currentDoorBaseKey: doorBaseKey,
          currentYAbs: yUse,
          currentBounds: { minY, maxY },
          readSplitPosList,
          readSplitHoverDoorBounds,
          getCanvasPickingRuntime,
        });
    }

    customIsRemove = isRemove;
    customIsBlocked = isBlocked;
    regionCenterY = yUse;
    regionH = Math.max(
      splitHoverDims.hoverCustomMarkerMinHeightM,
      Math.min(splitHoverDims.hoverCustomMarkerMaxHeightM, H * splitHoverDims.hoverCustomMarkerHeightRatio)
    );
    const activeUd = __asObject<MarkerUserDataLike>(activeMarker.userData) || {};
    material =
      isRemove || isBlocked
        ? activeUd.__matRemove || activeUd.__matAdd
        : hasAlignedCut
          ? activeUd.__matCenter || activeUd.__matAdd
          : activeUd.__matAdd;
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
    const markerLocalY = regionCenterY - hgWp.y;
    local.y = markerLocalY;
    groupRec?.localToWorld?.(local);
    __asObject<TransformNodeLike>(wardrobeGroup)?.worldToLocal?.(local);
    activeMarker.position?.copy?.(local);

    groupRec?.getWorldQuaternion?.(wq);
    activeMarker.quaternion?.copy?.(wq);

    if (isSplitCustom) {
      setCanvasDoorCustomSplitHoverMeasurements({
        App,
        setSketchPreview,
        anchor: hitDoorGroup,
        anchorParent: hitDoorGroup,
        bounds: { minY, maxY },
        doorBaseKey,
        yAbs: regionCenterY,
        localY: markerLocalY,
        localMinY: minY - hgWp.y,
        localMaxY: maxY - hgWp.y,
        anchorX,
        width: Math.max(splitHoverDims.hoverMarkerScaleMinM, w - splitHoverDims.hoverMarkerWidthClearanceM),
        z: zOff,
        zSign,
        isRemove: customIsRemove,
        isBlocked: customIsBlocked,
        readSplitPosList,
        readSplitHoverDoorBounds,
        getCanvasPickingRuntime,
      });
    }

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
