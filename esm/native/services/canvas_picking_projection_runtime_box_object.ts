import type { AppContainer } from '../../../types';
import { asRecord, getProp, getRecordProp } from '../runtime/record.js';
import {
  __getThreeBoxSupport,
  __getWorldToLocalFn,
  __readBox3Bounds,
  __readFiniteNumberProp,
} from './canvas_picking_projection_runtime_shared.js';
import type { __ProjectionLocalBox } from './canvas_picking_projection_runtime_box_shared.js';

function hasMeaningfulLocalRotation(obj: unknown): boolean {
  const rotation = getRecordProp(obj, 'rotation');
  return (
    Math.abs(__readFiniteNumberProp(rotation, 'x') ?? 0) > 1e-9 ||
    Math.abs(__readFiniteNumberProp(rotation, 'y') ?? 0) > 1e-9 ||
    Math.abs(__readFiniteNumberProp(rotation, 'z') ?? 0) > 1e-9
  );
}

function readGeometryParameterBox(o: unknown): __ProjectionLocalBox | null {
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
  return null;
}

function projectGeometryParameterBoxThroughUnrotatedAncestors(
  obj: unknown,
  targetParent: unknown
): __ProjectionLocalBox | null {
  if (hasMeaningfulLocalRotation(obj)) return null;
  const box = readGeometryParameterBox(obj);
  if (!box) return null;

  let frame = getRecordProp(obj, 'parent');
  let centerX = box.centerX;
  let centerY = box.centerY;
  let centerZ = box.centerZ;
  let width = box.width;
  let height = box.height;
  let depth = box.depth;

  while (frame && frame !== targetParent) {
    const parent = asRecord(frame);
    if (!parent || hasMeaningfulLocalRotation(parent)) return null;
    const pos = getRecordProp(parent, 'position');
    const scale = getRecordProp(parent, 'scale');
    const scaleX = __readFiniteNumberProp(scale, 'x') ?? 1;
    const scaleY = __readFiniteNumberProp(scale, 'y') ?? 1;
    const scaleZ = __readFiniteNumberProp(scale, 'z') ?? 1;
    centerX = (__readFiniteNumberProp(pos, 'x') ?? 0) + centerX * scaleX;
    centerY = (__readFiniteNumberProp(pos, 'y') ?? 0) + centerY * scaleY;
    centerZ = (__readFiniteNumberProp(pos, 'z') ?? 0) + centerZ * scaleZ;
    width *= Math.abs(scaleX);
    height *= Math.abs(scaleY);
    depth *= Math.abs(scaleZ);
    frame = getRecordProp(parent, 'parent');
  }

  if (frame !== targetParent) return null;
  return { centerX, centerY, centerZ, width, height, depth };
}

export function __wp_measureObjectLocalBox(
  App: AppContainer,
  obj: unknown,
  parentOverride?: unknown
): __ProjectionLocalBox | null {
  try {
    const o = asRecord(obj);
    if (!o) return null;
    const parent = asRecord(parentOverride) ?? getRecordProp(o, 'parent');

    const directParent = getRecordProp(o, 'parent');
    const parentOverrideIsDirectLocalFrame =
      !parentOverride || parentOverride === directParent || !directParent;

    if (parentOverrideIsDirectLocalFrame && !hasMeaningfulLocalRotation(o)) {
      const parameterBox = readGeometryParameterBox(o);
      if (parameterBox) return parameterBox;
    }

    const three = __getThreeBoxSupport(App);
    if (three) {
      try {
        const parentObj = asRecord(parent);
        const updateParentMatrixWorld = parentObj && getProp(parentObj, 'updateMatrixWorld');
        if (typeof updateParentMatrixWorld === 'function') {
          Reflect.apply(updateParentMatrixWorld, parentObj, [true]);
        }
      } catch {
        // ignore matrix refresh failures; Box3 can still use the current world matrices.
      }
      try {
        const updateObjectMatrixWorld = getProp(o, 'updateMatrixWorld');
        if (typeof updateObjectMatrixWorld === 'function') {
          Reflect.apply(updateObjectMatrixWorld, o, [true]);
        }
      } catch {
        // ignore matrix refresh failures.
      }
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
              // projection-geometry-fallback: failed optional transforms fall through to the remaining bounds strategies
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
          // projection-geometry-fallback: failed optional transforms fall through to the remaining bounds strategies
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

    if (parentOverride && parentOverride !== directParent) {
      const projectedBox = projectGeometryParameterBoxThroughUnrotatedAncestors(o, parentOverride);
      if (projectedBox) return projectedBox;
    }
  } catch {
    // projection-geometry-fallback: failed optional transforms fall through to the remaining bounds strategies
  }
  return null;
}
