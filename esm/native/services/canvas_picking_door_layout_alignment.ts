import type { AppContainer, GrooveLayoutEntry, UnknownRecord } from '../../../types';
import { buildDoorVisualLookupKeys } from '../../shared/door_visual_key_contracts_shared.js';
import {
  readDoorVisualMapValue,
  readDoorVisualMirrorLayout,
  readGrooveLayoutList,
  readGrooveLayoutListForPart,
  readMirrorLayoutFaceSign,
  readMirrorLayoutList,
  resolveGroovePlacementInRect,
  resolveMirrorPlacementInRect,
} from '../features/door_authoring/api.js';
import {
  computeAutoGrooveLinesCount,
  normalizeGrooveLinesCount,
  readGrooveLinesCountForPart,
} from '../runtime/groove_lines_access.js';
import { getDoorsArray, getDrawersArray } from '../runtime/render_access.js';
import { __wp_isDrawerLikePartId } from './canvas_picking_core_helpers.js';
import {
  readGrooveSurfaceRectFromUserData,
  readMirrorPlacementRectFromUserData,
  resolveGrooveSurfaceOwnerByPartId,
  resolveMirrorPlacementOwnerByPartId,
  type DoorHitNode,
} from './canvas_picking_door_shared.js';
import type { ReusableVectorLike } from './canvas_picking_door_action_hover_preview_contracts.js';

export type DoorLayoutHoverAlignment = {
  hasVerticalAlignment: boolean;
  hasHorizontalAlignment: boolean;
};

type LayoutRect = { minX: number; maxX: number; minY: number; maxY: number };
type LayoutPlacement = {
  widthM: number;
  heightM: number;
  centerX: number;
  centerY: number;
  centerXNorm: number;
  centerYNorm: number;
};

type DoorLayoutHostKind = 'door' | 'drawer';

type DoorSceneCandidate = {
  group: DoorHitNode;
  partId: string;
  hingeSide: 'left' | 'right' | null;
  hostKind: DoorLayoutHostKind;
};

const POSITION_TOLERANCE_M = 0.006;
const POSITION_TOLERANCE_NORM = 0.006;
const SIZE_TOLERANCE_M = 0.001;
const SIZE_TOLERANCE_CM = SIZE_TOLERANCE_M * 100;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function emptyAlignment(): DoorLayoutHoverAlignment {
  return { hasVerticalAlignment: false, hasHorizontalAlignment: false };
}

function readPartId(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function readGroupPartId(group: DoorHitNode | null): string {
  const userData = asRecord(group?.userData);
  return readPartId(userData?.partId);
}

function readEntryPartId(entry: UnknownRecord | null, group: DoorHitNode): string {
  return readGroupPartId(group) || readPartId(entry?.partId) || readPartId(entry?.id);
}

function readHingeSideFromNode(group: DoorHitNode | null): 'left' | 'right' | null {
  let current = group;
  let depth = 0;
  while (current && depth < 20) {
    depth += 1;
    const userData = asRecord(current.userData);
    if (typeof userData?.__hingeLeft === 'boolean') return userData.__hingeLeft ? 'left' : 'right';
    current = (asRecord(current.parent) as DoorHitNode | null) || null;
  }
  return null;
}

function readEntryHingeSide(entry: UnknownRecord | null, group: DoorHitNode): 'left' | 'right' | null {
  const hingeSide = entry?.hingeSide;
  if (hingeSide === 'left' || hingeSide === 'right') return hingeSide;
  return readHingeSideFromNode(group);
}

function resolveHostKind(args: {
  defaultKind: DoorLayoutHostKind;
  partId: string;
  group: DoorHitNode | null;
}): DoorLayoutHostKind {
  const userData = asRecord(args.group?.userData);
  if (
    args.defaultKind === 'drawer' ||
    __wp_isDrawerLikePartId(args.partId) ||
    userData?.__wpType === 'extDrawer' ||
    userData?.__wpSketchExtDrawer === true
  )
    return 'drawer';
  return 'door';
}

function resolvePartIdHostKind(partId: string): DoorLayoutHostKind {
  return __wp_isDrawerLikePartId(partId) ? 'drawer' : 'door';
}

function collectDoorSceneCandidates(App: AppContainer): DoorSceneCandidate[] {
  const out: DoorSceneCandidate[] = [];
  const seenGroups = new Set<DoorHitNode>();
  const pushEntries = (entries: unknown[], defaultKind: DoorLayoutHostKind) => {
    for (let index = 0; index < entries.length; index += 1) {
      const entry = asRecord(entries[index]);
      const group = asRecord(entry?.group) as DoorHitNode | null;
      if (!group || seenGroups.has(group)) continue;
      const partId = readEntryPartId(entry, group);
      if (!partId) continue;
      seenGroups.add(group);
      out.push({
        group,
        partId,
        hingeSide: readEntryHingeSide(entry, group),
        hostKind: resolveHostKind({ defaultKind, partId, group }),
      });
    }
  };
  pushEntries(getDoorsArray(App) as unknown[], 'door');
  pushEntries(getDrawersArray(App) as unknown[], 'drawer');
  return out;
}

function isSameDoorVisualHost(a: string, b: string): boolean {
  if (!a || !b) return false;
  const aKeys = new Set(buildDoorVisualLookupKeys(a));
  const bKeys = buildDoorVisualLookupKeys(b);
  for (let index = 0; index < bKeys.length; index += 1) {
    if (aKeys.has(bKeys[index])) return true;
  }
  return false;
}

function isAlignedDistance(a: number, b: number): boolean {
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= POSITION_TOLERANCE_M;
}

function isAlignedNorm(a: number, b: number): boolean {
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= POSITION_TOLERANCE_NORM;
}

function isSameSizeM(a: number, b: number): boolean {
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= SIZE_TOLERANCE_M;
}

function projectLocalYToWorld(args: {
  group: DoorHitNode | null;
  scratch: ReusableVectorLike;
  x: number;
  y: number;
}): number | null {
  if (!args.group || typeof args.group.localToWorld !== 'function') return null;
  try {
    args.scratch.set(args.x, args.y, 0);
    args.group.localToWorld(args.scratch);
    return Number.isFinite(args.scratch.y) ? Number(args.scratch.y) : null;
  } catch {
    return null;
  }
}

function resolveOpeningSideDistance(args: {
  rect: LayoutRect;
  centerX: number;
  hingeSide: 'left' | 'right' | null;
}): number | null {
  if (args.hingeSide === 'left') return args.rect.maxX - args.centerX;
  if (args.hingeSide === 'right') return args.centerX - args.rect.minX;
  return null;
}

function comparePlacementAlignment(args: {
  currentRect: LayoutRect;
  currentPlacement: LayoutPlacement;
  currentOwner: DoorHitNode | null;
  currentHingeSide: 'left' | 'right' | null;
  otherRect: LayoutRect;
  otherPlacement: LayoutPlacement;
  otherOwner: DoorHitNode | null;
  otherHingeSide: 'left' | 'right' | null;
  scratch: ReusableVectorLike;
}): DoorLayoutHoverAlignment {
  const currentWorldY = projectLocalYToWorld({
    group: args.currentOwner,
    scratch: args.scratch,
    x: args.currentPlacement.centerX,
    y: args.currentPlacement.centerY,
  });
  const otherWorldY = projectLocalYToWorld({
    group: args.otherOwner,
    scratch: args.scratch,
    x: args.otherPlacement.centerX,
    y: args.otherPlacement.centerY,
  });
  const hasVerticalAlignment =
    (currentWorldY != null && otherWorldY != null && isAlignedDistance(currentWorldY, otherWorldY)) ||
    isAlignedNorm(args.currentPlacement.centerYNorm, args.otherPlacement.centerYNorm);

  const currentOpeningDistance = resolveOpeningSideDistance({
    rect: args.currentRect,
    centerX: args.currentPlacement.centerX,
    hingeSide: args.currentHingeSide,
  });
  const otherOpeningDistance = resolveOpeningSideDistance({
    rect: args.otherRect,
    centerX: args.otherPlacement.centerX,
    hingeSide: args.otherHingeSide,
  });
  const hasHorizontalAlignment =
    currentOpeningDistance != null && otherOpeningDistance != null
      ? isAlignedDistance(currentOpeningDistance, otherOpeningDistance)
      : isAlignedNorm(args.currentPlacement.centerXNorm, args.otherPlacement.centerXNorm);

  return { hasVerticalAlignment, hasHorizontalAlignment };
}

function mergeAlignment(target: DoorLayoutHoverAlignment, next: DoorLayoutHoverAlignment): void {
  if (next.hasVerticalAlignment) target.hasVerticalAlignment = true;
  if (next.hasHorizontalAlignment) target.hasHorizontalAlignment = true;
}

function resolveCandidateMirrorOwner(candidate: DoorSceneCandidate): DoorHitNode | null {
  const keys = buildDoorVisualLookupKeys(candidate.partId);
  for (let index = 0; index < keys.length; index += 1) {
    const owner = resolveMirrorPlacementOwnerByPartId(candidate.group, keys[index]);
    if (owner) return owner;
  }
  return resolveMirrorPlacementOwnerByPartId(candidate.group, candidate.partId);
}

function resolveCandidateGrooveOwner(candidate: DoorSceneCandidate): DoorHitNode | null {
  const keys = buildDoorVisualLookupKeys(candidate.partId);
  for (let index = 0; index < keys.length; index += 1) {
    const owner = resolveGrooveSurfaceOwnerByPartId(candidate.group, keys[index]);
    if (owner) return owner;
  }
  return resolveGrooveSurfaceOwnerByPartId(candidate.group, candidate.partId);
}

function mirrorPlacementsHaveSameShape(
  current: ReturnType<typeof resolveMirrorPlacementInRect>,
  other: ReturnType<typeof resolveMirrorPlacementInRect>
): boolean {
  return (
    isSameSizeM(current.mirrorWidthM, other.mirrorWidthM) &&
    isSameSizeM(current.mirrorHeightM, other.mirrorHeightM) &&
    current.faceSign === other.faceSign
  );
}

function toMirrorPlacement(value: ReturnType<typeof resolveMirrorPlacementInRect>): LayoutPlacement {
  return {
    widthM: value.mirrorWidthM,
    heightM: value.mirrorHeightM,
    centerX: value.centerX,
    centerY: value.centerY,
    centerXNorm: value.centerXNorm,
    centerYNorm: value.centerYNorm,
  };
}

function fallbackMirrorLayoutShapeMatches(currentLayout: unknown, otherLayout: unknown): boolean {
  const currentList = readMirrorLayoutList(currentLayout);
  const otherList = readMirrorLayoutList(otherLayout);
  const current = currentList[0] || null;
  const other = otherList[0] || null;
  if (!current || !other) return false;
  const currentWidth = current.widthCm ?? null;
  const otherWidth = other.widthCm ?? null;
  if (currentWidth == null || otherWidth == null) {
    if (currentWidth !== otherWidth) return false;
  } else if (Math.abs(currentWidth - otherWidth) > SIZE_TOLERANCE_CM) return false;
  const currentHeight = current.heightCm ?? null;
  const otherHeight = other.heightCm ?? null;
  if (currentHeight == null || otherHeight == null) {
    if (currentHeight !== otherHeight) return false;
  } else if (Math.abs(currentHeight - otherHeight) > SIZE_TOLERANCE_CM) return false;
  return readMirrorLayoutFaceSign(current) === readMirrorLayoutFaceSign(other);
}

export function resolveMirrorLayoutHoverAlignment(args: {
  App: AppContainer;
  currentPartId: string;
  currentRoot: DoorHitNode | null;
  currentOwner: DoorHitNode | null;
  currentRect: LayoutRect;
  currentLayout: unknown;
  currentPlacement: ReturnType<typeof resolveMirrorPlacementInRect>;
  mirrorLayoutMap: Record<string, unknown> | null;
  doorSpecialMap: Record<string, unknown> | null;
  paintSelection: string;
  scratch: ReusableVectorLike;
}): DoorLayoutHoverAlignment {
  const alignment = emptyAlignment();
  if (!args.currentLayout || !args.mirrorLayoutMap) return alignment;
  const candidates = collectDoorSceneCandidates(args.App);
  const currentSceneCandidate = candidates.find(candidate =>
    isSameDoorVisualHost(args.currentPartId, candidate.partId)
  );
  const currentHostKind =
    currentSceneCandidate?.hostKind ||
    resolveHostKind({
      defaultKind: resolvePartIdHostKind(args.currentPartId),
      partId: args.currentPartId,
      group: args.currentRoot,
    });
  const currentHingeSide =
    readHingeSideFromNode(args.currentRoot) ||
    readHingeSideFromNode(args.currentOwner) ||
    currentSceneCandidate?.hingeSide ||
    null;
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (candidate.hostKind !== currentHostKind) continue;
    if (isSameDoorVisualHost(args.currentPartId, candidate.partId)) continue;
    if (readDoorVisualMapValue(args.doorSpecialMap, candidate.partId) !== args.paintSelection) continue;
    const otherLayouts = readDoorVisualMirrorLayout(args.mirrorLayoutMap, candidate.partId) || [];
    if (!otherLayouts.length) continue;
    const otherOwner = resolveCandidateMirrorOwner(candidate);
    const otherRect = readMirrorPlacementRectFromUserData(asRecord(otherOwner?.userData));
    if (!otherOwner || !otherRect) continue;
    for (let layoutIndex = 0; layoutIndex < otherLayouts.length; layoutIndex += 1) {
      const otherPlacement = resolveMirrorPlacementInRect({
        rect: otherRect,
        layout: otherLayouts[layoutIndex],
      });
      if (!mirrorPlacementsHaveSameShape(args.currentPlacement, otherPlacement)) continue;
      mergeAlignment(
        alignment,
        comparePlacementAlignment({
          currentRect: args.currentRect,
          currentPlacement: toMirrorPlacement(args.currentPlacement),
          currentOwner: args.currentOwner,
          currentHingeSide,
          otherRect,
          otherPlacement: toMirrorPlacement(otherPlacement),
          otherOwner,
          otherHingeSide: candidate.hingeSide,
          scratch: args.scratch,
        })
      );
      if (alignment.hasVerticalAlignment && alignment.hasHorizontalAlignment) return alignment;
    }
  }

  if (candidates.length) return alignment;

  for (const [otherPartId, otherLayoutsRaw] of Object.entries(args.mirrorLayoutMap)) {
    if (resolvePartIdHostKind(otherPartId) !== currentHostKind) continue;
    if (isSameDoorVisualHost(args.currentPartId, otherPartId)) continue;
    if (readDoorVisualMapValue(args.doorSpecialMap, otherPartId) !== args.paintSelection) continue;
    const otherLayouts = readMirrorLayoutList(otherLayoutsRaw);
    for (let layoutIndex = 0; layoutIndex < otherLayouts.length; layoutIndex += 1) {
      const otherLayout = otherLayouts[layoutIndex];
      if (!fallbackMirrorLayoutShapeMatches(args.currentLayout, otherLayout)) continue;
      const currentLayout = readMirrorLayoutList(args.currentLayout)[0];
      if (!currentLayout) continue;
      const currentX = currentLayout.centerXNorm ?? 0.5;
      const currentY = currentLayout.centerYNorm ?? 0.5;
      const otherX = otherLayout.centerXNorm ?? 0.5;
      const otherY = otherLayout.centerYNorm ?? 0.5;
      if (isAlignedNorm(currentY, otherY)) alignment.hasVerticalAlignment = true;
      if (isAlignedNorm(currentX, otherX)) alignment.hasHorizontalAlignment = true;
      if (alignment.hasVerticalAlignment && alignment.hasHorizontalAlignment) return alignment;
    }
  }
  return alignment;
}

function groovePlacementsHaveSameShape(args: {
  currentPlacement: ReturnType<typeof resolveGroovePlacementInRect>;
  currentLinesCount: number;
  otherPlacement: ReturnType<typeof resolveGroovePlacementInRect>;
  otherLinesCount: number;
}): boolean {
  return (
    isSameSizeM(args.currentPlacement.widthM, args.otherPlacement.widthM) &&
    isSameSizeM(args.currentPlacement.heightM, args.otherPlacement.heightM) &&
    args.currentPlacement.orientation === args.otherPlacement.orientation &&
    args.currentLinesCount === args.otherLinesCount
  );
}

function resolveOtherGrooveLinesCount(args: {
  App: AppContainer;
  partId: string;
  layout: GrooveLayoutEntry;
  placement: ReturnType<typeof resolveGroovePlacementInRect>;
}): number {
  const stored = normalizeGrooveLinesCount(args.layout.linesCount);
  if (stored != null) return stored;
  const partCount = readGrooveLinesCountForPart(args.App, args.partId);
  if (partCount != null) return partCount;
  const distributionSpan =
    args.placement.orientation === 'horizontal' ? args.placement.heightM : args.placement.widthM;
  return computeAutoGrooveLinesCount(distributionSpan);
}

function toGroovePlacement(value: ReturnType<typeof resolveGroovePlacementInRect>): LayoutPlacement {
  return {
    widthM: value.widthM,
    heightM: value.heightM,
    centerX: value.centerX,
    centerY: value.centerY,
    centerXNorm: value.centerXNorm,
    centerYNorm: value.centerYNorm,
  };
}

function fallbackGrooveShapeMatches(args: {
  currentLayout: GrooveLayoutEntry;
  currentLinesCount: number;
  otherLayout: GrooveLayoutEntry;
  otherLinesCount: number;
}): boolean {
  const currentWidth = args.currentLayout.widthCm ?? null;
  const otherWidth = args.otherLayout.widthCm ?? null;
  if (currentWidth == null || otherWidth == null) {
    if (currentWidth !== otherWidth) return false;
  } else if (Math.abs(currentWidth - otherWidth) > SIZE_TOLERANCE_CM) return false;
  const currentHeight = args.currentLayout.heightCm ?? null;
  const otherHeight = args.otherLayout.heightCm ?? null;
  if (currentHeight == null || otherHeight == null) {
    if (currentHeight !== otherHeight) return false;
  } else if (Math.abs(currentHeight - otherHeight) > SIZE_TOLERANCE_CM) return false;
  const currentOrientation = args.currentLayout.orientation === 'horizontal' ? 'horizontal' : 'vertical';
  const otherOrientation = args.otherLayout.orientation === 'horizontal' ? 'horizontal' : 'vertical';
  return currentOrientation === otherOrientation && args.currentLinesCount === args.otherLinesCount;
}

export function resolveGrooveLayoutHoverAlignment(args: {
  App: AppContainer;
  currentPartId: string;
  currentRoot: DoorHitNode | null;
  currentOwner: DoorHitNode | null;
  currentRect: LayoutRect;
  currentLayout: GrooveLayoutEntry | null;
  currentPlacement: ReturnType<typeof resolveGroovePlacementInRect>;
  currentLinesCount: number;
  grooveLayoutMap: Record<string, unknown> | null;
  scratch: ReusableVectorLike;
}): DoorLayoutHoverAlignment {
  const alignment = emptyAlignment();
  if (!args.currentLayout || !args.grooveLayoutMap) return alignment;
  const candidates = collectDoorSceneCandidates(args.App);
  const currentSceneCandidate = candidates.find(candidate =>
    isSameDoorVisualHost(args.currentPartId, candidate.partId)
  );
  const currentHostKind =
    currentSceneCandidate?.hostKind ||
    resolveHostKind({
      defaultKind: resolvePartIdHostKind(args.currentPartId),
      partId: args.currentPartId,
      group: args.currentRoot,
    });
  const currentHingeSide =
    readHingeSideFromNode(args.currentRoot) ||
    readHingeSideFromNode(args.currentOwner) ||
    currentSceneCandidate?.hingeSide ||
    null;
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (candidate.hostKind !== currentHostKind) continue;
    if (isSameDoorVisualHost(args.currentPartId, candidate.partId)) continue;
    const otherLayouts =
      readGrooveLayoutListForPart({ map: args.grooveLayoutMap, partId: candidate.partId })?.layouts || [];
    if (!otherLayouts.length) continue;
    const otherOwner = resolveCandidateGrooveOwner(candidate);
    const otherRect = readGrooveSurfaceRectFromUserData(asRecord(otherOwner?.userData));
    if (!otherOwner || !otherRect) continue;
    for (let layoutIndex = 0; layoutIndex < otherLayouts.length; layoutIndex += 1) {
      const otherLayout = otherLayouts[layoutIndex];
      const otherPlacement = resolveGroovePlacementInRect({ rect: otherRect, layout: otherLayout });
      const otherLinesCount = resolveOtherGrooveLinesCount({
        App: args.App,
        partId: candidate.partId,
        layout: otherLayout,
        placement: otherPlacement,
      });
      if (
        !groovePlacementsHaveSameShape({
          currentPlacement: args.currentPlacement,
          currentLinesCount: args.currentLinesCount,
          otherPlacement,
          otherLinesCount,
        })
      )
        continue;
      mergeAlignment(
        alignment,
        comparePlacementAlignment({
          currentRect: args.currentRect,
          currentPlacement: toGroovePlacement(args.currentPlacement),
          currentOwner: args.currentOwner,
          currentHingeSide,
          otherRect,
          otherPlacement: toGroovePlacement(otherPlacement),
          otherOwner,
          otherHingeSide: candidate.hingeSide,
          scratch: args.scratch,
        })
      );
      if (alignment.hasVerticalAlignment && alignment.hasHorizontalAlignment) return alignment;
    }
  }

  if (candidates.length) return alignment;

  const currentLayout = readGrooveLayoutList(args.currentLayout)[0] || null;
  if (!currentLayout) return alignment;
  for (const [otherPartId, otherLayoutsRaw] of Object.entries(args.grooveLayoutMap)) {
    if (resolvePartIdHostKind(otherPartId) !== currentHostKind) continue;
    if (isSameDoorVisualHost(args.currentPartId, otherPartId)) continue;
    const otherLayouts = readGrooveLayoutList(otherLayoutsRaw);
    for (let layoutIndex = 0; layoutIndex < otherLayouts.length; layoutIndex += 1) {
      const otherLayout = otherLayouts[layoutIndex];
      const otherLinesCount = normalizeGrooveLinesCount(otherLayout.linesCount) ?? args.currentLinesCount;
      if (
        !fallbackGrooveShapeMatches({
          currentLayout,
          currentLinesCount: args.currentLinesCount,
          otherLayout,
          otherLinesCount,
        })
      )
        continue;
      const currentX = currentLayout.centerXNorm ?? 0.5;
      const currentY = currentLayout.centerYNorm ?? 0.5;
      const otherX = otherLayout.centerXNorm ?? 0.5;
      const otherY = otherLayout.centerYNorm ?? 0.5;
      if (isAlignedNorm(currentY, otherY)) alignment.hasVerticalAlignment = true;
      if (isAlignedNorm(currentX, otherX)) alignment.hasHorizontalAlignment = true;
      if (alignment.hasVerticalAlignment && alignment.hasHorizontalAlignment) return alignment;
    }
  }
  return alignment;
}

export function resolveDoorLayoutAlignmentGuideWidth(rect: LayoutRect): number {
  const width = Math.max(0.0001, rect.maxX - rect.minX);
  return Math.max(width, width * 3.15);
}
