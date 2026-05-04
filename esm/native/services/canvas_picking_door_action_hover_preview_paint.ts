import {
  buildMirrorLayoutFromHit,
  buildSnappedMirrorCenterFromHit,
  findMirrorLayoutMatchInRect,
  readMirrorLayoutList,
  resolveMirrorPlacementInRect,
} from '../features/mirror_layout.js';
import {
  readMirrorPlacementRectFromUserData,
  resolveMirrorPlacementOwnerByPartId,
} from './canvas_picking_door_shared.js';
import {
  __asObject,
  __isSpecialPaintTarget,
  __positionDoorMarker,
  __readCurtainChoice,
  __readDoorLeafRect,
  __readMapRecord,
  __hasMirrorSizedDraft,
  __readMirrorDraft,
  __readPointXYZ,
  __resolveMirrorFaceSignFromLocalPoint,
  __styleMirrorGuidePreview,
  type DoorPaintHoverPreviewArgs,
} from './canvas_picking_door_action_hover_preview_shared.js';
import type { UnknownRecord } from '../../../types';
import {
  isGlassPaintSelection,
  parseDoorStyleOverridePaintToken,
  resolveDoorStyleOverrideValue,
  resolveGlassFrameStylePaintSelection,
} from '../features/door_style_overrides.js';
import { buildRectClearanceMeasurementEntries } from './canvas_picking_hover_clearance_measurements.js';

export function tryHandleDoorPaintHoverPreview(args: DoorPaintHoverPreviewArgs): boolean {
  const {
    App,
    THREE,
    hit,
    groupRec,
    userData,
    wardrobeGroup,
    doorMarker,
    markerUd,
    local,
    localHit,
    wq,
    scopedHitDoorPid,
    canonDoorPartKeyForMaps,
    normalizedPaintSelection,
    zOff: initialZOff,
    setSketchPreview,
    readUi,
  } = args;
  const rect = __readDoorLeafRect(userData);
  const partKey = canonDoorPartKeyForMaps(scopedHitDoorPid);
  if (!partKey || !rect) {
    if (doorMarker) doorMarker.visible = false;
    return false;
  }

  const individualColors = __readMapRecord(App, 'individualColors');
  const curtainMap = __readMapRecord(App, 'curtainMap');
  const doorSpecialMap = __readMapRecord(App, 'doorSpecialMap');
  const mirrorLayoutMap = __readMapRecord(App, 'mirrorLayoutMap');
  const doorStyleMap = __readMapRecord(App, 'doorStyleMap');
  const existingDoorStyle = (() => {
    const doorStyleSelection = parseDoorStyleOverridePaintToken(normalizedPaintSelection);
    return doorStyleSelection
      ? (resolveDoorStyleOverrideValue(doorStyleMap, partKey) ?? undefined)
      : undefined;
  })();
  const existingSpecial =
    doorSpecialMap[partKey] === 'mirror' || doorSpecialMap[partKey] === 'glass'
      ? String(doorSpecialMap[partKey])
      : null;
  const existingCurtain = typeof curtainMap[partKey] === 'string' ? String(curtainMap[partKey]) : undefined;
  const existingColor =
    typeof individualColors[partKey] === 'string' ? String(individualColors[partKey]) : undefined;

  let previewCenterX = (rect.minX + rect.maxX) / 2;
  let previewCenterY = (rect.minY + rect.maxY) / 2;
  let previewWidth = Math.max(0.01, rect.maxX - rect.minX);
  let previewHeight = Math.max(0.01, rect.maxY - rect.minY);
  let zOff = initialZOff;
  let markerGroupRec = groupRec;
  const baseMarkerMaterial = doorMarker?.material;
  let previewMaterial = markerUd.__matAdd || markerUd.__matGroove || baseMarkerMaterial;

  const doorStyleSelection = parseDoorStyleOverridePaintToken(normalizedPaintSelection);
  if (doorStyleSelection) {
    const willRemoveDoorStyle = existingDoorStyle === doorStyleSelection;
    previewMaterial = willRemoveDoorStyle
      ? markerUd.__matRemove || markerUd.__matGroove || baseMarkerMaterial
      : markerUd.__matAdd || markerUd.__matGroove || baseMarkerMaterial;
  } else if (normalizedPaintSelection === 'mirror') {
    if (!__isSpecialPaintTarget(partKey)) {
      if (doorMarker) doorMarker.visible = false;
      return false;
    }
    const mirrorOwner = resolveMirrorPlacementOwnerByPartId(
      __asObject<UnknownRecord>(hit.hitDoorGroup),
      scopedHitDoorPid
    );
    const mirrorOwnerUserData = mirrorOwner
      ? (__asObject<UnknownRecord>(mirrorOwner.userData) ?? userData)
      : userData;
    const mirrorOwnerGroup = mirrorOwner || groupRec;
    markerGroupRec = mirrorOwnerGroup;
    const mirrorRect = readMirrorPlacementRectFromUserData(mirrorOwnerUserData);
    if (!mirrorRect) {
      if (doorMarker) doorMarker.visible = false;
      return false;
    }
    const hitPoint = __readPointXYZ(hit.hitPoint);
    if (!hitPoint) {
      if (doorMarker) doorMarker.visible = false;
      return false;
    }
    localHit.set(hitPoint.x, hitPoint.y, hitPoint.z);
    mirrorOwnerGroup?.worldToLocal?.(localHit);
    const hitFaceSign = __resolveMirrorFaceSignFromLocalPoint(localHit);
    const existingMirrorLayouts = readMirrorLayoutList(mirrorLayoutMap[partKey]);
    const removeMatch =
      existingSpecial === 'mirror'
        ? findMirrorLayoutMatchInRect({
            rect: mirrorRect,
            layouts: existingMirrorLayouts,
            hitX: localHit.x,
            hitY: localHit.y,
            faceSign: hitFaceSign,
          })
        : null;
    const center = buildSnappedMirrorCenterFromHit({
      rect: mirrorRect,
      hitX: localHit.x,
      hitY: localHit.y,
    });
    const mirrorDraft = __readMirrorDraft(readUi, App);
    const hasSizedDraft = __hasMirrorSizedDraft(readUi, App);
    const nextLayout = hasSizedDraft
      ? buildMirrorLayoutFromHit({
          rect: mirrorRect,
          hitX: localHit.x,
          hitY: localHit.y,
          draft: mirrorDraft,
          faceSign: hitFaceSign,
        })
      : null;
    const placement = removeMatch
      ? removeMatch.placement
      : resolveMirrorPlacementInRect({
          rect: mirrorRect,
          layout: nextLayout,
        });
    previewCenterX = placement.centerX;
    previewCenterY = placement.centerY;
    previewWidth = Math.max(0.01, placement.mirrorWidthM);
    previewHeight = Math.max(0.01, placement.mirrorHeightM);
    zOff = 0.02 * (placement.faceSign === -1 ? -1 : 1);
    const showGuidePreview = !removeMatch && hasSizedDraft && (center.snappedX || center.snappedY);
    const clearanceMeasurements = buildRectClearanceMeasurementEntries({
      containerMinX: mirrorRect.minX,
      containerMaxX: mirrorRect.maxX,
      containerMinY: mirrorRect.minY,
      containerMaxY: mirrorRect.maxY,
      targetCenterX: placement.centerX,
      targetCenterY: placement.centerY,
      targetWidth: placement.mirrorWidthM,
      targetHeight: placement.mirrorHeightM,
      z: zOff + (zOff >= 0 ? 0.0025 : -0.0025),
      showTop: true,
      showBottom: true,
      showLeft: placement.mirrorWidthM < mirrorRect.maxX - mirrorRect.minX - 0.0005,
      showRight: placement.mirrorWidthM < mirrorRect.maxX - mirrorRect.minX - 0.0005,
      minHorizontalCm: 0.5,
      horizontalLabelPlacement: 'outside',
      styleKey: 'cell',
      textScale: 0.9,
    });
    if (setSketchPreview && (showGuidePreview || clearanceMeasurements.length)) {
      const guidePreviewArgs: UnknownRecord = {
        App,
        THREE,
        anchor: mirrorOwnerGroup,
        anchorParent: mirrorOwnerGroup,
        kind: 'rod',
        x: placement.centerX,
        y: placement.centerY,
        z: zOff,
        w: placement.mirrorWidthM,
        h: placement.mirrorHeightM,
        d: 0.004,
        woodThick: 0.004,
        op: 'add',
        showPrimaryBody: false,
        showCenterXGuide: showGuidePreview && !!center.snappedX,
        showCenterYGuide: showGuidePreview && !!center.snappedY,
        guideWidth: Math.max(0.0001, mirrorRect.maxX - mirrorRect.minX),
        guideHeight: Math.max(0.0001, mirrorRect.maxY - mirrorRect.minY),
        clearanceMeasurements,
      };
      const guidePreview = setSketchPreview(guidePreviewArgs);
      if (showGuidePreview) __styleMirrorGuidePreview(guidePreview, { isCentered: !!center.isCentered });
    }
    previewMaterial = removeMatch
      ? markerUd.__matRemove || markerUd.__matGroove || baseMarkerMaterial
      : hasSizedDraft && center.isCentered
        ? markerUd.__matCenter ||
          markerUd.__matMirror ||
          markerUd.__matAdd ||
          markerUd.__matGroove ||
          baseMarkerMaterial
        : markerUd.__matMirror || markerUd.__matAdd || markerUd.__matGroove || baseMarkerMaterial;
  } else if (isGlassPaintSelection(normalizedPaintSelection)) {
    if (!__isSpecialPaintTarget(partKey)) {
      if (doorMarker) doorMarker.visible = false;
      return false;
    }
    const curtainChoice = __readCurtainChoice(readUi, App);
    const glassFrameStyleSelection = resolveGlassFrameStylePaintSelection(normalizedPaintSelection);
    const existingGlassFrameStyle = resolveDoorStyleOverrideValue(doorStyleMap, partKey) ?? null;
    const willRemoveGlass =
      existingSpecial === 'glass' &&
      existingCurtain === curtainChoice &&
      existingGlassFrameStyle === glassFrameStyleSelection;
    previewMaterial = willRemoveGlass
      ? markerUd.__matRemove || markerUd.__matGroove || baseMarkerMaterial
      : markerUd.__matAdd || markerUd.__matGroove || baseMarkerMaterial;
  } else {
    const willRemoveColor = existingColor === normalizedPaintSelection;
    previewMaterial = willRemoveColor
      ? markerUd.__matRemove || markerUd.__matGroove || baseMarkerMaterial
      : markerUd.__matAdd || markerUd.__matGroove || baseMarkerMaterial;
  }

  __positionDoorMarker({
    groupRec: markerGroupRec,
    wardrobeGroup,
    doorMarker,
    local,
    wq,
    centerX: previewCenterX,
    centerY: previewCenterY,
    zOff,
  });
  if (doorMarker) doorMarker.visible = true;
  if (doorMarker) doorMarker.material = previewMaterial;
  doorMarker?.scale?.set?.(previewWidth, previewHeight, 1);
  return true;
}
