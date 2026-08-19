import { CARCASS_SHELL_DIMENSIONS } from '../../shared/dimensions/carcass_shell_policy.js';
import { getWardrobeGroup } from '../runtime/render_access.js';
import { resolveHexCellGeometry } from '../features/hex_cell/index.js';
import {
  buildHexCellDiagonalUserData,
  createHexCellDiagonalGlassVisual,
  resolveHexCellDiagonalGlassState,
} from './hex_cell_diagonal_visual.js';

import type { ModuleLoopRuntime } from './module_loop_pipeline_runtime.js';
import type { ModuleLoopMutableState } from './module_loop_pipeline_module_contracts.js';
import type { ResolvedModuleFrame } from './module_loop_pipeline_module_frame.js';

type P2 = { x: number; z: number };

type ShapeLike = {
  moveTo: (x: number, y: number) => unknown;
  lineTo: (x: number, y: number) => unknown;
  closePath?: () => unknown;
};

type ThreeLoose = {
  Shape?: new () => ShapeLike;
  ExtrudeGeometry?: new (shape: ShapeLike, opts: Record<string, unknown>) => unknown;
  BoxGeometry?: new (w: number, h: number, d: number) => unknown;
  Mesh?: new (geo: unknown, mat: unknown) => unknown;
};

type Object3DLoose = {
  position?: { set: (x: number, y: number, z: number) => unknown };
  rotation?: { x?: number; y?: number; z?: number };
  userData?: unknown;
  castShadow?: boolean;
  receiveShadow?: boolean;
};

type MeshLoose = {
  position?: { set: (x: number, y: number, z: number) => unknown };
  rotation?: { x?: number; y?: number; z?: number };
  userData?: unknown;
  castShadow?: boolean;
  receiveShadow?: boolean;
};

function resolveHorizontalCarcassFrontZ(args: { cabinetDepth: number; panelDepth: number }): number {
  const shell = CARCASS_SHELL_DIMENSIONS;
  const panelDepth = Math.max(
    shell.boardMinDepthM,
    args.panelDepth - (shell.backInsetZM + shell.frontInsetZM)
  );
  return -args.cabinetDepth / 2 + shell.backInsetZM + panelDepth;
}

function createShape(three: ThreeLoose, points: P2[]): ShapeLike | null {
  if (typeof three.Shape !== 'function' || !points.length) return null;
  const firstPoint = points[0];
  if (!firstPoint) return null;
  const shape = new three.Shape();
  shape.moveTo(firstPoint.x, firstPoint.z);
  for (const point of points.slice(1)) shape.lineTo(point.x, point.z);
  if (typeof shape.closePath === 'function') shape.closePath();
  return shape;
}

function createHexCellHorizontalExtensionFootprint(args: {
  leftX: number;
  rightX: number;
  extensionBackZ: number;
  doorLeftX: number;
  doorRightX: number;
  doorZ: number;
}): P2[] {
  return [
    { x: args.leftX, z: args.extensionBackZ },
    { x: args.rightX, z: args.extensionBackZ },
    { x: args.doorRightX, z: args.doorZ },
    { x: args.doorLeftX, z: args.doorZ },
  ];
}

function addOutlines(runtime: ModuleLoopRuntime, mesh: unknown): void {
  try {
    (runtime.addOutlines as ((value: unknown) => unknown) | undefined)?.(mesh);
  } catch {
    // Outlines are visual-only; geometry itself is already present.
  }
}

function placeHexCellDiagonalObject(args: {
  obj: Object3DLoose;
  runtime: ModuleLoopRuntime;
  x: number;
  y: number;
  z: number;
  rotY: number;
}): void {
  args.obj.position?.set(args.x, args.y, args.z);
  if (args.obj.rotation) args.obj.rotation.y = args.rotY;
  addOutlines(args.runtime, args.obj as unknown);
  getWardrobeGroup(args.runtime.App)?.add(args.obj as never);
}

function addBoardMesh(args: {
  runtime: ModuleLoopRuntime;
  geometry: unknown;
  partId: string;
  x?: number;
  y?: number;
  z?: number;
  rotX?: number;
  rotY?: number;
  userData?: Record<string, unknown>;
}): void {
  const three = args.runtime.THREE as unknown as ThreeLoose;
  if (typeof three.Mesh !== 'function') return;
  const mat = args.runtime.getPartMaterial(args.partId) || args.runtime.bodyMat;
  const mesh = new three.Mesh(args.geometry, mat) as MeshLoose;
  if (
    mesh.position &&
    typeof args.x === 'number' &&
    typeof args.y === 'number' &&
    typeof args.z === 'number'
  ) {
    mesh.position.set(args.x, args.y, args.z);
  } else if (mesh.position && typeof args.y === 'number') {
    mesh.position.set(0, args.y, 0);
  }
  if (mesh.rotation) {
    if (typeof args.rotX === 'number') mesh.rotation.x = args.rotX;
    if (typeof args.rotY === 'number') mesh.rotation.y = args.rotY;
  }
  mesh.userData = args.userData || { partId: args.partId };
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  addOutlines(args.runtime, mesh as unknown);
  getWardrobeGroup(args.runtime.App)?.add(mesh as never);
}

function addSegmentPanel(args: {
  runtime: ModuleLoopRuntime;
  a: P2;
  b: P2;
  partId: string;
  bottomY: number;
  height: number;
}): void {
  const three = args.runtime.THREE as unknown as ThreeLoose;
  if (typeof three.BoxGeometry !== 'function') return;
  const dx = args.b.x - args.a.x;
  const dz = args.b.z - args.a.z;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (!Number.isFinite(len) || len <= args.runtime.woodThick) return;
  const x = (args.a.x + args.b.x) / 2;
  const y = args.bottomY + args.height / 2;
  const z = (args.a.z + args.b.z) / 2;
  const rotY = -Math.atan2(dz, dx);
  const userData = buildHexCellDiagonalUserData({
    partId: args.partId,
    width: len,
    height: args.height,
    stackKey: args.runtime.stackKey,
  });
  const glassState = resolveHexCellDiagonalGlassState({
    cfg: args.runtime.cfg,
    partId: args.partId,
    globalDoorStyle: args.runtime.doorStyle,
  });
  const glassVisual = createHexCellDiagonalGlassVisual({
    createDoorVisual: args.runtime.createDoorVisual ?? null,
    width: len,
    height: args.height,
    thickness: args.runtime.woodThick,
    material:
      args.runtime.getPartMaterial(args.partId) || args.runtime.globalFrontMat || args.runtime.bodyMat,
    baseMaterial: args.runtime.bodyMat,
    partId: args.partId,
    state: glassState,
    userData,
  });
  if (glassVisual) {
    placeHexCellDiagonalObject({
      obj: glassVisual,
      runtime: args.runtime,
      x,
      y,
      z,
      rotY,
    });
    return;
  }

  const geometry = new three.BoxGeometry(len, args.height, args.runtime.woodThick);
  addBoardMesh({
    runtime: args.runtime,
    geometry,
    partId: args.partId,
    x,
    y,
    z,
    rotY,
    userData,
  });
}

export function applyHexCellGeometryForModule(
  runtime: ModuleLoopRuntime,
  state: ModuleLoopMutableState,
  index: number,
  frame: ResolvedModuleFrame
): void {
  const geometry = resolveHexCellGeometry({
    cfgMod: frame.config,
    moduleWidthM: frame.modWidth,
    defaultDepthM: runtime.D,
    woodThickM: runtime.woodThick,
  });
  if (!geometry) return;

  const three = runtime.THREE as unknown as ThreeLoose;
  if (typeof three.ExtrudeGeometry !== 'function') return;

  const leftX = state.currentX;
  const rightX = state.currentX + frame.modWidth;
  const centerX = frame.moduleCenterX;
  const carcassBackZ = -runtime.D / 2;
  const sideFrontZ = carcassBackZ + geometry.sideDepthM;
  const extensionBackZ = resolveHorizontalCarcassFrontZ({
    cabinetDepth: runtime.D,
    panelDepth: geometry.sideDepthM,
  });
  const doorZ = carcassBackZ + geometry.doorDepthM;
  const halfDoorW = geometry.doorWidthM / 2;
  const doorLeftX = Math.max(leftX + runtime.woodThick, centerX - halfDoorW);
  const doorRightX = Math.min(rightX - runtime.woodThick, centerX + halfDoorW);

  const footprint = createHexCellHorizontalExtensionFootprint({
    leftX,
    rightX,
    extensionBackZ,
    doorLeftX,
    doorRightX,
    doorZ,
  });
  const shape = createShape(three, footprint);
  if (!shape) return;

  const prefix = runtime.stackKey === 'bottom' ? 'lower_' : '';
  const floorPartId = `${prefix}body_floor`;
  const ceilPartId = `${prefix}body_ceil`;
  const floorGeometry = new three.ExtrudeGeometry(shape, { depth: runtime.woodThick, bevelEnabled: false });
  addBoardMesh({
    runtime,
    geometry: floorGeometry,
    partId: floorPartId,
    y: runtime.startY + runtime.woodThick,
    rotX: Math.PI / 2,
    userData: {
      partId: floorPartId,
      moduleIndex: index,
      kind: 'hexCellHorizontal',
      __wpStack: runtime.stackKey,
    },
  });

  const ceilGeometry = new three.ExtrudeGeometry(shape, { depth: runtime.woodThick, bevelEnabled: false });
  addBoardMesh({
    runtime,
    geometry: ceilGeometry,
    partId: ceilPartId,
    y: runtime.startY + frame.moduleCabinetBodyHeight,
    rotX: Math.PI / 2,
    userData: {
      partId: ceilPartId,
      moduleIndex: index,
      kind: 'hexCellHorizontal',
      __wpStack: runtime.stackKey,
    },
  });

  const panelBottomY = runtime.startY + runtime.woodThick;
  const panelHeight = Math.max(runtime.woodThick, frame.moduleCabinetBodyHeight - 2 * runtime.woodThick);
  addSegmentPanel({
    runtime,
    a: { x: leftX, z: sideFrontZ },
    b: { x: doorLeftX, z: doorZ },
    partId: `${prefix}hex_cell_${index + 1}_diag_left`,
    bottomY: panelBottomY,
    height: panelHeight,
  });
  addSegmentPanel({
    runtime,
    a: { x: doorRightX, z: doorZ },
    b: { x: rightX, z: sideFrontZ },
    partId: `${prefix}hex_cell_${index + 1}_diag_right`,
    bottomY: panelBottomY,
    height: panelHeight,
  });
}
