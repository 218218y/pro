import { readMapKey, uniqueNonEmptyKeys } from './domain_api_surface_sections_prefixed_maps.js';

export function isSegmentedDoorBaseId(partId: string): boolean {
  return (
    /^(?:lower_)?d\d+$/.test(partId) ||
    /^(?:lower_)?corner_door_\d+$/.test(partId) ||
    /^(?:lower_)?corner_pent_door_\d+$/.test(partId)
  );
}

export function canonicalRemovedDoorPartId(partId: unknown): string {
  const raw = readMapKey(partId);
  if (!raw) return '';
  const clean = raw.indexOf('removed_') === 0 ? raw.slice(8) : raw;
  if (!clean) return '';
  if (/(?:_(?:full|top|bot|mid))$/i.test(clean)) return clean;
  return isSegmentedDoorBaseId(clean) ? clean + '_full' : clean;
}

export function listRemovedDoorLookupKeys(partId: unknown): string[] {
  const raw = readMapKey(partId);
  if (!raw) return [];
  const clean = raw.indexOf('removed_') === 0 ? raw.slice(8) : raw;
  const canonical = canonicalRemovedDoorPartId(clean);
  const fullInherited = /_(?:top|bot|mid)$/i.test(canonical)
    ? canonical.replace(/_(top|bot|mid)$/i, '_full')
    : '';
  return uniqueNonEmptyKeys([
    raw,
    clean,
    clean ? 'removed_' + clean : '',
    canonical,
    canonical ? 'removed_' + canonical : '',
    fullInherited,
    fullInherited ? 'removed_' + fullInherited : '',
  ]);
}

export function listRemovedDoorCleanupKeys(partId: unknown): string[] {
  const raw = readMapKey(partId);
  if (!raw) return [];
  const clean = raw.indexOf('removed_') === 0 ? raw.slice(8) : raw;
  const canonical = canonicalRemovedDoorPartId(clean);
  return uniqueNonEmptyKeys([clean, raw, clean ? 'removed_' + clean : '']).filter(
    key => key !== canonical && key !== (canonical ? 'removed_' + canonical : '')
  );
}
