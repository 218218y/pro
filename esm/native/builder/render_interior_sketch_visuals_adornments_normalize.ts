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

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readRecordNumber(source: unknown, key: string): number | null {
  if (!source || typeof source !== 'object') return readNumber(source);
  return readNumber((source as Record<string, unknown>)[key]);
}

function readBaseLegOptionsFromState(source: unknown): ReturnType<typeof readBaseLegOptions> {
  const rec = source && typeof source === 'object' ? (source as Record<string, unknown>) : {};
  return readBaseLegOptions({
    baseLegStyle: rec.baseLegStyle,
    baseLegColor: rec.baseLegColor,
    baseLegHeightCm: readNumber(rec.baseLegHeightCm),
    baseLegWidthCm: readNumber(rec.baseLegWidthCm),
  });
}

export function getSketchBoxAdornmentBaseHeight(baseType: unknown, source?: unknown): number {
  const normalized = normalizeSketchBoxAdornmentBaseType(baseType);
  if (normalized === 'legs') {
    const bottomPlatformHeight =
      normalizeBaseLegPlatformMode((source as Record<string, unknown> | null)?.baseLegPlatformMode) ===
      'stage'
        ? CARCASS_BASE_DIMENSIONS.legs.platform.heightM
        : 0;
    return readBaseLegOptionsFromState(source).heightM + bottomPlatformHeight;
  }
  if (normalized === 'plinth') return getBasePlinthHeightM(readRecordNumber(source, 'basePlinthHeightCm'));
  return 0;
}
