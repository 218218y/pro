import type { DoorTrimEntry, DoorTrimMap, MapsByName } from '../../../types';

import { readCanonicalMirrorLayoutMap } from '../../shared/mirror_layout_contracts_shared.js';
import { isCanonicalDoorTrimTargetKey } from '../../shared/door_trim_key_contracts_shared.js';
import { normalizeDoorTrimEntryValueList } from '../../shared/door_trim_value_contracts_shared.js';
import { asRecord } from './maps_access_shared.js';
import { normalizeDoorStyleMap } from './maps_access_normalizers_shared.js';

export function normalizeMirrorLayoutMap(value: unknown): MapsByName['mirrorLayoutMap'] {
  return readCanonicalMirrorLayoutMap(value);
}

function normalizeDoorTrimList(value: unknown): DoorTrimEntry[] {
  return normalizeDoorTrimEntryValueList(value, { useStableIdWhenMissing: true });
}

export function normalizeDoorTrimMap(value: unknown): DoorTrimMap {
  const rec = asRecord(value);
  const out: DoorTrimMap = Object.create(null);
  if (!rec) return out;
  for (const key of Object.keys(rec)) {
    if (!isCanonicalDoorTrimTargetKey(key)) continue;
    const next = normalizeDoorTrimList(rec[key]);
    if (next.length) out[key] = next;
  }
  return out;
}

export { normalizeDoorStyleMap };
