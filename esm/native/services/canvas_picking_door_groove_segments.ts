import type { AppContainer, UnknownRecord } from '../../../types';

import { asRecord } from '../runtime/record.js';
import { getDoorsArray } from '../runtime/render_access.js';
import {
  buildDoorVisualLookupKeys,
  hasAnyDoorVisualSegmentMapEntry,
  isDoorVisualSegmentPartId,
  readDoorVisualPrefixedMapEntry,
  readDoorVisualPrefixedOwnMapEntry,
  readDoorVisualSegmentBasePartId,
  stripDoorVisualSurfaceSuffix,
} from '../features/door_visual_map_lookup.js';

const GROOVE_PREFIX = 'groove_';

function readOwnMapValue(map: Record<string, unknown> | null | undefined, key: string): unknown {
  if (!map || !key || !Object.prototype.hasOwnProperty.call(map, key)) return undefined;
  return map[key];
}

function readGrooveBooleanValue(value: unknown): boolean {
  return value === true;
}

function readNodePartId(node: unknown): string {
  const record = asRecord<UnknownRecord>(node);
  const userData = asRecord<UnknownRecord>(record?.userData);
  return typeof userData?.partId === 'string'
    ? stripDoorVisualSurfaceSuffix(String(userData.partId || ''))
    : '';
}

function readNodeChildren(node: unknown): unknown[] {
  const record = asRecord<UnknownRecord>(node);
  return Array.isArray(record?.children) ? record.children : [];
}

export function readDoorGrooveBasePartId(partId: string): string {
  return readDoorVisualSegmentBasePartId(partId);
}

export function isDoorGrooveSegmentPartId(partId: string): boolean {
  return isDoorVisualSegmentPartId(partId);
}

export function readDoorGrooveFullPartId(partId: string): string {
  const basePartId = readDoorGrooveBasePartId(partId);
  return basePartId ? `${basePartId}_full` : '';
}

export function readDoorGrooveMapFlag(
  map: Record<string, unknown> | null | undefined,
  partId: string
): boolean | null {
  const entry = readDoorVisualPrefixedOwnMapEntry({ map, partId, prefix: GROOVE_PREFIX });
  return entry ? readGrooveBooleanValue(entry.value) : null;
}

export function readDoorGrooveVisualMapFlag(
  map: Record<string, unknown> | null | undefined,
  partId: string
): boolean | null {
  const entry = readDoorVisualPrefixedMapEntry({ map, partId, prefix: GROOVE_PREFIX });
  return entry ? readGrooveBooleanValue(entry.value) : null;
}

export function hasAnyDoorGrooveSegmentMapEntry(
  map: Record<string, unknown> | null | undefined,
  basePartId: string
): boolean {
  return hasAnyDoorVisualSegmentMapEntry({ map, basePartId, prefix: GROOVE_PREFIX });
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
  const key = stripDoorVisualSurfaceSuffix(String(partId || ''));
  if (!map || !key) return null;
  const keys = buildDoorVisualLookupKeys(key);
  for (let index = 0; index < keys.length; index += 1) {
    const candidateKey = keys[index];
    const raw = readOwnMapValue(map, candidateKey);
    const value = raw === undefined ? readOwnMapValue(map, `${GROOVE_PREFIX}${candidateKey}`) : raw;
    if (value == null || value === '') continue;
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return null;
}
