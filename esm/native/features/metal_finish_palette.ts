export type MetalFinishPresetColor = 'nickel' | 'silver' | 'gold' | 'black';

export type MetalFinishPalette = {
  hex: number;
  cssHex: string;
  emissiveHex: number;
  metalness: number;
  roughness: number;
  emissiveIntensity: number;
  lineHex?: number;
  swatchTextColor: string;
};

export const METAL_FINISH_PALETTE_BY_COLOR: Record<MetalFinishPresetColor, MetalFinishPalette> = {
  // Same calibrated finish used by sliding wardrobe nickel rails.
  // Keeping this as the single nickel token prevents legs / handles / trims from drifting dark again.
  nickel: {
    hex: 0xe5e9ef,
    cssHex: '#e5e9ef',
    lineHex: 0x7f8792,
    emissiveHex: 0x20242b,
    metalness: 0.28,
    roughness: 0.2,
    emissiveIntensity: 0.16,
    swatchTextColor: '#1f2933',
  },
  silver: {
    hex: 0xc0c7d0,
    cssHex: '#c0c7d0',
    emissiveHex: 0x080a0d,
    metalness: 0.36,
    roughness: 0.38,
    emissiveIntensity: 0.08,
    swatchTextColor: '#1f2933',
  },
  gold: {
    hex: 0xe5c66b,
    cssHex: '#e5c66b',
    emissiveHex: 0x3b2d09,
    metalness: 0.5,
    roughness: 0.2,
    emissiveIntensity: 0.08,
    swatchTextColor: '#1f2933',
  },
  black: {
    hex: 0x1c1d20,
    cssHex: '#15171a',
    emissiveHex: 0x000000,
    metalness: 0.32,
    roughness: 0.3,
    emissiveIntensity: 0,
    swatchTextColor: '#ffffff',
  },
};

export const NICKEL_METAL_FINISH = METAL_FINISH_PALETTE_BY_COLOR.nickel;

export function resolveMetalFinishPalette(value: unknown): MetalFinishPalette {
  const key = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return Object.prototype.hasOwnProperty.call(METAL_FINISH_PALETTE_BY_COLOR, key)
    ? METAL_FINISH_PALETTE_BY_COLOR[key as MetalFinishPresetColor]
    : METAL_FINISH_PALETTE_BY_COLOR.nickel;
}

export function getMetalFinishCssHex(value: unknown): string {
  return resolveMetalFinishPalette(value).cssHex;
}
