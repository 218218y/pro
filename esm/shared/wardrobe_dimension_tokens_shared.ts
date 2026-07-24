// Transitional facade for wardrobe/product dimension tokens.
// New consumers must import the focused owner under ./dimensions; existing
// domain tokens remain here while consumers move one policy family at a time.

import { CM_PER_METER, MM_PER_METER, clampDimension, cmToM, mToCm } from './dimensions/units.js';
import { WARDROBE_MODULE_LAYOUT_POLICY } from './dimensions/wardrobe_layout_policy.js';
import {
  DEFAULT_CHEST_DRAWERS_COUNT,
  DEFAULT_CORNER_DOORS,
  DEFAULT_CORNER_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_HINGED_DOORS,
  DEFAULT_SLIDING_DOORS,
  DEFAULT_WIDTH,
  HINGED_DEFAULT_DEPTH,
  HINGED_DEFAULT_PER_DOOR_WIDTH,
  SLIDING_DEFAULT_DEPTH,
  SLIDING_DEFAULT_PER_DOOR_WIDTH,
  WARDROBE_DEFAULTS as WARDROBE_DEFAULTS_OWNER,
} from './dimensions/wardrobe_defaults.js';
import type { WardrobeDimensionDefaultType } from './dimensions/wardrobe_defaults.js';
import {
  DEFAULT_STACK_SPLIT_LOWER_HEIGHT,
  STACK_SPLIT_POLICY,
  STACK_SPLIT_SEAM_GAP_M,
} from './dimensions/stack_split_policy.js';
import { STACK_SPLIT_RENDER_POLICY } from './dimensions/stack_split_render_policy.js';
import { CARCASS_SHELL_DIMENSIONS } from './dimensions/carcass_shell_policy.js';
import { CORNER_SYSTEM_POLICY } from './dimensions/corner_system_policy.js';
import { CORNER_CONNECTOR_INTERIOR_POLICY } from './dimensions/corner_connector_interior_policy.js';
import { CARCASS_INTERIOR_DIMENSIONS } from './dimensions/carcass_interior_policy.js';
import { BASE_PLINTH_POLICY } from './dimensions/base_plinth_policy.js';
import {
  BASE_LEG_DIMENSIONS as BASE_LEG_DIMENSIONS_OWNER,
  BASE_LEG_LAYOUT_POLICY,
} from './dimensions/base_leg_policy.js';
import { CHEST_STRUCTURAL_DIMENSIONS as CHEST_STRUCTURAL_DIMENSIONS_OWNER } from './dimensions/chest_structural_policy.js';
import { MATERIAL_THICKNESS_POLICY } from './dimensions/material_thickness_policy.js';
import { CARCASS_CORNICE_RENDER_POLICY } from './dimensions/carcass_cornice_render_policy.js';
import { CHEST_MODE_DIMENSIONS as CHEST_MODE_DIMENSIONS_OWNER } from './dimensions/chest_mode_policy.js';
import { DOOR_SYSTEM_DIMENSIONS as DOOR_SYSTEM_DIMENSIONS_OWNER } from './dimensions/door_system_policy.js';
import { DOOR_MOUNT_THICKNESS_DIMENSIONS as DOOR_MOUNT_THICKNESS_DIMENSIONS_OWNER } from './dimensions/door_mount_thickness_policy.js';
import { DOOR_VISUAL_DIMENSIONS as DOOR_VISUAL_DIMENSIONS_OWNER } from './dimensions/door_visual_policy.js';
import { DOOR_TRIM_DIMENSIONS as DOOR_TRIM_DIMENSIONS_OWNER } from './dimensions/door_trim_policy.js';
import {
  EXTERNAL_DRAWER_POLICY,
  resolveExternalDrawerGeometry,
  type ExternalDrawerGeometry,
} from './dimensions/external_drawer_policy.js';
import { INTERNAL_DRAWER_POLICY } from './dimensions/internal_drawer_policy.js';
import { INTERIOR_FITTINGS_POLICY } from './dimensions/interior_fittings_policy.js';
import { DRAWER_SKETCH_POLICY } from './dimensions/drawer_sketch_policy.js';
import { FRONT_REVEAL_FRAME_POLICY } from './dimensions/front_reveal_frame_policy.js';
import { HANDLE_POLICY } from './dimensions/handle_policy.js';
import {
  BOOK_CONTENT_VISUAL_POLICY,
  FOLDED_CLOTHES_VISUAL_POLICY,
  HANGER_VISUAL_POLICY,
  HANGING_CLOTHES_VISUAL_POLICY,
} from './dimensions/content_visual_policy.js';
import { SKETCH_BOX_CLASSIC_DOOR_VISUAL_POLICY } from './dimensions/sketch_box_classic_door_visual_policy.js';
import { SKETCH_BOX_GEOMETRY_POLICY } from './dimensions/sketch_box_geometry_policy.js';
import { SKETCH_BOX_DIVIDER_POLICY } from './dimensions/sketch_box_divider_policy.js';
import { SKETCH_BOX_DIMENSION_OVERLAY_POLICY } from './dimensions/sketch_box_dimension_overlay_policy.js';
import { SKETCH_BOX_PREVIEW_POLICY } from './dimensions/sketch_box_preview_policy.js';
import { SKETCH_BOX_FREE_PLACEMENT_POLICY } from './dimensions/sketch_box_free_placement_policy.js';
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
  WARDROBE_CELL_DIM_MIN,
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
  WARDROBE_DOORS_MIN,
  WARDROBE_HEIGHT_MAX,
  WARDROBE_HEIGHT_MIN,
  WARDROBE_LIMITS,
  WARDROBE_SLIDING_DOORS_MIN,
  WARDROBE_WIDTH_MAX,
  WARDROBE_WIDTH_MIN,
} from './dimensions/product_limits.js';

type LegacyDimensionNumberView<T> = T extends number
  ? number
  : T extends object
    ? { readonly [Key in keyof T]: LegacyDimensionNumberView<T[Key]> }
    : T;

function legacyDimensionNumberView<T>(value: T): LegacyDimensionNumberView<T> {
  return value as LegacyDimensionNumberView<T>;
}

type ContentVisualDimensionsNumberView = {
  readonly books: LegacyDimensionNumberView<typeof BOOK_CONTENT_VISUAL_POLICY>;
  readonly foldedClothes: LegacyDimensionNumberView<typeof FOLDED_CLOTHES_VISUAL_POLICY>;
  readonly hanger: LegacyDimensionNumberView<typeof HANGER_VISUAL_POLICY>;
  readonly hangingClothes: LegacyDimensionNumberView<typeof HANGING_CLOTHES_VISUAL_POLICY>;
  readonly sketchBoxClassic: LegacyDimensionNumberView<typeof SKETCH_BOX_CLASSIC_DOOR_VISUAL_POLICY>;
};

const BASE_LEG_DIMENSIONS = legacyDimensionNumberView(BASE_LEG_DIMENSIONS_OWNER);
const BASE_PLINTH_DIMENSIONS = legacyDimensionNumberView(BASE_PLINTH_POLICY);
const BASE_LEG_LAYOUT_DIMENSIONS = legacyDimensionNumberView(BASE_LEG_LAYOUT_POLICY);
const CHEST_STRUCTURAL_DIMENSIONS = legacyDimensionNumberView(CHEST_STRUCTURAL_DIMENSIONS_OWNER);
const MATERIAL_DIMENSIONS = legacyDimensionNumberView(MATERIAL_THICKNESS_POLICY);
const CARCASS_CORNICE_DIMENSIONS = legacyDimensionNumberView(CARCASS_CORNICE_RENDER_POLICY);
const CHEST_MODE_DIMENSIONS = legacyDimensionNumberView(CHEST_MODE_DIMENSIONS_OWNER);
const DOOR_SYSTEM_DIMENSIONS = legacyDimensionNumberView(DOOR_SYSTEM_DIMENSIONS_OWNER);
const DOOR_MOUNT_THICKNESS_DIMENSIONS = legacyDimensionNumberView(DOOR_MOUNT_THICKNESS_DIMENSIONS_OWNER);
const DOOR_VISUAL_DIMENSIONS = legacyDimensionNumberView(DOOR_VISUAL_DIMENSIONS_OWNER);
const DOOR_TRIM_DIMENSIONS = legacyDimensionNumberView(DOOR_TRIM_DIMENSIONS_OWNER);
const EXTERNAL_DRAWER_DIMENSIONS = legacyDimensionNumberView(EXTERNAL_DRAWER_POLICY);
const INTERNAL_DRAWER_DIMENSIONS = legacyDimensionNumberView(INTERNAL_DRAWER_POLICY);
const INTERIOR_FITTINGS_DIMENSIONS = legacyDimensionNumberView(INTERIOR_FITTINGS_POLICY);
const DRAWER_SKETCH_DIMENSIONS = legacyDimensionNumberView(DRAWER_SKETCH_POLICY);
const FRONT_REVEAL_FRAME_DIMENSIONS = legacyDimensionNumberView(FRONT_REVEAL_FRAME_POLICY);
const HANDLE_DIMENSIONS = legacyDimensionNumberView(HANDLE_POLICY);

const WARDROBE_DEFAULTS = Object.freeze({
  ...WARDROBE_DEFAULTS_OWNER,
  stackSplit: Object.freeze({
    lowerHeightCm: STACK_SPLIT_POLICY.defaults.lowerHeightCm,
    minTopHeightCm: STACK_SPLIT_POLICY.limits.minTopHeightCm,
    minLowerHeightCm: STACK_SPLIT_POLICY.limits.minLowerHeightCm,
    seamGapM: STACK_SPLIT_POLICY.seam.gapM,
    lowerWidthDefaultCm: STACK_SPLIT_POLICY.defaults.lowerWidthCm,
    decorativeSeparator: STACK_SPLIT_RENDER_POLICY.decorativeSeparator,
  }),
});

export { CM_PER_METER, MM_PER_METER, clampDimension, cmToM, mToCm };
export type { Centimeters, Meters, Millimeters, Pixels, WorldUnits } from './dimensions/units.js';
export {
  DEFAULT_CHEST_DRAWERS_COUNT,
  DEFAULT_CORNER_DOORS,
  DEFAULT_CORNER_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_HINGED_DOORS,
  DEFAULT_SLIDING_DOORS,
  DEFAULT_STACK_SPLIT_LOWER_HEIGHT,
  DEFAULT_WIDTH,
  DOOR_MOUNT_THICKNESS_DIMENSIONS,
  DOOR_TRIM_DIMENSIONS,
  DOOR_VISUAL_DIMENSIONS,
  HINGED_DEFAULT_DEPTH,
  HINGED_DEFAULT_PER_DOOR_WIDTH,
  SLIDING_DEFAULT_DEPTH,
  SLIDING_DEFAULT_PER_DOOR_WIDTH,
  STACK_SPLIT_SEAM_GAP_M,
  WARDROBE_DEFAULTS,
};
export type { WardrobeDimensionDefaultType } from './dimensions/wardrobe_defaults.js';
export {
  DOOR_MOUNT_THICKNESS_CONFIG_KEYS,
  getDefaultDoorMountThicknessCm,
  getDefaultDoorMountThicknessM,
  getDoorMountThicknessConfigKey,
  normalizeDoorMountThicknessCm,
  resolveDoorMountThicknessesFromConfig,
} from './dimensions/door_mount_thickness_policy.js';
export type {
  DoorMountConstructionMode,
  DoorMountThicknessConfigKey,
  DoorMountThicknessKind,
} from './dimensions/door_mount_thickness_policy.js';
export { CARCASS_SHELL_DIMENSIONS, CARCASS_INTERIOR_DIMENSIONS };
export {
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
  WARDROBE_CELL_DIM_MIN,
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
  WARDROBE_DOORS_MIN,
  WARDROBE_HEIGHT_MAX,
  WARDROBE_HEIGHT_MIN,
  WARDROBE_LIMITS,
  WARDROBE_SLIDING_DOORS_MIN,
  WARDROBE_WIDTH_MAX,
  WARDROBE_WIDTH_MIN,
};

function finiteOr(value: unknown, defaultValue: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
}

export const WARDROBE_LAYOUT_DIMENSIONS = Object.freeze({
  minSegmentWidthCm: WARDROBE_MODULE_LAYOUT_POLICY.minSegmentWidthCm,
  boundaryFullThicknessMultiplier: WARDROBE_MODULE_LAYOUT_POLICY.boundaryFullThicknessMultiplier,
  boundarySharedThicknessMultiplier: WARDROBE_MODULE_LAYOUT_POLICY.boundarySharedThicknessMultiplier,
  autoWidthMatchToleranceCm: 0.51,
  valueEqualityToleranceCm: 0.0001,
  cellDimsMatchToleranceCm: 0.11,
  cellDimsPreview: Object.freeze({
    minWidthM: 0.03,
    minHeightM: 0.03,
    widthClearanceM: 0.006,
    heightClearanceM: 0.006,
    minDepthM: 0.024,
    woodThicknessMinM: 0.004,
    woodThicknessMaxM: 0.01,
    woodThicknessScale: 0.5,
  }),
});

export const WARDROBE_DIMENSION_GUIDE_DIMENSIONS = Object.freeze({
  textScale: Object.freeze({
    total: 1,
    cell: 0.78,
    cornerTotal: 0.9,
  }),
  verticalPlacement: Object.freeze({
    totalYOffsetWithCorniceM: 0.28,
    totalYOffsetWithoutCorniceM: 0.23,
    cellYOffsetWithCorniceM: 0.2,
    cellYOffsetWithoutCorniceM: 0.15,
  }),
  main: Object.freeze({
    totalWidthTextYOffsetM: 0.1,
    cellWidthTextYOffsetM: 0.07,
    heightLineOffsetM: 0.3,
    stackSplitHeightLineOffsetM: 0.54,
    heightTextOffsetM: 0.1,
    cellHeightLineDeltaM: 0.12,
    stackSplitCellHeightLineDeltaM: 0.24,
    cellHeightTextOffsetM: 0.08,
    cellHeightLabelYOffsetM: -0.26,
    depthLineOffsetXM: 0.24,
    depthTextOffsetXM: 0.2,
    depthStartYOffsetM: 0.35,
    depthEndYOffsetM: 0.15,
    smallDepthLineOffsetXM: 0.16,
    smallDepthTextOffsetXM: 0.18,
    smallDepthStartYOffsetM: 0.57,
    smallDepthEndYOffsetM: 0.37,
    minDistinctDepthDeltaCm: 1,
  }),
  corner: Object.freeze({
    connectorWallMinLengthM: 0.05,
    expandedWidthEpsilonM: 0.01,
    expandedWidthYOffsetM: 0.12,
    expandedWidthTextYOffsetM: 0.1,
    wingMinLengthM: 0.01,
    wingTotalTextYOffsetM: 0.1,
    wingCellTextYOffsetM: 0.07,
    connectorDepthMidRatio: 0.55,
    connectorDepthInsetM: 0.08,
    connectorDepthMinM: 0.2,
    connectorHeightLineRatio: 0.55,
    depthStartYOffsetM: 0.35,
    depthEndYOffsetM: 0.15,
    depthTextOffsetZM: 0.28,
    heightTextOffsetZM: 0.46,
    wingHeightLineRatio: 0.55,
  }),
});

export const NO_MAIN_SKETCH_DIMENSIONS = Object.freeze({
  defaultGridDivisions: 6,
  workspacePaddingM: 0.12,
  defaultWorkspaceWidthM: 1.6,
  minHostHeightM: 0.05,
  minInnerWidthM: 0.02,
  minGridSpanM: 0.02,
});

export const LIBRARY_PRESET_DIMENSIONS = Object.freeze({
  defaultDoorsCount: 6,
  defaultModuleDoorsCount: 2,
  topGridDivisions: 5,
  lowerGridDivisions: 2,
  minWidthCm: 20,
  minLowerDepthCm: STACK_SPLIT_POLICY.limits.lowerDepthMinCm,
  minLowerHeightCm: STACK_SPLIT_POLICY.limits.minLowerHeightCm,
  minTopHeightCm: STACK_SPLIT_POLICY.limits.minTopHeightCm,
  defaultLowerHeightCm: 80,
  lowerDepthInsetCm: 5,
});

export const CARCASS_BASE_DIMENSIONS = Object.freeze({
  plinth: BASE_PLINTH_DIMENSIONS,
  legs: BASE_LEG_LAYOUT_DIMENSIONS,
  chest: CHEST_STRUCTURAL_DIMENSIONS,
});

export {
  BASE_LEG_DIMENSIONS,
  CARCASS_CORNICE_DIMENSIONS,
  CHEST_MODE_DIMENSIONS,
  DOOR_SYSTEM_DIMENSIONS,
  INTERIOR_FITTINGS_DIMENSIONS,
  MATERIAL_DIMENSIONS,
};

export const CONTENT_VISUAL_DIMENSIONS: ContentVisualDimensionsNumberView = Object.freeze({
  books: BOOK_CONTENT_VISUAL_POLICY,
  foldedClothes: FOLDED_CLOTHES_VISUAL_POLICY,
  hanger: HANGER_VISUAL_POLICY,
  hangingClothes: HANGING_CLOTHES_VISUAL_POLICY,
  sketchBoxClassic: SKETCH_BOX_CLASSIC_DOOR_VISUAL_POLICY,
});

export const DRAWER_DIMENSIONS = Object.freeze({
  sketch: DRAWER_SKETCH_DIMENSIONS,
  external: EXTERNAL_DRAWER_DIMENSIONS,
  internal: INTERNAL_DRAWER_DIMENSIONS,
});

export { FRONT_REVEAL_FRAME_DIMENSIONS };

const SKETCH_BOX_GEOMETRY_DIMENSIONS = legacyDimensionNumberView(SKETCH_BOX_GEOMETRY_POLICY);
const SKETCH_BOX_DIVIDER_DIMENSIONS = legacyDimensionNumberView(SKETCH_BOX_DIVIDER_POLICY);
const SKETCH_BOX_DIMENSION_OVERLAY_DIMENSIONS = legacyDimensionNumberView(
  SKETCH_BOX_DIMENSION_OVERLAY_POLICY
);
const SKETCH_BOX_PREVIEW_DIMENSIONS = legacyDimensionNumberView(SKETCH_BOX_PREVIEW_POLICY);
const SKETCH_BOX_FREE_PLACEMENT_DIMENSIONS = legacyDimensionNumberView(SKETCH_BOX_FREE_PLACEMENT_POLICY);

export const SKETCH_BOX_DIMENSIONS = Object.freeze({
  geometry: SKETCH_BOX_GEOMETRY_DIMENSIONS,
  dividers: SKETCH_BOX_DIVIDER_DIMENSIONS,
  dimensionOverlay: SKETCH_BOX_DIMENSION_OVERLAY_DIMENSIONS,
  preview: SKETCH_BOX_PREVIEW_DIMENSIONS,
  freePlacement: SKETCH_BOX_FREE_PLACEMENT_DIMENSIONS,
});

export const CORNER_WING_DIMENSIONS = legacyDimensionNumberView(CORNER_SYSTEM_POLICY);

export const CORNER_CONNECTOR_INTERIOR_DIMENSIONS = legacyDimensionNumberView(
  CORNER_CONNECTOR_INTERIOR_POLICY
);

export { HANDLE_DIMENSIONS };
export { resolveExternalDrawerGeometry };
export type { ExternalDrawerGeometry };

export function normalizeWardrobeDimensionDefaultType(value: unknown): WardrobeDimensionDefaultType {
  return value === 'sliding' ? 'sliding' : 'hinged';
}

export function resolveWardrobeTypeDefaults(value: unknown): {
  widthCm: number;
  heightCm: number;
  depthCm: number;
  doorsCount: number;
  perDoorWidthCm: number;
} {
  const type = normalizeWardrobeDimensionDefaultType(value);
  const byType = WARDROBE_DEFAULTS.byType[type];
  return {
    widthCm: WARDROBE_DEFAULTS.widthCm,
    heightCm: WARDROBE_DEFAULTS.heightCm,
    depthCm: byType.depthCm,
    doorsCount: byType.doorsCount,
    perDoorWidthCm: byType.perDoorWidthCm,
  };
}

export function getDefaultDepthForWardrobeType(value: unknown): number {
  return resolveWardrobeTypeDefaults(value).depthCm;
}

export function getDefaultDoorsForWardrobeType(value: unknown): number {
  return resolveWardrobeTypeDefaults(value).doorsCount;
}

export function getDefaultPerDoorWidthForWardrobeType(value: unknown): number {
  return resolveWardrobeTypeDefaults(value).perDoorWidthCm;
}

export function resolveAutoWidthForDoors(value: unknown, doors: unknown): number {
  const n = Math.max(0, Math.round(finiteOr(doors, 0)));
  return n * getDefaultPerDoorWidthForWardrobeType(value);
}

export function isAutoWidthForDoors(value: unknown, widthCm: unknown, doors: unknown): boolean {
  const currentWidthCm = finiteOr(widthCm, 0);
  if (!(currentWidthCm > 0)) return true;
  const expectedWidthCm = resolveAutoWidthForDoors(value, doors);
  return Math.abs(currentWidthCm - expectedWidthCm) < WARDROBE_LAYOUT_DIMENSIONS.autoWidthMatchToleranceCm;
}

export function getDefaultWidthForWardrobeType(value: unknown): number {
  const defaults = resolveWardrobeTypeDefaults(value);
  return defaults.doorsCount * defaults.perDoorWidthCm;
}

export function getDefaultHeightForWardrobeType(value: unknown): number {
  return resolveWardrobeTypeDefaults(value).heightCm;
}

export function getDefaultChestDrawersCount(): number {
  return WARDROBE_DEFAULTS.chestDrawersCount;
}

export function resolveDefaultWardrobeDimensions(value: unknown): {
  widthCm: number;
  heightCm: number;
  depthCm: number;
  doorsCount: number;
  perDoorWidthCm: number;
} {
  return resolveWardrobeTypeDefaults(value);
}
