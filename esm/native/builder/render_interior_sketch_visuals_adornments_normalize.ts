import { readBaseLegOptions } from '../features/base_leg_support.js';

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

export function getSketchBoxAdornmentBaseHeight(baseType: unknown, source?: unknown): number {
  const normalized = normalizeSketchBoxAdornmentBaseType(baseType);
  if (normalized === 'legs') return readBaseLegOptions(source).heightM;
  if (normalized === 'plinth') return 0.08;
  return 0;
}
