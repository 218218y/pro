import {
  DEFAULT_DOOR_TRIM_DEPTH_M,
  buildSnappedDoorTrimCenterFromLocal,
  findDoorTrimMatchInRect,
  resolveDoorTrimPlacement,
  resolveDoorTrimPlacementAvoidingMirror,
} from '../features/door_trim.js';
import { readMirrorLayoutListForPart } from '../features/mirror_layout.js';
import { resolveDoorTrimTarget } from './canvas_picking_door_trim_targets.js';
import {
  __asObject,
  __positionDoorMarker,
  __readDoorLeafRect,
  __readDoorTrimConfigMap,
  __readDoorTrimModeDraft,
  __readMapRecord,
  __styleDoorTrimPreview,
  type DoorTrimHoverPreviewArgs,
  type TransformNodeLike,
} from './canvas_picking_door_action_hover_preview_shared.js';
import type { UnknownRecord } from '../../../types';
import { buildRectClearanceMeasurementEntries } from './canvas_picking_hover_clearance_measurements.js';

export function tryHandleDoorTrimHoverPreview(args: DoorTrimHoverPreviewArgs): boolean {
  const {
    App,
    THREE,
    hit,
    hitDoorPid,
    groupRec,
    userData,
    doorMarker,
    markerUd,
    local,
    localHit,
    wq,
    zOff,
    setSketchPreview,
    wardrobeGroup,
  } = args;
  const rect = __readDoorLeafRect(userData);
  if (!rect || !hit.hitPoint || !groupRec) {
    if (doorMarker) doorMarker.visible = false;
    return false;
  }

  const trimTarget = resolveDoorTrimTarget(App, hitDoorPid, hit.hitDoorGroup);
  const trimPartId = trimTarget?.partId || hitDoorPid;
  const trimGroup = trimTarget?.group || hit.hitDoorGroup;
  const trimGroupRec = __asObject<TransformNodeLike>(trimGroup);
  const trimUserData = trimGroupRec ? __asObject<UnknownRecord>(trimGroupRec.userData) : userData;
  const rect0 = __readDoorLeafRect(trimUserData) || rect;
  const trimDraft = __readDoorTrimModeDraft(App);
  const trimMap = __readDoorTrimConfigMap(App);
  const mirrorLayoutMap = __readMapRecord(App, 'mirrorLayoutMap');
  const trimMirrorLayouts = readMirrorLayoutListForPart({
    map: mirrorLayoutMap,
    partId: trimPartId,
    scopedPartId: trimPartId,
  });
  if (!trimGroupRec) {
    if (doorMarker) doorMarker.visible = false;
    return false;
  }

  localHit.set(hit.hitPoint.x, hit.hitPoint.y, hit.hitPoint.z);
  trimGroupRec.worldToLocal?.(localHit);
  const localX = Number(localHit.x);
  const localY = Number(localHit.y);
  const currentTrims = trimMap[trimPartId] || [];
  const match = findDoorTrimMatchInRect({
    rect: rect0,
    trims: currentTrims,
    axis: trimDraft.axis,
    localX,
    localY,
  });
  const center = match
    ? {
        centerNorm: match.entry.centerNorm,
        centerXNorm: match.entry.centerXNorm,
        centerYNorm: match.entry.centerYNorm,
        snappedX: Math.abs(Number(match.entry.centerXNorm ?? 0.5) - 0.5) <= 1e-4,
        snappedY: Math.abs(Number(match.entry.centerYNorm ?? 0.5) - 0.5) <= 1e-4,
        isCentered:
          Math.abs(Number(match.entry.centerXNorm ?? 0.5) - 0.5) <= 1e-4 &&
          Math.abs(Number(match.entry.centerYNorm ?? 0.5) - 0.5) <= 1e-4,
      }
    : buildSnappedDoorTrimCenterFromLocal({ rect: rect0, axis: trimDraft.axis, localX, localY });
  const placement = match
    ? resolveDoorTrimPlacement({ rect: rect0, entry: match.entry })
    : resolveDoorTrimPlacementAvoidingMirror({
        rect: rect0,
        mirrorLayouts: trimMirrorLayouts,
        axis: trimDraft.axis,
        color: trimDraft.color,
        span: trimDraft.span,
        sizeCm: trimDraft.sizeCm,
        crossSizeCm: trimDraft.crossSizeCm,
        centerNorm: center.centerNorm,
        centerXNorm: center.centerXNorm,
        centerYNorm: center.centerYNorm,
      });
  const clearanceMeasurements = buildRectClearanceMeasurementEntries({
    containerMinX: rect0.minX,
    containerMaxX: rect0.maxX,
    containerMinY: rect0.minY,
    containerMaxY: rect0.maxY,
    targetCenterX: placement.centerX,
    targetCenterY: placement.centerY,
    targetWidth: placement.width,
    targetHeight: placement.height,
    z: zOff + (zOff >= 0 ? 0.0025 : -0.0025),
    showTop: true,
    showBottom: true,
    showLeft: placement.width < rect0.maxX - rect0.minX - 0.0005,
    showRight: placement.width < rect0.maxX - rect0.minX - 0.0005,
    minHorizontalCm: 0.5,
    horizontalLabelPlacement: 'outside',
    styleKey: 'cell',
    textScale: 0.9,
  });

  const previewArgs: UnknownRecord = {
    App,
    THREE,
    anchor: trimGroup,
    anchorParent: trimGroup,
    kind: 'rod',
    x: placement.centerX,
    y: placement.centerY,
    z: zOff,
    w: placement.width,
    h: placement.height,
    d: DEFAULT_DOOR_TRIM_DEPTH_M,
    woodThick: placement.axis === 'vertical' ? placement.width : placement.height,
    op: match ? 'remove' : 'add',
    showCenterXGuide: !match && !!center.snappedX,
    showCenterYGuide: !match && !!center.snappedY,
    guideWidth: Math.max(0.0001, rect0.maxX - rect0.minX),
    guideHeight: Math.max(0.0001, rect0.maxY - rect0.minY),
    clearanceMeasurements,
  };
  const preview = setSketchPreview ? setSketchPreview(previewArgs) : null;
  if (preview)
    __styleDoorTrimPreview(preview, { isRemove: !!match, isCentered: !!center.isCentered && !match });
  __positionDoorMarker({
    groupRec: trimGroupRec,
    wardrobeGroup,
    doorMarker,
    local,
    wq,
    centerX: placement.centerX,
    centerY: placement.centerY,
    zOff,
  });
  if (doorMarker) doorMarker.visible = true;
  if (doorMarker)
    doorMarker.material = match
      ? markerUd.__matRemove || markerUd.__matAdd || doorMarker?.material
      : center.isCentered
        ? markerUd.__matCenter || markerUd.__matAdd || doorMarker?.material
        : markerUd.__matAdd || doorMarker?.material;
  doorMarker?.scale?.set?.(Math.max(0.0001, placement.width), Math.max(0.0001, placement.height), 1);
  return true;
}
