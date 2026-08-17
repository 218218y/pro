import type { UnknownRecord } from '../../../types';

import { __wp_asRecord } from './canvas_picking_core_support.js';

export function isIgnoredRoomWardrobeObstacleObject(value: unknown): boolean {
  let node = __wp_asRecord(value);
  for (let depth = 0; node && depth < 12; depth += 1) {
    const type = typeof node.type === 'string' ? node.type : '';
    if (type === 'Line' || type === 'LineSegments' || type === 'Sprite') return true;

    const userData = __wp_asRecord(node.userData);
    if (
      userData?.__ignoreRaycast === true ||
      userData?.__wpExcludeWardrobeBounds === true ||
      userData?.__wpViewerMeasurementOverlay === true ||
      userData?.isModuleSelector === true
    ) {
      return true;
    }

    if (depth === 0) {
      const material = __wp_asRecord(node.material);
      if (material?.visible === false || material?.opacity === 0) return true;
      if (Array.isArray(node.material)) {
        const materials = node.material
          .map(item => __wp_asRecord(item))
          .filter((item): item is UnknownRecord => item != null);
        if (materials.length && materials.every(item => item.visible === false || item.opacity === 0)) {
          return true;
        }
      }
    }

    node = __wp_asRecord(node.parent);
  }
  return false;
}
