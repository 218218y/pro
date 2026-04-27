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
  type ToggleManualLayoutShelfArgs,
} from './canvas_picking_manual_layout_config_ops_shared.js';

export { normalizeManualLayoutShelfVariant };

export function fillManualLayoutShelves(
  cfg: ManualLayoutConfigRecord,
  args: ManualLayoutGridMutationArgs & { shelfVariant: ManualLayoutShelfVariant }
): void {
  const { customData, braceShelves } = prepareEditableManualLayoutGrid(cfg, {
    divs: args.divs,
    topY: args.topY,
    bottomY: args.bottomY,
    reset: true,
  });
  const itemsNeeded = args.divs - 1;
  const storedVariant = args.shelfVariant === 'regular' ? '' : args.shelfVariant;
  for (let i = 0; i < itemsNeeded; i += 1) {
    customData.shelves[i] = true;
    customData.shelfVariants[i] = storedVariant;
    if (args.shelfVariant === 'brace') addBraceShelfIndex(braceShelves, i + 1);
  }
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
  args: ToggleManualLayoutShelfArgs & { reset: boolean }
): void {
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
  const isBraceExisting = braceShelves.some(value => Number(value) === shelfIndex);
  const existingVariant =
    isBraceExisting || currentVariantRaw === 'brace'
      ? 'brace'
      : currentVariantRaw === 'double' || currentVariantRaw === 'glass' || currentVariantRaw === 'regular'
        ? currentVariantRaw
        : 'regular';
  const desiredStore = args.shelfVariant === 'regular' ? '' : args.shelfVariant;
  const existing = !!customData.shelves[args.arrayIdx];

  if (!existing) {
    customData.shelves[args.arrayIdx] = true;
    customData.shelfVariants[args.arrayIdx] = desiredStore;
    if (args.shelfVariant === 'brace') addBraceShelfIndex(braceShelves, shelfIndex);
    else removeBraceShelfIndex(braceShelves, shelfIndex);
    return;
  }

  if (existingVariant !== args.shelfVariant) {
    customData.shelves[args.arrayIdx] = true;
    customData.shelfVariants[args.arrayIdx] = desiredStore;
    if (args.shelfVariant === 'brace') addBraceShelfIndex(braceShelves, shelfIndex);
    else removeBraceShelfIndex(braceShelves, shelfIndex);
    return;
  }

  customData.shelves[args.arrayIdx] = false;
  customData.shelfVariants[args.arrayIdx] = '';
  removeBraceShelfIndex(braceShelves, shelfIndex);
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
