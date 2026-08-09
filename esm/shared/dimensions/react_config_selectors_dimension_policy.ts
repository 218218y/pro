import { DEFAULT_GROOVE_DENSITY_PER_M } from '../groove_layout_contracts_shared.js';
import { WARDROBE_DEFAULTS } from './wardrobe_defaults.js';

export { resolveDoorMountThicknessesFromConfig } from './door_mount_thickness_policy.js';

export const DESIGN_TAB_WARDROBE_DEFAULTS = Object.freeze({
  widthCm: WARDROBE_DEFAULTS.widthCm,
  heightCm: WARDROBE_DEFAULTS.heightCm,
  doorsCount: WARDROBE_DEFAULTS.byType.hinged.doorsCount,
});

function readPositiveDimensionCm(value: unknown): number | null {
  const text =
    typeof value === 'string'
      ? value
      : typeof value === 'number' && Number.isFinite(value)
        ? String(value)
        : '';
  const parsed = Number(text.trim().replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function resolveDesignTabGrooveLinesAutoBaseline(args: {
  grooveOrientation?: unknown;
  grooveDraftHeightCm?: unknown;
  grooveDraftWidthCm?: unknown;
  wardrobeWidthCm?: unknown;
  wardrobeHeightCm?: unknown;
  wardrobeDoorsCount?: unknown;
}): number {
  const wardrobeWidthCm =
    readPositiveDimensionCm(args.wardrobeWidthCm) ?? DESIGN_TAB_WARDROBE_DEFAULTS.widthCm;
  const wardrobeHeightCm =
    readPositiveDimensionCm(args.wardrobeHeightCm) ?? DESIGN_TAB_WARDROBE_DEFAULTS.heightCm;
  const rawDoorsCount = Number(args.wardrobeDoorsCount);
  const doorsCount =
    Number.isFinite(rawDoorsCount) && rawDoorsCount > 0
      ? Math.floor(rawDoorsCount)
      : DESIGN_TAB_WARDROBE_DEFAULTS.doorsCount;
  const distributionSpanCm =
    args.grooveOrientation === 'horizontal'
      ? (readPositiveDimensionCm(args.grooveDraftHeightCm) ?? wardrobeHeightCm)
      : (readPositiveDimensionCm(args.grooveDraftWidthCm) ?? wardrobeWidthCm / doorsCount);
  return Math.max(1, Math.floor((distributionSpanCm / 100) * DEFAULT_GROOVE_DENSITY_PER_M));
}
