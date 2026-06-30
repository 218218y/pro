import {
  CARCASS_SHELL_DIMENSIONS,
  CONTENT_VISUAL_DIMENSIONS,
  DRAWER_DIMENSIONS,
  INTERIOR_FITTINGS_DIMENSIONS,
  MATERIAL_DIMENSIONS,
  SKETCH_BOX_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
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
};

type RodPoint = {
  y: number;
};

type DrawerRange = {
  minY: number;
  maxY: number;
};

const FOLDED_CLOTHES_BLOCKER_HEIGHT_M =
  CONTENT_VISUAL_DIMENSIONS.foldedClothes.itemHeightM *
    (CONTENT_VISUAL_DIMENSIONS.foldedClothes.stackBaseItems +
      Math.max(0, CONTENT_VISUAL_DIMENSIONS.foldedClothes.randomItemsRange - 1)) +
  INTERIOR_FITTINGS_DIMENSIONS.shelves.contentsHeightClearanceM;

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
  return CARCASS_SHELL_DIMENSIONS.drawerGridDivisions;
}

function pushShelfBlocker(args: {
  blockers: number[];
  effectiveBottomY: number;
  localGridStep: number;
  index: number;
  shelfThick: number;
}): void {
  const { blockers, effectiveBottomY, localGridStep, index, shelfThick } = args;
  if (!(index > 0) || !(localGridStep > 0)) return;
  pushShelfContentBlocker({ blockers, shelfY: effectiveBottomY + index * localGridStep, shelfThick });
}

function pushShelfContentBlocker(args: { blockers: number[]; shelfY: number; shelfThick: number }): void {
  const { blockers, shelfY, shelfThick } = args;
  if (!Number.isFinite(shelfY)) return;

  // Hanging clothes are shortened against the visible contents resting on a shelf, not only
  // against the wooden shelf slab. Folded clothes are emitted from the shelf top upward, so
  // reserve their maximum generated stack height as a real blocker whenever contents are shown.
  const shelfHalfH = Math.max(0, shelfThick) / 2;
  blockers.push(shelfY + shelfHalfH + FOLDED_CLOTHES_BLOCKER_HEIGHT_M);
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

function pushRodBlockers(args: { blockers: number[]; rods: RodPoint[] }): void {
  const { blockers, rods } = args;
  for (let i = 0; i < rods.length; i += 1) {
    const y = rods[i]?.y;
    if (Number.isFinite(y)) blockers.push(y);
  }
}

function collectPresetBlockers(args: {
  config: UnknownRecord | null;
  layout: string;
  effectiveBottomY: number;
  localGridStep: number;
  blockers: number[];
  shelfThick: number;
}): boolean {
  const { config, layout, effectiveBottomY, localGridStep, blockers, shelfThick } = args;
  const preset = INTERIOR_FITTINGS_DIMENSIONS.presets;
  const rods: RodPoint[] = [];
  let hasKnownPreset = false;

  const addShelves = (rows: readonly number[]): void => {
    for (let i = 0; i < rows.length; i += 1) {
      pushShelfBlocker({ blockers, effectiveBottomY, localGridStep, index: rows[i], shelfThick });
    }
  };
  const addRod = (yFactor: number): void => {
    if (!(localGridStep > 0)) return;
    rods.push({ y: effectiveBottomY + yFactor * localGridStep });
  };

  switch (layout) {
    case 'shelves':
      hasKnownPreset = true;
      addShelves(preset.fullShelfRows);
      break;
    case 'mixed':
      hasKnownPreset = true;
      addShelves(preset.fullShelfRows);
      addRod(preset.mixedRodYFactor);
      break;
    case 'hanging':
    case 'hanging_top2':
      hasKnownPreset = true;
      addShelves(preset.hangingShelfRows);
      addRod(preset.hangingRodYFactor);
      break;
    case 'hanging_split':
      hasKnownPreset = true;
      addShelves(preset.splitShelfRows);
      addRod(preset.splitUpperRodYFactor);
      addRod(preset.splitLowerRodYFactor);
      break;
    case 'storage':
    case 'storage_shelf':
      hasKnownPreset = true;
      addShelves(preset.hangingShelfRows);
      addRod(preset.storageRodYFactor);
      blockers.push(effectiveBottomY + INTERIOR_FITTINGS_DIMENSIONS.storage.barrierHeightM);
      break;
    default:
      break;
  }

  const customData = isRecord(config?.customData) ? config.customData : null;
  if (customData && !!customData.storage) {
    blockers.push(effectiveBottomY + INTERIOR_FITTINGS_DIMENSIONS.storage.barrierHeightM);
    hasKnownPreset = true;
  }

  pushRodBlockers({ blockers, rods });
  return hasKnownPreset;
}

function collectCustomBlockers(args: {
  customData: UnknownRecord;
  effectiveBottomY: number;
  localGridStep: number;
  blockers: number[];
  shelfThick: number;
}): boolean {
  const { customData, effectiveBottomY, localGridStep, blockers, shelfThick } = args;
  let hasEvidence = true;

  const shelves = readBoolArray(customData.shelves);
  for (let i = 0; i < shelves.length; i += 1) {
    if (shelves[i]) pushShelfBlocker({ blockers, effectiveBottomY, localGridStep, index: i + 1, shelfThick });
  }

  const rodOps = readRecordArray(customData.rodOps);
  const explicitRodGridIndexes = new Set<number>();
  for (let i = 0; i < rodOps.length; i += 1) {
    const rawGridIndex = readRuntimeNumber(rodOps[i].gridIndex);
    if (rawGridIndex != null && rawGridIndex >= 1) explicitRodGridIndexes.add(Math.round(rawGridIndex));
    const rodY = resolveRodY({
      rod: rodOps[i],
      effectiveBottomY,
      localGridStep,
    });
    if (rodY != null) blockers.push(rodY);
  }

  const rods = readBoolArray(customData.rods);
  for (let i = 0; i < rods.length; i += 1) {
    if (!rods[i] || explicitRodGridIndexes.has(i + 1)) continue;
    const rodY =
      effectiveBottomY + (i + 1) * localGridStep + INTERIOR_FITTINGS_DIMENSIONS.rods.defaultYOffsetM;
    if (Number.isFinite(rodY)) blockers.push(rodY);
  }

  if (!!customData.storage) {
    blockers.push(effectiveBottomY + INTERIOR_FITTINGS_DIMENSIONS.storage.barrierHeightM);
  }

  if (!shelves.length && !rods.length && !rodOps.length && !customData.storage) hasEvidence = false;
  return hasEvidence;
}

function resolvePositiveThickness(value: unknown): number {
  const thickness = readRuntimeNumber(value);
  if (thickness != null && thickness > 0) return thickness;
  return MATERIAL_DIMENSIONS.wood.thicknessM;
}

function resolveSketchInternalDrawerPad(woodThick: number): number {
  return Math.min(
    DRAWER_DIMENSIONS.sketch.internalClampPadMaxM,
    Math.max(
      DRAWER_DIMENSIONS.sketch.internalClampPadMinM,
      Math.max(0, woodThick) * DRAWER_DIMENSIONS.sketch.internalClampPadWoodRatio
    )
  );
}

function pushDrawerRangeBlocker(args: { blockers: number[]; range: DrawerRange }): boolean {
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
  blockers: number[];
  woodThick: number;
}): boolean {
  const { extras, effectiveBottomY, effectiveTopY, span, blockers, woodThick } = args;
  let hasEvidence = false;

  const drawers = readRecordArray(extras.drawers);
  for (let i = 0; i < drawers.length; i += 1) {
    const range = resolveSketchInternalDrawerRange({
      item: drawers[i],
      effectiveBottomY,
      effectiveTopY,
      span,
      woodThick,
    });
    if (range && pushDrawerRangeBlocker({ blockers, range })) hasEvidence = true;
  }

  const extDrawers = readRecordArray(extras.extDrawers);
  for (let i = 0; i < extDrawers.length; i += 1) {
    const range = resolveSketchExternalDrawerRange({
      item: extDrawers[i],
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
  blockers: number[];
  woodThick: number;
  shelfThick: number;
}): boolean {
  const { config, effectiveBottomY, effectiveTopY, blockers, woodThick, shelfThick } = args;
  const extras = isRecord(config?.sketchExtras) ? config.sketchExtras : null;
  if (!extras) return false;
  let hasEvidence = false;
  const span = effectiveTopY - effectiveBottomY;
  if (!(span > 0)) return false;

  const clampNormY = (value: unknown): number | null => {
    const raw = readRuntimeNumber(value);
    if (raw == null) return null;
    const n = Math.max(0, Math.min(1, raw));
    const geometryDims = SKETCH_BOX_DIMENSIONS.geometry;
    const pad = geometryDims.placementClampPadMinM;
    const lo = effectiveBottomY + pad;
    const hi = effectiveTopY - pad;
    const y = effectiveBottomY + n * span;
    return Math.max(lo, Math.min(hi, y));
  };

  const shelves = readRecordArray(extras.shelves);
  for (let i = 0; i < shelves.length; i += 1) {
    const y = clampNormY(shelves[i].yNorm);
    if (y != null) {
      pushShelfContentBlocker({ blockers, shelfY: y, shelfThick });
      hasEvidence = true;
    }
  }

  const rods = readRecordArray(extras.rods);
  for (let i = 0; i < rods.length; i += 1) {
    const y = clampNormY(rods[i].yNorm);
    if (y != null) {
      blockers.push(y);
      hasEvidence = true;
    }
  }

  const storageBarriers = readRecordArray(extras.storageBarriers);
  for (let i = 0; i < storageBarriers.length; i += 1) {
    const barrier = storageBarriers[i];
    const baseY = clampNormY(barrier.yNorm);
    const height =
      readRuntimeNumber(barrier.heightM ?? barrier.hM) ?? INTERIOR_FITTINGS_DIMENSIONS.storage.barrierHeightM;
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
  const derivedTopY =
    Number.isFinite(localGridStep) && localGridStep > 0
      ? effectiveBottomY + gridDivisions * localGridStep
      : yPos;
  const effectiveTopYRaw = readRuntimeNumber(args.effectiveTopY);
  const effectiveTopY = effectiveTopYRaw != null ? effectiveTopYRaw : derivedTopY;

  const blockers: number[] = [effectiveBottomY];
  let hasEvidence = false;
  const customData = isRecord(config?.customData) ? config.customData : null;

  if (config && config.isCustom === true && customData) {
    hasEvidence = collectCustomBlockers({
      customData,
      effectiveBottomY,
      localGridStep,
      blockers,
      shelfThick,
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
    }) || hasEvidence;

  let blockerY = effectiveBottomY;
  const sameRodTolerance = Math.max(1e-5, Math.abs(localGridStep || 0) * 1e-4);
  for (let i = 0; i < blockers.length; i += 1) {
    const blocker = blockers[i];
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
