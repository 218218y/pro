import { CARCASS_BASE_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { normalizeBaseLegPlatformMode, readBaseLegOptions } from '../features/base_leg_support.js';
import { getBasePlinthHeightM } from '../features/base_plinth_support.js';

export function normalizeSketchBoxAdornmentBaseType(value: unknown): 'plinth' | 'legs' | 'none' {
  const raw = String(value || '')
    .trim()
    .toLowerCase();
  if (raw === 'legs') return 'legs';
  if (raw === 'plinth') return 'plinth';
  return 'none';
}

export function normalizeSketchBoxAdornmentCorniceType(value: unknown): 'classic' | 'wave' {
  return String(value || '')
    .trim()
    .toLowerCase() === 'wave'
    ? 'wave'
    : 'classic';
}

function readSupportHeightCm(source: unknown, key: 'basePlinthHeightCm'): unknown {
  if (source && typeof source === 'object') return (source as Record<string, unknown>)[key];
  return source;
}

export function getSketchBoxAdornmentBaseHeight(baseType: unknown, source?: unknown): number {
  const normalized = normalizeSketchBoxAdornmentBaseType(baseType);
  if (normalized === 'legs') {
    const bottomPlatformHeight =
      normalizeBaseLegPlatformMode((source as Record<string, unknown> | null)?.baseLegPlatformMode) ===
      'stage'
        ? CARCASS_BASE_DIMENSIONS.legs.platform.heightM
        : 0;
    return readBaseLegOptions(source).heightM + bottomPlatformHeight;
  }
  if (normalized === 'plinth') return getBasePlinthHeightM(readSupportHeightCm(source, 'basePlinthHeightCm'));
  return 0;
}
