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
}): unknown {
  const { individualColors, isMulti, partId, stackKey } = args;
  if (!partId || !isMulti || !individualColors) return undefined;

  const scopedPartId = scopeCornerPartKeyForStack(partId, stackKey);
  if (scopedPartId !== partId) {
    const scopedColorEntry = readDoorVisualMapEntry(individualColors, scopedPartId);
    if (scopedColorEntry) return scopedColorEntry.value;
    if (Object.prototype.hasOwnProperty.call(individualColors, scopedPartId)) {
      return individualColors[scopedPartId];
    }
    const scopedCornerShellGroupPartId = resolveCornerWingShellMaterialGroupPartId(scopedPartId);
    const scopedCornerShellGroupValue = scopedCornerShellGroupPartId
      ? readOwnMapValue(individualColors, scopedCornerShellGroupPartId)
      : undefined;
    if (typeof scopedCornerShellGroupValue !== 'undefined') return scopedCornerShellGroupValue;
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
