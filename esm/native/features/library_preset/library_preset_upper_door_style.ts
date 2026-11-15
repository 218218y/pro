import type { DoorStyleMap } from '../../../../types';

import { readDoorStyleMap, type DoorStyleOverrideValue } from '../door_authoring/api.js';
import { normDoorCount } from './library_preset_shared.js';

/**
 * Upper library doors own an explicit profile frame, independently of the
 * global door style. A global profile selection restyles every upper segment;
 * a post selection changes the lower doors only. This is a pure projection of
 * the persisted map; the design controller commits it through the config owner.
 */
export function buildLibraryUpperDoorStyleMap(
  currentMap: unknown,
  topDoors: unknown,
  wardrobeType: 'hinged' | 'sliding',
  style: DoorStyleOverrideValue
): DoorStyleMap | null {
  if (style === 'flat') return null;
  const requestedDoors = Number(topDoors);
  if (!Number.isInteger(requestedDoors) || requestedDoors < 1) {
    throw new Error('[WardrobePro] Library door style requires a valid upper-door count.');
  }
  const upperCount = normDoorCount(requestedDoors, wardrobeType);
  const current = readDoorStyleMap(currentMap);
  let changed = false;

  // Project every existing segment, including explicit per-segment overrides.
  // Unrelated lower doors, drawers, and other identities remain untouched.
  const entries: Array<[string, DoorStyleMap[string]]> = Object.entries(current).map(([key, value]) => {
    // DoorStyleMap has already been normalized by the door-authoring owner.
    // Match its supported upper-door keys without introducing another
    // Features -> Shared dependency for a general visual identity reader.
    const match =
      /^d([1-9]\d*)(?:_(?:full|top|bot|mid\d*))?(?:_(?:accent|groove)_(?:top|bottom|left|right))?$/i.exec(
        key
      );
    const isUpper = match !== null && Number(match[1]) <= upperCount;
    const nextValue = isUpper ? style : value;
    if (nextValue !== value) changed = true;
    return [key, nextValue];
  });

  // A full-door owner must exist even when the old map was sparse.
  for (let door = 1; door <= upperCount; door += 1) {
    const key = `d${door}_full`;
    if (Object.prototype.hasOwnProperty.call(current, key)) continue;
    entries.push([key, style]);
    changed = true;
  }
  return changed ? Object.fromEntries(entries) : null;
}
