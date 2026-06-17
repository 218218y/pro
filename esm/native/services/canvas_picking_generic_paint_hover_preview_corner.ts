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
  anchorObject: UnknownRecord;
}): UnknownRecord | null {
  const { App, wardrobeGroup, objects, anchorObject } = args;
  if (!objects.length) return anchorObject;
  for (let i = 0; i < objects.length; i += 1) {
    if (objects[i] === anchorObject) return anchorObject;
  }

  const referenceBox = __wp_measureObjectLocalBox(App, anchorObject, wardrobeGroup);
  if (!referenceBox) return objects[0] || anchorObject;

  let bestObject: UnknownRecord | null = objects[0] || null;
  let bestDist = Infinity;
  for (let i = 0; i < objects.length; i += 1) {
    const candidate = objects[i];
    const box = __wp_measureObjectLocalBox(App, candidate, wardrobeGroup);
    if (!box) continue;
    const dx = box.centerX - referenceBox.centerX;
    const dy = box.centerY - referenceBox.centerY;
    const dz = box.centerZ - referenceBox.centerZ;
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
  anchorObject: UnknownRecord;
}): PaintPreviewGroupBox | null {
  const { App, wardrobeGroup, partKeys, objects, anchorObject } = args;
  if (partKeys.length !== 1 || !__isCornerCorniceFrontPreviewKey(partKeys[0])) return null;
  const previewObject = resolveNearestPreviewObject({ App, wardrobeGroup, objects, anchorObject });
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
  anchorObject: UnknownRecord;
}): PaintPreviewGroupBox | null {
  const { wardrobeGroup, partKeys, objects, anchorObject } = args;
  if (!__isScopedCornerCornicePreviewKeyList(partKeys)) return null;
  const previewObjects: UnknownRecord[] = [];
  appendUniquePartObjects(previewObjects, objects);
  appendUniquePartObjects(previewObjects, anchorObject);
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
