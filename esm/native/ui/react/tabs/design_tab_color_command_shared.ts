import { readSavedColorId, withoutLockedFlag } from './design_tab_shared.js';

import type { SavedColor } from './design_tab_multicolor_panel.js';
import type { DesignTabSwatchReorderPos } from './design_tab_shared.js';

export function trimDesignTabColorValue(value: unknown): string {
  return String(value || '').trim();
}

export function readTextureFileName(file: Blob | File): string | undefined {
  const name = 'name' in file ? file.name : undefined;
  const trimmed = typeof name === 'string' ? trimDesignTabColorValue(name) : '';
  return trimmed || undefined;
}

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(trimDesignTabColorValue(value));
}

export function normalizeDesignTabColorOrderIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    const next = trimDesignTabColorValue(entry);
    if (!next || seen.has(next)) continue;
    seen.add(next);
    out.push(next);
  }
  return out;
}

export function buildSavedColorOrder(orderedSwatches: SavedColor[]): string[] {
  return normalizeDesignTabColorOrderIds(orderedSwatches.map(color => readSavedColorId(color)));
}

export function reorderIds(
  ids: string[],
  dragId: string,
  overId: string | null,
  pos: DesignTabSwatchReorderPos
): string[] | null {
  const sourceId = trimDesignTabColorValue(dragId);
  if (!sourceId) return null;

  const from = ids.indexOf(sourceId);
  if (from < 0) return null;

  let to = ids.length;
  if (overId) {
    const targetId = trimDesignTabColorValue(overId);
    const overIndex = ids.indexOf(targetId);
    if (overIndex >= 0) to = overIndex + (pos === 'after' ? 1 : 0);
  }
  if (pos === 'end') to = ids.length;

  let newIndex = to;
  if (newIndex > from) newIndex -= 1;
  if (newIndex < 0) newIndex = 0;
  if (newIndex > ids.length - 1) newIndex = ids.length - 1;
  if (newIndex === from) return null;

  const nextIds = ids.slice();
  const moved = nextIds.splice(from, 1)[0];
  if (!moved) return null;
  nextIds.splice(newIndex, 0, moved);
  return nextIds;
}

export function reorderSavedColors(savedColors: SavedColor[], nextIds: string[]): SavedColor[] {
  const savedMap = new Map<string, SavedColor>();
  for (const color of savedColors) savedMap.set(readSavedColorId(color), color);

  const nextSaved: SavedColor[] = [];
  const usedSaved = new Set<string>();
  for (const id of normalizeDesignTabColorOrderIds(nextIds)) {
    if (usedSaved.has(id)) continue;
    const value = savedMap.get(id);
    if (!value) continue;
    nextSaved.push(value);
    usedSaved.add(id);
  }

  for (const color of savedColors) {
    const id = readSavedColorId(color);
    if (!id || usedSaved.has(id)) continue;
    nextSaved.push(color);
    usedSaved.add(id);
  }
  return nextSaved;
}

export function findSavedColor(savedColors: SavedColor[], id: string): SavedColor | null {
  const targetId = trimDesignTabColorValue(id);
  if (!targetId) return null;
  return savedColors.find(color => trimDesignTabColorValue(color.id) === targetId) || null;
}

export function nextDefaultColorName(savedColors: SavedColor[], hasTexture: boolean): string {
  const base = hasTexture ? 'טקסטורה שלי ' : 'הגוון שלי ';
  return base + String(savedColors.length + 1);
}

export function nextSavedColorId(idFactory?: (() => string) | null): string {
  const raw = typeof idFactory === 'function' ? trimDesignTabColorValue(idFactory()) : '';
  if (raw) return raw.indexOf('saved_') === 0 ? raw : `saved_${raw}`;
  return `saved_${Date.now()}`;
}

export function toggleLockedSavedColor(savedColors: SavedColor[], targetId: string): SavedColor[] {
  return savedColors.map(color => {
    if (trimDesignTabColorValue(color.id) !== targetId) return color;
    return color.locked ? withoutLockedFlag(color) : Object.assign({}, color, { locked: true });
  });
}
