function readRemovedDoorKey(value: unknown): string {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

export function hasRemovedDoorSegmentSuffix(value: string): boolean {
  return /_(?:full|top|bot|mid\d*)$/i.test(value);
}

export function isSegmentedRemovedDoorBaseId(value: string): boolean {
  return (
    /^(?:lower_)?d\d+$/.test(value) ||
    /^(?:lower_)?corner_door_\d+$/.test(value) ||
    /^(?:lower_)?corner_pent_door_\d+$/.test(value)
  );
}

export function toCanonicalRemovedDoorPartId(partId: unknown): string {
  const raw = readRemovedDoorKey(partId);
  if (!raw) return '';
  const clean = raw.startsWith('removed_') ? raw.slice('removed_'.length) : raw;
  if (!clean || clean.startsWith('removed_')) return '';
  if (hasRemovedDoorSegmentSuffix(clean)) return clean;
  return isSegmentedRemovedDoorBaseId(clean) ? `${clean}_full` : clean;
}

export function toCanonicalRemovedDoorsMapKey(partId: unknown): string {
  const canonicalPartId = toCanonicalRemovedDoorPartId(partId);
  return canonicalPartId ? `removed_${canonicalPartId}` : '';
}

export function toInheritedFullRemovedDoorsMapKey(partId: unknown): string {
  const canonicalPartId = toCanonicalRemovedDoorPartId(partId);
  if (!/_(?:top|bot|mid\d*)$/i.test(canonicalPartId)) return '';
  return `removed_${canonicalPartId.replace(/_(?:top|bot|mid\d*)$/i, '_full')}`;
}

export function isCanonicalRemovedDoorsMapKey(key: unknown): key is string {
  const raw = readRemovedDoorKey(key);
  return !!raw && raw.startsWith('removed_') && raw === toCanonicalRemovedDoorsMapKey(raw);
}

function uniqueNonEmpty(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

export function listCanonicalRemovedDoorLookupKeys(partId: unknown): string[] {
  return uniqueNonEmpty([toCanonicalRemovedDoorsMapKey(partId), toInheritedFullRemovedDoorsMapKey(partId)]);
}
