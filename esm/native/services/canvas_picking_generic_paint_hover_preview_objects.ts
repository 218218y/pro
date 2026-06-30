import type { AppContainer, UnknownRecord } from '../../../types';

import { isDrawerBoxPartId } from '../features/part_identity/api.js';
import { getBuilderRegistry } from '../runtime/builder_service_access.js';
import {
  __readObjectLocalGeometryBox,
  asObject3DRecord,
  asRecordMap,
} from './canvas_picking_generic_paint_hover_shared.js';

type PreviewStackKey = 'top' | 'bottom' | null;

type PreviewPartKeyMatch = {
  key: string;
  stackKey: PreviewStackKey;
};

function readStackKey(value: unknown): PreviewStackKey {
  return value === 'bottom' ? 'bottom' : value === 'top' ? 'top' : null;
}

function readObjectStackKeyFromSelfOrAncestors(value: unknown): PreviewStackKey {
  let obj = asObject3DRecord(value);
  while (obj) {
    const ud = asRecordMap(obj.userData);
    const stack = readStackKey(ud?.__wpStack);
    if (stack) return stack;
    obj = asObject3DRecord(obj.parent);
  }
  return null;
}

function readScopedCornerPartKeyStack(partKey: string): PreviewStackKey {
  if (partKey.startsWith('lower_corner_')) return 'bottom';
  if (partKey.startsWith('corner_')) return 'top';
  return null;
}

function readScopedCornerPartIdStack(partId: string): PreviewStackKey {
  if (partId.startsWith('lower_corner_')) return 'bottom';
  if (partId.startsWith('corner_')) return null;
  return null;
}

function cornerPartKeyMatchesObjectStack(
  partKey: string,
  effectivePartId: string,
  objectStackKey: PreviewStackKey
): boolean {
  const keyStack = readScopedCornerPartKeyStack(partKey);
  if (!keyStack) return true;

  const explicitPartStack = readScopedCornerPartIdStack(effectivePartId);
  if (keyStack === 'bottom') return objectStackKey === 'bottom' || explicitPartStack === 'bottom';
  return objectStackKey !== 'bottom' && explicitPartStack !== 'bottom';
}

function appendRegisteredPartObjects(out: UnknownRecord[], value: unknown, partKey?: string): void {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) appendRegisteredPartObjects(out, value[i], partKey);
    return;
  }
  const obj = asObject3DRecord(value);
  if (!obj) return;
  if (partKey) {
    const userData = asRecordMap(obj.userData);
    const partId = typeof userData?.partId === 'string' ? String(userData.partId) : '';
    const objectStackKey = readObjectStackKeyFromSelfOrAncestors(obj);
    if (!cornerPartKeyMatchesObjectStack(partKey, partId, objectStackKey)) return;
  }
  out.push(obj);
}

export function appendUniquePartObjects(out: UnknownRecord[], value: unknown): void {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) appendUniquePartObjects(out, value[i]);
    return;
  }
  const obj = asObject3DRecord(value);
  if (!obj) return;
  for (let i = 0; i < out.length; i += 1) {
    if (out[i] === obj) return;
  }
  out.push(obj);
}

function unscopedCornerPreviewKey(partKey: string): string {
  return partKey.startsWith('lower_corner_') ? partKey.slice('lower_'.length) : partKey;
}

function isCornerCeilingPreviewObjectPartId(partId: string): boolean {
  return partId === 'corner_wing_ceil' || /^corner_cell_top_c\d+$/.test(partId);
}

function isCornerFloorPreviewObjectPartId(partId: string): boolean {
  return partId === 'corner_floor' || partId === 'corner_floor_blind' || /^corner_floor_c\d+$/.test(partId);
}

function isUnifiedCornerMiddleFloorPreviewObjectPartId(partId: string): boolean {
  return (
    partId === 'corner_stack_mid_floor' ||
    partId === 'corner_stack_mid_floor_blind' ||
    /^corner_stack_mid_floor_c\d+$/.test(partId)
  );
}

function isUnifiedCornerMiddleFloorPaintKey(partKey: string): boolean {
  const key = unscopedCornerPreviewKey(partKey);
  return (
    key === 'corner_stack_mid_floor' ||
    key === 'corner_stack_mid_floor_blind' ||
    /^corner_stack_mid_floor_c\d+$/.test(key)
  );
}

function isCornerPlinthPreviewObjectPartId(partId: string): boolean {
  return (
    partId === 'corner_plinth' || partId === 'corner_plinth_blind' || /^corner_plinth_c\d+$/.test(partId)
  );
}

function isCornerShellPaintPreviewMatch(partId: string, partKey: string): boolean {
  const key = unscopedCornerPreviewKey(partKey);
  if (partId === key) return true;
  if (key === 'corner_ceil') return isCornerCeilingPreviewObjectPartId(partId);
  if (key === 'corner_floor') return isCornerFloorPreviewObjectPartId(partId);
  if (isUnifiedCornerMiddleFloorPaintKey(key)) {
    return isUnifiedCornerMiddleFloorPreviewObjectPartId(partId);
  }
  if (key === 'corner_plinth') return isCornerPlinthPreviewObjectPartId(partId);
  return false;
}

function findPaintPreviewPartKeyMatch(
  effectivePartId: string,
  partKeySet: Set<string>,
  objectStackKey: PreviewStackKey
): PreviewPartKeyMatch | null {
  if (!effectivePartId) return null;
  for (const partKey of partKeySet) {
    const matches = partKey === effectivePartId || isCornerShellPaintPreviewMatch(effectivePartId, partKey);
    if (!matches) continue;
    if (!cornerPartKeyMatchesObjectStack(partKey, effectivePartId, objectStackKey)) continue;
    return { key: partKey, stackKey: readScopedCornerPartKeyStack(partKey) };
  }
  return null;
}

function matchesPaintPreviewPartKey(
  effectivePartId: string,
  partKeySet: Set<string>,
  objectStackKey: PreviewStackKey
): boolean {
  return !!findPaintPreviewPartKeyMatch(effectivePartId, partKeySet, objectStackKey);
}

function isSkippedPaintPreviewKind(kind: string): boolean {
  return (
    kind === 'shelf_pin' ||
    kind === 'brace_seam' ||
    kind === 'internal_drawer_accent_line' ||
    kind.startsWith('folded_') ||
    kind.startsWith('library_')
  );
}

function appendScenePartObjectsByKeySet(
  out: UnknownRecord[],
  node: unknown,
  partKeySet: Set<string>,
  inheritedDrawerBoxPartId: string | null = null,
  inheritedStackKey: PreviewStackKey = null
): void {
  const obj = asObject3DRecord(node);
  if (!obj) return;
  const userData = asRecordMap(obj.userData);
  const partId = typeof userData?.partId === 'string' ? String(userData.partId) : '';
  const kind = typeof userData?.__kind === 'string' ? String(userData.__kind) : '';
  const objectStackKey = readStackKey(userData?.__wpStack) || inheritedStackKey;
  const effectivePartId = partId || inheritedDrawerBoxPartId || '';
  if (
    effectivePartId &&
    matchesPaintPreviewPartKey(effectivePartId, partKeySet, objectStackKey) &&
    !isSkippedPaintPreviewKind(kind) &&
    __readObjectLocalGeometryBox(obj)
  ) {
    appendUniquePartObjects(out, obj);
  }
  const nextInheritedDrawerBoxPartId = partId
    ? matchesPaintPreviewPartKey(partId, partKeySet, objectStackKey) && isDrawerBoxPartId(partId)
      ? partId
      : null
    : inheritedDrawerBoxPartId;
  const children = Array.isArray(obj.children) ? obj.children : [];
  for (let i = 0; i < children.length; i += 1) {
    appendScenePartObjectsByKeySet(
      out,
      children[i],
      partKeySet,
      nextInheritedDrawerBoxPartId,
      objectStackKey
    );
  }
}

export function appendScenePartObjects(
  out: UnknownRecord[],
  wardrobeGroup: UnknownRecord,
  partKeys: string[]
): void {
  if (!partKeys.length) return;
  const partKeySet = new Set<string>();
  for (let i = 0; i < partKeys.length; i += 1) {
    const key = typeof partKeys[i] === 'string' ? String(partKeys[i]) : '';
    if (key) partKeySet.add(key);
  }
  if (!partKeySet.size) return;
  appendScenePartObjectsByKeySet(out, wardrobeGroup, partKeySet);
}

export function collectPaintPreviewPartObjects(args: {
  App: AppContainer;
  wardrobeGroup: UnknownRecord;
  partKeys: string[];
}): UnknownRecord[] {
  const { App, wardrobeGroup, partKeys } = args;
  const registry = getBuilderRegistry(App);
  const objects: UnknownRecord[] = [];
  if (registry && typeof registry.get === 'function') {
    for (let i = 0; i < partKeys.length; i += 1) {
      const key = typeof partKeys[i] === 'string' ? String(partKeys[i]) : '';
      if (!key) continue;
      try {
        appendRegisteredPartObjects(objects, registry.get(key), key);
      } catch {
        // ignore registry lookup failures
      }
    }
  }
  appendScenePartObjects(objects, wardrobeGroup, partKeys);
  return objects;
}
