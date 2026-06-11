import type { AppContainer, UnknownRecord } from '../../../types';

import { __wp_measureObjectLocalBox } from './canvas_picking_local_helpers.js';
import {
  __readObjectLocalGeometryBox,
  __isCornerCorniceFrontPreviewKey,
  __isScopedCornerCornicePreviewKeyList,
  type PaintPreviewGroupBox,
} from './canvas_picking_generic_paint_hover_shared.js';
import { appendUniquePartObjects } from './canvas_picking_generic_paint_hover_preview_objects.js';

function readPreviewBoxThickness(
  localBox: { width: number; height: number; depth: number } | null
): number | null {
  if (!localBox) return null;
  return Math.max(0.004, Math.min(0.05, Math.min(localBox.width, localBox.height, localBox.depth)));
}

export function resolveNearestPreviewObject(args: {
  App: AppContainer;
  wardrobeGroup: UnknownRecord;
  objects: UnknownRecord[];
  fallbackObject: UnknownRecord;
}): UnknownRecord | null {
  const { App, wardrobeGroup, objects, fallbackObject } = args;
  if (!objects.length) return fallbackObject;
  for (let i = 0; i < objects.length; i += 1) {
    if (objects[i] === fallbackObject) return fallbackObject;
  }

  const fallbackBox = __wp_measureObjectLocalBox(App, fallbackObject, wardrobeGroup);
  if (!fallbackBox) return objects[0] || fallbackObject;

  let bestObject: UnknownRecord | null = objects[0] || null;
  let bestDist = Infinity;
  for (let i = 0; i < objects.length; i += 1) {
    const candidate = objects[i];
    const box = __wp_measureObjectLocalBox(App, candidate, wardrobeGroup);
    if (!box) continue;
    const dx = box.centerX - fallbackBox.centerX;
    const dy = box.centerY - fallbackBox.centerY;
    const dz = box.centerZ - fallbackBox.centerZ;
    const distSq = dx * dx + dy * dy + dz * dz;
    if (distSq < bestDist) {
      bestDist = distSq;
      bestObject = candidate;
    }
  }
  return bestObject;
}

export function resolveCornerCorniceFrontObjectLocalPreview(args: {
  App: AppContainer;
  wardrobeGroup: UnknownRecord;
  partKeys: string[];
  objects: UnknownRecord[];
  fallbackObject: UnknownRecord;
}): PaintPreviewGroupBox | null {
  const { App, wardrobeGroup, partKeys, objects, fallbackObject } = args;
  if (partKeys.length !== 1 || !__isCornerCorniceFrontPreviewKey(partKeys[0])) return null;
  const previewObject = resolveNearestPreviewObject({ App, wardrobeGroup, objects, fallbackObject });
  const localBox = __readObjectLocalGeometryBox(previewObject);
  const woodThick = readPreviewBoxThickness(localBox);
  if (!previewObject || !localBox || !woodThick) return null;
  return {
    ...localBox,
    woodThick,
    anchor: previewObject,
    anchorParent: previewObject,
  };
}

export function resolveCornerCorniceGroupObjectPreview(args: {
  wardrobeGroup: UnknownRecord;
  partKeys: string[];
  objects: UnknownRecord[];
  fallbackObject: UnknownRecord;
}): PaintPreviewGroupBox | null {
  const { wardrobeGroup, partKeys, objects, fallbackObject } = args;
  if (!__isScopedCornerCornicePreviewKeyList(partKeys)) return null;
  const previewObjects: UnknownRecord[] = [];
  appendUniquePartObjects(previewObjects, objects);
  appendUniquePartObjects(previewObjects, fallbackObject);
  if (!previewObjects.length) return null;

  let minThickness = Infinity;
  for (let i = 0; i < previewObjects.length; i += 1) {
    const localBox = __readObjectLocalGeometryBox(previewObjects[i]);
    const thickness = readPreviewBoxThickness(localBox);
    if (!thickness) continue;
    minThickness = Math.min(minThickness, thickness);
  }

  return {
    centerX: 0,
    centerY: 0,
    centerZ: 0,
    width: 1,
    height: 1,
    depth: 1,
    woodThick: Number.isFinite(minThickness) ? minThickness : 0.018,
    anchor: wardrobeGroup,
    anchorParent: wardrobeGroup,
    kind: 'object_boxes',
    previewObjects,
  };
}
