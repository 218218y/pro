import type {
  BuiltInDeskBoard,
  BuiltInDeskHostGeometry,
  BuiltInDeskOptions,
  BuiltInDeskPlacement,
} from '../../types/built_in_desk.js';
import { SKETCH_BOX_FREE_VERTICAL_POLICY } from './dimensions/sketch_box_free_placement_policy.js';

export const BUILT_IN_DESK_TOOL_PREFIX = 'sketch_built_in_desk:';
export const BUILT_IN_DESK_DIMENSIONS = {
  minLengthCm: 50,
  maxLengthCm: 300,
  minDrawerWidthCm: 25,
  maxDrawerCount: 8,
  drawerBayHeightM: 0.12,
  frontGapM: 0.003,
  doorOpeningClearanceM: 0.3,
  maxDoorClearanceCm: 100,
  shelfClearanceM: 0.1,
  floorY: SKETCH_BOX_FREE_VERTICAL_POLICY.roomFloorY,
} as const;

export const DEFAULT_BUILT_IN_DESK_OPTIONS: BuiltInDeskOptions = {
  lengthCm: 120,
  drawerCount: 3,
  support: 'leg',
};

export function maxBuiltInDeskDrawers(lengthCm: number): number {
  return Math.min(
    BUILT_IN_DESK_DIMENSIONS.maxDrawerCount,
    Math.floor(lengthCm / BUILT_IN_DESK_DIMENSIONS.minDrawerWidthCm)
  );
}

function readOptions(value: Record<string, unknown>): BuiltInDeskOptions | null {
  const { lengthCm, drawerCount, support, doorClearanceAboveCm, doorClearanceBelowCm } = value;
  if (
    typeof lengthCm !== 'number' ||
    !Number.isInteger(lengthCm) ||
    lengthCm < BUILT_IN_DESK_DIMENSIONS.minLengthCm ||
    lengthCm > BUILT_IN_DESK_DIMENSIONS.maxLengthCm ||
    typeof drawerCount !== 'number' ||
    !Number.isInteger(drawerCount) ||
    drawerCount < 2 ||
    drawerCount > maxBuiltInDeskDrawers(lengthCm) ||
    (support !== 'leg' && support !== 'wall')
  ) {
    return null;
  }
  for (const gap of [doorClearanceAboveCm, doorClearanceBelowCm]) {
    if (
      gap !== undefined &&
      (typeof gap !== 'number' ||
        !Number.isInteger(gap) ||
        gap < 0 ||
        gap > BUILT_IN_DESK_DIMENSIONS.maxDoorClearanceCm)
    )
      return null;
  }
  return {
    lengthCm,
    drawerCount,
    support,
    ...(typeof doorClearanceAboveCm === 'number' ? { doorClearanceAboveCm } : {}),
    ...(typeof doorClearanceBelowCm === 'number' ? { doorClearanceBelowCm } : {}),
  };
}

export function encodeBuiltInDeskTool(options: BuiltInDeskOptions): string {
  const base = `${BUILT_IN_DESK_TOOL_PREFIX}${options.lengthCm}:${options.drawerCount}:${options.support}`;
  if (options.doorClearanceAboveCm === undefined && options.doorClearanceBelowCm === undefined) return base;
  const defaultCm = BUILT_IN_DESK_DIMENSIONS.doorOpeningClearanceM * 100;
  return `${base}:${options.doorClearanceAboveCm ?? defaultCm}:${options.doorClearanceBelowCm ?? defaultCm}`;
}

export function readBuiltInDeskTool(tool: string): BuiltInDeskOptions | null {
  if (!tool.startsWith(BUILT_IN_DESK_TOOL_PREFIX)) return null;
  const parts = tool.slice(BUILT_IN_DESK_TOOL_PREFIX.length).split(':');
  if (
    (parts.length !== 3 && parts.length !== 5) ||
    [parts[0], parts[1], ...parts.slice(3)].some(part => !/^\d+$/.test(part ?? ''))
  )
    return null;
  return readOptions({
    lengthCm: Number(parts[0]),
    drawerCount: Number(parts[1]),
    support: parts[2],
    ...(parts.length === 5
      ? { doorClearanceAboveCm: Number(parts[3]), doorClearanceBelowCm: Number(parts[4]) }
      : {}),
  });
}

export function readBuiltInDeskPlacement(value: unknown): BuiltInDeskPlacement | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const options = readOptions(record);
  const { topNorm, drawerSide } = record;
  return options &&
    typeof topNorm === 'number' &&
    topNorm >= 0 &&
    topNorm <= 1 &&
    (drawerSide === 'left' || drawerSide === 'right')
    ? { ...options, topNorm, drawerSide }
    : null;
}

export function planBuiltInDesk(host: BuiltInDeskHostGeometry, placement: BuiltInDeskPlacement) {
  const { thickness, leftX, rightX, topY, bottomY, backZ, frontZ } = host;
  const { drawerBayHeightM, frontGapM, floorY, shelfClearanceM } = BUILT_IN_DESK_DIMENSIONS;
  const deskHeight = 2 * thickness + drawerBayHeightM;
  const width = rightX - leftX;
  const minTopY = Math.max(bottomY, floorY) + deskHeight;
  if (!(thickness > 0 && width > 4 * thickness && topY > minTopY && frontZ > backZ)) return null;

  const length = placement.lengthCm / 100;
  const hasEndPanel = placement.support === 'leg';
  const drawerSign = placement.drawerSide === 'left' ? -1 : 1;
  const drawerEdgeX = drawerSign < 0 ? leftX : rightX;
  const wallEdgeX = drawerSign < 0 ? rightX : leftX;
  const endZ = frontZ + length;
  const surfaceY = Math.max(minTopY, bottomY + placement.topNorm * (topY - bottomY));
  const outsideBottomY = surfaceY - deskHeight;
  const centerX = (leftX + rightX) / 2;
  const plate = {
    x: centerX,
    z: (backZ + endZ) / 2,
    width,
    height: thickness,
    depth: endZ - backZ,
  };
  const top = { ...plate, y: surfaceY - thickness / 2 };
  const endPanelInset = hasEndPanel ? thickness : 0;
  const bottom = {
    ...plate,
    y: outsideBottomY + thickness / 2,
    z: plate.z - endPanelInset / 2,
    depth: plate.depth - endPanelInset,
  };
  const bayCenterY = outsideBottomY + thickness + drawerBayHeightM / 2;
  const drawerRunLength = length - endPanelInset;
  const bayWidth = drawerRunLength / placement.drawerCount;
  const back: BuiltInDeskBoard = {
    x: wallEdgeX + (drawerSign * thickness) / 2,
    y: bayCenterY,
    z: frontZ + drawerRunLength / 2,
    width: thickness,
    height: drawerBayHeightM,
    depth: drawerRunLength,
  };
  const drawers = Array.from({ length: placement.drawerCount }, (_, index): BuiltInDeskBoard => ({
    x: drawerEdgeX - (drawerSign * thickness) / 2,
    y: bayCenterY,
    z: frontZ + (index + 0.5) * bayWidth,
    width: thickness,
    height: drawerBayHeightM - 2 * frontGapM,
    depth: bayWidth - 2 * frontGapM,
  }));
  const topUndersideY = surfaceY - thickness;
  const support: BuiltInDeskBoard | null = hasEndPanel
    ? {
        x: centerX,
        y: (topUndersideY + floorY) / 2,
        z: endZ - thickness / 2,
        width,
        height: topUndersideY - floorY,
        depth: thickness,
      }
    : null;

  const partitionCount = placement.drawerCount + (hasEndPanel ? 0 : 1);
  const drawerPartitions = Array.from({ length: partitionCount }, (_, index): BuiltInDeskBoard => {
    const edgeOffset = index === 0 ? thickness / 2 : index === placement.drawerCount ? -thickness / 2 : 0;
    return {
      x: centerX,
      y: bayCenterY,
      z: frontZ + index * bayWidth + edgeOffset,
      width: width - 2 * thickness,
      height: drawerBayHeightM,
      depth: thickness,
    };
  });

  const verticalRange = {
    bottomY: outsideBottomY,
    surfaceY,
    shelfMinY: outsideBottomY - shelfClearanceM,
    shelfMaxY: surfaceY + shelfClearanceM,
  };
  const defaultClearance = BUILT_IN_DESK_DIMENSIONS.doorOpeningClearanceM;
  const above =
    placement.doorClearanceAboveCm === undefined ? defaultClearance : placement.doorClearanceAboveCm / 100;
  const below =
    placement.doorClearanceBelowCm === undefined ? defaultClearance : placement.doorClearanceBelowCm / 100;
  return {
    top,
    bottom,
    back,
    drawers,
    drawerPartitions,
    support,
    surfaceY,
    verticalRange,
    doorOpening: {
      yMin: outsideBottomY - below,
      yMax: surfaceY + above,
      keepShortLeaves: below !== defaultClearance,
    },
    bayWidth,
    drawerSign,
    wallEdgeX,
  };
}
