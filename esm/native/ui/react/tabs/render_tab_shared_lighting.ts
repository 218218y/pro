import type { LightingScalarKey, LightPresetName, LightPresetValue } from './render_tab_shared_contracts.js';

export const LIGHT_PRESETS: Record<LightPresetName, LightPresetValue> = {
  default: { amb: 0.7, dir: 1.45, x: 5, y: 8, z: 8 },
  natural: { amb: 0.91, dir: 1.69, x: 8, y: 10, z: 12 },
  evening: { amb: 0.42, dir: 1.21, x: -10, y: 5, z: 10 },
  front: { amb: 0.84, dir: 1.93, x: 0, y: 2, z: 10 },
};

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getLightBounds(key: LightingScalarKey): { min: number; max: number; step?: number } {
  switch (key) {
    case 'lightAmb':
      return { min: 0, max: 2, step: 0.05 };
    case 'lightDir':
      return { min: 0, max: 3, step: 0.1 };
    case 'lightX':
      return { min: -20, max: 20, step: 1 };
    case 'lightY':
      return { min: 0, max: 30, step: 1 };
    case 'lightZ':
      return { min: -10, max: 30, step: 1 };
    default:
      return { min: 0, max: 1 };
  }
}
