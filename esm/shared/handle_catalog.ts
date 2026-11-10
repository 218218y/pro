import { STANDARD_HANDLE_RENDER_POLICY } from './dimensions/handle_policy.js';

const allFronts = ['door', 'drawer', 'sliding'] as const;
const hingedFronts = ['door', 'drawer'] as const;
const barSizes = [96, 128, 160, 192, 320] as const;
const bowSizes = [96, 128, 160] as const;
const fixed = [] as const;
const surface = {
  hosts: hingedFronts,
  mounting: 'surface',
  placement: 'opening-side',
  requiresFrontCutout: false,
} as const;

export const HANDLE_CATALOG = {
  standard: {
    ...surface,
    hosts: allFronts,
    label: 'סטנדרטית',
    family: 'bars',
    description: 'ידית ישרה בעיצוב הקיים',
    sizesMm: fixed,
  },
  bar_slim: {
    ...surface,
    label: 'מוט מלבני דק',
    family: 'bars',
    description: 'חתך מלבני ושני תומכים',
    sizesMm: barSizes,
    defaultSizeMm: 128,
    crossM: 0.01,
    endAllowanceM: 0.02,
    depthM: 0.029,
  },
  bar_round: {
    ...surface,
    label: 'מוט עגול',
    family: 'bars',
    description: 'מוט גלילי על שני תומכים',
    sizesMm: barSizes,
    defaultSizeMm: 128,
    crossM: 0.012,
    endAllowanceM: 0.028,
    depthM: 0.032,
  },
  bow: {
    ...surface,
    label: 'ידית קשת',
    family: 'bars',
    description: 'אחיזה מעוגלת עם שני חיבורים',
    sizesMm: bowSizes,
    defaultSizeMm: 128,
    crossM: 0.012,
    endAllowanceM: 0.012,
    depthM: 0.029,
  },
  knob_round: {
    ...surface,
    label: 'כפתור עגול',
    family: 'knobs',
    description: 'ראש עגול על תושבת יחידה',
    sizesMm: fixed,
    widthM: 0.034,
    heightM: 0.034,
    depthM: 0.026,
  },
  knob_t: {
    ...surface,
    label: 'כפתור T',
    family: 'knobs',
    description: 'מוט קצר על תושבת מרכזית',
    sizesMm: fixed,
    widthM: 0.052,
    heightM: 0.014,
    depthM: 0.03,
  },
  cup: {
    ...surface,
    label: 'ידית קונכייה',
    family: 'classic',
    description: 'קונכייה פתוחה מלמטה, למגירות ולדלתות',
    sizesMm: fixed,
    widthM: 0.096,
    heightM: 0.032,
    depthM: 0.024,
  },
  edge: {
    ...surface,
    hosts: allFronts,
    label: 'רוכבת',
    family: 'edge',
    description: 'פרופיל על שפת החזית',
    sizesMm: fixed,
    mounting: 'edge',
    placement: 'edge',
  },
  none: {
    ...surface,
    hosts: allFronts,
    label: 'ללא ידית',
    family: 'none',
    description: 'חזית ללא ידית',
    sizesMm: fixed,
    mounting: 'none',
    placement: 'none',
  },
} as const;

export type HandleType = keyof typeof HANDLE_CATALOG;
export type SurfaceHandleType = Exclude<HandleType, 'standard' | 'edge' | 'none'>;
export type HandleHost = (typeof allFronts)[number];
export type HandleFootprint = { width: number; height: number; depth: number };
export type HandleFrontRect = { minX: number; maxX: number; minY: number; maxY: number };

export function isHandleType(value: unknown): value is HandleType {
  return typeof value === 'string' && Object.hasOwn(HANDLE_CATALOG, value);
}

export function isSurfaceHandleType(value: unknown): value is SurfaceHandleType {
  return isHandleType(value) && value !== 'standard' && value !== 'edge' && value !== 'none';
}

export function supportsHandleHost(type: HandleType, host: HandleHost): boolean {
  const hosts: readonly HandleHost[] = HANDLE_CATALOG[type].hosts;
  return hosts.includes(host);
}

export const HANDLE_SIZE_GLOBAL_KEY = '__wp_handle_size_global';
const HANDLE_SIZE_PART_PREFIX = '__wp_handle_size:';
export const HANDLE_INHERIT_GLOBAL = '__wp_inherit_global';

export function handleOverrideBaseId(
  map: Readonly<Record<string, unknown>> | null | undefined,
  partId: string
): string {
  return map?.[partId] === HANDLE_INHERIT_GLOBAL ? partId : partId.replace(/_(top|mid\d*|bot|full)$/, '');
}

export function handleSizePartKey(partId: string): string {
  return HANDLE_SIZE_PART_PREFIX + partId;
}

export function readHandleSizeMm(type: HandleType, value?: unknown): number | undefined {
  const model = HANDLE_CATALOG[type];
  if (!('defaultSizeMm' in model)) return undefined;
  const sizes: readonly number[] = model.sizesMm;
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && sizes.includes(parsed) ? parsed : model.defaultSizeMm;
}

export function encodeHandleSize(type: HandleType, value: unknown): string | null {
  const size = readHandleSizeMm(type, value);
  return size === undefined ? null : `${type}:${size}`;
}

export function decodeHandleSize(type: HandleType, value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const [storedType, storedSize, extra] = value.split(':');
  return storedType === type && extra === undefined && encodeHandleSize(type, storedSize) === value
    ? Number(storedSize)
    : undefined;
}

export function normalizeHandleMapSizeEntry(key: string, value: string): string | undefined {
  if (key !== HANDLE_SIZE_GLOBAL_KEY && !key.startsWith(HANDLE_SIZE_PART_PREFIX)) return value;
  const type = value.split(':', 1)[0];
  return isHandleType(type) && decodeHandleSize(type, value) !== undefined ? value : undefined;
}

export function resolveConfiguredHandleSizeMm(
  map: Readonly<Record<string, unknown>> | null | undefined,
  partId: string,
  type: HandleType
): number | undefined {
  const base = handleOverrideBaseId(map, partId);
  return (
    decodeHandleSize(type, map?.[handleSizePartKey(partId)]) ??
    (base !== partId ? decodeHandleSize(type, map?.[handleSizePartKey(base)]) : undefined) ??
    decodeHandleSize(type, map?.[HANDLE_SIZE_GLOBAL_KEY]) ??
    readHandleSizeMm(type)
  );
}

export function getSurfaceHandleFootprint(
  type: SurfaceHandleType,
  host: HandleHost,
  sizeMm?: unknown
): HandleFootprint {
  const model = HANDLE_CATALOG[type];
  if ('widthM' in model) return { width: model.widthM, height: model.heightM, depth: model.depthM };
  const length = (readHandleSizeMm(type, sizeMm) ?? model.defaultSizeMm) / 1000 + model.endAllowanceM;
  return {
    width: host === 'drawer' ? length : model.crossM,
    height: host === 'drawer' ? model.crossM : length,
    depth: model.depthM,
  };
}

const FRONT_CLEARANCE_M = 0.003;

export function clampSurfaceHandleCenter(
  footprint: HandleFootprint,
  rect: HandleFrontRect,
  x: number,
  y: number
): { x: number; y: number } | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const marginX = footprint.width / 2 + FRONT_CLEARANCE_M;
  const marginY = footprint.height / 2 + FRONT_CLEARANCE_M;
  const minX = rect.minX + marginX;
  const maxX = rect.maxX - marginX;
  const minY = rect.minY + marginY;
  const maxY = rect.maxY - marginY;
  if (!(minX <= maxX && minY <= maxY)) return null;
  return { x: Math.max(minX, Math.min(maxX, x)), y: Math.max(minY, Math.min(maxY, y)) };
}

export function getSurfaceDoorAnchorX(width: number, isLeftHinge: boolean): number {
  return (isLeftHinge ? 1 : -1) * Math.max(0, width / 2 - STANDARD_HANDLE_RENDER_POLICY.doorOffsetM);
}
