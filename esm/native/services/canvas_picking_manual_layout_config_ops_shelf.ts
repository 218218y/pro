import { DRAWER_DIMENSIONS, MATERIAL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  doesSketchModuleVerticalRangeCollideWithDrawers,
  resolveSketchModuleShelfCollisionHeight,
} from './canvas_picking_sketch_module_vertical_content_collision.js';
import {
  addBraceShelfIndex,
  normalizeManualLayoutShelfVariant,
  prepareEditableManualLayoutGrid,
  preparePresetBackedManualLayoutGrid,
  removeBraceShelfIndex,
  type ManualLayoutConfigRecord,
  type ManualLayoutEditableGridArgs,
  type ManualLayoutGridMutationArgs,
  type ManualLayoutShelfVariant,
  type RemoveManualLayoutBaseShelfArgs,
  type RemoveManualLayoutBaseStorageArgs,
  type ToggleManualLayoutShelfArgs,
} from './canvas_picking_manual_layout_config_ops_shared.js';

export { normalizeManualLayoutShelfVariant };

type ManualLayoutShelfCollisionOptions = {
  cfgRef?: ManualLayoutConfigRecord | null;
  pad?: unknown;
  woodThick?: unknown;
};

export type ManualLayoutShelfFillPlan = {
  requestedCount: number;
  builtCount: number;
  skippedCount: number;
  skippedIndexes: number[];
  allowedIndexes: number[];
  shelfYs: number[];
};

export type ManualLayoutShelfToggleResult = {
  changed: boolean;
  blockedBySketchDrawers: boolean;
};

function readFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  return null;
}

function resolveCollisionWoodThick(value: unknown): number {
  const parsed = readFiniteNumber(value);
  return parsed != null && parsed > 0 ? parsed : MATERIAL_DIMENSIONS.wood.thicknessM;
}

function resolveCollisionPad(value: unknown, woodThick: number): number {
  const parsed = readFiniteNumber(value);
  if (parsed != null && parsed >= 0) return parsed;
  const dims = DRAWER_DIMENSIONS.sketch;
  return Math.min(
    dims.internalClampPadMaxM,
    Math.max(dims.internalClampPadMinM, woodThick * dims.internalClampPadWoodRatio)
  );
}

function resolveGridShelfCount(divs: unknown): number {
  const parsed = readFiniteNumber(divs);
  if (parsed == null || parsed <= 1) return 0;
  return Math.max(0, Math.floor(parsed) - 1);
}

function resolveShelfCenterY(args: ManualLayoutGridMutationArgs & { shelfIndex: number }): number | null {
  const totalHeight = args.topY - args.bottomY;
  if (!(totalHeight > 0) || args.shelfIndex < 1) return null;
  return args.bottomY + args.shelfIndex * (totalHeight / args.divs);
}

export function isManualLayoutShelfBlockedBySketchDrawers(
  args: ManualLayoutGridMutationArgs &
    ManualLayoutShelfCollisionOptions & {
      shelfIndex: number;
      shelfVariant: ManualLayoutShelfVariant;
    }
): boolean {
  const centerY = resolveShelfCenterY(args);
  const totalHeight = args.topY - args.bottomY;
  if (centerY == null || !(totalHeight > 0)) return false;
  const woodThick = resolveCollisionWoodThick(args.woodThick);
  const pad = resolveCollisionPad(args.pad, woodThick);
  return doesSketchModuleVerticalRangeCollideWithDrawers({
    cfgRef: args.cfgRef ?? null,
    bottomY: args.bottomY,
    topY: args.topY,
    totalHeight,
    pad,
    centerY,
    heightM: resolveSketchModuleShelfCollisionHeight({
      variant: args.shelfVariant,
      woodThick,
    }),
  });
}

export function resolveManualLayoutShelfFillPlan(
  args: ManualLayoutGridMutationArgs &
    ManualLayoutShelfCollisionOptions & { shelfVariant: ManualLayoutShelfVariant }
): ManualLayoutShelfFillPlan {
  const requestedCount = resolveGridShelfCount(args.divs);
  const allowedIndexes: number[] = [];
  const skippedIndexes: number[] = [];
  const shelfYs: number[] = [];
  for (let shelfIndex = 1; shelfIndex <= requestedCount; shelfIndex += 1) {
    const centerY = resolveShelfCenterY({ ...args, shelfIndex });
    if (centerY == null) {
      skippedIndexes.push(shelfIndex);
      continue;
    }
    if (isManualLayoutShelfBlockedBySketchDrawers({ ...args, shelfIndex })) {
      skippedIndexes.push(shelfIndex);
      continue;
    }
    allowedIndexes.push(shelfIndex);
    shelfYs.push(centerY);
  }
  return {
    requestedCount,
    builtCount: allowedIndexes.length,
    skippedCount: skippedIndexes.length,
    skippedIndexes,
    allowedIndexes,
    shelfYs,
  };
}

export function fillManualLayoutShelves(
  cfg: ManualLayoutConfigRecord,
  args: ManualLayoutGridMutationArgs &
    ManualLayoutShelfCollisionOptions & { shelfVariant: ManualLayoutShelfVariant }
): ManualLayoutShelfFillPlan {
  const { customData, braceShelves } = prepareEditableManualLayoutGrid(cfg, {
    divs: args.divs,
    topY: args.topY,
    bottomY: args.bottomY,
    reset: true,
  });
  const plan = resolveManualLayoutShelfFillPlan({ ...args, cfgRef: args.cfgRef ?? cfg });
  const skipped = new Set(plan.skippedIndexes);
  const storedVariant = args.shelfVariant === 'regular' ? '' : args.shelfVariant;
  for (let i = 0; i < plan.requestedCount; i += 1) {
    const shelfIndex = i + 1;
    const shouldBuild = !skipped.has(shelfIndex);
    customData.shelves[i] = shouldBuild;
    customData.shelfVariants[i] = shouldBuild ? storedVariant : '';
    if (shouldBuild && args.shelfVariant === 'brace') addBraceShelfIndex(braceShelves, shelfIndex);
  }
  return plan;
}

export function toggleManualLayoutStorage(
  cfg: ManualLayoutConfigRecord,
  args: ManualLayoutEditableGridArgs
): void {
  const { customData } = prepareEditableManualLayoutGrid(cfg, args);
  customData.storage = !customData.storage;
}

export function toggleManualLayoutShelf(
  cfg: ManualLayoutConfigRecord,
  args: ToggleManualLayoutShelfArgs & ManualLayoutShelfCollisionOptions & { reset: boolean }
): ManualLayoutShelfToggleResult {
  const { customData, braceShelves } = prepareEditableManualLayoutGrid(cfg, {
    divs: args.divs,
    topY: args.topY,
    bottomY: args.bottomY,
    reset: args.reset,
  });
  while (customData.shelves.length < args.divs - 1) customData.shelves.push(false);
  while (customData.shelfVariants.length < args.divs - 1) customData.shelfVariants.push('');

  const shelfIndex = args.arrayIdx + 1;
  const currentVariantRaw =
    typeof customData.shelfVariants[args.arrayIdx] === 'string'
      ? String(customData.shelfVariants[args.arrayIdx])
      : '';
  const isBraceExisting = braceShelves.includes(shelfIndex);
  const existingVariant =
    isBraceExisting || currentVariantRaw === 'brace'
      ? 'brace'
      : currentVariantRaw === 'double' || currentVariantRaw === 'glass' || currentVariantRaw === 'regular'
        ? currentVariantRaw
        : 'regular';
  const desiredStore = args.shelfVariant === 'regular' ? '' : args.shelfVariant;
  const existing = !!customData.shelves[args.arrayIdx];

  if (!existing) {
    if (
      isManualLayoutShelfBlockedBySketchDrawers({
        ...args,
        cfgRef: args.cfgRef ?? cfg,
        shelfIndex,
      })
    ) {
      return { changed: false, blockedBySketchDrawers: true };
    }
    customData.shelves[args.arrayIdx] = true;
    customData.shelfVariants[args.arrayIdx] = desiredStore;
    if (args.shelfVariant === 'brace') addBraceShelfIndex(braceShelves, shelfIndex);
    else removeBraceShelfIndex(braceShelves, shelfIndex);
    return { changed: true, blockedBySketchDrawers: false };
  }

  if (existingVariant !== args.shelfVariant) {
    if (
      isManualLayoutShelfBlockedBySketchDrawers({
        ...args,
        cfgRef: args.cfgRef ?? cfg,
        shelfIndex,
      })
    ) {
      customData.shelves[args.arrayIdx] = false;
      customData.shelfVariants[args.arrayIdx] = '';
      removeBraceShelfIndex(braceShelves, shelfIndex);
      return { changed: true, blockedBySketchDrawers: true };
    }
    customData.shelves[args.arrayIdx] = true;
    customData.shelfVariants[args.arrayIdx] = desiredStore;
    if (args.shelfVariant === 'brace') addBraceShelfIndex(braceShelves, shelfIndex);
    else removeBraceShelfIndex(braceShelves, shelfIndex);
    return { changed: true, blockedBySketchDrawers: false };
  }

  customData.shelves[args.arrayIdx] = false;
  customData.shelfVariants[args.arrayIdx] = '';
  removeBraceShelfIndex(braceShelves, shelfIndex);
  return { changed: true, blockedBySketchDrawers: false };
}

export function removeManualLayoutBaseStorage(
  cfg: ManualLayoutConfigRecord,
  args: RemoveManualLayoutBaseStorageArgs
): void {
  const { customData } = preparePresetBackedManualLayoutGrid(cfg, args);
  customData.storage = false;
}

export function removeManualLayoutBaseShelf(
  cfg: ManualLayoutConfigRecord,
  args: RemoveManualLayoutBaseShelfArgs
): void {
  const shelfIndex = Math.max(1, Math.min(args.divs - 1, Math.round(args.shelfIndex)));
  const { customData, braceShelves } = preparePresetBackedManualLayoutGrid(cfg, args);
  while (customData.shelves.length < args.divs - 1) customData.shelves.push(false);
  while (customData.shelfVariants.length < args.divs - 1) customData.shelfVariants.push('');
  customData.shelves[shelfIndex - 1] = false;
  customData.shelfVariants[shelfIndex - 1] = '';
  removeBraceShelfIndex(braceShelves, shelfIndex);
}
