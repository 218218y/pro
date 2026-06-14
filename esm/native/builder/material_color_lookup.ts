import { readDoorVisualMapEntry } from '../features/door_visual_map_lookup.js';
import { isIndividualShelfPartId, resolveShelfGroupPartId } from '../features/shelf_part_identity.js';
import type { IndividualColorsMap } from '../../../types/maps';
import type { PartStackKey } from './materials_apply_shared.js';

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
    const shelfGroupPartId = isIndividualShelfPartId(partId) ? resolveShelfGroupPartId(partId) : null;
    if (shelfGroupPartId && Object.prototype.hasOwnProperty.call(individualColors, shelfGroupPartId)) {
      return individualColors[shelfGroupPartId];
    }
    return undefined;
  }

  const colorEntry = readDoorVisualMapEntry(individualColors, partId);
  if (colorEntry) return colorEntry.value;

  const shelfGroupPartId = isIndividualShelfPartId(partId) ? resolveShelfGroupPartId(partId) : null;
  if (shelfGroupPartId && Object.prototype.hasOwnProperty.call(individualColors, shelfGroupPartId)) {
    return individualColors[shelfGroupPartId];
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
