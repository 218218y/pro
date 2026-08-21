import type { RemovedDoorsMap } from '../../../types/index.js';
import {
  canonicalRemovablePartKey,
  captureRemovedPartsMapSnapshot,
  frameSideToPartId,
  hasRemovedHingedDoorInMapRange,
  isCanvasRemovablePartId,
  isRemovedPartOnMap,
  normalizeCanonicalRemovedPartsMap,
  readSketchBoxRemovedSideShelfState,
  sketchBoxSideToPartId,
} from '../../shared/removable_parts_shared.js';

export type BuilderRemovedPartsSnapshot = Readonly<RemovedDoorsMap>;
export type BuilderRemovableFrameSide = 'left' | 'right';
export type BuilderRemovableFrameSidePartIdPrefix = '' | 'lower_';

export type BuilderRemovedHingedDoorRange = Readonly<{
  startDoorId: number;
  moduleDoors: number;
  frameSidePartIdPrefix: BuilderRemovableFrameSidePartIdPrefix;
}>;

export type BuilderRemovedPartsState = Readonly<{
  map: BuilderRemovedPartsSnapshot;
  isRemoved: (partId: unknown) => boolean;
  hasRemovedHingedDoorInRange: (range: BuilderRemovedHingedDoorRange) => boolean;
}>;

/**
 * Builder-local capability adapter for the canonical removable-parts domain.
 *
 * Native Builder owners consume this seam rather than rebuilding removed-map
 * lookup and inheritance rules. The shared domain remains the only authority.
 */
export function captureBuilderRemovedPartsState(value: unknown): BuilderRemovedPartsState {
  const map = captureRemovedPartsMapSnapshot(value);
  return Object.freeze({
    map,
    isRemoved(partId) {
      return isRemovedPartOnMap(map, partId);
    },
    hasRemovedHingedDoorInRange(range) {
      return hasRemovedHingedDoorInMapRange({
        removedPartsMap: map,
        startDoorId: range.startDoorId,
        moduleDoors: range.moduleDoors,
        frameSidePartIdPrefix: range.frameSidePartIdPrefix,
      });
    },
  });
}

export function normalizeBuilderRemovedPartsMap(value: unknown): RemovedDoorsMap {
  return normalizeCanonicalRemovedPartsMap(value);
}

export function builderFrameSidePartId(
  side: BuilderRemovableFrameSide,
  frameSidePartIdPrefix: BuilderRemovableFrameSidePartIdPrefix
): string {
  return frameSideToPartId(side, frameSidePartIdPrefix);
}

export function builderCanonicalRemovablePartKey(partId: unknown): string {
  return canonicalRemovablePartKey(partId);
}

export function isBuilderCanvasRemovablePartId(partId: unknown): boolean {
  return isCanvasRemovablePartId(partId);
}

export function readBuilderSketchBoxRemovedSideShelfState(cfg: unknown, boxPartId: unknown) {
  return readSketchBoxRemovedSideShelfState(cfg, boxPartId);
}

export function builderSketchBoxSideToPartId(boxPartId: unknown, side: BuilderRemovableFrameSide): string {
  return sketchBoxSideToPartId(boxPartId, side);
}
