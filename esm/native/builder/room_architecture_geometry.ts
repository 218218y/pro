import type {
  AxisAlignedBox,
  ResolvedRoomOpeningGeometry,
  RoomArchitectureConfigLike,
  RoomArchitectureGeometry,
  RoomArchitecturePlan,
  RoomArchitecturePlanInput,
  RoomArchitectureWallGeometry,
  RoomColumnAdjustedHorizontalSpan,
  RoomColumnAdjustmentGeometry,
  RoomColumnLinerFace,
  RoomColumnLinerPanel,
  RoomWallId,
  RoomWallOpeningLike,
  RoomWallSurfaceGeometry,
} from '../../../types/index.js';

import { CARCASS_BACK_PANEL_THICKNESS_M } from './core_carcass_shell.js';

export const ROOM_WALL_THICKNESS_M = 0.2;
export const ROOM_BACK_WALL_THICKNESS_M = ROOM_WALL_THICKNESS_M;
export const ROOM_BACK_WALL_GAP_M = 0.01;
export const ROOM_ARCHITECTURE_EPSILON_M = 0.00005;
export const ROOM_COLUMN_LINER_THICKNESS_M = CARCASS_BACK_PANEL_THICKNESS_M;

function finitePositive(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function resolveWardrobeDimensions(input: RoomArchitecturePlanInput): {
  width: number;
  height: number;
  depth: number;
} {
  return {
    width: finitePositive(input.wardrobeWidthM) ?? 2.4,
    height: finitePositive(input.wardrobeHeightM) ?? 2.4,
    depth: finitePositive(input.wardrobeDepthM) ?? 0.6,
  };
}

function cloneRoomArchitectureConfig(config: RoomArchitectureConfigLike): RoomArchitectureConfigLike {
  return {
    backWall: { ...config.backWall },
    leftWall: { ...config.leftWall },
    rightWall: { ...config.rightWall },
    column: { ...config.column },
    openings: Array.isArray(config.openings) ? config.openings.map(opening => ({ ...opening })) : [],
    wallColor: config.wallColor,
    surfacesHidden: config.surfacesHidden,
  };
}

function withBoxMetrics(box: AxisAlignedBox): RoomArchitectureWallGeometry {
  const width = Math.max(0, box.maxX - box.minX);
  const height = Math.max(0, box.maxY - box.minY);
  const depth = Math.max(0, box.maxZ - box.minZ);
  return {
    ...box,
    width,
    height,
    depth,
    centerX: (box.minX + box.maxX) / 2,
    centerY: (box.minY + box.maxY) / 2,
    centerZ: (box.minZ + box.maxZ) / 2,
  };
}

function resolveRoomArchitectureGeometry(input: RoomArchitecturePlanInput): RoomArchitectureGeometry {
  const wardrobe = resolveWardrobeDimensions(input);
  const config = cloneRoomArchitectureConfig(input.config);
  const wallWidthM = config.backWall.widthCm / 100;
  const wallHeightM = config.backWall.heightCm / 100;
  const offsetLeftM = config.backWall.wardrobeOffsetLeftCm / 100;
  const wallLeftX = -wardrobe.width / 2 - offsetLeftM;
  const wallFrontZ = -wardrobe.depth / 2 - ROOM_BACK_WALL_GAP_M;
  const wall = withBoxMetrics({
    minX: wallLeftX,
    maxX: wallLeftX + wallWidthM,
    minY: 0,
    maxY: wallHeightM,
    minZ: wallFrontZ - ROOM_WALL_THICKNESS_M,
    maxZ: wallFrontZ,
  });

  const resolveSideWall = (
    side: 'left' | 'right',
    sideConfig: RoomArchitectureConfigLike['leftWall']
  ): RoomArchitectureWallGeometry | null => {
    if (!sideConfig.enabled) return null;
    const depthM = sideConfig.depthCm / 100;
    const heightM = sideConfig.heightCm / 100;
    const minX = side === 'left' ? wall.minX - ROOM_WALL_THICKNESS_M : wall.maxX;
    const maxX = side === 'left' ? wall.minX : wall.maxX + ROOM_WALL_THICKNESS_M;
    return withBoxMetrics({
      minX,
      maxX,
      minY: 0,
      maxY: heightM,
      minZ: wall.minZ,
      maxZ: wall.maxZ + depthM,
    });
  };

  const leftWall = config.backWall.enabled ? resolveSideWall('left', config.leftWall) : null;
  const rightWall = config.backWall.enabled ? resolveSideWall('right', config.rightWall) : null;

  let column: RoomArchitectureGeometry['column'] = null;
  if (config.backWall.enabled && config.column.enabled) {
    const columnLeftX = wallLeftX + config.column.offsetLeftCm / 100;
    const columnBottomY = config.column.bottomOffsetCm / 100;
    column = withBoxMetrics({
      minX: columnLeftX,
      maxX: columnLeftX + config.column.widthCm / 100,
      minY: columnBottomY,
      maxY: columnBottomY + config.column.heightCm / 100,
      minZ: wallFrontZ,
      maxZ: wallFrontZ + config.column.depthCm / 100,
    });
  }

  return {
    config,
    wardrobeWidthM: wardrobe.width,
    wardrobeHeightM: wardrobe.height,
    wardrobeDepthM: wardrobe.depth,
    wall,
    leftWall,
    rightWall,
    column,
  };
}

export function resolveRoomWallSurface(
  geometry: RoomArchitectureGeometry,
  wall: RoomWallId
): RoomWallSurfaceGeometry | null {
  if (!geometry.config.backWall.enabled) return null;
  if (wall === 'back') {
    return {
      wall,
      box: geometry.wall,
      usableLength: geometry.wall.width,
      height: geometry.wall.height,
      axis: 'x',
      startCoord: geometry.wall.minX,
      interiorFaceCoord: geometry.wall.maxZ,
      inwardNormalX: 0,
      inwardNormalZ: 1,
    };
  }

  const box = wall === 'left' ? geometry.leftWall : geometry.rightWall;
  if (!box) return null;
  const usableLength = Math.max(0, box.maxZ - geometry.wall.maxZ);
  return {
    wall,
    box,
    usableLength,
    height: box.height,
    axis: 'z',
    startCoord: geometry.wall.maxZ,
    interiorFaceCoord: wall === 'left' ? box.maxX : box.minX,
    inwardNormalX: wall === 'left' ? 1 : -1,
    inwardNormalZ: 0,
  };
}

function resolveOpeningDimensions(
  opening: RoomWallOpeningLike,
  surface: RoomWallSurfaceGeometry
): { width: number; height: number; bottom: number; offsetAlong: number } | null {
  if (
    !(surface.usableLength > ROOM_ARCHITECTURE_EPSILON_M) ||
    !(surface.height > ROOM_ARCHITECTURE_EPSILON_M)
  ) {
    return null;
  }
  const requestedWidth = finitePositive(opening.widthCm) != null ? opening.widthCm / 100 : 0;
  const requestedHeight = finitePositive(opening.heightCm) != null ? opening.heightCm / 100 : 0;
  if (!(requestedWidth > 0) || !(requestedHeight > 0)) return null;

  const width = Math.min(requestedWidth, surface.usableLength);
  const height = Math.min(requestedHeight, surface.height);
  const maxOffset = Math.max(0, surface.usableLength - width);
  const rawOffset = Number.isFinite(opening.offsetAlongCm) ? opening.offsetAlongCm / 100 : 0;
  const offsetAlong = Math.min(maxOffset, Math.max(0, rawOffset));
  const requestedBottom = opening.kind === 'door' ? 0 : Math.max(0, opening.bottomOffsetCm / 100);
  const bottom = Math.min(Math.max(0, surface.height - height), requestedBottom);
  return { width, height, bottom, offsetAlong };
}

export function resolveRoomOpeningGeometry(
  geometry: RoomArchitectureGeometry,
  opening: RoomWallOpeningLike
): ResolvedRoomOpeningGeometry | null {
  const surface = resolveRoomWallSurface(geometry, opening.wall);
  if (!surface) return null;
  const dims = resolveOpeningDimensions(opening, surface);
  if (!dims) return null;
  const { width, height, bottom, offsetAlong } = dims;
  const start = surface.startCoord + offsetAlong;
  const end = start + width;
  const minY = bottom;
  const maxY = bottom + height;

  const cut: AxisAlignedBox =
    surface.axis === 'x'
      ? {
          minX: start,
          maxX: end,
          minY,
          maxY,
          minZ: surface.box.minZ - ROOM_ARCHITECTURE_EPSILON_M,
          maxZ: surface.box.maxZ + ROOM_ARCHITECTURE_EPSILON_M,
        }
      : {
          minX: surface.box.minX - ROOM_ARCHITECTURE_EPSILON_M,
          maxX: surface.box.maxX + ROOM_ARCHITECTURE_EPSILON_M,
          minY,
          maxY,
          minZ: start,
          maxZ: end,
        };

  return {
    opening,
    surface,
    cut,
    centerX: surface.axis === 'x' ? (start + end) / 2 : surface.box.centerX,
    centerY: (minY + maxY) / 2,
    centerZ: surface.axis === 'z' ? (start + end) / 2 : surface.box.centerZ,
    width,
    height,
    bottom,
    offsetAlong,
    clearancesCm: {
      start: Math.round(offsetAlong * 1000) / 10,
      end: Math.round(Math.max(0, surface.usableLength - offsetAlong - width) * 1000) / 10,
      top: Math.round(Math.max(0, surface.height - bottom - height) * 1000) / 10,
      bottom: Math.round(bottom * 1000) / 10,
    },
  };
}

function resolveRoomOpeningsGeometry(geometry: RoomArchitectureGeometry): ResolvedRoomOpeningGeometry[] {
  const openings = Array.isArray(geometry.config.openings) ? geometry.config.openings : [];
  const out: ResolvedRoomOpeningGeometry[] = [];
  for (const opening of openings) {
    const resolved = resolveRoomOpeningGeometry(geometry, opening);
    if (resolved) out.push(resolved);
  }
  return out;
}

export function intersectAxisAlignedBoxes(a: AxisAlignedBox, b: AxisAlignedBox): AxisAlignedBox | null {
  const overlap: AxisAlignedBox = {
    minX: Math.max(a.minX, b.minX),
    maxX: Math.min(a.maxX, b.maxX),
    minY: Math.max(a.minY, b.minY),
    maxY: Math.min(a.maxY, b.maxY),
    minZ: Math.max(a.minZ, b.minZ),
    maxZ: Math.min(a.maxZ, b.maxZ),
  };
  if (
    overlap.maxX - overlap.minX <= ROOM_ARCHITECTURE_EPSILON_M ||
    overlap.maxY - overlap.minY <= ROOM_ARCHITECTURE_EPSILON_M ||
    overlap.maxZ - overlap.minZ <= ROOM_ARCHITECTURE_EPSILON_M
  ) {
    return null;
  }
  return overlap;
}

export function boxFromCenterSize(args: {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
}): AxisAlignedBox {
  return {
    minX: args.x - args.width / 2,
    maxX: args.x + args.width / 2,
    minY: args.y - args.height / 2,
    maxY: args.y + args.height / 2,
    minZ: args.z - args.depth / 2,
    maxZ: args.z + args.depth / 2,
  };
}

function appendBoxIfPositive(out: AxisAlignedBox[], box: AxisAlignedBox): void {
  if (
    box.maxX - box.minX > ROOM_ARCHITECTURE_EPSILON_M &&
    box.maxY - box.minY > ROOM_ARCHITECTURE_EPSILON_M &&
    box.maxZ - box.minZ > ROOM_ARCHITECTURE_EPSILON_M
  ) {
    out.push(box);
  }
}

/** Exact decomposition of A \ B for axis-aligned rectangular prisms. */
type AxisAlignedBoxAxis = 'x' | 'y' | 'z';

type AxisAlignedBoxBounds = readonly [keyof AxisAlignedBox, keyof AxisAlignedBox];

const AXIS_ALIGNED_BOX_BOUNDS: Readonly<Record<AxisAlignedBoxAxis, AxisAlignedBoxBounds>> = Object.freeze({
  x: Object.freeze(['minX', 'maxX'] as const),
  y: Object.freeze(['minY', 'maxY'] as const),
  z: Object.freeze(['minZ', 'maxZ'] as const),
});

function subtractAxisAlignedBoxInOrder(
  source: AxisAlignedBox,
  obstacle: AxisAlignedBox,
  axisOrder: readonly [AxisAlignedBoxAxis, AxisAlignedBoxAxis, AxisAlignedBoxAxis]
): AxisAlignedBox[] {
  const cut = intersectAxisAlignedBoxes(source, obstacle);
  if (!cut) return [source];

  const out: AxisAlignedBox[] = [];
  let remainder: AxisAlignedBox = { ...source };
  for (const axis of axisOrder) {
    const [minKey, maxKey] = AXIS_ALIGNED_BOX_BOUNDS[axis];
    appendBoxIfPositive(out, { ...remainder, [maxKey]: cut[minKey] } as AxisAlignedBox);
    appendBoxIfPositive(out, { ...remainder, [minKey]: cut[maxKey] } as AxisAlignedBox);
    remainder = {
      ...remainder,
      [minKey]: cut[minKey],
      [maxKey]: cut[maxKey],
    } as AxisAlignedBox;
  }
  return out;
}

export function subtractAxisAlignedBox(source: AxisAlignedBox, obstacle: AxisAlignedBox): AxisAlignedBox[] {
  return subtractAxisAlignedBoxInOrder(source, obstacle, ['x', 'y', 'z']);
}

type WallOpeningRect = Readonly<{
  minU: number;
  maxU: number;
  minY: number;
  maxY: number;
}>;

export type RoomWallOpeningMeshData = Readonly<{
  positions: number[];
  normals: number[];
}>;

type Vec3Tuple = readonly [number, number, number];

function appendUniqueCoordinate(values: number[], value: number): void {
  if (!values.some(existing => Math.abs(existing - value) <= ROOM_ARCHITECTURE_EPSILON_M)) {
    values.push(value);
  }
}

function adjacentIntervals(values: readonly number[]): Array<readonly [number, number]> {
  const intervals: Array<readonly [number, number]> = [];
  for (let index = 1; index < values.length; index += 1) {
    const start = values[index - 1];
    const end = values[index];
    if (start === undefined || end === undefined) continue;
    intervals.push([start, end]);
  }
  return intervals;
}

function pushOrientedQuad(
  positions: number[],
  normals: number[],
  corners: readonly [Vec3Tuple, Vec3Tuple, Vec3Tuple, Vec3Tuple],
  normal: Vec3Tuple
): void {
  const [p0, p1, p2, p3] = corners;
  const ux = p1[0] - p0[0];
  const uy = p1[1] - p0[1];
  const uz = p1[2] - p0[2];
  const vx = p2[0] - p0[0];
  const vy = p2[1] - p0[1];
  const vz = p2[2] - p0[2];
  const crossX = uy * vz - uz * vy;
  const crossY = uz * vx - ux * vz;
  const crossZ = ux * vy - uy * vx;
  const sameDirection = crossX * normal[0] + crossY * normal[1] + crossZ * normal[2] >= 0;
  const ordered = sameDirection ? ([p0, p1, p2, p0, p2, p3] as const) : ([p0, p3, p2, p0, p2, p1] as const);
  for (const point of ordered) {
    positions.push(point[0], point[1], point[2]);
    normals.push(normal[0], normal[1], normal[2]);
  }
}

/**
 * Builds one continuous wall surface around its rectangular openings.
 *
 * The wall face is tessellated only into coplanar triangles; reveal/edge faces are emitted
 * exclusively on the real outer boundary or on an opening boundary. Unlike decomposing the
 * wall into adjacent boxes, this creates no internal vertical/horizontal faces that can cast
 * seams beyond the dimensions of a door or window.
 */
export function buildRoomWallOpeningMeshData(
  source: AxisAlignedBox,
  cuts: readonly AxisAlignedBox[],
  wallAxis: RoomWallSurfaceGeometry['axis']
): RoomWallOpeningMeshData {
  const minU = wallAxis === 'x' ? source.minX : source.minZ;
  const maxU = wallAxis === 'x' ? source.maxX : source.maxZ;
  const minN = wallAxis === 'x' ? source.minZ : source.minX;
  const maxN = wallAxis === 'x' ? source.maxZ : source.maxX;
  const minY = source.minY;
  const maxY = source.maxY;

  const openings: WallOpeningRect[] = [];
  const uStops = [minU, maxU];
  const yStops = [minY, maxY];
  for (const cut of cuts) {
    const cutMinU = Math.max(minU, wallAxis === 'x' ? cut.minX : cut.minZ);
    const cutMaxU = Math.min(maxU, wallAxis === 'x' ? cut.maxX : cut.maxZ);
    const cutMinY = Math.max(minY, cut.minY);
    const cutMaxY = Math.min(maxY, cut.maxY);
    if (
      cutMaxU - cutMinU <= ROOM_ARCHITECTURE_EPSILON_M ||
      cutMaxY - cutMinY <= ROOM_ARCHITECTURE_EPSILON_M
    ) {
      continue;
    }
    openings.push({ minU: cutMinU, maxU: cutMaxU, minY: cutMinY, maxY: cutMaxY });
    appendUniqueCoordinate(uStops, cutMinU);
    appendUniqueCoordinate(uStops, cutMaxU);
    appendUniqueCoordinate(yStops, cutMinY);
    appendUniqueCoordinate(yStops, cutMaxY);
  }
  uStops.sort((a, b) => a - b);
  yStops.sort((a, b) => a - b);

  const uIntervals = adjacentIntervals(uStops);
  const yIntervals = adjacentIntervals(yStops);
  const solid: boolean[][] = uIntervals.map(([u0, u1]) => {
    const centerU = (u0 + u1) / 2;
    return yIntervals.map(([y0, y1]) => {
      const centerY = (y0 + y1) / 2;
      return !openings.some(
        opening =>
          centerU > opening.minU - ROOM_ARCHITECTURE_EPSILON_M &&
          centerU < opening.maxU + ROOM_ARCHITECTURE_EPSILON_M &&
          centerY > opening.minY - ROOM_ARCHITECTURE_EPSILON_M &&
          centerY < opening.maxY + ROOM_ARCHITECTURE_EPSILON_M
      );
    });
  });

  const positions: number[] = [];
  const normals: number[] = [];
  const point = (u: number, y: number, n: number): Vec3Tuple => (wallAxis === 'x' ? [u, y, n] : [n, y, u]);
  const normalU = (sign: -1 | 1): Vec3Tuple => (wallAxis === 'x' ? [sign, 0, 0] : [0, 0, sign]);
  const normalN = (sign: -1 | 1): Vec3Tuple => (wallAxis === 'x' ? [0, 0, sign] : [sign, 0, 0]);

  for (const [uIndex, [u0, u1]] of uIntervals.entries()) {
    const solidRow = solid[uIndex];
    if (!solidRow) continue;
    for (const [yIndex, [y0, y1]] of yIntervals.entries()) {
      if (!solidRow[yIndex]) continue;

      pushOrientedQuad(
        positions,
        normals,
        [point(u0, y0, minN), point(u1, y0, minN), point(u1, y1, minN), point(u0, y1, minN)],
        normalN(-1)
      );
      pushOrientedQuad(
        positions,
        normals,
        [point(u0, y0, maxN), point(u1, y0, maxN), point(u1, y1, maxN), point(u0, y1, maxN)],
        normalN(1)
      );

      const leftIsSolid = uIndex > 0 && solid[uIndex - 1]?.[yIndex] === true;
      const rightIsSolid = solid[uIndex + 1]?.[yIndex] === true;
      const belowIsSolid = yIndex > 0 && solidRow[yIndex - 1] === true;
      const aboveIsSolid = solidRow[yIndex + 1] === true;

      if (!leftIsSolid) {
        pushOrientedQuad(
          positions,
          normals,
          [point(u0, y0, minN), point(u0, y1, minN), point(u0, y1, maxN), point(u0, y0, maxN)],
          normalU(-1)
        );
      }
      if (!rightIsSolid) {
        pushOrientedQuad(
          positions,
          normals,
          [point(u1, y0, minN), point(u1, y1, minN), point(u1, y1, maxN), point(u1, y0, maxN)],
          normalU(1)
        );
      }
      if (!belowIsSolid) {
        pushOrientedQuad(
          positions,
          normals,
          [point(u0, y0, minN), point(u1, y0, minN), point(u1, y0, maxN), point(u0, y0, maxN)],
          [0, -1, 0]
        );
      }
      if (!aboveIsSolid) {
        pushOrientedQuad(
          positions,
          normals,
          [point(u0, y1, minN), point(u1, y1, minN), point(u1, y1, maxN), point(u0, y1, maxN)],
          [0, 1, 0]
        );
      }
    }
  }

  return { positions, normals };
}

function wardrobeBoxFromGeometry(geometry: RoomArchitectureGeometry): AxisAlignedBox {
  return {
    minX: -geometry.wardrobeWidthM / 2,
    maxX: geometry.wardrobeWidthM / 2,
    minY: 0,
    maxY: geometry.wardrobeHeightM,
    minZ: -geometry.wardrobeDepthM / 2,
    maxZ: geometry.wardrobeDepthM / 2,
  };
}

function buildRoomColumnLinerPanels(args: {
  intrusion: AxisAlignedBox;
  cutIntrusion: AxisAlignedBox;
}): RoomColumnLinerPanel[] {
  const { intrusion, cutIntrusion } = args;
  const panels: RoomColumnLinerPanel[] = [];

  const add = (face: RoomColumnLinerFace, box: AxisAlignedBox): void => {
    if (
      box.maxX - box.minX > ROOM_ARCHITECTURE_EPSILON_M &&
      box.maxY - box.minY > ROOM_ARCHITECTURE_EPSILON_M &&
      box.maxZ - box.minZ > ROOM_ARCHITECTURE_EPSILON_M
    ) {
      panels.push({ face, box });
    }
  };

  add('front', {
    minX: cutIntrusion.minX,
    maxX: cutIntrusion.maxX,
    minY: cutIntrusion.minY,
    maxY: cutIntrusion.maxY,
    minZ: intrusion.maxZ,
    maxZ: cutIntrusion.maxZ,
  });
  add('left', {
    minX: cutIntrusion.minX,
    maxX: intrusion.minX,
    minY: cutIntrusion.minY,
    maxY: cutIntrusion.maxY,
    minZ: intrusion.minZ,
    maxZ: intrusion.maxZ,
  });
  add('right', {
    minX: intrusion.maxX,
    maxX: cutIntrusion.maxX,
    minY: cutIntrusion.minY,
    maxY: cutIntrusion.maxY,
    minZ: intrusion.minZ,
    maxZ: intrusion.maxZ,
  });
  add('top', {
    minX: intrusion.minX,
    maxX: intrusion.maxX,
    minY: intrusion.maxY,
    maxY: cutIntrusion.maxY,
    minZ: intrusion.minZ,
    maxZ: intrusion.maxZ,
  });
  add('bottom', {
    minX: intrusion.minX,
    maxX: intrusion.maxX,
    minY: cutIntrusion.minY,
    maxY: intrusion.minY,
    minZ: intrusion.minZ,
    maxZ: intrusion.maxZ,
  });

  return panels;
}

function buildRoomColumnCutObstacle(args: {
  obstacle: AxisAlignedBox;
  intrusion: AxisAlignedBox;
  enclosureBox: AxisAlignedBox;
}): AxisAlignedBox {
  const { obstacle, intrusion, enclosureBox } = args;
  const liner = ROOM_COLUMN_LINER_THICKNESS_M;
  return {
    minX:
      intrusion.minX > enclosureBox.minX + ROOM_ARCHITECTURE_EPSILON_M
        ? obstacle.minX - liner
        : obstacle.minX,
    maxX:
      intrusion.maxX < enclosureBox.maxX - ROOM_ARCHITECTURE_EPSILON_M
        ? obstacle.maxX + liner
        : obstacle.maxX,
    minY:
      intrusion.minY > enclosureBox.minY + ROOM_ARCHITECTURE_EPSILON_M
        ? obstacle.minY - liner
        : obstacle.minY,
    maxY:
      intrusion.maxY < enclosureBox.maxY - ROOM_ARCHITECTURE_EPSILON_M
        ? obstacle.maxY + liner
        : obstacle.maxY,
    minZ: obstacle.minZ,
    maxZ:
      intrusion.maxZ < enclosureBox.maxZ - ROOM_ARCHITECTURE_EPSILON_M
        ? obstacle.maxZ + liner
        : obstacle.maxZ,
  };
}

function buildRoomColumnAdjustmentGeometry(
  geometry: RoomArchitectureGeometry,
  wardrobeBox: AxisAlignedBox
): RoomColumnAdjustmentGeometry | null {
  const obstacle =
    geometry.config.backWall.enabled && geometry.config.column.enabled ? geometry.column : null;
  if (!obstacle) return null;

  const intrusion = intersectAxisAlignedBoxes(obstacle, wardrobeBox);
  if (!intrusion) return null;

  const cutObstacle = buildRoomColumnCutObstacle({
    obstacle,
    intrusion,
    enclosureBox: wardrobeBox,
  });
  const cutIntrusion = intersectAxisAlignedBoxes(cutObstacle, wardrobeBox);
  if (!cutIntrusion) return null;

  return {
    wardrobeBox,
    obstacle,
    intrusion,
    cutObstacle,
    cutIntrusion,
    linerPanels: buildRoomColumnLinerPanels({ intrusion, cutIntrusion }),
  };
}

function deepFreezeRoomPlanValue<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value as object)) deepFreezeRoomPlanValue(nested);
  return Object.freeze(value);
}

export function createRoomArchitecturePlan(input: RoomArchitecturePlanInput): RoomArchitecturePlan {
  const geometry = resolveRoomArchitectureGeometry(input);
  const wardrobeBox = wardrobeBoxFromGeometry(geometry);
  const columnAdjustment = buildRoomColumnAdjustmentGeometry(geometry, wardrobeBox);
  const plan: RoomArchitecturePlan = {
    ...geometry,
    wardrobeBox,
    wallSurfaces: {
      back: resolveRoomWallSurface(geometry, 'back'),
      left: resolveRoomWallSurface(geometry, 'left'),
      right: resolveRoomWallSurface(geometry, 'right'),
    },
    resolvedOpenings: resolveRoomOpeningsGeometry(geometry),
    columnAdjustment,
    activeCutObstacle: columnAdjustment?.cutObstacle ?? null,
  };
  return deepFreezeRoomPlanValue(plan);
}

export function resolveRoomColumnAdjustmentGeometry(
  plan: RoomArchitecturePlan
): RoomColumnAdjustmentGeometry | null {
  return plan.columnAdjustment;
}

export function resolveActiveRoomColumnCutObstacle(plan: RoomArchitecturePlan): AxisAlignedBox | null {
  return plan.activeCutObstacle;
}

export function resolveRoomColumnLinerPanelsForBox(
  plan: RoomArchitecturePlan,
  enclosureBox: AxisAlignedBox
): RoomColumnLinerPanel[] {
  const adjustment = plan.columnAdjustment;
  if (!adjustment) return [];

  // Free-box boards are cut by createBoard() with this same canonical cut obstacle.
  // Derive the liner from that exact cut so the liner can never overlap uncut wood
  // or leave a gap because a second enclosure-relative obstacle was calculated here.
  const intrusion = intersectAxisAlignedBoxes(adjustment.obstacle, enclosureBox);
  const cutIntrusion = intersectAxisAlignedBoxes(adjustment.cutObstacle, enclosureBox);
  if (!intrusion || !cutIntrusion) return [];

  return buildRoomColumnLinerPanels({ intrusion, cutIntrusion });
}

export function intersectsActiveRoomColumnCutObstacle(
  plan: RoomArchitecturePlan,
  box: AxisAlignedBox
): boolean {
  const obstacle = plan.activeCutObstacle;
  return !!(obstacle && intersectAxisAlignedBoxes(box, obstacle));
}

export function resolveHorizontalSpanAgainstRoomColumnCut(
  plan: RoomArchitecturePlan,
  args: {
    centerX: number;
    centerY: number;
    centerZ: number;
    length: number;
    halfHeight: number;
    halfDepth: number;
    minUsableLength: number;
  }
): RoomColumnAdjustedHorizontalSpan | null {
  const obstacle = plan.activeCutObstacle;
  const sourceMinX = args.centerX - args.length / 2;
  const sourceMaxX = args.centerX + args.length / 2;
  const source = {
    minX: sourceMinX,
    maxX: sourceMaxX,
    minY: args.centerY - args.halfHeight,
    maxY: args.centerY + args.halfHeight,
    minZ: args.centerZ - args.halfDepth,
    maxZ: args.centerZ + args.halfDepth,
  };

  if (!obstacle) {
    return {
      minX: sourceMinX,
      maxX: sourceMaxX,
      centerX: args.centerX,
      length: args.length,
    };
  }

  const cut = intersectAxisAlignedBoxes(source, obstacle);
  if (!cut) {
    return {
      minX: sourceMinX,
      maxX: sourceMaxX,
      centerX: args.centerX,
      length: args.length,
    };
  }

  const cutsLeftEdge = cut.minX <= sourceMinX + ROOM_ARCHITECTURE_EPSILON_M;
  const cutsRightEdge = cut.maxX >= sourceMaxX - ROOM_ARCHITECTURE_EPSILON_M;
  if (cutsLeftEdge && cutsRightEdge) return null;

  // A column in the middle would split one fitting into two independent fittings.
  // The room-column rule intentionally removes that fitting instead.
  if (!cutsLeftEdge && !cutsRightEdge) return null;

  const minX = cutsLeftEdge ? cut.maxX : sourceMinX;
  const maxX = cutsRightEdge ? cut.minX : sourceMaxX;
  const length = maxX - minX;
  if (!(length >= args.minUsableLength - ROOM_ARCHITECTURE_EPSILON_M)) return null;

  return {
    minX,
    maxX,
    centerX: (minX + maxX) / 2,
    length,
  };
}

export function axisAlignedBoxToCenterSize(box: AxisAlignedBox) {
  return {
    width: box.maxX - box.minX,
    height: box.maxY - box.minY,
    depth: box.maxZ - box.minZ,
    x: (box.minX + box.maxX) / 2,
    y: (box.minY + box.maxY) / 2,
    z: (box.minZ + box.maxZ) / 2,
  };
}
