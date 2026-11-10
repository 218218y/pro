import {
  EDGE_HANDLE_PROFILE_RENDER_POLICY,
  EDGE_HANDLE_SIZE_POLICY,
  STANDARD_HANDLE_RENDER_POLICY,
} from './dimensions/handle_policy.js';

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
    sizesMm: barSizes,
    defaultSizeMm: 128,
    crossM: STANDARD_HANDLE_RENDER_POLICY.drawerHeightM,
    endAllowanceM: STANDARD_HANDLE_RENDER_POLICY.drawerWidthM - 0.128,
    depthM: STANDARD_HANDLE_RENDER_POLICY.drawerDepthM,
  },
  bar_slim: {
    ...surface,
    label: 'מוט מלבני דק',
    family: 'bars',
    description: 'חתך מלבני ושני תומכים',
    sizesMm: barSizes,
    defaultSizeMm: 128,
    crossM: 0.012,
    endAllowanceM: 0.02,
    depthM: 0.035,
  },
  bar_round: {
    ...surface,
    label: 'מוט עגול',
    family: 'bars',
    description: 'מוט גלילי על שני תומכים',
    sizesMm: barSizes,
    defaultSizeMm: 128,
    crossM: 0.01,
    endAllowanceM: 0.016,
    depthM: 0.031,
  },
  bow: {
    ...surface,
    label: 'ידית קשת',
    family: 'bars',
    description: 'אחיזה מעוגלת עם שני חיבורים',
    sizesMm: bowSizes,
    defaultSizeMm: 128,
    crossM: 0.012,
    endAllowanceM: 0.02,
    depthM: 0.032,
  },
  knob_round: {
    ...surface,
    label: 'כפתור עגול',
    family: 'knobs',
    description: 'ראש עגול על תושבת יחידה',
    sizesMm: fixed,
    widthM: 0.032,
    heightM: 0.032,
    depthM: 0.027,
  },
  knob_square: {
    ...surface,
    label: 'כפתור מרובע',
    family: 'knobs',
    description: 'ראש מרובע מעוגל בפינות על תושבת מרכזית',
    sizesMm: fixed,
    widthM: 0.032,
    heightM: 0.032,
    depthM: 0.032,
  },
  knob_t: {
    ...surface,
    label: 'כפתור T',
    family: 'knobs',
    description: 'מוט קצר על תושבת מרכזית',
    sizesMm: fixed,
    widthM: 0.051,
    heightM: 0.013,
    depthM: 0.032,
  },
  cup: {
    ...surface,
    label: 'ידית קונכייה',
    family: 'classic',
    description: 'קונכייה פתוחה מלמטה, למגירות ולדלתות',
    sizesMm: fixed,
    widthM: 0.102,
    heightM: 0.032,
    depthM: 0.025,
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
export type SurfaceHandleType = Exclude<HandleType, 'edge' | 'none'>;
export type HandleHost = (typeof allFronts)[number];
export type HandleFootprint = { width: number; height: number; depth: number };
export type HandleFrontRect = { minX: number; maxX: number; minY: number; maxY: number };

export function isHandleType(value: unknown): value is HandleType {
  return typeof value === 'string' && Object.hasOwn(HANDLE_CATALOG, value);
}

export function usesCatalogHandleGeometry(value: unknown, sizeMm?: unknown): value is SurfaceHandleType {
  return (
    isHandleType(value) &&
    value !== 'edge' &&
    value !== 'none' &&
    (value !== 'standard' || readHandleSizeMm(value, sizeMm) !== HANDLE_CATALOG.standard.defaultSizeMm)
  );
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

export function getEdgeHandleLengthM(variant: unknown, drawerWidth?: number): number {
  const { shortLengthM, longLengthM, drawerWidthClearanceM, minLengthM } = EDGE_HANDLE_SIZE_POLICY;
  const length = variant === 'long' ? longLengthM : shortLengthM;
  if (drawerWidth === undefined) return length;
  const fitted = Math.min(length, drawerWidth - drawerWidthClearanceM);
  return fitted >= minLengthM ? fitted : 0;
}

export function resolveEdgeHandleMount(
  rect: HandleFrontRect,
  host: 'door' | 'drawer',
  isLeftHinge: boolean,
  variant: unknown,
  point: { x: number; y: number }
): { x: number; y: number; length: number } | null {
  const drawer = host === 'drawer';
  const length = getEdgeHandleLengthM(variant, drawer ? rect.maxX - rect.minX : undefined);
  const pad = drawer ? EDGE_HANDLE_SIZE_POLICY.drawerWidthClearanceM / 2 : 0;
  const min = (drawer ? rect.minX : rect.minY) + length / 2 + pad;
  const max = (drawer ? rect.maxX : rect.maxY) - length / 2 - pad;
  const requested = drawer ? point.x : point.y;
  if (length <= 0 || !Number.isFinite(requested) || !(min <= max + 1e-8)) return null;
  const along = Math.max(min, Math.min(max, requested));
  return drawer
    ? { x: along, y: rect.maxY, length }
    : { x: isLeftHinge ? rect.maxX : rect.minX, y: along, length };
}

export function getEdgeHandlePreviewFootprint(length: number, drawer: boolean): HandleFootprint {
  const { metalThicknessM, gripInsetM, gripProjectionM } = EDGE_HANDLE_PROFILE_RENDER_POLICY;
  const cross = metalThicknessM + gripInsetM;
  return { width: drawer ? length : cross, height: drawer ? cross : length, depth: gripProjectionM };
}

export function readHandleVisualFrontRect(
  rect: HandleFrontRect,
  data: Readonly<Record<string, unknown>> | null | undefined
): HandleFrontRect {
  const width = data?.__wpFrontVisualWidth;
  const height = data?.__wpFrontVisualHeight;
  const xInset =
    typeof width === 'number' && Number.isFinite(width) && width > 0
      ? (rect.maxX - rect.minX - width) / 2
      : 0;
  const yInset =
    typeof height === 'number' && Number.isFinite(height) && height > 0
      ? (rect.maxY - rect.minY - height) / 2
      : 0;
  return {
    minX: rect.minX + xInset,
    maxX: rect.maxX - xInset,
    minY: rect.minY + yInset,
    maxY: rect.maxY - yInset,
  };
}
