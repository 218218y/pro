import type { AppContainer, UnknownRecord } from '../../../types';

import { getBuilderRegistry } from '../runtime/builder_service_access.js';
import {
  __readObjectLocalGeometryBox,
  __isScopedCornerCornicePreviewKeyList,
  asObject3DRecord,
  asRecordMap,
} from './canvas_picking_generic_paint_hover_shared.js';

function appendRegisteredPartObjects(out: UnknownRecord[], value: unknown): void {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) appendRegisteredPartObjects(out, value[i]);
    return;
  }
  const obj = asObject3DRecord(value);
  if (obj) out.push(obj);
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

function appendScenePartObjectsByKeySet(out: UnknownRecord[], node: unknown, partKeySet: Set<string>): void {
  const obj = asObject3DRecord(node);
  if (!obj) return;
  const userData = asRecordMap(obj.userData);
  const partId = typeof userData?.partId === 'string' ? String(userData.partId) : '';
  if (partId && partKeySet.has(partId) && __readObjectLocalGeometryBox(obj))
    appendUniquePartObjects(out, obj);
  const children = Array.isArray(obj.children) ? obj.children : [];
  for (let i = 0; i < children.length; i += 1) appendScenePartObjectsByKeySet(out, children[i], partKeySet);
}

export function appendFallbackPartObjectsFromScene(
  out: UnknownRecord[],
  wardrobeGroup: UnknownRecord,
  partKeys: string[]
): void {
  if (!__isScopedCornerCornicePreviewKeyList(partKeys) || !partKeys.length) return;
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
        appendRegisteredPartObjects(objects, registry.get(key));
      } catch {
        // ignore registry lookup failures
      }
    }
  }
  appendFallbackPartObjectsFromScene(objects, wardrobeGroup, partKeys);
  return objects;
}
