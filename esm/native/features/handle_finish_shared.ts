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
  const raw = String(value || '')
    .trim()
    .toLowerCase();
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
  return normalizeHexColor(String(value ?? '')) !== null;
}

export function isHandleFinishCustomColor(value: unknown): value is `#${string}` {
  return isHandleFinishCustomHexColor(value);
}

export function normalizeHandleFinishColor(value: unknown): HandleFinishColor {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase();
  if (isHandleFinishPresetColor(raw)) return raw;
  return normalizeHexColor(raw) || DEFAULT_HANDLE_FINISH_COLOR;
}

export function handleColorPartKey(partId: unknown): string {
  return `${HANDLE_COLOR_PART_PREFIX}${String(partId ?? '')}`;
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
      return { hex: 0xcfd5dd, emissiveHex: 0x20252c, metalness: 0.42, roughness: 0.22 };
    case 'gold':
      return { hex: 0xe5c66b, emissiveHex: 0x3b2d09, metalness: 0.5, roughness: 0.2 };
    case 'black':
      return { hex: 0x1c1d20, emissiveHex: 0x000000, metalness: 0.32, roughness: 0.3 };
    case 'pink':
      return { hex: 0xf3b6cb, emissiveHex: 0x2d1820, metalness: 0.3, roughness: 0.24 };
    case 'nickel':
    default:
      return { hex: 0xe5e9ef, emissiveHex: 0x20242b, metalness: 0.28, roughness: 0.2 };
  }
}
