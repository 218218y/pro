import type { GrooveLayoutEntry, UnknownRecord } from '../../../types';
import {
  buildDoorVisualLookupKeys,
  computeAutoGrooveLinesCount,
  normalizeGrooveLinesCount,
  readDoorVisualMapValue,
  readDoorVisualMirrorLayout,
  readGrooveLayoutList,
  readGrooveLayoutListForPart,
  readMirrorLayoutFaceSign,
  readMirrorLayoutList,
  resolveGroovePlacementInRect,
  resolveMirrorPlacementInRect,
} from './canvas_picking_door_edit_shared.js';
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

export type DoorLayoutAlignmentCapabilities = {
  readDoorEntries: () => readonly unknown[];
  readDrawerEntries: () => readonly unknown[];
  readGrooveLinesCountForPart: (partId: string) => number | null;
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

function collectDoorSceneCandidates(capabilities: DoorLayoutAlignmentCapabilities): DoorSceneCandidate[] {
  const out: DoorSceneCandidate[] = [];
  const seenGroups = new Set<DoorHitNode>();
  const pushEntries = (entries: readonly unknown[], defaultKind: DoorLayoutHostKind) => {
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
  pushEntries(capabilities.readDoorEntries(), 'door');
  pushEntries(capabilities.readDrawerEntries(), 'drawer');
  return out;
}

function isSameDoorVisualHost(a: string, b: string): boolean {
  if (!a || !b) return false;
  const aKeys = new Set(buildDoorVisualLookupKeys(a));
  const bKeys = buildDoorVisualLookupKeys(b);
  for (const key of bKeys) {
    if (aKeys.has(key)) return true;
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

function layoutDimensionMatches(args: {
  currentSizeCm: number | null | undefined;
  otherSizeCm: number | null | undefined;
  currentResolvedSizeM: number;
  otherResolvedSizeM: number;
}): boolean {
  const currentUsesFullSpan = args.currentSizeCm == null;
  const otherUsesFullSpan = args.otherSizeCm == null;
  if (currentUsesFullSpan || otherUsesFullSpan) return currentUsesFullSpan && otherUsesFullSpan;
  return isSameSizeM(args.currentResolvedSizeM, args.otherResolvedSizeM);
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
  forceVerticalAlignment?: boolean;
  forceHorizontalAlignment?: boolean;
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
    args.forceVerticalAlignment === true ||
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
    args.forceHorizontalAlignment === true ||
    (currentOpeningDistance != null && otherOpeningDistance != null
      ? isAlignedDistance(currentOpeningDistance, otherOpeningDistance)
      : isAlignedNorm(args.currentPlacement.centerXNorm, args.otherPlacement.centerXNorm));

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

function mirrorPlacementsHaveSameShape(args: {
  currentLayout: ReturnType<typeof readMirrorLayoutList>[number];
  currentPlacement: ReturnType<typeof resolveMirrorPlacementInRect>;
  otherLayout: ReturnType<typeof readMirrorLayoutList>[number];
  otherPlacement: ReturnType<typeof resolveMirrorPlacementInRect>;
}): boolean {
  return (
    layoutDimensionMatches({
      currentSizeCm: args.currentLayout.widthCm,
      otherSizeCm: args.otherLayout.widthCm,
      currentResolvedSizeM: args.currentPlacement.mirrorWidthM,
      otherResolvedSizeM: args.otherPlacement.mirrorWidthM,
    }) &&
    layoutDimensionMatches({
      currentSizeCm: args.currentLayout.heightCm,
      otherSizeCm: args.otherLayout.heightCm,
      currentResolvedSizeM: args.currentPlacement.mirrorHeightM,
      otherResolvedSizeM: args.otherPlacement.mirrorHeightM,
    }) &&
    args.currentPlacement.faceSign === args.otherPlacement.faceSign
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
  capabilities: DoorLayoutAlignmentCapabilities;
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
  const currentLayout = readMirrorLayoutList(args.currentLayout)[0] || null;
  if (!currentLayout) return alignment;
  const candidates = collectDoorSceneCandidates(args.capabilities);
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
  for (const candidate of candidates) {
    if (candidate.hostKind !== currentHostKind) continue;
    if (isSameDoorVisualHost(args.currentPartId, candidate.partId)) continue;
    if (readDoorVisualMapValue(args.doorSpecialMap, candidate.partId) !== args.paintSelection) continue;
    const otherLayouts = readDoorVisualMirrorLayout(args.mirrorLayoutMap, candidate.partId) || [];
    if (!otherLayouts.length) continue;
    const otherOwner = resolveCandidateMirrorOwner(candidate);
    const otherRect = readMirrorPlacementRectFromUserData(asRecord(otherOwner?.userData));
    if (!otherOwner || !otherRect) continue;
    for (const otherLayout of otherLayouts) {
      const otherPlacement = resolveMirrorPlacementInRect({
        rect: otherRect,
        layout: otherLayout,
      });
      if (
        !mirrorPlacementsHaveSameShape({
          currentLayout,
          currentPlacement: args.currentPlacement,
          otherLayout,
          otherPlacement,
        })
      )
        continue;
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
          forceVerticalAlignment: currentLayout.heightCm == null && otherLayout.heightCm == null,
          forceHorizontalAlignment: currentLayout.widthCm == null && otherLayout.widthCm == null,
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
    for (const otherLayout of otherLayouts) {
      if (!fallbackMirrorLayoutShapeMatches(args.currentLayout, otherLayout)) continue;
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

function grooveLineCountsMatchForLayout(args: {
  currentLayout: GrooveLayoutEntry;
  currentPlacement: ReturnType<typeof resolveGroovePlacementInRect>;
  currentLinesCount: number;
  otherLayout: GrooveLayoutEntry;
  otherPlacement: ReturnType<typeof resolveGroovePlacementInRect>;
  otherLinesCount: number;
}): boolean {
  if (args.currentLinesCount === args.otherLinesCount) return true;
  if (args.currentPlacement.orientation !== args.otherPlacement.orientation) return false;

  const orientation = args.currentPlacement.orientation;
  const currentDistributionUsesFullSpan =
    orientation === 'horizontal' ? args.currentLayout.heightCm == null : args.currentLayout.widthCm == null;
  const otherDistributionUsesFullSpan =
    orientation === 'horizontal' ? args.otherLayout.heightCm == null : args.otherLayout.widthCm == null;
  if (!currentDistributionUsesFullSpan || !otherDistributionUsesFullSpan) return false;

  const currentDistributionSpan =
    orientation === 'horizontal' ? args.currentPlacement.heightM : args.currentPlacement.widthM;
  const otherDistributionSpan =
    orientation === 'horizontal' ? args.otherPlacement.heightM : args.otherPlacement.widthM;
  return (
    args.currentLinesCount === computeAutoGrooveLinesCount(currentDistributionSpan) &&
    args.otherLinesCount === computeAutoGrooveLinesCount(otherDistributionSpan)
  );
}

function groovePlacementsHaveSameShape(args: {
  currentLayout: GrooveLayoutEntry;
  currentPlacement: ReturnType<typeof resolveGroovePlacementInRect>;
  currentLinesCount: number;
  otherLayout: GrooveLayoutEntry;
  otherPlacement: ReturnType<typeof resolveGroovePlacementInRect>;
  otherLinesCount: number;
}): boolean {
  return (
    layoutDimensionMatches({
      currentSizeCm: args.currentLayout.widthCm,
      otherSizeCm: args.otherLayout.widthCm,
      currentResolvedSizeM: args.currentPlacement.widthM,
      otherResolvedSizeM: args.otherPlacement.widthM,
    }) &&
    layoutDimensionMatches({
      currentSizeCm: args.currentLayout.heightCm,
      otherSizeCm: args.otherLayout.heightCm,
      currentResolvedSizeM: args.currentPlacement.heightM,
      otherResolvedSizeM: args.otherPlacement.heightM,
    }) &&
    args.currentPlacement.orientation === args.otherPlacement.orientation &&
    grooveLineCountsMatchForLayout(args)
  );
}

function resolveOtherGrooveLinesCount(args: {
  capabilities: DoorLayoutAlignmentCapabilities;
  partId: string;
  layout: GrooveLayoutEntry;
  placement: ReturnType<typeof resolveGroovePlacementInRect>;
}): number {
  const stored = normalizeGrooveLinesCount(args.layout.linesCount);
  if (stored != null) return stored;
  const partCount = args.capabilities.readGrooveLinesCountForPart(args.partId);
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
  capabilities: DoorLayoutAlignmentCapabilities;
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
  const candidates = collectDoorSceneCandidates(args.capabilities);
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
  for (const candidate of candidates) {
    if (candidate.hostKind !== currentHostKind) continue;
    if (isSameDoorVisualHost(args.currentPartId, candidate.partId)) continue;
    const otherLayouts =
      readGrooveLayoutListForPart({ map: args.grooveLayoutMap, partId: candidate.partId })?.layouts || [];
    if (!otherLayouts.length) continue;
    const otherOwner = resolveCandidateGrooveOwner(candidate);
    const otherRect = readGrooveSurfaceRectFromUserData(asRecord(otherOwner?.userData));
    if (!otherOwner || !otherRect) continue;
    for (const otherLayout of otherLayouts) {
      const otherPlacement = resolveGroovePlacementInRect({ rect: otherRect, layout: otherLayout });
      const otherLinesCount = resolveOtherGrooveLinesCount({
        capabilities: args.capabilities,
        partId: candidate.partId,
        layout: otherLayout,
        placement: otherPlacement,
      });
      if (
        !groovePlacementsHaveSameShape({
          currentLayout: args.currentLayout,
          currentPlacement: args.currentPlacement,
          currentLinesCount: args.currentLinesCount,
          otherLayout,
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
          forceVerticalAlignment: args.currentLayout.heightCm == null && otherLayout.heightCm == null,
          forceHorizontalAlignment: args.currentLayout.widthCm == null && otherLayout.widthCm == null,
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
    for (const otherLayout of otherLayouts) {
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
