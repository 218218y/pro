import type {
  ProjectDataLike,
  ProjectSettingsLike,
  ProjectTogglesLike,
  UnknownRecord,
} from '../../../types/index.js';

import { asObject, asObjectRecord } from './project_payload_shared.js';

export type EnsureSettingsRecordFn = (data: ProjectDataLike) => ProjectSettingsLike & UnknownRecord;

export type EnsureTogglesRecordFn = (data: ProjectDataLike) => ProjectTogglesLike & UnknownRecord;

export function ensureMapRecord(value: unknown): UnknownRecord {
  return asObjectRecord(value) ?? {};
}

export function isSegmentedDoorBaseId(partId: string): boolean {
  return (
    /^(?:lower_)?d\d+$/.test(partId) ||
    /^(?:lower_)?corner_door_\d+$/.test(partId) ||
    /^(?:lower_)?corner_pent_door_\d+$/.test(partId)
  );
}

export function canonicalSegmentedDoorKey(partId: string): string {
  if (!partId) return '';
  if (/(?:_(?:full|top|bot|mid))$/i.test(partId)) return partId;
  return isSegmentedDoorBaseId(partId) ? partId + '_full' : partId;
}

export function migrateBaseKeysToFull(map: UnknownRecord): void {
  const hasOwn = Object.prototype.hasOwnProperty;
  for (const key in map) {
    if (!hasOwn.call(map, key)) continue;
    const value = map[key];
    if (value == null) continue;
    if (/(?:_(?:full|top|bot|mid))$/i.test(key)) continue;
    if (!isSegmentedDoorBaseId(key)) continue;
    const fullKey = key + '_full';
    if (!hasOwn.call(map, fullKey)) map[fullKey] = value;
    try {
      delete map[key];
    } catch {
      map[key] = undefined;
    }
  }
}

export function readCornerConfigurationRecord(data: ProjectDataLike): UnknownRecord | null {
  return asObjectRecord(asObject(data.cornerConfiguration));
}
