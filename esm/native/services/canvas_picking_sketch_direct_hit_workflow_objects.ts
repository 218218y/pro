import type { AppContainer } from '../../../types';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import type {
  DirectHitObject,
  MinimalVec3,
  Vec3Ctor,
} from './canvas_picking_sketch_direct_hit_workflow_contracts.js';
import { getProp, getRecordProp } from '../runtime/record.js';
import { readRecordNumber, readRecordString } from './canvas_picking_sketch_direct_hit_workflow_records.js';

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function isDirectHitObject(value: unknown): value is DirectHitObject {
  return isRecord(value);
}

function isVec3Ctor(value: unknown): value is Vec3Ctor {
  return typeof value === 'function';
}

function asDirectHitObject(value: unknown): DirectHitObject | null {
  return isDirectHitObject(value) ? value : null;
}

export function readChildObjects(value: unknown): DirectHitObject[] {
  const children = asDirectHitObject(value)?.children;
  if (!Array.isArray(children) || children.length === 0) return [];
  const out: DirectHitObject[] = [];
  for (let i = 0; i < children.length; i++) {
    const child = asDirectHitObject(children[i]);
    if (child) out.push(child);
  }
  return out;
}

export function readPartId(value: unknown): string {
  const obj = asDirectHitObject(value);
  return obj?.userData ? readRecordString(obj.userData, 'partId') : '';
}

export function readModuleIndex(value: unknown): string {
  const obj = asDirectHitObject(value);
  if (!obj?.userData) return '';
  return (
    readRecordString(obj.userData, '__wpSketchModuleKey') || readRecordString(obj.userData, 'moduleIndex')
  );
}

export function readSketchBoxId(value: unknown): string {
  const obj = asDirectHitObject(value);
  if (!obj?.userData) return '';
  return readRecordString(obj.userData, '__wpSketchBoxId');
}

function readParent(value: unknown): unknown {
  return asDirectHitObject(value)?.parent ?? null;
}

function readPositionY(value: unknown): number | null {
  const obj = asDirectHitObject(value);
  return readRecordNumber(obj?.position ?? null, 'y');
}

export function getWorldPositionY(value: unknown, tmp: MinimalVec3 | null): number | null {
  const obj = asDirectHitObject(value);
  if (obj && tmp && typeof obj.getWorldPosition === 'function') {
    obj.getWorldPosition(tmp);
    return Number.isFinite(tmp.y) ? Number(tmp.y) : null;
  }
  return readPositionY(value);
}

export function readVector3Ctor(App: AppContainer): Vec3Ctor | null {
  const deps = getRecordProp(App, 'deps');
  const THREE = deps ? getRecordProp(deps, 'THREE') : null;
  const Vector3Ctor0 = THREE ? getProp(THREE, 'Vector3') : null;
  return isVec3Ctor(Vector3Ctor0) ? Vector3Ctor0 : null;
}

export function findPartAncestor(
  App: AppContainer,
  intersects: RaycastHitLike[],
  prefix: string,
  isViewportRoot: (App: AppContainer, obj: unknown) => boolean
): DirectHitObject | null {
  for (let ii = 0; ii < intersects.length; ii++) {
    const hitObject = intersects[ii]?.object ?? null;
    let current: unknown = hitObject;
    while (current && !isViewportRoot(App, current)) {
      const pid = readPartId(current);
      if (pid.startsWith(prefix)) return asDirectHitObject(current);
      current = readParent(current);
    }
  }
  return null;
}
