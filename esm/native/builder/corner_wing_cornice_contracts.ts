// Corner wing cornice contracts/helpers.
//
// Keep the public wing cornice owner focused on flow routing while the heavier
// profile builders consume one canonical set of contracts.

import type { BufferAttrLike } from './corner_geometry_plan.js';

export type UnknownRecord = Record<string, unknown>;

export type CornicePoint = { x: number; y: number };

export type CornicePartId = 'corner_cornice_front' | 'corner_cornice_side_left' | 'corner_cornice_side_right';

export type CorniceSegment = {
  length: number;
  profile: CornicePoint[];
  partId: CornicePartId;
  rotationY?: number;
  flipX?: boolean;
  miterStartTrim?: number;
  miterEndTrim?: number;
  x: number;
  y: number;
  z: number;
};

export type ShapeLike = {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
};

export type GeometryLike = {
  computeVertexNormals(): void;
  translate(x: number, y: number, z: number): void;
  getAttribute(name: string): unknown;
};

export type MeshLike = {
  position: { set(x: number, y: number, z: number): void };
  rotation: { y: number };
  scale: { x: number };
  userData: UnknownRecord;
  castShadow?: boolean;
  receiveShadow?: boolean;
};

export type GroupLike = {
  add(obj: unknown): void;
};

export type ThreeCorniceLike = {
  Shape: new () => ShapeLike;
  ExtrudeGeometry: new (shape: ShapeLike, opts: UnknownRecord) => GeometryLike;
  BoxGeometry: new (width: number, height: number, depth: number) => unknown;
  Mesh: new (geometry: unknown, material: unknown) => MeshLike;
};

export type CorniceCtxLike = {
  App: unknown;
  THREE: unknown;
  woodThick: number;
  startY: number;
  wingH: number;
  wingD: number;
  wingW: number;
  cornerConnectorEnabled: boolean;
  hasCorniceEnabled: boolean;
  __corniceAllowedForThisStack: boolean;
  __corniceTypeNorm: string;
  getCornerMat: (partId: string, fallback: unknown) => unknown;
  bodyMat: unknown;
  addOutlines: (mesh: unknown) => void;
  __sketchMode: boolean;
  wingGroup: GroupLike;
};

export type CorniceLocalsLike = {
  __wingBackPanelThick: number;
  __wingBackPanelCenterZ: number;
};

export type CorniceHelpersLike = {
  getCfg: (app: unknown) => UnknownRecord;
  readMap: (app: unknown, key: string) => unknown;
  isRecord: (value: unknown) => value is UnknownRecord;
  asRecord: (value: unknown) => UnknownRecord;
  readNumFrom: (obj: unknown, key: string, fallback: number) => number;
};

export type CorniceParamsLike = {
  ctx: unknown;
  locals: unknown;
  helpers: unknown;
};

export function asObject(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const out: UnknownRecord = {};
  for (const key of Object.keys(value)) out[key] = Reflect.get(value, key);
  return out;
}

export function isThreeCorniceLike(value: unknown): value is ThreeCorniceLike {
  const rec = asObject(value);
  return (
    !!rec &&
    typeof rec.Shape === 'function' &&
    typeof rec.ExtrudeGeometry === 'function' &&
    typeof rec.Mesh === 'function'
  );
}

export function getThreeCornice(threeLike: unknown): ThreeCorniceLike | null {
  return isThreeCorniceLike(threeLike) ? threeLike : null;
}

export function isBufferAttrLike(value: unknown): value is BufferAttrLike {
  const rec = asObject(value);
  return (
    !!rec &&
    typeof rec.count === 'number' &&
    typeof rec.getX === 'function' &&
    typeof rec.getZ === 'function' &&
    typeof rec.setZ === 'function'
  );
}

export function asBufferAttr(value: unknown): BufferAttrLike | null {
  return isBufferAttrLike(value) ? value : null;
}

export function isGroupLike(value: unknown): value is GroupLike {
  const rec = asObject(value);
  return !!rec && typeof rec.add === 'function';
}

export function isCorniceCtxLike(value: unknown): value is CorniceCtxLike {
  const rec = asObject(value);
  return (
    !!rec &&
    typeof rec.getCornerMat === 'function' &&
    typeof rec.addOutlines === 'function' &&
    isGroupLike(rec.wingGroup)
  );
}

export function isCorniceLocalsLike(value: unknown): value is CorniceLocalsLike {
  const rec = asObject(value);
  return (
    !!rec && typeof rec.__wingBackPanelThick === 'number' && typeof rec.__wingBackPanelCenterZ === 'number'
  );
}

export function isCorniceHelpersLike(value: unknown): value is CorniceHelpersLike {
  const rec = asObject(value);
  return !!rec && typeof rec.readNumFrom === 'function';
}

export function readCornicePoints(
  profile: unknown,
  readNumFrom: CorniceHelpersLike['readNumFrom']
): CornicePoint[] {
  if (!Array.isArray(profile)) return [];
  const out: CornicePoint[] = [];
  for (let i = 0; i < profile.length; i++) {
    const point = profile[i];
    const x = readNumFrom(point, 'x', NaN);
    const y = readNumFrom(point, 'y', NaN);
    if (Number.isFinite(x) && Number.isFinite(y)) out.push({ x, y });
  }
  return out;
}
