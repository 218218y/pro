import type { UnknownCallable } from '../../../types';
import { asRecord } from '../runtime/record.js';
import type {
  PreviewDrawerEntry,
  PreviewGroupLike,
  PreviewLineLike,
  PreviewMaterialLike,
  PreviewMeshLike,
  PreviewValueRecord,
  RenderPreviewOpsDeps,
  SketchPlacementPreviewArgs,
  SketchPlacementPreviewUserData,
} from './render_preview_ops_contracts.js';

export type PreviewMatrixLike = Record<string, unknown> & {
  copy: (value: unknown) => unknown;
  invert: () => unknown;
  multiplyMatrices?: (a: unknown, b: unknown) => unknown;
  decompose?: (position: unknown, quaternion: unknown, scale: unknown) => unknown;
};

export type PreviewVectorLike = Record<string, unknown> & {
  x: number;
  y: number;
  z: number;
  applyMatrix4?: (matrix: unknown) => unknown;
};

export type PreviewQuaternionLike = Record<string, unknown>;

function isPreviewMatrixLike(value: unknown): value is PreviewMatrixLike {
  const rec = asRecord<Record<string, unknown>>(value);
  return !!(rec && __isFn(rec.copy) && __isFn(rec.invert));
}

function isPreviewVectorLike(value: unknown): value is PreviewVectorLike {
  const rec = asRecord<Record<string, unknown>>(value);
  return !!(rec && typeof rec.x === 'number' && typeof rec.y === 'number' && typeof rec.z === 'number');
}

function __isFn(v: unknown): v is UnknownCallable {
  return typeof v === 'function';
}

export function createRenderPreviewSketchShared(deps: Pick<RenderPreviewOpsDeps, 'asObject'>) {
  const __asObject = deps.asObject;

  const asPreviewGroup = (x: unknown) => __asObject<PreviewGroupLike>(x);
  const asPreviewMesh = (x: unknown) => __asObject<PreviewMeshLike>(x);
  const asPreviewLine = (x: unknown) => __asObject<PreviewLineLike>(x);
  const readArgs = (x: unknown): SketchPlacementPreviewArgs =>
    __asObject<SketchPlacementPreviewArgs>(x) ?? {};
  const readUserData = (x: unknown): SketchPlacementPreviewUserData =>
    __asObject<SketchPlacementPreviewUserData>(x) ?? {};
  const ensureGroupUserData = (g: PreviewGroupLike): SketchPlacementPreviewUserData => {
    const next = readUserData(g.userData);
    g.userData = next;
    return next;
  };
  const markKeepMaterial = (mat: PreviewMaterialLike) => {
    mat.userData = mat.userData || {};
    mat.userData.__keepMaterial = true;
  };
  const markIgnoreRaycast = (obj: PreviewMeshLike | PreviewLineLike | PreviewGroupLike) => {
    obj.userData = obj.userData || {};
    obj.userData.__ignoreRaycast = true;
  };
  const readOutline = (m: PreviewMeshLike | null | undefined): PreviewLineLike | null =>
    m ? asPreviewLine(m.userData?.__outline) : null;
  const setOutlineVisible = (m: PreviewMeshLike | null | undefined, on: boolean) => {
    const outline = readOutline(m);
    if (outline) outline.visible = on;
  };
  const readValueRecord = (x: unknown): PreviewValueRecord | null =>
    __asObject<PreviewValueRecord>(x) ?? null;
  const callMethod = (target: unknown, key: string, args: unknown[] = []): boolean => {
    const rec = readValueRecord(target);
    const fn = rec && __isFn(rec[key]) ? rec[key] : null;
    if (!fn) return false;
    Reflect.apply(fn, target, args);
    return true;
  };
  const readPreviewDrawerList = (value: unknown): PreviewDrawerEntry[] => {
    if (!Array.isArray(value)) return [];
    const out: PreviewDrawerEntry[] = [];
    for (let i = 0; i < value.length; i += 1) {
      const entry = __asObject<PreviewDrawerEntry>(value[i]);
      if (entry) out.push(entry);
    }
    return out;
  };
  const readMatrix4 = (value: unknown): PreviewMatrixLike | null =>
    isPreviewMatrixLike(value) ? value : null;
  const readVector3 = (value: unknown): PreviewVectorLike | null =>
    isPreviewVectorLike(value) ? value : null;
  const readQuaternion = (value: unknown): PreviewQuaternionLike | null => readValueRecord(value);
  const makeCtorValue = (THREE: unknown, key: 'Matrix4' | 'Vector3' | 'Quaternion', args: unknown[] = []) => {
    const rec = readValueRecord(THREE);
    const ctor = rec && __isFn(rec[key]) ? rec[key] : null;
    if (!ctor) return null;
    try {
      return Reflect.construct(ctor, args);
    } catch {
      return null;
    }
  };
  const readPreviewObjectList = (value: unknown): PreviewMeshLike[] => {
    if (!Array.isArray(value)) return [];
    const out: PreviewMeshLike[] = [];
    for (let i = 0; i < value.length; i += 1) {
      const obj = asPreviewMesh(value[i]);
      if (obj) out.push(obj);
    }
    return out;
  };
  const resetMeshOrientation = (m: PreviewMeshLike | null) => {
    if (!m) return;
    const rec = readValueRecord(m);
    const quaternion = readValueRecord(rec?.quaternion);
    if (typeof quaternion?.identity === 'function') quaternion.identity();
    else if (typeof quaternion?.set === 'function') quaternion.set(0, 0, 0, 1);
    const rotation = readValueRecord(rec?.rotation);
    if (typeof rotation?.set === 'function') rotation.set(0, 0, 0);
  };
  const sketchMeshKeys: ReadonlyArray<string> = [
    '__shelfA',
    '__boxTop',
    '__boxBottom',
    '__boxLeft',
    '__boxRight',
    '__boxBack',
  ];

  return {
    asPreviewGroup,
    asPreviewMesh,
    asPreviewLine,
    readArgs,
    readUserData,
    ensureGroupUserData,
    markKeepMaterial,
    markIgnoreRaycast,
    readOutline,
    setOutlineVisible,
    readValueRecord,
    callMethod,
    readPreviewDrawerList,
    readMatrix4,
    readVector3,
    readQuaternion,
    makeCtorValue,
    readPreviewObjectList,
    resetMeshOrientation,
    sketchMeshKeys,
    isFn: __isFn,
  };
}

export type RenderPreviewSketchShared = ReturnType<typeof createRenderPreviewSketchShared>;
