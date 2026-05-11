import { HANDLE_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { readMapOrEmpty } from '../runtime/maps_access.js';
import {
  areManualHandleHeightsAligned,
  createManualHandlePositionFromLocalPoint,
  readManualHandlePosition,
  resolveManualHandleLocalPosition,
} from '../features/manual_handle_position.js';
import type { UnknownRecord } from '../../../types';
import { buildRectClearanceMeasurementEntries } from './canvas_picking_hover_clearance_measurements.js';
import {
  __asObject,
  __positionDoorMarker,
  __readDoorLeafRect,
  __readPointXYZ,
  __styleMirrorGuidePreview,
  type DoorManualHandleHoverPreviewArgs,
} from './canvas_picking_door_action_hover_preview_shared.js';

function readHandleType(modeOpts: UnknownRecord | null): 'standard' | 'edge' {
  return modeOpts?.handleType === 'edge' ? 'edge' : 'standard';
}

function readEdgeVariant(modeOpts: UnknownRecord | null): 'short' | 'long' {
  return modeOpts?.edgeHandleVariant === 'long' ? 'long' : 'short';
}

function resolvePreviewSize(modeOpts: UnknownRecord | null): {
  width: number;
  height: number;
  depth: number;
} {
  const handleType = readHandleType(modeOpts);
  if (handleType === 'edge') {
    return {
      width: HANDLE_DIMENSIONS.edge.mountThicknessM,
      height:
        readEdgeVariant(modeOpts) === 'long'
          ? HANDLE_DIMENSIONS.edge.longLengthM
          : HANDLE_DIMENSIONS.edge.shortLengthM,
      depth: HANDLE_DIMENSIONS.edge.mountDepthM,
    };
  }
  return {
    width: HANDLE_DIMENSIONS.standard.doorWidthM,
    height: HANDLE_DIMENSIONS.standard.doorHeightM,
    depth: HANDLE_DIMENSIONS.standard.doorDepthM,
  };
}

function readManualPositionForAnyOtherDoor(args: {
  handlesMap: Record<string, unknown> | null;
  currentKey: string;
  currentPosition: { xRatio: number; yRatio: number };
}): boolean {
  const { handlesMap, currentKey, currentPosition } = args;
  if (!handlesMap) return false;
  const prefix = '__wp_manual_handle_position:';
  for (const key of Object.keys(handlesMap)) {
    if (key === currentKey || !key.startsWith(prefix)) continue;
    const other = readManualHandlePosition(handlesMap[key]);
    if (areManualHandleHeightsAligned(currentPosition, other)) return true;
  }
  return false;
}

function resolveGuideWidth(rect: { minX: number; maxX: number }): number {
  const width = Math.max(0.0001, rect.maxX - rect.minX);
  return Math.max(width, width * 3.15);
}

export function tryHandleDoorManualHandleHoverPreview(args: DoorManualHandleHoverPreviewArgs): boolean {
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
    zOff,
    setSketchPreview,
    modeOpts,
    scopedHitDoorPid,
  } = args;

  const rect = __readDoorLeafRect(userData);
  const hitPoint = __readPointXYZ(hit.hitPoint);
  if (!rect || !hitPoint) {
    if (doorMarker) doorMarker.visible = false;
    return false;
  }

  localHit.set(hitPoint.x, hitPoint.y, hitPoint.z);
  try {
    groupRec?.worldToLocal?.(localHit);
  } catch {
    if (doorMarker) doorMarker.visible = false;
    return false;
  }

  const manualPosition = createManualHandlePositionFromLocalPoint({
    rect,
    localX: localHit.x,
    localY: localHit.y,
  });
  const placement = resolveManualHandleLocalPosition({ rect, position: manualPosition });
  if (!manualPosition || !placement) {
    if (doorMarker) doorMarker.visible = false;
    return false;
  }

  const size = resolvePreviewSize(modeOpts);
  const handleZ = zOff + (zOff >= 0 ? 0.003 : -0.003);
  const clearanceMeasurements = buildRectClearanceMeasurementEntries({
    containerMinX: rect.minX,
    containerMaxX: rect.maxX,
    containerMinY: rect.minY,
    containerMaxY: rect.maxY,
    targetCenterX: placement.x,
    targetCenterY: placement.y,
    targetWidth: Math.max(0.005, size.width),
    targetHeight: Math.max(0.005, size.height),
    z: handleZ + (handleZ >= 0 ? 0.0025 : -0.0025),
    showTop: true,
    showBottom: true,
    showLeft: true,
    showRight: true,
    minHorizontalCm: 0.5,
    minVerticalCm: 0.5,
    horizontalLabelPlacement: 'outside',
    styleKey: 'cell',
    textScale: 0.88,
  });

  const handlesMap = __asObject<Record<string, unknown>>(readMapOrEmpty(App, 'handlesMap'));
  const manualKey = `__wp_manual_handle_position:${String(scopedHitDoorPid || '')}`;
  const hasAlignedNeighbor = readManualPositionForAnyOtherDoor({
    handlesMap,
    currentKey: manualKey,
    currentPosition: manualPosition,
  });

  const previewArgs: UnknownRecord = {
    App,
    THREE,
    anchor: groupRec,
    anchorParent: groupRec,
    kind: 'rod',
    x: placement.x,
    y: placement.y,
    z: handleZ,
    w: Math.max(0.004, size.width),
    h: Math.max(0.004, size.height),
    d: Math.max(0.004, size.depth),
    woodThick: Math.max(0.004, Math.min(size.width, size.height)),
    op: 'add',
    showCenterYGuide: true,
    guideWidth: resolveGuideWidth(rect),
    guideHeight: Math.max(0.0001, rect.maxY - rect.minY),
    clearanceMeasurements,
  };

  const preview = setSketchPreview ? setSketchPreview(previewArgs) : null;
  if (preview && hasAlignedNeighbor) __styleMirrorGuidePreview(preview, { isCentered: true });

  __positionDoorMarker({
    groupRec,
    wardrobeGroup,
    doorMarker,
    local,
    wq,
    centerX: placement.x,
    centerY: placement.y,
    zOff: handleZ,
  });
  if (doorMarker) doorMarker.visible = true;
  if (doorMarker)
    doorMarker.material = hasAlignedNeighbor
      ? markerUd.__matCenter || markerUd.__matAdd || doorMarker.material
      : markerUd.__matAdd || doorMarker.material;
  doorMarker?.scale?.set?.(Math.max(0.0001, size.width), Math.max(0.0001, size.height), 1);
  return true;
}
