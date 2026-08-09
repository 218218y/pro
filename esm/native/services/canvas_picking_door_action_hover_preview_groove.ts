import type { AppContainer, UnknownRecord } from '../../../types';
import {
  buildGrooveLayoutFromHit,
  findGrooveLayoutMatchInRect,
  normalizeKnownMapSnapshot,
  readGrooveLayoutListForPart,
  resolveGroovePlacementInRect,
} from './canvas_picking_door_edit_shared.js';
import {
  readGrooveSurfaceRectFromUserData,
  readPointXYZ,
  resolveGrooveSurfaceOwnerByPartId,
} from './canvas_picking_door_shared.js';
import { readDoorGrooveVisualMapFlag } from './canvas_picking_door_groove_segments.js';
import {
  __asObject,
  __positionDoorMarker,
  __readMapRecord,
  type DoorHoverHit,
  type MarkerLike,
  type MarkerUserDataLike,
  type ReadUiFn,
  type ReusableQuaternionLike,
  type ReusableVectorLike,
  type SetSketchPreviewFn,
  type TransformNodeLike,
} from './canvas_picking_door_action_hover_preview_shared.js';
import {
  buildRectClearanceMeasurementEntries,
  markCenteredRectClearanceMeasurements,
  resolveCellMeasurementLabelOutsets,
} from './canvas_picking_hover_clearance_measurements.js';

export function tryHandleDoorGrooveLayoutHoverPreview(args: {
  App: AppContainer;
  THREE: unknown;
  hit: DoorHoverHit;
  doorMarker: MarkerLike | null;
  markerUd: MarkerUserDataLike;
  local: ReusableVectorLike;
  localHit: ReusableVectorLike;
  wq: ReusableQuaternionLike;
  wardrobeGroup: UnknownRecord;
  scopedHitDoorPid: string;
  canonDoorPartKeyForMaps: (id: string) => string;
  readUi: ReadUiFn;
  setSketchPreview: SetSketchPreviewFn;
}): boolean {
  const partKey = args.canonDoorPartKeyForMaps(args.scopedHitDoorPid);
  const surfaceOwner = resolveGrooveSurfaceOwnerByPartId(
    __asObject<UnknownRecord>(args.hit.hitDoorGroup),
    partKey
  );
  const userData = surfaceOwner ? __asObject<UnknownRecord>(surfaceOwner.userData) : null;
  const rect = readGrooveSurfaceRectFromUserData(userData);
  const hitPoint = readPointXYZ(args.hit.hitPoint);
  if (!partKey || !surfaceOwner || !rect || !hitPoint || typeof surfaceOwner.worldToLocal !== 'function') {
    if (args.doorMarker) args.doorMarker.visible = false;
    return false;
  }

  args.localHit.set(hitPoint.x, hitPoint.y, hitPoint.z);
  surfaceOwner.worldToLocal(args.localHit);
  const ui = args.readUi(args.App);
  const manual = ui?.grooveManualEnabled === true;
  const orientation = ui?.currentGrooveOrientation === 'horizontal' ? 'horizontal' : 'vertical';
  const layouts =
    readGrooveLayoutListForPart({
      map: __readMapRecord(args.App, 'grooveLayoutMap'),
      partId: partKey,
    })?.layouts || [];
  const removeMatch = findGrooveLayoutMatchInRect({
    rect,
    layouts,
    hitX: args.localHit.x,
    hitY: args.localHit.y,
  });
  const nextLayout = buildGrooveLayoutFromHit({
    rect,
    hitX: args.localHit.x,
    hitY: args.localHit.y,
    draft: {
      widthCm: manual ? ui?.currentGrooveDraftWidthCm : null,
      heightCm: manual ? ui?.currentGrooveDraftHeightCm : null,
      orientation,
    },
  });
  const sameOrientationRemoveMatch = removeMatch?.placement.orientation === orientation ? removeMatch : null;
  const placement =
    sameOrientationRemoveMatch?.placement || resolveGroovePlacementInRect({ rect, layout: nextLayout });
  const centerX = (rect.minX + rect.maxX) / 2;
  const centerY = (rect.minY + rect.maxY) / 2;
  const placementIsCenteredX = Math.abs(placement.centerX - centerX) <= 0.000001;
  const placementIsCenteredY = Math.abs(placement.centerY - centerY) <= 0.000001;
  const hasSizedDraft = !!(
    manual &&
    nextLayout &&
    (typeof nextLayout.widthCm === 'number' || typeof nextLayout.heightCm === 'number')
  );
  const groovesMap = normalizeKnownMapSnapshot('groovesMap', __readMapRecord(args.App, 'groovesMap'));
  const willRemoveFullVertical =
    !layouts.length &&
    orientation === 'vertical' &&
    readDoorGrooveVisualMapFlag(groovesMap, partKey) === true;
  const zSign = Number(userData?.__wpGrooveSurfaceZSign) === -1 ? -1 : 1;
  const surfaceZ = typeof userData?.__wpGrooveSurfaceZ === 'number' ? Number(userData.__wpGrooveSurfaceZ) : 0;
  const showCenteredMeasurements = !sameOrientationRemoveMatch && hasSizedDraft;
  const clearanceTextScale = 0.9;
  const { horizontalLabelOutset, verticalLabelOutset } =
    resolveCellMeasurementLabelOutsets(clearanceTextScale);
  const clearanceMeasurements = markCenteredRectClearanceMeasurements(
    buildRectClearanceMeasurementEntries({
      containerMinX: rect.minX,
      containerMaxX: rect.maxX,
      containerMinY: rect.minY,
      containerMaxY: rect.maxY,
      targetCenterX: placement.centerX,
      targetCenterY: placement.centerY,
      targetWidth: placement.widthM,
      targetHeight: placement.heightM,
      z: surfaceZ + (zSign === -1 ? -0.0225 : 0.0225),
      showTop: true,
      showBottom: true,
      showLeft: placement.widthM < rect.maxX - rect.minX - 0.0005,
      showRight: placement.widthM < rect.maxX - rect.minX - 0.0005,
      minHorizontalCm: 0.5,
      horizontalLabelPlacement: 'outside',
      horizontalLabelOutset,
      verticalLabelOutset,
      styleKey: 'cell',
      textScale: clearanceTextScale,
    }),
    {
      centerX: showCenteredMeasurements && placementIsCenteredX,
      centerY: showCenteredMeasurements && placementIsCenteredY,
    }
  );
  if (args.setSketchPreview && showCenteredMeasurements && clearanceMeasurements.length) {
    args.setSketchPreview({
      App: args.App,
      THREE: args.THREE,
      anchor: surfaceOwner,
      anchorParent: surfaceOwner,
      kind: 'rod',
      x: placement.centerX,
      y: placement.centerY,
      z: surfaceZ + 0.02 * zSign,
      w: placement.widthM,
      h: placement.heightM,
      d: 0.004,
      woodThick: 0.004,
      op: 'add',
      showPrimaryBody: false,
      showCenterXGuide: false,
      showCenterYGuide: false,
      guideWidth: Math.max(0.0001, rect.maxX - rect.minX),
      guideHeight: Math.max(0.0001, rect.maxY - rect.minY),
      clearanceMeasurements,
    });
  }

  __positionDoorMarker({
    groupRec: surfaceOwner as TransformNodeLike,
    wardrobeGroup: args.wardrobeGroup,
    doorMarker: args.doorMarker,
    local: args.local,
    wq: args.wq,
    centerX: placement.centerX,
    centerY: placement.centerY,
    zOff: surfaceZ + 0.02 * zSign,
  });
  if (args.doorMarker) {
    args.doorMarker.visible = true;
    args.doorMarker.material =
      sameOrientationRemoveMatch || willRemoveFullVertical
        ? args.markerUd.__matRemove || args.markerUd.__matGroove
        : showCenteredMeasurements && placementIsCenteredX && placementIsCenteredY
          ? args.markerUd.__matCenter || args.markerUd.__matAdd || args.markerUd.__matGroove
          : args.markerUd.__matAdd || args.markerUd.__matGroove;
  }
  args.doorMarker?.scale?.set?.(
    Math.max(0.01, placement.widthM - 0.005),
    Math.max(0.01, placement.heightM - 0.005),
    1
  );
  return true;
}
