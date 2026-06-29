import {
  isSegmentedRemovedDoorBaseId,
  listCanonicalRemovedDoorLookupKeys,
  toCanonicalRemovedDoorPartId,
} from '../../shared/removed_doors_map_keys_shared.js';

export function isSegmentedDoorBaseId(partId: string): boolean {
  return isSegmentedRemovedDoorBaseId(partId);
}

export function canonicalRemovedDoorPartId(partId: unknown): string {
  return toCanonicalRemovedDoorPartId(partId);
}

export function listRemovedDoorLookupKeys(partId: unknown): string[] {
  return listCanonicalRemovedDoorLookupKeys(partId);
}
