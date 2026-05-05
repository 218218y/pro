import {
  STACK_SPLIT_LOWER_DEPTH_MAX,
  STACK_SPLIT_LOWER_DEPTH_MIN,
  STACK_SPLIT_LOWER_DOORS_MAX,
  STACK_SPLIT_LOWER_DOORS_MIN,
  STACK_SPLIT_LOWER_HEIGHT_MIN,
  STACK_SPLIT_LOWER_WIDTH_MAX,
  STACK_SPLIT_LOWER_WIDTH_MIN,
  STACK_SPLIT_MIN_TOP_HEIGHT,
  WARDROBE_CELL_DEPTH_MAX,
  WARDROBE_CELL_DEPTH_MIN,
  WARDROBE_CELL_HEIGHT_MAX,
  WARDROBE_CELL_HEIGHT_MIN,
  WARDROBE_CELL_WIDTH_MAX,
  WARDROBE_CELL_WIDTH_MIN,
  WARDROBE_CHEST_DRAWERS_MAX,
  WARDROBE_CHEST_DRAWERS_MIN,
  WARDROBE_CHEST_HEIGHT_MIN,
  WARDROBE_CHEST_WIDTH_MIN,
  WARDROBE_DEPTH_MAX,
  WARDROBE_DEPTH_MIN,
  WARDROBE_DOORS_MAX,
  WARDROBE_HEIGHT_MAX,
  WARDROBE_HEIGHT_MIN,
  WARDROBE_SLIDING_DOORS_MIN,
  WARDROBE_WIDTH_MAX,
  WARDROBE_WIDTH_MIN,
} from '../../../services/api.js';

export type StructureDimInputBounds = {
  min?: number;
  max?: number;
  integer?: boolean;
  allowZero?: boolean;
};

export type StructureDimensionKey =
  | 'width'
  | 'height'
  | 'depth'
  | 'doors'
  | 'cellDimsWidth'
  | 'cellDimsHeight'
  | 'cellDimsDepth'
  | 'stackSplitLowerHeight'
  | 'stackSplitLowerDepth'
  | 'stackSplitLowerWidth'
  | 'stackSplitLowerDoors';

export type StructureDimensionContext = {
  key: StructureDimensionKey;
  wardrobeType?: string;
  isChestMode?: boolean;
  width?: number;
  height?: number;
  depth?: number;
  doors?: number;
  allowNoMainWardrobe?: boolean;
};

function finitePositiveOr(value: unknown, defaultValue: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : defaultValue;
}

function maxAtLeast(min: number, value: number): number {
  return Math.max(min, value);
}

function isZeroDoorHingedWardrobe(args: StructureDimensionContext): boolean {
  if (args.allowNoMainWardrobe) return true;
  if (args.wardrobeType === 'sliding') return false;
  const doors = Math.round(Number(args.doors));
  return Number.isFinite(doors) && doors === 0;
}

export function readStructureDimensionBounds(args: StructureDimensionContext): StructureDimInputBounds {
  const isSliding = args.wardrobeType === 'sliding';
  const isChestMode = !!args.isChestMode;

  switch (args.key) {
    case 'width':
      return {
        min: isChestMode ? WARDROBE_CHEST_WIDTH_MIN : WARDROBE_WIDTH_MIN,
        max: WARDROBE_WIDTH_MAX,
        allowZero: !isChestMode && isZeroDoorHingedWardrobe(args),
      };
    case 'height':
      return {
        min: isChestMode ? WARDROBE_CHEST_HEIGHT_MIN : WARDROBE_HEIGHT_MIN,
        max: WARDROBE_HEIGHT_MAX,
      };
    case 'depth':
      return { min: WARDROBE_DEPTH_MIN, max: WARDROBE_DEPTH_MAX };
    case 'doors':
      return {
        min: isSliding ? WARDROBE_SLIDING_DOORS_MIN : 0,
        max: WARDROBE_DOORS_MAX,
        integer: true,
      };
    case 'cellDimsWidth':
      return { min: WARDROBE_CELL_WIDTH_MIN, max: WARDROBE_CELL_WIDTH_MAX };
    case 'cellDimsHeight':
      return { min: WARDROBE_CELL_HEIGHT_MIN, max: WARDROBE_CELL_HEIGHT_MAX };
    case 'cellDimsDepth':
      return { min: WARDROBE_CELL_DEPTH_MIN, max: WARDROBE_CELL_DEPTH_MAX };
    case 'stackSplitLowerHeight': {
      const overallHeight = finitePositiveOr(args.height, WARDROBE_HEIGHT_MAX);
      return {
        min: STACK_SPLIT_LOWER_HEIGHT_MIN,
        max: maxAtLeast(STACK_SPLIT_LOWER_HEIGHT_MIN, overallHeight - STACK_SPLIT_MIN_TOP_HEIGHT),
      };
    }
    case 'stackSplitLowerDepth':
      return { min: STACK_SPLIT_LOWER_DEPTH_MIN, max: STACK_SPLIT_LOWER_DEPTH_MAX };
    case 'stackSplitLowerWidth':
      return { min: STACK_SPLIT_LOWER_WIDTH_MIN, max: STACK_SPLIT_LOWER_WIDTH_MAX };
    case 'stackSplitLowerDoors':
      return {
        min: STACK_SPLIT_LOWER_DOORS_MIN,
        max: STACK_SPLIT_LOWER_DOORS_MAX,
        integer: true,
      };
    default:
      return {};
  }
}

export function readStructureCornerDoorsBounds(): StructureDimInputBounds {
  return { min: 0, max: WARDROBE_DOORS_MAX, integer: true };
}

export function readStructureCornerDimensionBounds(
  key: 'cornerWidth' | 'cornerHeight' | 'cornerDepth',
  args: { cornerDoors?: number; allowNoCornerWardrobe?: boolean } = {}
): StructureDimInputBounds {
  if (key === 'cornerHeight') return { min: WARDROBE_HEIGHT_MIN, max: WARDROBE_HEIGHT_MAX };
  if (key === 'cornerDepth') return { min: WARDROBE_DEPTH_MIN, max: WARDROBE_DEPTH_MAX };
  const doors = Math.round(Number(args.cornerDoors));
  return {
    min: WARDROBE_WIDTH_MIN,
    max: WARDROBE_WIDTH_MAX,
    allowZero: !!args.allowNoCornerWardrobe || (Number.isFinite(doors) && doors === 0),
  };
}

export function readStructureChestDrawersBounds(): StructureDimInputBounds {
  return {
    min: WARDROBE_CHEST_DRAWERS_MIN,
    max: WARDROBE_CHEST_DRAWERS_MAX,
    integer: true,
  };
}

export function normalizeStructureDimensionValue(
  value: unknown,
  bounds: StructureDimInputBounds
): number | null {
  let n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (bounds.integer) n = Math.round(n);
  if (bounds.allowZero && Math.abs(n) < 0.0001) return 0;
  if (typeof bounds.min === 'number' && Number.isFinite(bounds.min)) n = Math.max(bounds.min, n);
  if (typeof bounds.max === 'number' && Number.isFinite(bounds.max)) n = Math.min(bounds.max, n);
  return n;
}

export function normalizeStructureRawValue(
  args: StructureDimensionContext & { value: unknown }
): number | null {
  return normalizeStructureDimensionValue(args.value, readStructureDimensionBounds(args));
}
