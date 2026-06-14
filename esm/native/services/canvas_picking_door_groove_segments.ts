import type { AppContainer, UnknownRecord } from '../../../types';

import { asRecord } from '../runtime/record.js';
import { getDoorsArray } from '../runtime/render_access.js';

const SEGMENTED_DOOR_ANY_SUFFIX_RE = /_(?:full|top|bot|mid\d*)$/i;
const SEGMENTED_DOOR_PART_SUFFIX_RE = /_(?:top|bot|mid\d*)$/i;
const GROOVE_PREFIX = 'groove_';

function readOwnMapValue(map: Record<string, unknown> | null | undefined, key: string): unknown {
  if (!map || !key || !Object.prototype.hasOwnProperty.call(map, key)) return undefined;
  return map[key];
}

function readGrooveBooleanValue(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function readNodePartId(node: unknown): string {
  const record = asRecord<UnknownRecord>(node);
  const userData = asRecord<UnknownRecord>(record?.userData);
  return typeof userData?.partId === 'string' ? String(userData.partId || '') : '';
}

function readNodeChildren(node: unknown): unknown[] {
  const record = asRecord<UnknownRecord>(node);
  return Array.isArray(record?.children) ? record.children : [];
}

export function readDoorGrooveBasePartId(partId: string): string {
  return String(partId || '').replace(SEGMENTED_DOOR_ANY_SUFFIX_RE, '');
}

export function isDoorGrooveSegmentPartId(partId: string): boolean {
  return SEGMENTED_DOOR_PART_SUFFIX_RE.test(String(partId || ''));
}

export function readDoorGrooveFullPartId(partId: string): string {
  const basePartId = readDoorGrooveBasePartId(partId);
  return basePartId ? `${basePartId}_full` : '';
}

export function readDoorGrooveMapFlag(
  map: Record<string, unknown> | null | undefined,
  partId: string
): boolean | null {
  const key = String(partId || '');
  if (!map || !key) return null;

  const canonicalValue = readOwnMapValue(map, `${GROOVE_PREFIX}${key}`);
  if (canonicalValue !== undefined) return readGrooveBooleanValue(canonicalValue);

  const aliasValue = readOwnMapValue(map, key);
  if (aliasValue !== undefined) return readGrooveBooleanValue(aliasValue);

  return null;
}

export function hasAnyDoorGrooveSegmentMapEntry(
  map: Record<string, unknown> | null | undefined,
  basePartId: string
): boolean {
  if (!map || !basePartId) return false;
  const prefixed = `${GROOVE_PREFIX}${basePartId}_`;
  const raw = `${basePartId}_`;
  const keys = Object.keys(map);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (!key || map[key] == null) continue;
    const segmentPartId = key.startsWith(prefixed)
      ? key.slice(GROOVE_PREFIX.length)
      : key.startsWith(raw)
        ? key
        : '';
    if (segmentPartId && isDoorGrooveSegmentPartId(segmentPartId)) return true;
  }
  return false;
}

function collectDoorGrooveSegmentPartIdsFromNode(args: {
  node: unknown;
  basePartId: string;
  out: Set<string>;
}): void {
  const { node, basePartId, out } = args;
  if (!basePartId) return;
  const partId = readNodePartId(node);
  if (partId && partId.startsWith(`${basePartId}_`) && isDoorGrooveSegmentPartId(partId)) {
    out.add(partId);
  }

  const children = readNodeChildren(node);
  for (let index = 0; index < children.length; index += 1) {
    collectDoorGrooveSegmentPartIdsFromNode({ node: children[index], basePartId, out });
  }
}

export function readDoorGrooveSiblingSegmentPartIds(args: {
  App: AppContainer;
  basePartId: string;
  clickedPartId: string;
}): string[] {
  const { App, basePartId, clickedPartId } = args;
  const out = new Set<string>();
  try {
    const doorsArray = getDoorsArray(App);
    for (let index = 0; index < doorsArray.length; index += 1) {
      collectDoorGrooveSegmentPartIdsFromNode({
        node: doorsArray[index]?.group,
        basePartId,
        out,
      });
    }
  } catch {
    // Best effort: click policy can still fall back to the common two-piece split identity.
  }

  if (!out.size && basePartId) {
    out.add(`${basePartId}_bot`);
    out.add(`${basePartId}_top`);
  }
  if (clickedPartId) out.add(clickedPartId);
  return Array.from(out).sort();
}

export function readDoorGrooveLinesCountForPart(
  map: Record<string, unknown> | null | undefined,
  partId: string
): number | null {
  const key = String(partId || '');
  if (!map || !key) return null;
  const raw = readOwnMapValue(map, key);
  const prefixed = raw === undefined ? readOwnMapValue(map, `${GROOVE_PREFIX}${key}`) : raw;
  if (prefixed == null || prefixed === '') return null;
  const n = Number(prefixed);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}
