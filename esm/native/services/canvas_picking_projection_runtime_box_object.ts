import type { AppContainer } from '../../../types';
import { asRecord, getProp, getRecordProp } from '../runtime/record.js';
import {
  __getThreeBoxSupport,
  __getWorldToLocalFn,
  __readBox3Bounds,
  __readFiniteNumberProp,
} from './canvas_picking_projection_runtime_shared.js';
import type { __ProjectionLocalBox } from './canvas_picking_projection_runtime_box_shared.js';

export function __wp_measureObjectLocalBox(
  App: AppContainer,
  obj: unknown,
  parentOverride?: unknown
): __ProjectionLocalBox | null {
  try {
    const o = asRecord(obj);
    if (!o) return null;
    const parent = asRecord(parentOverride) ?? getRecordProp(o, 'parent');

    const params = getRecordProp(getProp(o, 'geometry'), 'parameters');
    const pos = getRecordProp(o, 'position');
    const scale = getRecordProp(o, 'scale');
    const baseWidth = __readFiniteNumberProp(params, 'width') ?? NaN;
    const baseHeight = __readFiniteNumberProp(params, 'height') ?? NaN;
    const baseDepth = __readFiniteNumberProp(params, 'depth') ?? NaN;
    const scaleX = Math.abs(__readFiniteNumberProp(scale, 'x') ?? 1);
    const scaleY = Math.abs(__readFiniteNumberProp(scale, 'y') ?? 1);
    const scaleZ = Math.abs(__readFiniteNumberProp(scale, 'z') ?? 1);
    const width = Number.isFinite(baseWidth) ? baseWidth * scaleX : NaN;
    const height = Number.isFinite(baseHeight) ? baseHeight * scaleY : NaN;
    const depth = Number.isFinite(baseDepth) ? baseDepth * scaleZ : NaN;
    const centerX = __readFiniteNumberProp(pos, 'x') ?? NaN;
    const centerY = __readFiniteNumberProp(pos, 'y') ?? NaN;
    const centerZ = __readFiniteNumberProp(pos, 'z') ?? NaN;
    if (
      Number.isFinite(width) &&
      width > 0 &&
      Number.isFinite(height) &&
      height > 0 &&
      Number.isFinite(depth) &&
      depth > 0 &&
      Number.isFinite(centerX) &&
      Number.isFinite(centerY) &&
      Number.isFinite(centerZ)
    ) {
      return { centerX, centerY, centerZ, width, height, depth };
    }

    const three = __getThreeBoxSupport(App);
    if (three) {
      const box = new three.Box3().setFromObject(o);
      const bounds = __readBox3Bounds(box);
      if (bounds) {
        const { min, max } = bounds;
        const worldToLocal = __getWorldToLocalFn(parent);
        if (worldToLocal) {
          const corners = [
            new three.Vector3(min.x, min.y, min.z),
            new three.Vector3(min.x, min.y, max.z),
            new three.Vector3(min.x, max.y, min.z),
            new three.Vector3(min.x, max.y, max.z),
            new three.Vector3(max.x, min.y, min.z),
            new three.Vector3(max.x, min.y, max.z),
            new three.Vector3(max.x, max.y, min.z),
            new three.Vector3(max.x, max.y, max.z),
          ];
          let localMinX = Infinity;
          let localMinY = Infinity;
          let localMinZ = Infinity;
          let localMaxX = -Infinity;
          let localMaxY = -Infinity;
          let localMaxZ = -Infinity;
          for (let i = 0; i < corners.length; i++) {
            const corner = corners[i];
            try {
              worldToLocal(corner);
            } catch {
              // ignore
            }
            if (Number.isFinite(corner.x)) {
              localMinX = Math.min(localMinX, Number(corner.x));
              localMaxX = Math.max(localMaxX, Number(corner.x));
            }
            if (Number.isFinite(corner.y)) {
              localMinY = Math.min(localMinY, Number(corner.y));
              localMaxY = Math.max(localMaxY, Number(corner.y));
            }
            if (Number.isFinite(corner.z)) {
              localMinZ = Math.min(localMinZ, Number(corner.z));
              localMaxZ = Math.max(localMaxZ, Number(corner.z));
            }
          }
          if (
            Number.isFinite(localMinX) &&
            Number.isFinite(localMinY) &&
            Number.isFinite(localMinZ) &&
            Number.isFinite(localMaxX) &&
            Number.isFinite(localMaxY) &&
            Number.isFinite(localMaxZ)
          ) {
            return {
              centerX: (localMinX + localMaxX) / 2,
              centerY: (localMinY + localMaxY) / 2,
              centerZ: (localMinZ + localMaxZ) / 2,
              width: Math.max(0, localMaxX - localMinX),
              height: Math.max(0, localMaxY - localMinY),
              depth: Math.max(0, localMaxZ - localMinZ),
            };
          }
        }

        const center = new three.Vector3((min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2);
        try {
          if (worldToLocal) worldToLocal(center);
        } catch {
          // ignore
        }
        return {
          centerX: Number(center.x),
          centerY: Number(center.y),
          centerZ: Number(center.z),
          width: Math.max(0, max.x - min.x),
          height: Math.max(0, max.y - min.y),
          depth: Math.max(0, max.z - min.z),
        };
      }
    }
  } catch {
    // ignore
  }
  return null;
}
