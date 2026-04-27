import type {
  BuilderCreateDoorVisualFn,
  MaterialLike,
  Object3DLike,
  ThreeLike,
  UnknownCallable,
  UnknownRecord,
} from '../../../types';
import type {
  GetHandleTypeFn,
  GetMaterialFn,
  GetPartColorValueFn,
  GetPartMaterialFn,
  HandleMeshFactory,
} from './render_door_ops_shared_contracts.js';

type FnLike = UnknownCallable;

type CloneableMaterial = MaterialLike & {
  clone?: () => CloneableMaterial;
  emissive?: { setHex?: (value: number) => unknown };
};

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function isFunction(value: unknown): value is FnLike {
  return typeof value === 'function';
}

export function readCurtainType(value: unknown): string | null | undefined {
  if (typeof value === 'string') return value;
  if (value === null) return null;
  if (typeof value === 'undefined') return undefined;
  return String(value);
}

function isThreeLike(value: unknown): value is ThreeLike {
  const rec = isRecord(value) ? value : null;
  return !!(
    rec &&
    typeof rec.Group === 'function' &&
    typeof rec.Mesh === 'function' &&
    typeof rec.Vector3 === 'function' &&
    typeof rec.BoxGeometry === 'function'
  );
}

export function readThreeLike(value: unknown): ThreeLike | null {
  return isThreeLike(value) ? value : null;
}

function isObject3DLike(value: unknown): value is Object3DLike {
  return isRecord(value) && typeof value.add === 'function';
}

export function readObject3D(value: unknown): Object3DLike | null {
  return isObject3DLike(value) ? value : null;
}

function isCloneableMaterial(value: unknown): value is CloneableMaterial {
  return isRecord(value) && isRecord(value.color);
}

export function readCloneableMaterial(value: unknown): CloneableMaterial | null {
  return isCloneableMaterial(value) ? value : null;
}

export function readGetMaterial(value: unknown): GetMaterialFn | null {
  if (!isFunction(value)) return null;
  return (partId, kind) => value(partId, kind);
}

export function readGetPartMaterial(value: unknown): GetPartMaterialFn | null {
  if (!isFunction(value)) return null;
  return partId => value(partId);
}

export function readGetPartColorValue(value: unknown): GetPartColorValueFn | null {
  if (!isFunction(value)) return null;
  return partId => value(partId);
}

export function readDoorVisualFactory(value: unknown): BuilderCreateDoorVisualFn | null {
  if (!isFunction(value)) return null;
  return (
    w,
    h,
    thickness,
    mat,
    style,
    hasGrooves,
    isMirror,
    curtainType,
    baseMaterial,
    frontFaceSign,
    forceCurtainFix,
    mirrorLayout,
    groovePartId
  ) => {
    const next = readObject3D(
      value(
        w,
        h,
        thickness,
        mat,
        style,
        hasGrooves,
        isMirror,
        curtainType,
        baseMaterial,
        frontFaceSign,
        forceCurtainFix,
        mirrorLayout,
        groovePartId
      )
    );
    if (!next) throw new Error('[render_door_ops] createDoorVisual returned invalid object');
    return next;
  };
}

export function readHandleMeshFactory(value: unknown): HandleMeshFactory | null {
  if (!isFunction(value)) return null;
  return (type, w, h, isLeftHinge, opts) => readObject3D(value(type, w, h, isLeftHinge, opts));
}

export function readGetHandleType(value: unknown): GetHandleTypeFn | null {
  if (!isFunction(value)) return null;
  return partId => value(partId);
}
