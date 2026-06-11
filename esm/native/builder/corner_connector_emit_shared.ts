// Corner connector shell shared seams.
//
// Keep connector setup / cleanup / footprint math centralized so the public
// pentagon owner can stay focused on orchestration while carcass-shell policy
// lives in dedicated helpers.

import { getWardrobeGroup } from '../runtime/render_access.js';
import { asRecord, isRecord } from './corner_geometry_plan.js';

import type { Object3DLike, ThreeLike, UnknownRecord } from '../../../types';
import type { CornerOpsEmitContext } from './corner_ops_emit_common.js';

type WardrobeChildLike = UnknownRecord & { userData?: UnknownRecord };

type PositionLike = { set(x: number, y: number, z: number): void };
type RotationLike = { x?: number; y?: number; z?: number };
type ShapeLike = { moveTo(x: number, y: number): void; lineTo(x: number, y: number): void };

type GroupLike = Object3DLike & {
  position: PositionLike;
  userData: UnknownRecord;
  add(obj: unknown): void;
};

type MeshLike = Object3DLike & {
  position: PositionLike;
  rotation: RotationLike;
  userData: UnknownRecord;
};

type ThreeCornerConnectorLike = ThreeLike & {
  Group: new () => GroupLike;
  Shape: new () => ShapeLike;
  Mesh: new (geometry: unknown, material: unknown) => MeshLike;
};

export type ShapeInputLike = ShapeLike;
export type P2 = { x: number; z: number };

export type EdgePanelOpts = {
  alignOuterFaceToFootprint?: boolean;
  shrinkStart?: number;
  shrinkEnd?: number;
  eps?: number;
};

export type AddEdgePanelFn = (a: P2, b: P2, partId: string, enabled: boolean, opts?: EdgePanelOpts) => void;

export type CornerConnectorSetup = {
  ctx: CornerOpsEmitContext;
  THREE: ThreeCornerConnectorLike;
  mx: (x: number) => number;
  L: number;
  Dmain: number;
  shape: ShapeInputLike;
  pts: P2[];
  interiorX: number;
  interiorZ: number;
  cornerGroup: GroupLike;
  showFrontPanel: boolean;
  cornerConnectorAsStandaloneCabinet: boolean;
  plateShape: ShapeInputLike;
  carcassBackInsetX: number;
  carcassBackInsetZ: number;
};

function ensureArray(rec: UnknownRecord, key: string): unknown[] {
  const value = rec[key];
  if (Array.isArray(value)) return value;
  const arr: unknown[] = [];
  rec[key] = arr;
  return arr;
}

function readWardrobeChildren(value: unknown): WardrobeChildLike[] {
  const rec = asRecord(value);
  const children = ensureArray(rec, 'children');
  const out: WardrobeChildLike[] = [];
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (isRecord(child)) out.push(asRecord(child));
  }
  return out;
}

function removeWardrobeChild(value: unknown, child: WardrobeChildLike): void {
  const rec = asRecord(value);
  const remove = rec.remove;
  if (typeof remove === 'function') remove(child);
}

function insetPoly(points: P2[], edgeInsets: number[], interiorX: number, interiorZ: number): P2[] | null {
  const n = points.length;
  if (n < 3) return null;
  const lines: Array<{ nx: number; nz: number; c: number }> = [];

  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (!Number.isFinite(len) || len <= 1e-6) return null;

    const nux = -dz / len;
    const nuz = dx / len;
    const midX = (a.x + b.x) / 2;
    const midZ = (a.z + b.z) / 2;
    const vix = interiorX - midX;
    const viz = interiorZ - midZ;
    const dot = nux * vix + nuz * viz;
    const sign = dot >= 0 ? 1 : -1;
    const nx = nux * sign;
    const nz = nuz * sign;
    const d = Math.max(0, Number(edgeInsets[i] ?? 0));
    const c = nx * a.x + nz * a.z + d;
    lines.push({ nx, nz, c });
  }

  const out: P2[] = [];
  for (let i = 0; i < n; i++) {
    const prev = lines[(i - 1 + n) % n];
    const cur = lines[i];
    const det = prev.nx * cur.nz - prev.nz * cur.nx;
    if (!Number.isFinite(det) || Math.abs(det) < 1e-10) return null;
    const x = (prev.c * cur.nz - prev.nz * cur.c) / det;
    const z = (prev.nx * cur.c - prev.c * cur.nx) / det;
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    out.push({ x, z });
  }
  return out;
}

function shapeFromPoly(THREE: ThreeCornerConnectorLike, poly: P2[]): ShapeInputLike {
  const shape = new THREE.Shape();
  shape.moveTo(poly[0].x, poly[0].z);
  for (let i = 1; i < poly.length; i++) shape.lineTo(poly[i].x, poly[i].z);
  shape.lineTo(poly[0].x, poly[0].z);
  return shape;
}

function buildFootprintShape(THREE: ThreeCornerConnectorLike, points: P2[]): ShapeInputLike {
  const shape = new THREE.Shape();
  shape.moveTo(points[0].x, points[0].z);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i].x, points[i].z);
  shape.lineTo(points[0].x, points[0].z);
  return shape;
}

function cleanupPreviousCornerConnector(ctx: CornerOpsEmitContext): void {
  const { App, __stackKey } = ctx;
  const wg = getWardrobeGroup(App);
  const children = readWardrobeChildren(wg);
  if (children.length === 0) return;
  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i];
    if (child && child.userData && child.userData.__wpCornerPentagon === true) {
      const stack = asRecord(child.userData).__wpStack;
      if (!stack || stack === __stackKey) removeWardrobeChild(wg, child);
    }
  }
}

export function createCornerConnectorSetup(ctx: CornerOpsEmitContext): CornerConnectorSetup | null {
  const {
    THREE,
    mainD,
    wingD,
    uiAny,
    cornerWallL,
    roomCornerX,
    roomCornerZ,
    __mirrorX,
    __stackKey,
    __stackOffsetZ,
    cornerConnectorEnabled,
  } = ctx;
  if (!cornerConnectorEnabled) return null;

  const cornerConnectorAsStandaloneCabinet =
    typeof uiAny.cornerConnectorAsStandaloneCabinet !== 'undefined'
      ? !!uiAny.cornerConnectorAsStandaloneCabinet
      : true;
  const Dwing = wingD;
  const Dmain = mainD;
  const L = cornerWallL;
  if (!Number.isFinite(Dwing) || Dwing <= 0.1) return null;
  if (!Number.isFinite(Dmain) || Dmain <= 0.1) return null;
  if (!Number.isFinite(L) || L <= 0.2) return null;

  const showFrontPanel =
    typeof uiAny.cornerCabinetFrontPanel !== 'undefined' ? !!uiAny.cornerCabinetFrontPanel : true;
  const mx = (x: number): number => x * __mirrorX;

  cleanupPreviousCornerConnector(ctx);

  const cornerGroup = new THREE.Group();
  cornerGroup.position.set(roomCornerX, 0, roomCornerZ + __stackOffsetZ);
  cornerGroup.userData = {
    partId: 'corner_pentagon',
    moduleIndex: 'corner_pentagon',
    __wpCornerPentagon: true,
    __wpStack: __stackKey,
  };

  const pts: P2[] = [
    { x: 0, z: 0 },
    { x: 0, z: L },
    { x: mx(-Dwing), z: L },
    { x: mx(-L), z: Dmain },
    { x: mx(-L), z: 0 },
  ];
  const shape = buildFootprintShape(THREE, pts);
  const interiorX = pts.reduce((sum, point) => sum + point.x, 0) / pts.length;
  const interiorZ = pts.reduce((sum, point) => sum + point.z, 0) / pts.length;

  const carcassBackInsetX = 0.0078;
  const carcassBackInsetZ = 0.0078;
  const carcassFrontInset = 0.005;
  const plateSideInset = ctx.woodThick + 0.0006;
  const plateEdgeInsets = [
    carcassBackInsetX,
    plateSideInset,
    carcassFrontInset,
    plateSideInset,
    carcassBackInsetZ,
  ];
  const platePoly = insetPoly(pts, plateEdgeInsets, interiorX, interiorZ);
  const plateShape = platePoly && platePoly.length >= 3 ? shapeFromPoly(THREE, platePoly) : shape;

  return {
    ctx,
    THREE,
    mx,
    L,
    Dmain,
    shape,
    pts,
    interiorX,
    interiorZ,
    cornerGroup,
    showFrontPanel,
    cornerConnectorAsStandaloneCabinet,
    plateShape,
    carcassBackInsetX,
    carcassBackInsetZ,
  };
}
