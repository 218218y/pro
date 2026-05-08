import type { SavedColorLike, UnknownRecord } from '../../types/index.js';

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeSavedColor(value: unknown): SavedColorLike | string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  const rec = isRecord(value) ? value : null;
  if (!rec) return null;
  const id = typeof rec.id === 'string' ? rec.id.trim() : '';
  if (!id) return null;
  const next: SavedColorLike = { id };
  if (typeof rec.name === 'string' && rec.name.trim()) next.name = rec.name.trim();
  if (typeof rec.type === 'string' && rec.type) next.type = rec.type;
  if (typeof rec.value === 'string') next.value = rec.value;
  if (typeof rec.textureData !== 'undefined') next.textureData = rec.textureData;
  if (rec.locked === true) next.locked = true;
  return next;
}

export function normalizeSavedColorsList(value: unknown): Array<SavedColorLike | string> {
  if (!Array.isArray(value)) return [];
  const out: Array<SavedColorLike | string> = [];
  const seenObjectIds = new Set<string>();
  const seenStringIds = new Set<string>();
  for (const entry of value) {
    const next = normalizeSavedColor(entry);
    if (!next) continue;
    if (typeof next === 'string') {
      if (seenStringIds.has(next)) continue;
      seenStringIds.add(next);
      out.push(next);
      continue;
    }
    if (seenObjectIds.has(next.id)) continue;
    seenObjectIds.add(next.id);
    out.push(next);
  }
  return out;
}

export function normalizeColorSwatchesOrder(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    const next = entry == null ? '' : String(entry).trim();
    if (!next || seen.has(next)) continue;
    seen.add(next);
    out.push(next);
  }
  return out;
}
