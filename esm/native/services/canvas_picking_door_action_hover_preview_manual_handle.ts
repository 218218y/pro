import { HANDLE_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { getDoorsArray, getDrawersArray } from '../runtime/render_access.js';
import { readMapOrEmpty } from '../runtime/maps_access.js';
import { __wp_isDrawerLikePartId } from './canvas_picking_core_helpers.js';
import {
  areManualHandleHeightsAligned,
  areManualHandleWidthsAligned,
  createManualHandlePositionFromLocalPoint,
  MANUAL_HANDLE_POSITION_KEY_PREFIX,
  manualHandlePositionKey,
  type ManualHandlePosition,
  readManualHandlePosition,
  resolveManualHandleLocalPosition,
} from '../features/manual_handle_position.js';
import type { UnknownRecord } from '../../../types';
import {
  buildRectClearanceMeasurementEntries,
  resolveCellMeasurementLabelOutsets,
} from './canvas_picking_hover_clearance_measurements.js';
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

type ManualHandleHostKind = 'door' | 'drawer';

type ManualDoorGroupLike = UnknownRecord & {
  userData?: UnknownRecord | null;
  localToWorld?: (target: { x: number; y: number; z: number }) => unknown;
};

type ManualDoorVisualEntryLike = UnknownRecord & {
  group?: ManualDoorGroupLike | null;
  hingeSide?: 'left' | 'right' | null;
  id?: unknown;
  partId?: unknown;
};

type ManualHandleSceneCandidate = {
  group: ManualDoorGroupLike;
  doorRec: ManualDoorVisualEntryLike | null;
  hostKind: ManualHandleHostKind;
  partId: string;
};

const MANUAL_HANDLE_MEASUREMENT_TEXT_SCALE = 0.88;
function readHandleType(modeOpts: UnknownRecord | null): 'standard' | 'edge' {
  return modeOpts?.handleType === 'edge' ? 'edge' : 'standard';
}

function readEdgeVariant(modeOpts: UnknownRecord | null): 'short' | 'long' {
  return modeOpts?.edgeHandleVariant === 'long' ? 'long' : 'short';
}

function resolvePreviewSize(args: {
  modeOpts: UnknownRecord | null;
  isDrawerHost: boolean;
  rect: { minX: number; maxX: number };
}): {
  width: number;
  height: number;
  depth: number;
} {
  const { modeOpts, isDrawerHost, rect } = args;
  const handleType = readHandleType(modeOpts);
  if (handleType === 'edge') {
    const targetLength =
      readEdgeVariant(modeOpts) === 'long'
        ? HANDLE_DIMENSIONS.edge.longLengthM
        : HANDLE_DIMENSIONS.edge.shortLengthM;
    if (isDrawerHost) {
      const hostWidth = Math.max(0, rect.maxX - rect.minX);
      const handleWidth = Math.max(
        HANDLE_DIMENSIONS.edge.minLengthM,
        Math.min(Math.max(0, hostWidth - HANDLE_DIMENSIONS.edge.drawerWidthClearanceM), targetLength)
      );
      return {
        width: handleWidth,
        height: HANDLE_DIMENSIONS.edge.mountThicknessM,
        depth: HANDLE_DIMENSIONS.edge.mountDepthM,
      };
    }
    return {
      width: HANDLE_DIMENSIONS.edge.mountThicknessM,
      height: targetLength,
      depth: HANDLE_DIMENSIONS.edge.mountDepthM,
    };
  }
  if (isDrawerHost) {
    return {
      width: HANDLE_DIMENSIONS.standard.drawerWidthM,
      height: HANDLE_DIMENSIONS.standard.drawerHeightM,
      depth: HANDLE_DIMENSIONS.standard.drawerDepthM,
    };
  }
  return {
    width: HANDLE_DIMENSIONS.standard.doorWidthM,
    height: HANDLE_DIMENSIONS.standard.doorHeightM,
    depth: HANDLE_DIMENSIONS.standard.doorDepthM,
  };
}

function isManualHandleDrawerHost(partId: unknown, userData: UnknownRecord | null): boolean {
  const pid = typeof partId === 'string' ? String(partId) : String(partId ?? '');
  if (__wp_isDrawerLikePartId(pid)) return true;
  const userPartId = typeof userData?.partId === 'string' ? String(userData.partId) : '';
  if (userPartId && __wp_isDrawerLikePartId(userPartId)) return true;
  return userData?.__wpType === 'extDrawer' || userData?.__wpSketchExtDrawer === true;
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

function readVisualEntryPartId(entry: ManualDoorVisualEntryLike | null, group: ManualDoorGroupLike): string {
  const groupPartId = readDoorGroupPartId(group);
  if (groupPartId) return groupPartId;
  const entryPartId = entry?.partId;
  if (typeof entryPartId === 'string' && entryPartId.trim()) return entryPartId.trim();
  if (typeof entryPartId === 'number' && Number.isFinite(entryPartId)) return String(entryPartId);
  const entryId = entry?.id;
  if (typeof entryId === 'string' && entryId.trim()) return entryId.trim();
  if (typeof entryId === 'number' && Number.isFinite(entryId)) return String(entryId);
  return '';
}

function resolveManualHandleHostKind(args: {
  defaultKind: ManualHandleHostKind;
  partId: string;
  group: ManualDoorGroupLike;
}): ManualHandleHostKind {
  const userData = __asObject<UnknownRecord>(args.group.userData);
  if (args.defaultKind === 'drawer' || isManualHandleDrawerHost(args.partId, userData)) return 'drawer';
  return 'door';
}

function pushManualHandleSceneCandidate(args: {
  out: ManualHandleSceneCandidate[];
  seenGroups: Set<ManualDoorGroupLike>;
  entry: unknown;
  defaultKind: ManualHandleHostKind;
}): void {
  const doorRec = __asObject<ManualDoorVisualEntryLike>(args.entry);
  const group = __asObject<ManualDoorGroupLike>(doorRec?.group);
  if (!group || args.seenGroups.has(group)) return;
  const partId = readVisualEntryPartId(doorRec, group);
  if (!partId) return;
  if (!__readDoorLeafRect(__asObject<UnknownRecord>(group.userData))) return;

  args.seenGroups.add(group);
  args.out.push({
    group,
    doorRec,
    partId,
    hostKind: resolveManualHandleHostKind({
      defaultKind: args.defaultKind,
      partId,
      group,
    }),
  });
}

function collectManualHandleSceneCandidates(
  App: DoorManualHandleHoverPreviewArgs['App']
): ManualHandleSceneCandidate[] {
  const out: ManualHandleSceneCandidate[] = [];
  const seenGroups = new Set<ManualDoorGroupLike>();
  const doors = getDoorsArray(App) as unknown[];
  for (let i = 0; i < doors.length; i += 1) {
    pushManualHandleSceneCandidate({
      out,
      seenGroups,
      entry: doors[i],
      defaultKind: 'door',
    });
  }

  const drawers = getDrawersArray(App) as unknown[];
  for (let i = 0; i < drawers.length; i += 1) {
    pushManualHandleSceneCandidate({
      out,
      seenGroups,
      entry: drawers[i],
      defaultKind: 'drawer',
    });
  }
  return out;
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

function readDoorHingeSide(args: {
  doorRec?: ManualDoorVisualEntryLike | null;
  group?: ManualDoorGroupLike | null;
}): 'left' | 'right' | null {
  const hingeSide = args.doorRec?.hingeSide;
  if (hingeSide === 'left' || hingeSide === 'right') return hingeSide;
  const userData = __asObject<UnknownRecord>(args.group?.userData);
  if (typeof userData?.__hingeLeft === 'boolean') return userData.__hingeLeft ? 'left' : 'right';
  return null;
}

function resolveOpeningSideDistance(args: {
  currentRect: { minX: number; maxX: number };
  currentX: number;
  hingeSide: 'left' | 'right' | null;
}): number | null {
  const { currentRect, currentX, hingeSide } = args;
  if (hingeSide === 'left') return currentRect.maxX - currentX;
  if (hingeSide === 'right') return currentX - currentRect.minX;
  return null;
}

function hasMatchingWidthDistance(args: {
  currentRect: { minX: number; maxX: number };
  currentX: number;
  currentHingeSide: 'left' | 'right' | null;
  otherRect: { minX: number; maxX: number };
  otherX: number;
  otherHingeSide: 'left' | 'right' | null;
  toleranceM?: number;
}): boolean {
  const currentDistance = resolveOpeningSideDistance({
    currentRect: args.currentRect,
    currentX: args.currentX,
    hingeSide: args.currentHingeSide,
  });
  const otherDistance = resolveOpeningSideDistance({
    currentRect: args.otherRect,
    currentX: args.otherX,
    hingeSide: args.otherHingeSide,
  });
  if (currentDistance == null || otherDistance == null) return false;
  return isAlignedDistance(currentDistance, otherDistance, args.toleranceM);
}

function hasMatchingDrawerWidthPosition(args: {
  currentPosition: ManualHandlePosition;
  currentX: number;
  otherPosition: ManualHandlePosition;
  otherX: number;
  toleranceM?: number;
}): boolean {
  return (
    areManualHandleWidthsAligned(args.currentPosition, args.otherPosition) ||
    isAlignedDistance(args.currentX, args.otherX, args.toleranceM)
  );
}

function shouldCompareSceneCandidate(args: {
  currentHostKind: ManualHandleHostKind;
  otherHostKind: ManualHandleHostKind;
}): boolean {
  if (args.currentHostKind === 'drawer') return args.otherHostKind === 'drawer';
  return args.otherHostKind === 'door';
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
  currentHostKind: ManualHandleHostKind;
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
    currentHostKind,
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
  const currentHingeSide = readDoorHingeSide({ group: currentGroup });
  const candidates = collectManualHandleSceneCandidates(App);
  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    const otherGroup = candidate.group;
    if (otherGroup === currentGroup) continue;
    if (
      !shouldCompareSceneCandidate({
        currentHostKind,
        otherHostKind: candidate.hostKind,
      })
    )
      continue;

    const otherPartId = candidate.partId;
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

    const hasWidthAlignment =
      currentHostKind === 'drawer'
        ? hasMatchingDrawerWidthPosition({
            currentPosition,
            currentX: currentPlacement.x,
            otherPosition,
            otherX: otherPlacement.x,
          })
        : hasMatchingWidthDistance({
            currentRect,
            currentX: currentPlacement.x,
            currentHingeSide,
            otherRect,
            otherX: otherPlacement.x,
            otherHingeSide: readDoorHingeSide({ doorRec: candidate.doorRec, group: otherGroup }),
          });

    if (hasWidthAlignment) {
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
  currentHostKind: ManualHandleHostKind;
}): ManualHandleAlignment {
  const { handlesMap, currentKey, currentPosition, currentHostKind } = args;
  const alignment = emptyAlignment();
  if (!handlesMap) return alignment;
  for (const key of Object.keys(handlesMap)) {
    if (key === currentKey || !key.startsWith(MANUAL_HANDLE_POSITION_KEY_PREFIX)) continue;
    const otherPartId = key.slice(MANUAL_HANDLE_POSITION_KEY_PREFIX.length);
    const otherIsDrawer = __wp_isDrawerLikePartId(otherPartId);
    if (currentHostKind === 'drawer' ? !otherIsDrawer : otherIsDrawer) continue;
    const other = readManualHandlePosition(handlesMap[key]);
    if (!other) continue;
    if (areManualHandleHeightsAligned(currentPosition, other)) alignment.hasVerticalAlignment = true;
    if (currentHostKind === 'drawer' && areManualHandleWidthsAligned(currentPosition, other)) {
      alignment.hasHorizontalAlignment = true;
    }
    if (alignment.hasVerticalAlignment && (currentHostKind !== 'drawer' || alignment.hasHorizontalAlignment))
      return alignment;
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
  currentHostKind: ManualHandleHostKind;
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
    currentHostKind: args.currentHostKind,
    handlesMap: args.handlesMap,
    scratch: args.scratch,
  });
  if (sceneAlignment.hasVerticalAlignment && sceneAlignment.hasHorizontalAlignment) return sceneAlignment;

  const mapAlignment = resolveMapManualHandleAlignment({
    handlesMap: args.handlesMap,
    currentKey: args.currentKey,
    currentPosition: args.currentPosition,
    currentHostKind: args.currentHostKind,
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

  const size = resolvePreviewSize({
    modeOpts,
    isDrawerHost: isManualHandleDrawerHost(scopedHitDoorPid, userData),
    rect,
  });
  const currentHostKind: ManualHandleHostKind = isManualHandleDrawerHost(scopedHitDoorPid, userData)
    ? 'drawer'
    : 'door';
  const handleZ = zOff + (zOff >= 0 ? 0.003 : -0.003);
  const { horizontalLabelOutset, verticalLabelOutset } = resolveCellMeasurementLabelOutsets(
    MANUAL_HANDLE_MEASUREMENT_TEXT_SCALE
  );
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
    horizontalLabelOutset,
    verticalLabelOutset,
    styleKey: 'cell',
    textScale: MANUAL_HANDLE_MEASUREMENT_TEXT_SCALE,
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
    currentHostKind,
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
    showCenterYGuide: alignment.hasHorizontalAlignment,
    showCenterXGuide: alignment.hasVerticalAlignment,
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
