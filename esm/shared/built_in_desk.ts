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
  legWidthM: 0.055,
  wallCleatHeightM: 0.06,
  doorClearanceM: 0.003,
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
  const { lengthCm, drawerCount, support } = value;
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
  return { lengthCm, drawerCount, support };
}

export function encodeBuiltInDeskTool(options: BuiltInDeskOptions): string {
  return `${BUILT_IN_DESK_TOOL_PREFIX}${options.lengthCm}:${options.drawerCount}:${options.support}`;
}

export function readBuiltInDeskTool(tool: string): BuiltInDeskOptions | null {
  if (!tool.startsWith(BUILT_IN_DESK_TOOL_PREFIX)) return null;
  const parts = tool.slice(BUILT_IN_DESK_TOOL_PREFIX.length).split(':');
  if (parts.length !== 3 || !/^\d+$/.test(parts[0] ?? '') || !/^\d+$/.test(parts[1] ?? '')) return null;
  return readOptions({ lengthCm: Number(parts[0]), drawerCount: Number(parts[1]), support: parts[2] });
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
  const { drawerBayHeightM, frontGapM, legWidthM, wallCleatHeightM, floorY } = BUILT_IN_DESK_DIMENSIONS;
  const deskHeight = 2 * thickness + drawerBayHeightM;
  const width = rightX - leftX;
  const minTopY =
    Math.max(bottomY, floorY + (placement.support === 'wall' ? wallCleatHeightM : 0)) + deskHeight;
  if (!(thickness > 0 && width > 4 * thickness && topY > minTopY && frontZ > backZ)) return null;

  const length = placement.lengthCm / 100;
  const drawerSign = placement.drawerSide === 'left' ? -1 : 1;
  const drawerEdgeX = drawerSign < 0 ? leftX : rightX;
  const wallEdgeX = drawerSign < 0 ? rightX : leftX;
  const endZ = frontZ + length;
  const outsideBottomY = Math.max(minTopY, bottomY + placement.topNorm * (topY - bottomY)) - deskHeight;
  const surfaceY = outsideBottomY + deskHeight;
  const centerX = (leftX + rightX) / 2;
  const plate = {
    x: centerX,
    z: (backZ + endZ) / 2,
    width,
    height: thickness,
    depth: endZ - backZ,
  };
  const top = { ...plate, y: surfaceY - thickness / 2 };
  const bottom = { ...plate, y: outsideBottomY + thickness / 2 };
  const bayCenterY = outsideBottomY + thickness + drawerBayHeightM / 2;
  const bayWidth = length / placement.drawerCount;
  const drawers = Array.from({ length: placement.drawerCount }, (_, index): BuiltInDeskBoard => ({
    x: drawerEdgeX - (drawerSign * thickness) / 2,
    y: bayCenterY,
    z: frontZ + (index + 0.5) * bayWidth,
    width: thickness,
    height: drawerBayHeightM - 2 * frontGapM,
    depth: bayWidth - 2 * frontGapM,
  }));
  const support: BuiltInDeskBoard | null =
    placement.support === 'leg'
      ? outsideBottomY > floorY
        ? {
            x: centerX,
            y: (outsideBottomY + floorY) / 2,
            z: endZ - legWidthM / 2 - thickness,
            width: legWidthM,
            height: outsideBottomY - floorY,
            depth: legWidthM,
          }
        : null
      : {
          x: wallEdgeX + (drawerSign * thickness) / 2,
          y: outsideBottomY - wallCleatHeightM / 2,
          z: (frontZ + endZ) / 2,
          width: thickness,
          height: wallCleatHeightM,
          depth: length,
        };

  const drawerPartitions = Array.from({ length: placement.drawerCount + 1 }, (_, index): BuiltInDeskBoard => {
    const edgeOffset = index === 0 ? thickness / 2 : index === placement.drawerCount ? -thickness / 2 : 0;
    return {
      x: centerX - (drawerSign * thickness) / 2,
      y: bayCenterY,
      z: frontZ + index * bayWidth + edgeOffset,
      width: width - thickness,
      height: drawerBayHeightM,
      depth: thickness,
    };
  });

  return { top, bottom, drawers, drawerPartitions, support, surfaceY, bayWidth, drawerSign, wallEdgeX };
}
