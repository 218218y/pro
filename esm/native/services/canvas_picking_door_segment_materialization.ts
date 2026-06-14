import type { AppContainer, UnknownRecord } from '../../../types';

import { asRecord } from '../runtime/record.js';
import { getDoorsArray } from '../runtime/render_access.js';

const SEGMENTED_DOOR_ANY_SUFFIX_RE = /_(?:full|top|bot|mid\d*)$/i;
const SEGMENTED_DOOR_PART_SUFFIX_RE = /_(?:top|bot|mid\d*)$/i;
const DOOR_VISUAL_SURFACE_SUFFIX_RE = /_(?:accent|groove)_(?:top|bottom|left|right)$/i;

function readOwnMapValue(map: Record<string, unknown> | null | undefined, key: string): unknown {
  if (!map || !key || !Object.prototype.hasOwnProperty.call(map, key)) return undefined;
  return map[key];
}

function hasOwnMapKey(map: Record<string, unknown> | null | undefined, key: string): boolean {
  return !!map && !!key && Object.prototype.hasOwnProperty.call(map, key);
}

function cloneDoorVisualValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => {
      if (item && typeof item === 'object' && !Array.isArray(item))
        return { ...(item as Record<string, unknown>) };
      return item;
    });
  }
  if (value && typeof value === 'object') return { ...(value as Record<string, unknown>) };
  return value;
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

function collectDoorVisualSegmentPartIdsFromNode(args: {
  node: unknown;
  basePartId: string;
  out: Set<string>;
}): void {
  const { node, basePartId, out } = args;
  if (!basePartId) return;
  const partId = readNodePartId(node);
  if (partId && partId.startsWith(`${basePartId}_`) && isDoorVisualSegmentPartId(partId)) {
    out.add(partId);
  }

  const children = readNodeChildren(node);
  for (let index = 0; index < children.length; index += 1) {
    collectDoorVisualSegmentPartIdsFromNode({ node: children[index], basePartId, out });
  }
}

export function stripDoorVisualSurfaceSuffix(partId: string): string {
  return String(partId || '').replace(DOOR_VISUAL_SURFACE_SUFFIX_RE, '');
}

export function readDoorVisualSegmentBasePartId(partId: string): string {
  return stripDoorVisualSurfaceSuffix(String(partId || '')).replace(SEGMENTED_DOOR_ANY_SUFFIX_RE, '');
}

export function isDoorVisualSegmentPartId(partId: string): boolean {
  return SEGMENTED_DOOR_PART_SUFFIX_RE.test(stripDoorVisualSurfaceSuffix(String(partId || '')));
}

export function readDoorVisualFullPartId(partId: string): string {
  const basePartId = readDoorVisualSegmentBasePartId(partId);
  return basePartId ? `${basePartId}_full` : '';
}

export function readDoorVisualSiblingSegmentPartIds(args: {
  App: AppContainer;
  basePartId: string;
  clickedPartId: string;
}): string[] {
  const { App, basePartId, clickedPartId } = args;
  const out = new Set<string>();
  try {
    const doorsArray = getDoorsArray(App);
    for (let index = 0; index < doorsArray.length; index += 1) {
      collectDoorVisualSegmentPartIdsFromNode({
        node: doorsArray[index]?.group,
        basePartId,
        out,
      });
    }
  } catch {
    // Partial runtimes/tests may not expose the rendered door tree; fall back to the common two-piece split.
  }

  if (!out.size && basePartId) {
    out.add(`${basePartId}_bot`);
    out.add(`${basePartId}_top`);
  }
  if (clickedPartId) out.add(clickedPartId);
  return Array.from(out).sort();
}

export function isDoorVisualInheritedOwner(args: {
  targetPartId: string;
  ownerPartId: string | null | undefined;
}): boolean {
  const targetPartId = stripDoorVisualSurfaceSuffix(String(args.targetPartId || ''));
  const ownerPartId = stripDoorVisualSurfaceSuffix(String(args.ownerPartId || ''));
  if (!targetPartId || !ownerPartId || !isDoorVisualSegmentPartId(targetPartId)) return false;
  const basePartId = readDoorVisualSegmentBasePartId(targetPartId);
  return ownerPartId === basePartId || ownerPartId === `${basePartId}_full`;
}

export type DoorVisualSegmentMaterializeResult = {
  didMaterialize: boolean;
  basePartId: string;
  fullPartId: string;
  clickedPartId: string;
  segmentPartIds: string[];
  ownerPartId: string;
  ownerValue: unknown;
};

export function materializeInheritedDoorVisualOwner(args: {
  App: AppContainer;
  map: Record<string, unknown> | null | undefined;
  targetPartId: string;
  ownerPartId: string | null | undefined;
}): DoorVisualSegmentMaterializeResult | null {
  const map = args.map;
  const clickedPartId = stripDoorVisualSurfaceSuffix(String(args.targetPartId || ''));
  const ownerPartId = stripDoorVisualSurfaceSuffix(String(args.ownerPartId || ''));
  if (!map || !isDoorVisualInheritedOwner({ targetPartId: clickedPartId, ownerPartId })) return null;

  const basePartId = readDoorVisualSegmentBasePartId(clickedPartId);
  const fullPartId = `${basePartId}_full`;
  const ownerValue = readOwnMapValue(map, ownerPartId);
  if (ownerValue === undefined) return null;

  const segmentPartIds = readDoorVisualSiblingSegmentPartIds({
    App: args.App,
    basePartId,
    clickedPartId,
  });

  delete map[fullPartId];
  delete map[basePartId];
  for (let index = 0; index < segmentPartIds.length; index += 1) {
    const partId = segmentPartIds[index];
    if (!partId || partId === clickedPartId) continue;
    if (!hasOwnMapKey(map, partId)) map[partId] = cloneDoorVisualValue(ownerValue);
  }

  return {
    didMaterialize: true,
    basePartId,
    fullPartId,
    clickedPartId,
    segmentPartIds,
    ownerPartId,
    ownerValue,
  };
}
