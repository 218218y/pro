import {
  prepareEditableManualLayoutGrid,
  preparePresetBackedManualLayoutGrid,
  removeExactPresetRodOp,
  type ManualLayoutConfigRecord,
  type RemoveManualLayoutBaseRodArgs,
  type ToggleManualLayoutRodArgs,
} from './canvas_picking_manual_layout_config_ops_shared.js';

export function toggleManualLayoutRod(
  cfg: ManualLayoutConfigRecord,
  args: ToggleManualLayoutRodArgs & { reset: boolean }
): void {
  const { customData } = prepareEditableManualLayoutGrid(cfg, {
    divs: args.divs,
    topY: args.topY,
    bottomY: args.bottomY,
    reset: args.reset,
  });
  while (customData.rods.length < args.divs) customData.rods.push(false);
  const existing = !!customData.rods[args.arrayIdx];
  customData.rods[args.arrayIdx] = !existing;
  if (existing) removeExactPresetRodOp(customData, args.arrayIdx + 1, args.divs);
}

export function removeManualLayoutBaseRod(
  cfg: ManualLayoutConfigRecord,
  args: RemoveManualLayoutBaseRodArgs
): void {
  const rodIndex = Math.max(1, Math.min(args.divs, Math.round(args.rodIndex)));
  const { customData } = preparePresetBackedManualLayoutGrid(cfg, args);
  while (customData.rods.length < args.divs) customData.rods.push(false);
  customData.rods[rodIndex - 1] = false;
  removeExactPresetRodOp(customData, rodIndex, args.divs);
}
