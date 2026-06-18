import { readDoorVisualMapEntry } from '../features/door_visual_map_lookup.js';
import { isIndividualShelfPartId, resolveShelfGroupPartId } from '../features/shelf_part_identity.js';
import type { IndividualColorsMap } from '../../../types/maps';
import type { PartStackKey } from './materials_apply_shared.js';

function unscopedLowerPartId(partId: string): { partId: string; wasLowerScoped: boolean } {
  if (partId.startsWith('lower_')) return { partId: partId.slice('lower_'.length), wasLowerScoped: true };
  return { partId, wasLowerScoped: false };
}

function restoreLowerScope(partId: string, wasLowerScoped: boolean): string {
  return wasLowerScoped ? `lower_${partId}` : partId;
}

function isCornerWingCeilingPartId(partId: string): boolean {
  return partId === 'corner_ceil' || partId === 'corner_wing_ceil' || /^corner_cell_top_c\d+$/.test(partId);
}

function isCornerWingFloorPartId(partId: string): boolean {
  return partId === 'corner_floor' || partId === 'corner_floor_blind' || /^corner_floor_c\d+$/.test(partId);
}

function isCornerWingSidePartId(partId: string): boolean {
  return partId === 'corner_wing_side_left' || partId === 'corner_wing_side_right';
}

function isCornerPentagonAttachPartId(partId: string): boolean {
  return partId === 'corner_pent_attach_main' || partId === 'corner_pent_attach_wing';
}

function resolveCornerWingShellMaterialGroupPartId(partId: string): string | null {
  const scoped = unscopedLowerPartId(partId);
  const basePartId = scoped.partId;
  let groupPartId: string | null = null;

  if (basePartId === 'corner_wing_ceil' || /^corner_cell_top_c\d+$/.test(basePartId)) {
    groupPartId = 'corner_ceil';
  } else if (basePartId === 'corner_floor_blind' || /^corner_floor_c\d+$/.test(basePartId)) {
    groupPartId = 'corner_floor';
  } else if (basePartId === 'corner_plinth_blind' || /^corner_plinth_c\d+$/.test(basePartId)) {
    groupPartId = 'corner_plinth';
  }

  return groupPartId ? restoreLowerScope(groupPartId, scoped.wasLowerScoped) : null;
}

function readOwnMapValue(map: IndividualColorsMap, partId: string): unknown {
  return Object.prototype.hasOwnProperty.call(map, partId) ? map[partId] : undefined;
}

function readUniformLegacyUnifiedColor(
  map: IndividualColorsMap,
  requiredKeys: string[],
  absentKeys: string[]
): unknown {
  for (let i = 0; i < absentKeys.length; i += 1) {
    if (typeof readOwnMapValue(map, absentKeys[i]) !== 'undefined') return undefined;
  }
  let color: unknown;
  for (let i = 0; i < requiredKeys.length; i += 1) {
    const value = readOwnMapValue(map, requiredKeys[i]);
    if (typeof value !== 'string' || !value) return undefined;
    if (i === 0) color = value;
    else if (value !== color) return undefined;
  }
  return color;
}

function readLegacyUnifiedCornerWingColor(map: IndividualColorsMap): unknown {
  return readUniformLegacyUnifiedColor(
    map,
    [
      'corner_ceil',
      'corner_wing_side_left',
      'corner_wing_side_right',
      'lower_corner_wing_side_left',
      'lower_corner_wing_side_right',
      'lower_corner_floor',
    ],
    ['corner_floor', 'lower_corner_ceil']
  );
}

function readLegacyUnifiedCornerPentagonColor(map: IndividualColorsMap): unknown {
  return readUniformLegacyUnifiedColor(
    map,
    [
      'corner_pent_ceil',
      'corner_pent_attach_main',
      'corner_pent_attach_wing',
      'lower_corner_pent_attach_main',
      'lower_corner_pent_attach_wing',
      'lower_corner_pent_floor',
    ],
    ['corner_pent_floor', 'lower_corner_pent_ceil']
  );
}

function readUnifiedCornerBaseKeyForLowerOuterBoard(partId: string): string | null {
  const basePartId = unscopedLowerPartId(partId).partId;
  if (isCornerWingSidePartId(basePartId)) return basePartId;
  if (isCornerWingFloorPartId(basePartId)) return 'corner_floor';
  if (isCornerPentagonAttachPartId(basePartId)) return basePartId;
  if (basePartId === 'corner_pent_floor') return 'corner_pent_floor';
  return null;
}

function shouldSuppressUnifiedTopMiddleBoard(
  partId: string,
  stackKey: PartStackKey,
  unifiedFrame: boolean
): boolean {
  if (!unifiedFrame || stackKey !== 'top') return false;
  const basePartId = unscopedLowerPartId(partId).partId;
  return isCornerWingFloorPartId(basePartId) || basePartId === 'corner_pent_floor';
}

function shouldIgnoreScopedCornerUnifiedFrameValue(args: {
  individualColors: IndividualColorsMap;
  partId: string;
  scopedPartId: string;
  stackKey: PartStackKey;
  unifiedFrame: boolean;
}): boolean {
  const { individualColors, partId, scopedPartId, stackKey, unifiedFrame } = args;
  if (!scopedPartId.startsWith('lower_corner_')) return false;
  const basePartId = unscopedLowerPartId(partId).partId;

  // A live unified frame deliberately stores only canonical upper-frame keys.
  // Bottom outer boards inherit those keys while the frame is unified; exact
  // lower_* entries are either old snapshots or unrelated to the active frame.
  if (unifiedFrame && stackKey === 'bottom' && readUnifiedCornerBaseKeyForLowerOuterBoard(basePartId)) {
    return true;
  }

  // Migration guard for snapshots produced by the earlier unified-frame paint bug.
  // The old map shape colored the lower sides/floor but did not contain the upper
  // frame floor / lower ceiling pair that a genuine split-frame paint would create.
  if (!unifiedFrame && stackKey === 'bottom') {
    const wingColor = readLegacyUnifiedCornerWingColor(individualColors);
    if (
      typeof wingColor !== 'undefined' &&
      (isCornerWingSidePartId(basePartId) || isCornerWingFloorPartId(basePartId))
    ) {
      return true;
    }
    const pentagonColor = readLegacyUnifiedCornerPentagonColor(individualColors);
    if (
      typeof pentagonColor !== 'undefined' &&
      (isCornerPentagonAttachPartId(basePartId) || basePartId === 'corner_pent_floor')
    ) {
      return true;
    }
  }

  return false;
}

export function scopeCornerPartKeyForStack(partId: string, stackKey: PartStackKey): string {
  if (!partId || stackKey !== 'bottom') return partId;
  if (partId.startsWith('lower_')) return partId;
  if (partId.startsWith('sliding') || partId.startsWith('slide')) return `lower_${partId}`;
  if (partId.startsWith('corner_')) return `lower_${partId}`;
  return partId;
}

export function readPartColorEntry(args: {
  individualColors: IndividualColorsMap | null | undefined;
  isMulti: boolean;
  partId: string;
  stackKey: PartStackKey;
  stackSplitUnifiedFrame?: boolean;
}): unknown {
  const { individualColors, isMulti, partId, stackKey } = args;
  const unifiedFrame = !!args.stackSplitUnifiedFrame;
  if (!partId || !isMulti || !individualColors) return undefined;
  if (shouldSuppressUnifiedTopMiddleBoard(partId, stackKey, unifiedFrame)) return undefined;

  const legacyWingColor = readLegacyUnifiedCornerWingColor(individualColors);
  const legacyPentagonColor = readLegacyUnifiedCornerPentagonColor(individualColors);

  const scopedPartId = scopeCornerPartKeyForStack(partId, stackKey);
  if (scopedPartId !== partId) {
    const ignoreScopedValue = shouldIgnoreScopedCornerUnifiedFrameValue({
      individualColors,
      partId,
      scopedPartId,
      stackKey,
      unifiedFrame,
    });
    const scopedColorEntry = ignoreScopedValue
      ? null
      : readDoorVisualMapEntry(individualColors, scopedPartId);
    if (scopedColorEntry) return scopedColorEntry.value;
    if (!ignoreScopedValue && Object.prototype.hasOwnProperty.call(individualColors, scopedPartId)) {
      return individualColors[scopedPartId];
    }
    const scopedCornerShellGroupPartId = resolveCornerWingShellMaterialGroupPartId(scopedPartId);
    const scopedCornerShellGroupValue =
      !ignoreScopedValue && scopedCornerShellGroupPartId
        ? readOwnMapValue(individualColors, scopedCornerShellGroupPartId)
        : undefined;
    if (typeof scopedCornerShellGroupValue !== 'undefined') return scopedCornerShellGroupValue;

    const unifiedBaseKey = unifiedFrame ? readUnifiedCornerBaseKeyForLowerOuterBoard(partId) : null;
    if (unifiedBaseKey) {
      const unifiedBaseValue = readOwnMapValue(individualColors, unifiedBaseKey);
      if (typeof unifiedBaseValue !== 'undefined') return unifiedBaseValue;
      const basePartId = unscopedLowerPartId(partId).partId;
      if (typeof legacyWingColor !== 'undefined' && isCornerWingFloorPartId(basePartId))
        return legacyWingColor;
      if (typeof legacyPentagonColor !== 'undefined' && basePartId === 'corner_pent_floor') {
        return legacyPentagonColor;
      }
    }

    const shelfGroupPartId = isIndividualShelfPartId(partId) ? resolveShelfGroupPartId(partId) : null;
    if (shelfGroupPartId) {
      const shelfGroupValue = readOwnMapValue(individualColors, shelfGroupPartId);
      if (typeof shelfGroupValue !== 'undefined') return shelfGroupValue;
    }
    return undefined;
  }

  const colorEntry = readDoorVisualMapEntry(individualColors, partId);
  if (colorEntry) return colorEntry.value;

  const shelfGroupPartId = isIndividualShelfPartId(partId) ? resolveShelfGroupPartId(partId) : null;
  if (shelfGroupPartId) {
    const shelfGroupValue = readOwnMapValue(individualColors, shelfGroupPartId);
    if (typeof shelfGroupValue !== 'undefined') return shelfGroupValue;
  }

  const cornerShellGroupPartId = resolveCornerWingShellMaterialGroupPartId(partId);
  const cornerShellGroupValue = cornerShellGroupPartId
    ? readOwnMapValue(individualColors, cornerShellGroupPartId)
    : undefined;
  if (typeof cornerShellGroupValue !== 'undefined') return cornerShellGroupValue;

  if (stackKey === 'top') {
    const basePartId = unscopedLowerPartId(partId).partId;
    if (typeof legacyWingColor !== 'undefined' && isCornerWingFloorPartId(basePartId)) return legacyWingColor;
    if (typeof legacyPentagonColor !== 'undefined' && basePartId === 'corner_pent_floor')
      return legacyPentagonColor;
  }

  if (
    partId === 'cornice_wave_front' ||
    partId === 'cornice_wave_side_left' ||
    partId === 'cornice_wave_side_right'
  ) {
    return Object.prototype.hasOwnProperty.call(individualColors, 'cornice_color')
      ? individualColors.cornice_color
      : undefined;
  }

  if (
    partId === 'corner_cornice_front' ||
    partId === 'corner_cornice_side_left' ||
    partId === 'corner_cornice_side_right' ||
    partId === 'lower_corner_cornice_front' ||
    partId === 'lower_corner_cornice_side_left' ||
    partId === 'lower_corner_cornice_side_right'
  ) {
    const groupKey = partId.startsWith('lower_') ? 'lower_corner_cornice' : 'corner_cornice';
    return Object.prototype.hasOwnProperty.call(individualColors, groupKey)
      ? individualColors[groupKey]
      : undefined;
  }

  return undefined;
}
