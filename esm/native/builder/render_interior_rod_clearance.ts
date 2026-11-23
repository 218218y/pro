import {
  CARCASS_INTERIOR_GRID_POLICY,
  DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY,
  FOLDED_CLOTHES_VISUAL_POLICY,
  HANGER_VISUAL_POLICY,
  INTERIOR_PRESET_ROD_FACTORS_POLICY,
  INTERIOR_PRESET_SHELF_ROWS_POLICY,
  INTERIOR_ROD_PLACEMENT_POLICY,
  INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY,
  INTERIOR_STORAGE_BARRIER_POLICY,
  MATERIAL_THICKNESS_POLICY,
  SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY,
} from '../../shared/dimensions/interior_rod_clearance_dimension_policy.js';
import {
  DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M,
  DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_M,
  readSketchDrawerHeightMFromItem,
  resolveSketchExternalDrawerMetrics,
  resolveSketchInternalDrawerMetrics,
  sketchStackFitsAvailableHeight,
} from '../features/sketch_drawer_sizing.js';
import { resolveSketchStackCenterYFromNormalizedItem } from '../features/sketch_stack_positioning.js';
import type { UnknownRecord } from '../../../types';
import type { BuiltInDeskVerticalRange } from '../../../types/built_in_desk.js';
import { isShelfHiddenByDesk } from './built_in_desk_contents.js';
import { shelfHeightForVariant } from './render_interior_custom_ops_shelves.js';

type ShelfBlockerMode = 'contents' | 'surface';

type RodClearanceArgs = {
  config?: unknown;
  yPos: number;
  effectiveBottomY: number;
  effectiveTopY?: unknown;
  localGridStep: number;
  gridDivisions?: unknown;
  manualHeightLimit?: number | null;
  woodThick?: unknown;
  shelfThick?: unknown;
  shelfBlockerMode?: ShelfBlockerMode;
  builtInDeskRange?: BuiltInDeskVerticalRange | undefined;
};

type RodPoint = {
  y: number;
};

type DrawerRange = {
  minY: number;
  maxY: number;
};

type RodClearanceBlocker = number | DrawerRange;

function clampSingleHangerScaleForModuleWidth(moduleWidth: unknown): number {
  const width = readRuntimeNumber(moduleWidth);
  if (width == null) return 1;
  const dims = HANGER_VISUAL_POLICY;
  const totalHangerWidth = dims.halfWidthM * 2;
  if (!(totalHangerWidth > 0)) return 1;
  const safeWidth = width - dims.moduleWidthClearanceM;
  if (!(safeWidth > 0)) return 0;
  return Math.min(1, safeWidth / totalHangerWidth);
}

export function resolveSingleHangerRequiredClearance(moduleWidth: unknown): number {
  const dims = HANGER_VISUAL_POLICY;
  const scale = clampSingleHangerScaleForModuleWidth(moduleWidth);
  const shoulderHeightM: number = dims.shoulderHeightM;
  const lowestBodyY = -shoulderHeightM - dims.shoulderDropM;
  const lowestBarY = -shoulderHeightM - dims.barYOffsetM - dims.barRadiusM;
  const lowestLocalY = Math.min(lowestBodyY, lowestBarY, 0);
  return Math.max(0, dims.rodYOffsetM + Math.abs(lowestLocalY) * scale);
}

export function canSingleHangerFitBelowRod(args: {
  availableHeight: unknown;
  moduleWidth: unknown;
}): boolean {
  const availableHeight = readRuntimeNumber(args.availableHeight);
  if (availableHeight == null) return false;
  const requiredClearance = resolveSingleHangerRequiredClearance(args.moduleWidth);
  const tolerance = Math.max(1e-5, requiredClearance * 1e-4);
  return availableHeight + tolerance >= requiredClearance;
}

export function resolveRodClearanceAboveDesk(
  yPos: number,
  desk: BuiltInDeskVerticalRange | null | undefined
): number {
  return desk && yPos > desk.bottomY ? Math.max(0, yPos - desk.surfaceY) : Infinity;
}

const FOLDED_CLOTHES_BLOCKER_HEIGHT_M =
  FOLDED_CLOTHES_VISUAL_POLICY.itemHeightM *
    (FOLDED_CLOTHES_VISUAL_POLICY.stackBaseItems +
      Math.max(0, FOLDED_CLOTHES_VISUAL_POLICY.randomItemsRange - 1)) +
  INTERIOR_SHELF_CONTENT_CLEARANCE_POLICY.contentsHeightClearanceM;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readRuntimeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readBoolArray(value: unknown): boolean[] {
  return Array.isArray(value) ? value.map(entry => !!entry) : [];
}

function readRecordArray(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.filter((entry): entry is UnknownRecord => isRecord(entry)) : [];
}

function readGridDivisions(config: UnknownRecord | null, explicit: unknown): number {
  const explicitDivisions = readRuntimeNumber(explicit);
  if (explicitDivisions != null && explicitDivisions > 0) return Math.round(explicitDivisions);
  const configDivisions = readRuntimeNumber(config?.gridDivisions);
  if (configDivisions != null && configDivisions > 0) return Math.round(configDivisions);
  return CARCASS_INTERIOR_GRID_POLICY.divisions;
}

function resolveShelfTopY(args: { shelfY: number; shelfThick: number }): number | null {
  const { shelfY, shelfThick } = args;
  if (!Number.isFinite(shelfY)) return null;
  return shelfY + Math.max(0, shelfThick) / 2;
}

function pushShelfBlocker(args: {
  blockers: RodClearanceBlocker[];
  effectiveBottomY: number;
  localGridStep: number;
  index: number;
  shelfThick: number;
  shelfBlockerMode: ShelfBlockerMode;
  builtInDeskRange?: BuiltInDeskVerticalRange | undefined;
  variant?: unknown;
}): void {
  const { blockers, effectiveBottomY, localGridStep, index, shelfThick, shelfBlockerMode } = args;
  if (!(index > 0) || !(localGridStep > 0)) return;
  pushShelfContentBlocker({
    blockers,
    shelfY: effectiveBottomY + index * localGridStep,
    shelfThick,
    shelfBlockerMode,
    builtInDeskRange: args.builtInDeskRange,
    variant: args.variant,
  });
}

function pushShelfContentBlocker(args: {
  blockers: RodClearanceBlocker[];
  shelfY: number;
  shelfThick: number;
  shelfBlockerMode: ShelfBlockerMode;
  builtInDeskRange?: BuiltInDeskVerticalRange | undefined;
  variant?: unknown;
}): void {
  const { blockers, shelfY, shelfThick, shelfBlockerMode } = args;
  const shelfTopY = resolveShelfTopY({ shelfY, shelfThick });
  if (
    shelfTopY == null ||
    isShelfHiddenByDesk(args.builtInDeskRange, shelfY, shelfHeightForVariant(args.variant, shelfThick))
  )
    return;

  // Hanging clothes must reserve the visible folded stack that can sit on top of a shelf.
  // A single hanger, however, only collides with the physical shelf slab itself. Keeping
  // these two blocker modes separate prevents false removal when folded-clothes height is
  // irrelevant, and prevents missed collisions when the synthetic folded stack rises above
  // the rod and would otherwise be ignored as an above-rod blocker.
  const blockerY = shelfBlockerMode === 'contents' ? shelfTopY + FOLDED_CLOTHES_BLOCKER_HEIGHT_M : shelfTopY;
  blockers.push(blockerY);
}

function resolveRodY(args: {
  rod: UnknownRecord;
  effectiveBottomY: number;
  localGridStep: number;
  fallbackGridIndex?: number;
}): number | null {
  const { rod, effectiveBottomY, localGridStep, fallbackGridIndex } = args;
  if (!(localGridStep > 0)) return null;
  const rawYFactor = readRuntimeNumber(rod.yFactor);
  const rawGridIndex = readRuntimeNumber(rod.gridIndex);
  const factor = rawYFactor ?? rawGridIndex ?? fallbackGridIndex ?? null;
  if (factor == null) return null;
  const yAdd = readRuntimeNumber(rod.yAdd) ?? 0;
  return effectiveBottomY + factor * localGridStep + yAdd;
}

function pushRodBlockers(args: { blockers: RodClearanceBlocker[]; rods: RodPoint[] }): void {
  const { blockers, rods } = args;
  for (const rod of rods) {
    const y = rod.y;
    if (Number.isFinite(y)) blockers.push(y);
  }
}

function collectPresetBlockers(args: {
  config: UnknownRecord | null;
  layout: string;
  effectiveBottomY: number;
  localGridStep: number;
  blockers: RodClearanceBlocker[];
  shelfThick: number;
  shelfBlockerMode: ShelfBlockerMode;
  builtInDeskRange?: BuiltInDeskVerticalRange | undefined;
}): boolean {
  const { config, layout, effectiveBottomY, localGridStep, blockers, shelfThick, shelfBlockerMode } = args;
  const presetShelfRows = INTERIOR_PRESET_SHELF_ROWS_POLICY;
  const presetRodFactors = INTERIOR_PRESET_ROD_FACTORS_POLICY;
  const rods: RodPoint[] = [];
  let hasKnownPreset = false;

  const addShelves = (rows: readonly number[]): void => {
    for (const index of rows) {
      pushShelfBlocker({
        blockers,
        effectiveBottomY,
        localGridStep,
        index,
        shelfThick,
        shelfBlockerMode,
        builtInDeskRange: args.builtInDeskRange,
      });
    }
  };
  const addRod = (yFactor: number): void => {
    if (!(localGridStep > 0)) return;
    rods.push({ y: effectiveBottomY + yFactor * localGridStep });
  };

  switch (layout) {
    case 'shelves':
      hasKnownPreset = true;
      addShelves(presetShelfRows.fullShelfRows);
      break;
    case 'mixed':
      hasKnownPreset = true;
      addShelves(presetShelfRows.fullShelfRows);
      addRod(presetRodFactors.mixedRodYFactor);
      break;
    case 'hanging':
    case 'hanging_top2':
      hasKnownPreset = true;
      addShelves(presetShelfRows.hangingShelfRows);
      addRod(presetRodFactors.hangingRodYFactor);
      break;
    case 'hanging_split':
      hasKnownPreset = true;
      addShelves(presetShelfRows.splitShelfRows);
      addRod(presetRodFactors.splitUpperRodYFactor);
      addRod(presetRodFactors.splitLowerRodYFactor);
      break;
    case 'storage':
    case 'storage_shelf':
      hasKnownPreset = true;
      addShelves(presetShelfRows.hangingShelfRows);
      addRod(presetRodFactors.storageRodYFactor);
      blockers.push(effectiveBottomY + INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM);
      break;
    default:
      break;
  }

  const customData = isRecord(config?.customData) ? config.customData : null;
  if (customData && !!customData.storage) {
    blockers.push(effectiveBottomY + INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM);
    hasKnownPreset = true;
  }

  pushRodBlockers({ blockers, rods });
  return hasKnownPreset;
}

function collectCustomBlockers(args: {
  customData: UnknownRecord;
  effectiveBottomY: number;
  localGridStep: number;
  blockers: RodClearanceBlocker[];
  shelfThick: number;
  shelfBlockerMode: ShelfBlockerMode;
  builtInDeskRange?: BuiltInDeskVerticalRange | undefined;
}): boolean {
  const { customData, effectiveBottomY, localGridStep, blockers, shelfThick, shelfBlockerMode } = args;
  let hasEvidence = true;

  const shelves = readBoolArray(customData.shelves);
  const variants = Array.isArray(customData.shelfVariants) ? customData.shelfVariants : [];
  for (let i = 0; i < shelves.length; i += 1) {
    if (shelves[i]) {
      pushShelfBlocker({
        blockers,
        effectiveBottomY,
        localGridStep,
        index: i + 1,
        shelfThick,
        shelfBlockerMode,
        builtInDeskRange: args.builtInDeskRange,
        variant: variants[i],
      });
    }
  }

  const rodOps = readRecordArray(customData.rodOps);
  const explicitRodGridIndexes = new Set<number>();
  for (const rod of rodOps) {
    const rawGridIndex = readRuntimeNumber(rod.gridIndex);
    if (rawGridIndex != null && rawGridIndex >= 1) explicitRodGridIndexes.add(Math.round(rawGridIndex));
    const rodY = resolveRodY({
      rod,
      effectiveBottomY,
      localGridStep,
    });
    if (rodY != null) blockers.push(rodY);
  }

  const rods = readBoolArray(customData.rods);
  for (let i = 0; i < rods.length; i += 1) {
    if (!rods[i] || explicitRodGridIndexes.has(i + 1)) continue;
    const rodY = effectiveBottomY + (i + 1) * localGridStep + INTERIOR_ROD_PLACEMENT_POLICY.defaultYOffsetM;
    if (Number.isFinite(rodY)) blockers.push(rodY);
  }

  if (customData.storage) {
    blockers.push(effectiveBottomY + INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM);
  }

  if (!shelves.length && !rods.length && !rodOps.length && !customData.storage) hasEvidence = false;
  return hasEvidence;
}

function resolvePositiveThickness(value: unknown): number {
  const thickness = readRuntimeNumber(value);
  if (thickness != null && thickness > 0) return thickness;
  return MATERIAL_THICKNESS_POLICY.wood.thicknessM;
}

function resolveSketchInternalDrawerPad(woodThick: number): number {
  return Math.min(
    DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalClampPadMaxM,
    Math.max(
      DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalClampPadMinM,
      Math.max(0, woodThick) * DRAWER_SKETCH_INTERNAL_PREVIEW_POLICY.internalClampPadWoodRatio
    )
  );
}

function pushDrawerRangeBlocker(args: { blockers: RodClearanceBlocker[]; range: DrawerRange }): boolean {
  const { blockers, range } = args;
  if (!Number.isFinite(range.minY) || !Number.isFinite(range.maxY)) return false;
  if (!(range.maxY > range.minY)) return false;
  blockers.push(range.maxY);
  return true;
}

function resolveSketchInternalDrawerRange(args: {
  item: UnknownRecord;
  effectiveBottomY: number;
  effectiveTopY: number;
  span: number;
  woodThick: number;
}): DrawerRange | null {
  const { item, effectiveBottomY, effectiveTopY, span, woodThick } = args;
  const pad = resolveSketchInternalDrawerPad(woodThick);
  const metrics = resolveSketchInternalDrawerMetrics({
    drawerHeightM: readSketchDrawerHeightMFromItem(item, DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_M),
  });
  const availableHeight = Math.max(0, effectiveTopY - effectiveBottomY - pad * 2);
  if (!sketchStackFitsAvailableHeight(metrics.stackH, availableHeight)) return null;
  const centerY = resolveSketchStackCenterYFromNormalizedItem({
    item,
    bottomY: effectiveBottomY,
    topY: effectiveTopY,
    totalHeight: span,
    stackH: metrics.stackH,
    pad,
  });
  if (centerY == null) return null;
  return {
    minY: centerY - metrics.stackH / 2,
    maxY: centerY + metrics.stackH / 2,
  };
}

function resolveSketchExternalDrawerRange(args: {
  item: UnknownRecord;
  effectiveBottomY: number;
  effectiveTopY: number;
  span: number;
}): DrawerRange | null {
  const { item, effectiveBottomY, effectiveTopY, span } = args;
  const metrics = resolveSketchExternalDrawerMetrics({
    drawerCount: readRuntimeNumber(item.count),
    drawerHeightM: readSketchDrawerHeightMFromItem(item, DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_M),
  });
  const availableHeight = Math.max(0, effectiveTopY - effectiveBottomY);
  if (!sketchStackFitsAvailableHeight(metrics.stackH, availableHeight)) return null;
  const centerY = resolveSketchStackCenterYFromNormalizedItem({
    item,
    bottomY: effectiveBottomY,
    topY: effectiveTopY,
    totalHeight: span,
    stackH: metrics.stackH,
  });
  if (centerY == null) return null;
  return {
    minY: centerY - metrics.stackH / 2,
    maxY: centerY + metrics.stackH / 2,
  };
}

function collectSketchDrawerBlockers(args: {
  extras: UnknownRecord;
  effectiveBottomY: number;
  effectiveTopY: number;
  span: number;
  blockers: RodClearanceBlocker[];
  woodThick: number;
}): boolean {
  const { extras, effectiveBottomY, effectiveTopY, span, blockers, woodThick } = args;
  let hasEvidence = false;

  const drawers = readRecordArray(extras.drawers);
  for (const item of drawers) {
    const range = resolveSketchInternalDrawerRange({
      item,
      effectiveBottomY,
      effectiveTopY,
      span,
      woodThick,
    });
    if (range && pushDrawerRangeBlocker({ blockers, range })) hasEvidence = true;
  }

  const extDrawers = readRecordArray(extras.extDrawers);
  for (const item of extDrawers) {
    const range = resolveSketchExternalDrawerRange({
      item,
      effectiveBottomY,
      effectiveTopY,
      span,
    });
    if (range && pushDrawerRangeBlocker({ blockers, range })) hasEvidence = true;
  }

  return hasEvidence;
}

function collectSketchExtraBlockers(args: {
  config: UnknownRecord | null;
  effectiveBottomY: number;
  effectiveTopY: number;
  blockers: RodClearanceBlocker[];
  woodThick: number;
  shelfThick: number;
  shelfBlockerMode: ShelfBlockerMode;
  builtInDeskRange?: BuiltInDeskVerticalRange | undefined;
}): boolean {
  const { config, effectiveBottomY, effectiveTopY, blockers, woodThick, shelfThick, shelfBlockerMode } = args;
  const extras = isRecord(config?.sketchExtras) ? config.sketchExtras : null;
  if (!extras) return false;
  let hasEvidence = false;
  const span = effectiveTopY - effectiveBottomY;
  if (!(span > 0)) return false;

  const clampNormY = (value: unknown): number | null => {
    const raw = readRuntimeNumber(value);
    if (raw == null) return null;
    const n = Math.max(0, Math.min(1, raw));
    const pad = SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY.placementClampPadMinM;
    const lo = effectiveBottomY + pad;
    const hi = effectiveTopY - pad;
    const y = effectiveBottomY + n * span;
    return Math.max(lo, Math.min(hi, y));
  };

  // A box occupies its whole height, including a top at or above the rod.
  // Keep its range so an intersecting top cannot be mistaken for another rod.
  for (const box of readRecordArray(extras.boxes)) {
    if (box.freePlacement === true) continue;
    const yNorm = readRuntimeNumber(box.yNorm);
    const height = readRuntimeNumber(box.heightM);
    if (yNorm == null || height == null || !(height > 0)) continue;
    const centerY = effectiveBottomY + Math.max(0, Math.min(1, yNorm)) * span;
    blockers.push({ minY: centerY - height / 2, maxY: centerY + height / 2 });
    hasEvidence = true;
  }

  const shelves = readRecordArray(extras.shelves);
  for (const shelf of shelves) {
    const y = clampNormY(shelf.yNorm);
    if (y != null) {
      pushShelfContentBlocker({
        blockers,
        shelfY: y,
        shelfThick,
        shelfBlockerMode,
        builtInDeskRange: args.builtInDeskRange,
        variant: shelf.variant,
      });
      hasEvidence = true;
    }
  }

  const rods = readRecordArray(extras.rods);
  for (const rod of rods) {
    const y = clampNormY(rod.yNorm);
    if (y != null) {
      blockers.push(y);
      hasEvidence = true;
    }
  }

  const storageBarriers = readRecordArray(extras.storageBarriers);
  for (const barrier of storageBarriers) {
    const baseY = clampNormY(barrier.yNorm);
    const height =
      readRuntimeNumber(barrier.heightM ?? barrier.hM) ?? INTERIOR_STORAGE_BARRIER_POLICY.barrierHeightM;
    if (baseY != null) {
      blockers.push(baseY + Math.max(0, height) / 2);
      hasEvidence = true;
    }
  }

  hasEvidence =
    collectSketchDrawerBlockers({
      extras,
      effectiveBottomY,
      effectiveTopY,
      span,
      blockers,
      woodThick,
    }) || hasEvidence;

  return hasEvidence;
}

export function resolveInteriorRodAvailableHeight(args: RodClearanceArgs): number {
  const config = isRecord(args.config) ? args.config : null;
  const yPos = readRuntimeNumber(args.yPos);
  const effectiveBottomY = readRuntimeNumber(args.effectiveBottomY);
  const localGridStep = readRuntimeNumber(args.localGridStep) ?? NaN;
  if (yPos == null || effectiveBottomY == null) return 0;

  const gridDivisions = readGridDivisions(config, args.gridDivisions);
  const woodThick = resolvePositiveThickness(args.woodThick);
  const shelfThick = resolvePositiveThickness(args.shelfThick ?? args.woodThick);
  const shelfBlockerMode: ShelfBlockerMode = args.shelfBlockerMode === 'surface' ? 'surface' : 'contents';
  const derivedTopY =
    Number.isFinite(localGridStep) && localGridStep > 0
      ? effectiveBottomY + gridDivisions * localGridStep
      : yPos;
  const effectiveTopYRaw = readRuntimeNumber(args.effectiveTopY);
  const effectiveTopY = effectiveTopYRaw != null ? effectiveTopYRaw : derivedTopY;

  const blockers: RodClearanceBlocker[] = [effectiveBottomY];
  let hasEvidence = false;
  const customData = isRecord(config?.customData) ? config.customData : null;

  if (config && config.isCustom === true && customData) {
    hasEvidence = collectCustomBlockers({
      customData,
      effectiveBottomY,
      localGridStep,
      blockers,
      shelfThick,
      shelfBlockerMode,
      builtInDeskRange: args.builtInDeskRange,
    });
  } else {
    const layout = typeof config?.layout === 'string' ? config.layout : '';
    hasEvidence = collectPresetBlockers({
      config,
      layout,
      effectiveBottomY,
      localGridStep,
      blockers,
      shelfThick,
      shelfBlockerMode,
      builtInDeskRange: args.builtInDeskRange,
    });
  }

  hasEvidence =
    collectSketchExtraBlockers({
      config,
      effectiveBottomY,
      effectiveTopY,
      blockers,
      woodThick,
      shelfThick,
      shelfBlockerMode,
      builtInDeskRange: args.builtInDeskRange,
    }) || hasEvidence;

  let blockerY = effectiveBottomY;
  const sameRodTolerance = Math.max(1e-5, Math.abs(localGridStep || 0) * 1e-4);
  for (const blocker of blockers) {
    if (typeof blocker !== 'number') {
      if (blocker.minY >= yPos) continue;
      if (blocker.maxY >= yPos - sameRodTolerance) return 0;
      blockerY = Math.max(blockerY, blocker.maxY);
      continue;
    }
    if (!Number.isFinite(blocker)) continue;
    if (blocker < yPos - sameRodTolerance && blocker > blockerY) blockerY = blocker;
  }

  if (hasEvidence) return Math.max(0, yPos - blockerY);

  const manualHeightLimit = readRuntimeNumber(args.manualHeightLimit);
  if (manualHeightLimit != null) {
    return Math.max(0, manualHeightLimit);
  }

  return Math.max(0, yPos - effectiveBottomY);
}
