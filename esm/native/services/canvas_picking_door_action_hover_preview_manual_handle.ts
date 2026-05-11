import { HANDLE_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { getDoorsArray } from '../runtime/render_access.js';
import { readMapOrEmpty } from '../runtime/maps_access.js';
import {
  areManualHandleHeightsAligned,
  createManualHandlePositionFromLocalPoint,
  manualHandlePositionKey,
  type ManualHandlePosition,
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

type ManualHandleAlignment = {
  hasVerticalAlignment: boolean;
  hasHorizontalAlignment: boolean;
};

type ManualDoorGroupLike = UnknownRecord & {
  userData?: UnknownRecord | null;
  localToWorld?: (target: { x: number; y: number; z: number }) => unknown;
};

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

function emptyAlignment(): ManualHandleAlignment {
  return {
    hasVerticalAlignment: false,
    hasHorizontalAlignment: false,
  };
}

function stripDoorSegmentSuffix(partId: string): string {
  return partId.replace(/_(top|mid|bot|full)$/i, '');
}

function readDoorGroupPartId(group: ManualDoorGroupLike | null): string {
  const userData = __asObject<UnknownRecord>(group?.userData);
  const partId = userData && typeof userData.partId === 'string' ? String(userData.partId) : '';
  return partId.trim();
}

function readManualPositionForPart(args: {
  handlesMap: Record<string, unknown> | null;
  partId: string;
}): ManualHandlePosition | null {
  const { handlesMap, partId } = args;
  if (!handlesMap || !partId) return null;
  const direct = readManualHandlePosition(handlesMap[manualHandlePositionKey(partId)]);
  if (direct) return direct;
  const base = stripDoorSegmentSuffix(partId);
  return base && base !== partId ? readManualHandlePosition(handlesMap[manualHandlePositionKey(base)]) : null;
}

function isAlignedDistance(a: number, b: number, toleranceM = 0.006): boolean {
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= toleranceM;
}

function hasMatchingWidthDistance(args: {
  currentRect: { minX: number; maxX: number };
  currentX: number;
  otherRect: { minX: number; maxX: number };
  otherX: number;
}): boolean {
  const { currentRect, currentX, otherRect, otherX } = args;
  const currentLeft = currentX - currentRect.minX;
  const currentRight = currentRect.maxX - currentX;
  const otherLeft = otherX - otherRect.minX;
  const otherRight = otherRect.maxX - otherX;
  return (
    isAlignedDistance(currentLeft, otherLeft) ||
    isAlignedDistance(currentRight, otherRight) ||
    isAlignedDistance(currentLeft, otherRight) ||
    isAlignedDistance(currentRight, otherLeft)
  );
}

function hasMatchingWidthRatio(
  currentPosition: ManualHandlePosition,
  otherPosition: ManualHandlePosition,
  tolerance = 0.006
): boolean {
  const currentX = Number(currentPosition.xRatio);
  const otherX = Number(otherPosition.xRatio);
  if (!Number.isFinite(currentX) || !Number.isFinite(otherX)) return false;
  return Math.abs(currentX - otherX) <= tolerance || Math.abs(currentX - (1 - otherX)) <= tolerance;
}

function projectLocalYToWorld(args: {
  group: ManualDoorGroupLike | null;
  scratch: { x: number; y: number; z: number; set: (x: number, y: number, z: number) => unknown };
  x: number;
  y: number;
}): number | null {
  const { group, scratch, x, y } = args;
  if (!group || typeof group.localToWorld !== 'function') return null;
  try {
    scratch.set(x, y, 0);
    group.localToWorld(scratch);
    return Number.isFinite(scratch.y) ? Number(scratch.y) : null;
  } catch {
    return null;
  }
}

function resolveSceneManualHandleAlignment(args: {
  App: DoorManualHandleHoverPreviewArgs['App'];
  currentGroup: ManualDoorGroupLike | null;
  currentKey: string;
  currentRect: { minX: number; maxX: number; minY: number; maxY: number };
  currentPlacement: { x: number; y: number };
  currentPosition: ManualHandlePosition;
  handlesMap: Record<string, unknown> | null;
  scratch: DoorManualHandleHoverPreviewArgs['localHit'];
}): ManualHandleAlignment {
  const alignment = emptyAlignment();
  const {
    App,
    currentGroup,
    currentKey,
    currentRect,
    currentPlacement,
    currentPosition,
    handlesMap,
    scratch,
  } = args;
  if (!handlesMap) return alignment;

  const currentWorldY = projectLocalYToWorld({
    group: currentGroup,
    scratch,
    x: currentPlacement.x,
    y: currentPlacement.y,
  });
  const doors = getDoorsArray(App);
  for (let i = 0; i < doors.length; i += 1) {
    const doorRec = __asObject<UnknownRecord>(doors[i]);
    const otherGroup = __asObject<ManualDoorGroupLike>(doorRec?.group);
    if (!otherGroup || otherGroup === currentGroup) continue;

    const otherPartId = readDoorGroupPartId(otherGroup);
    if (!otherPartId || manualHandlePositionKey(otherPartId) === currentKey) continue;

    const otherPosition = readManualPositionForPart({ handlesMap, partId: otherPartId });
    if (!otherPosition) continue;

    const otherRect = __readDoorLeafRect(__asObject<UnknownRecord>(otherGroup.userData));
    const otherPlacement = resolveManualHandleLocalPosition({ rect: otherRect, position: otherPosition });
    if (!otherRect || !otherPlacement) continue;

    const otherWorldY = projectLocalYToWorld({
      group: otherGroup,
      scratch,
      x: otherPlacement.x,
      y: otherPlacement.y,
    });
    if (
      (currentWorldY != null && otherWorldY != null && isAlignedDistance(currentWorldY, otherWorldY)) ||
      areManualHandleHeightsAligned(currentPosition, otherPosition)
    ) {
      alignment.hasVerticalAlignment = true;
    }

    if (
      hasMatchingWidthDistance({
        currentRect,
        currentX: currentPlacement.x,
        otherRect,
        otherX: otherPlacement.x,
      })
    ) {
      alignment.hasHorizontalAlignment = true;
    }

    if (alignment.hasVerticalAlignment && alignment.hasHorizontalAlignment) return alignment;
  }
  return alignment;
}

function resolveMapManualHandleAlignment(args: {
  handlesMap: Record<string, unknown> | null;
  currentKey: string;
  currentPosition: ManualHandlePosition;
}): ManualHandleAlignment {
  const { handlesMap, currentKey, currentPosition } = args;
  const alignment = emptyAlignment();
  if (!handlesMap) return alignment;
  const prefix = '__wp_manual_handle_position:';
  for (const key of Object.keys(handlesMap)) {
    if (key === currentKey || !key.startsWith(prefix)) continue;
    const other = readManualHandlePosition(handlesMap[key]);
    if (!other) continue;
    if (areManualHandleHeightsAligned(currentPosition, other)) alignment.hasVerticalAlignment = true;
    if (hasMatchingWidthRatio(currentPosition, other)) alignment.hasHorizontalAlignment = true;
    if (alignment.hasVerticalAlignment && alignment.hasHorizontalAlignment) return alignment;
  }
  return alignment;
}

function resolveManualHandleAlignment(args: {
  App: DoorManualHandleHoverPreviewArgs['App'];
  groupRec: DoorManualHandleHoverPreviewArgs['groupRec'];
  currentKey: string;
  currentRect: { minX: number; maxX: number; minY: number; maxY: number };
  currentPlacement: { x: number; y: number };
  currentPosition: ManualHandlePosition;
  handlesMap: Record<string, unknown> | null;
  scratch: DoorManualHandleHoverPreviewArgs['localHit'];
}): ManualHandleAlignment {
  const sceneAlignment = resolveSceneManualHandleAlignment({
    App: args.App,
    currentGroup: __asObject<ManualDoorGroupLike>(args.groupRec),
    currentKey: args.currentKey,
    currentRect: args.currentRect,
    currentPlacement: args.currentPlacement,
    currentPosition: args.currentPosition,
    handlesMap: args.handlesMap,
    scratch: args.scratch,
  });
  if (sceneAlignment.hasVerticalAlignment && sceneAlignment.hasHorizontalAlignment) return sceneAlignment;

  const mapAlignment = resolveMapManualHandleAlignment({
    handlesMap: args.handlesMap,
    currentKey: args.currentKey,
    currentPosition: args.currentPosition,
  });
  return {
    hasVerticalAlignment: sceneAlignment.hasVerticalAlignment || mapAlignment.hasVerticalAlignment,
    hasHorizontalAlignment: sceneAlignment.hasHorizontalAlignment || mapAlignment.hasHorizontalAlignment,
  };
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
  const manualKey = manualHandlePositionKey(scopedHitDoorPid);
  const alignment = resolveManualHandleAlignment({
    App,
    groupRec,
    handlesMap,
    currentKey: manualKey,
    currentRect: rect,
    currentPlacement: placement,
    currentPosition: manualPosition,
    scratch: localHit,
  });
  const hasAlignedNeighbor = alignment.hasVerticalAlignment || alignment.hasHorizontalAlignment;

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
    showCenterXGuide: alignment.hasHorizontalAlignment,
    guideWidth: resolveGuideWidth(rect),
    guideHeight: Math.max(0.0001, rect.maxY - rect.minY),
    guideHorizontalX: placement.x,
    guideHorizontalY: placement.y,
    guideVerticalX: placement.x,
    guideVerticalY: (rect.minY + rect.maxY) / 2,
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
