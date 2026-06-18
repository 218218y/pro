import type { CornerCell } from './corner_geometry_plan.js';
import type { CornerWingCarcassFlowParams } from './corner_wing_carcass_shared.js';
import type { CornerWingCarcassShellMetrics } from './corner_wing_carcass_shell_metrics.js';
import { resolveHexCellGeometry, type HexCellGeometry } from '../features/hex_cell/index.js';
import {
  buildHexCellDiagonalUserData,
  createHexCellDiagonalGlassVisual,
  resolveHexCellDiagonalGlassState,
} from './hex_cell_diagonal_visual.js';
import { CORNER_WING_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';

type P2 = { x: number; z: number };

type ShapeLike = {
  moveTo: (x: number, y: number) => unknown;
  lineTo: (x: number, y: number) => unknown;
  closePath?: () => unknown;
};

type HexObject3DLike = {
  position?: { set(x: number, y: number, z: number): void };
  rotation?: { x?: number; y?: number; z?: number };
  userData?: Record<string, unknown>;
  castShadow?: boolean;
  receiveShadow?: boolean;
};

type ThreeHexLike = {
  Shape?: new () => ShapeLike;
  ExtrudeGeometry?: new (shape: ShapeLike, opts: Record<string, unknown>) => unknown;
  BoxGeometry?: new (width: number, height: number, depth: number) => unknown;
  Mesh?: new (
    geometry: unknown,
    material: unknown
  ) => {
    position: { set(x: number, y: number, z: number): void };
    rotation: { x?: number; y?: number; z?: number };
    userData: Record<string, unknown>;
    castShadow?: boolean;
    receiveShadow?: boolean;
  };
};

function createShape(three: ThreeHexLike, points: P2[]): ShapeLike | null {
  if (typeof three.Shape !== 'function' || points.length <= 0) return null;
  const shape = new three.Shape();
  shape.moveTo(points[0].x, points[0].z);
  for (let i = 1; i < points.length; i += 1) shape.lineTo(points[i].x, points[i].z);
  if (typeof shape.closePath === 'function') shape.closePath();
  return shape;
}

export function resolveCornerCellHexGeometry(args: {
  cfgCell: unknown;
  cellWidthM: number;
  defaultDepthM: number;
  woodThickM: number;
}): HexCellGeometry | null {
  return resolveHexCellGeometry({
    cfgMod: args.cfgCell,
    moduleWidthM: args.cellWidthM,
    defaultDepthM: args.defaultDepthM,
    woodThickM: args.woodThickM,
  });
}

export function getCornerHexDoorDepth(cell: CornerCell, fallbackDepth: number): number {
  const geometry = cell.__hexCellGeometry;
  return geometry && Number.isFinite(geometry.doorDepthM) && geometry.doorDepthM > 0
    ? geometry.doorDepthM
    : fallbackDepth;
}

export function getCornerHexHitDepth(cell: CornerCell): number {
  const geometry = cell.__hexCellGeometry;
  const sideDepth = Number.isFinite(cell.depth) ? cell.depth : 0;
  const doorDepth = geometry && Number.isFinite(geometry.doorDepthM) ? geometry.doorDepthM : sideDepth;
  return Math.max(sideDepth, doorDepth, CORNER_WING_DIMENSIONS.selector.minDepthM);
}

export function buildCornerHexFootprint(args: {
  cell: CornerCell;
  wingD: number;
  woodThick: number;
}): { points: P2[]; doorLeftX: number; doorRightX: number; sideFrontZ: number; doorZ: number } | null {
  const geometry = args.cell.__hexCellGeometry;
  if (!geometry) return null;

  const leftX = args.cell.startX;
  const rightX = args.cell.startX + args.cell.width;
  const centerX = args.cell.centerX;
  const backZ = -args.wingD;
  const sideFrontZ = backZ + geometry.sideDepthM;
  const doorZ = backZ + geometry.doorDepthM;
  const halfDoorW = geometry.doorWidthM / 2;
  const doorLeftX = Math.max(leftX + args.woodThick, centerX - halfDoorW);
  const doorRightX = Math.min(rightX - args.woodThick, centerX + halfDoorW);

  return {
    doorLeftX,
    doorRightX,
    sideFrontZ,
    doorZ,
    points: [
      { x: leftX, z: backZ },
      { x: rightX, z: backZ },
      { x: rightX, z: sideFrontZ },
      { x: doorRightX, z: doorZ },
      { x: doorLeftX, z: doorZ },
      { x: leftX, z: sideFrontZ },
    ],
  };
}

export function addCornerHexHorizontalBoard(args: {
  params: CornerWingCarcassFlowParams;
  metrics: CornerWingCarcassShellMetrics;
  cell: CornerCell;
  partId: string;
  y: number;
  material: unknown;
}): boolean {
  const { ctx } = args.params;
  const three = ctx.THREE as unknown as ThreeHexLike;
  if (typeof three.ExtrudeGeometry !== 'function' || typeof three.Mesh !== 'function') return false;

  const footprint = buildCornerHexFootprint({
    cell: args.cell,
    wingD: ctx.wingD,
    woodThick: ctx.woodThick,
  });
  if (!footprint) return false;

  const shape = createShape(three, footprint.points);
  if (!shape) return false;

  const geometry = new three.ExtrudeGeometry(shape, { depth: ctx.woodThick, bevelEnabled: false });
  const board = new three.Mesh(geometry, args.material);
  board.position.set(0, args.y, 0);
  board.rotation.x = Math.PI / 2;
  board.userData = {
    partId: args.partId,
    moduleIndex: args.cell.key,
    kind: 'hexCellHorizontal',
    __wpStack: ctx.__stackKey,
    __wpStackSplitUnifiedFrame: ctx.__stackSplitUnifiedFrame,
  };
  board.castShadow = true;
  board.receiveShadow = true;
  ctx.addOutlines(board);
  ctx.wingGroup.add(board);
  return true;
}

export function addCornerHexDiagonalPanels(args: {
  params: CornerWingCarcassFlowParams;
  cell: CornerCell;
  material: unknown;
}): void {
  const { ctx } = args.params;
  const three = ctx.THREE as unknown as ThreeHexLike;
  if (typeof three.BoxGeometry !== 'function' || typeof three.Mesh !== 'function') return;
  const BoxGeometry = three.BoxGeometry;
  const Mesh = three.Mesh;

  const footprint = buildCornerHexFootprint({ cell: args.cell, wingD: ctx.wingD, woodThick: ctx.woodThick });
  if (!footprint) return;

  const panelBottomY = ctx.startY + ctx.woodThick;
  const panelHeight = Math.max(ctx.woodThick, args.cell.bodyHeight - 2 * ctx.woodThick);

  const cfg = args.params.helpers.getCfg(args.params.locals.App) || {};
  const addSegment = (a: P2, b: P2, partId: string): void => {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (!Number.isFinite(len) || len <= ctx.woodThick) return;
    const x = (a.x + b.x) / 2;
    const y = panelBottomY + panelHeight / 2;
    const z = (a.z + b.z) / 2;
    const rotY = -Math.atan2(dz, dx);
    const userData = buildHexCellDiagonalUserData({
      partId,
      width: len,
      height: panelHeight,
      moduleIndex: args.cell.key,
      stackKey: ctx.__stackKey,
    });
    const material = ctx.getCornerMat(partId, args.material);
    const glassState = resolveHexCellDiagonalGlassState({
      cfg,
      partId,
      globalDoorStyle: ctx.doorStyle,
      readScopedMapVal: ctx.__readScopedMapVal,
      doorSpecialMap: ctx.__doorSpecialMap,
    });
    const glassVisual = createHexCellDiagonalGlassVisual({
      createDoorVisual: ctx.createDoorVisual,
      width: len,
      height: panelHeight,
      thickness: ctx.woodThick,
      material: material || ctx.frontMat || args.material,
      baseMaterial: ctx.bodyMat,
      partId,
      state: glassState,
      userData,
    });
    if (glassVisual) {
      const obj = glassVisual as HexObject3DLike;
      obj.position?.set(x, y, z);
      if (obj.rotation) obj.rotation.y = rotY;
      ctx.addOutlines(obj);
      ctx.wingGroup.add(obj);
      return;
    }

    const mesh = new Mesh(new BoxGeometry(len, panelHeight, ctx.woodThick), material);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    mesh.userData = userData;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    ctx.addOutlines(mesh);
    ctx.wingGroup.add(mesh);
  };

  const leftX = args.cell.startX;
  const rightX = args.cell.startX + args.cell.width;
  addSegment(
    { x: leftX, z: footprint.sideFrontZ },
    { x: footprint.doorLeftX, z: footprint.doorZ },
    `corner_hex_cell_c${args.cell.idx}_diag_left`
  );
  addSegment(
    { x: footprint.doorRightX, z: footprint.doorZ },
    { x: rightX, z: footprint.sideFrontZ },
    `corner_hex_cell_c${args.cell.idx}_diag_right`
  );
}
