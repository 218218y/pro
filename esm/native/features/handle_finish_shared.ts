import { METAL_FINISH_PALETTE_BY_COLOR } from './metal_finish_palette.js';
import { formatIdentityValue, readIdentityValue } from '../../shared/identity_value_shared.js';

export type HandleFinishPresetColor = 'nickel' | 'silver' | 'gold' | 'black' | 'pink';
export type HandleFinishColor = HandleFinishPresetColor | `#${string}`;

export const HANDLE_FINISH_COLORS = ['nickel', 'silver', 'gold', 'black', 'pink'] as const;
export const DEFAULT_HANDLE_FINISH_COLOR: HandleFinishColor = 'nickel';
export const HANDLE_COLOR_GLOBAL_KEY = '__wp_handle_color_global';
export const HANDLE_COLOR_PART_PREFIX = '__wp_handle_color:';

export type HandleFinishPalette = {
  hex: number;
  emissiveHex: number;
  metalness: number;
  roughness: number;
};

function isValidHexNibbleSequence(value: string): boolean {
  return /^[0-9a-f]{6}$/i.test(value);
}

function normalizeHexColor(value: string): `#${string}` | null {
  const raw = value.trim().toLowerCase();
  if (!raw) return null;
  const withHash = raw.startsWith('#') ? raw : `#${raw}`;
  return isValidHexNibbleSequence(withHash.slice(1)) ? (withHash as `#${string}`) : null;
}

function parseHexColorNumber(value: `#${string}`): number {
  return Number.parseInt(value.slice(1), 16);
}

export function isHandleFinishPresetColor(value: unknown): value is HandleFinishPresetColor {
  return (
    value === 'silver' || value === 'gold' || value === 'black' || value === 'nickel' || value === 'pink'
  );
}

export function isHandleFinishCustomHexColor(value: unknown): value is `#${string}` {
  return typeof value === 'string' && normalizeHexColor(value) !== null;
}

export function isHandleFinishCustomColor(value: unknown): value is `#${string}` {
  return isHandleFinishCustomHexColor(value);
}

export function normalizeHandleFinishColor(value: unknown): HandleFinishColor {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (isHandleFinishPresetColor(raw)) return raw;
  return normalizeHexColor(raw) || DEFAULT_HANDLE_FINISH_COLOR;
}

export function handleColorPartKey(partId: unknown): string {
  return `${HANDLE_COLOR_PART_PREFIX}${formatIdentityValue(readIdentityValue(partId))}`;
}

function buildCustomHandleFinishPalette(color: `#${string}`): HandleFinishPalette {
  const hex = parseHexColorNumber(color);
  return {
    hex,
    emissiveHex: 0x141414,
    metalness: 0.34,
    roughness: 0.26,
  };
}

export function resolveHandleFinishPalette(color: unknown): HandleFinishPalette {
  const normalized = normalizeHandleFinishColor(color);
  if (isHandleFinishCustomHexColor(normalized)) return buildCustomHandleFinishPalette(normalized);
  switch (normalized) {
    case 'silver':
      return METAL_FINISH_PALETTE_BY_COLOR.silver;
    case 'gold':
      return METAL_FINISH_PALETTE_BY_COLOR.gold;
    case 'black':
      return METAL_FINISH_PALETTE_BY_COLOR.black;
    case 'pink':
      return { hex: 0xf3b6cb, emissiveHex: 0x2d1820, metalness: 0.3, roughness: 0.24 };
    case 'nickel':
    default:
      return METAL_FINISH_PALETTE_BY_COLOR.nickel;
  }
}
