import type { AppContainer, UnknownRecord } from '../../../types';

import { __wp_measureObjectLocalBox } from './canvas_picking_local_helpers.js';
import type { PaintPreviewGroupBox } from './canvas_picking_generic_paint_hover_shared.js';

function readPreviewBoxThickness(
  box: { width: number; height: number; depth: number } | null
): number | null {
  if (!box || !(box.width > 0) || !(box.height > 0) || !(box.depth > 0)) return null;
  return Math.max(0.004, Math.min(0.05, Math.min(box.width, box.height, box.depth)));
}

export function resolvePaintPreviewGroupBoxFromFallback(args: {
  App: AppContainer;
  wardrobeGroup: UnknownRecord;
  fallbackObject: UnknownRecord;
  fallbackParent: UnknownRecord | null;
}): PaintPreviewGroupBox | null {
  const { App, wardrobeGroup, fallbackObject, fallbackParent } = args;
  const box = __wp_measureObjectLocalBox(App, fallbackObject, fallbackParent || undefined);
  const woodThick = readPreviewBoxThickness(box);
  if (!box || !woodThick) return null;
  return {
    centerX: box.centerX,
    centerY: box.centerY,
    centerZ: box.centerZ,
    width: box.width,
    height: box.height,
    depth: box.depth,
    woodThick,
    anchor: fallbackObject,
    anchorParent: fallbackParent || wardrobeGroup,
  };
}

export function resolvePaintPreviewGroupBoxFromObjects(args: {
  App: AppContainer;
  wardrobeGroup: UnknownRecord;
  objects: UnknownRecord[];
}): PaintPreviewGroupBox | null {
  const { App, wardrobeGroup, objects } = args;
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  let minThickness = Infinity;

  for (let i = 0; i < objects.length; i += 1) {
    const box = __wp_measureObjectLocalBox(App, objects[i], wardrobeGroup);
    const woodThick = readPreviewBoxThickness(box);
    if (!box || !woodThick) continue;
    minX = Math.min(minX, box.centerX - box.width / 2);
    maxX = Math.max(maxX, box.centerX + box.width / 2);
    minY = Math.min(minY, box.centerY - box.height / 2);
    maxY = Math.max(maxY, box.centerY + box.height / 2);
    minZ = Math.min(minZ, box.centerZ - box.depth / 2);
    maxZ = Math.max(maxZ, box.centerZ + box.depth / 2);
    minThickness = Math.min(minThickness, woodThick);
  }

  if (
    !(
      Number.isFinite(minX) &&
      Number.isFinite(maxX) &&
      maxX > minX &&
      Number.isFinite(minY) &&
      Number.isFinite(maxY) &&
      maxY > minY &&
      Number.isFinite(minZ) &&
      Number.isFinite(maxZ) &&
      maxZ > minZ
    )
  ) {
    return null;
  }

  return {
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    centerZ: (minZ + maxZ) / 2,
    width: Math.max(0.01, maxX - minX),
    height: Math.max(0.01, maxY - minY),
    depth: Math.max(0.01, maxZ - minZ),
    woodThick: Number.isFinite(minThickness) ? minThickness : 0.018,
    anchor: wardrobeGroup,
    anchorParent: wardrobeGroup,
  };
}
