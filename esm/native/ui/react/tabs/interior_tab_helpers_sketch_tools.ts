import {
  DEFAULT_BASE_LEG_COLOR,
  DEFAULT_BASE_LEG_HEIGHT_CM,
  DEFAULT_BASE_LEG_STYLE,
  getDefaultBaseLegWidthCm,
  normalizeBaseLegColor,
  normalizeBaseLegHeightCm,
  normalizeBaseLegStyle,
  normalizeBaseLegWidthCm,
} from '../../../features/base_leg_support.js';
import {
  DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM,
  DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM,
  SKETCH_DRAWER_HEIGHT_MAX_CM,
  SKETCH_DRAWER_HEIGHT_MIN_CM,
  SKETCH_EXTERNAL_DRAWERS_TOOL_PREFIX,
  SKETCH_INTERNAL_DRAWERS_TOOL_ID,
  createSketchExternalDrawersTool,
  createSketchInternalDrawersTool,
  isSketchInternalDrawersTool,
  normalizeSketchDrawerHeightCm,
  parseSketchExternalDrawersTool,
  parseSketchInternalDrawersTool,
} from '../../../features/sketch_drawer_sizing.js';

import type {
  SketchBoxBaseType,
  SketchBoxCorniceType,
  SketchBoxLegColor,
  SketchBoxLegStyle,
} from './interior_tab_helpers_types.js';

// ---------------------------------------------------------------------------
// Sketch tools (previously a dedicated "סקיצה" tab).
// We embed them under Interior > "חלוקה ידנית" behind a toggle button.
// ---------------------------------------------------------------------------

export const SKETCH_TOOL_SHELF_DOUBLE = 'sketch_shelf:double';
export const SKETCH_TOOL_SHELF_REGULAR = 'sketch_shelf:regular';
export const SKETCH_TOOL_SHELF_GLASS = 'sketch_shelf:glass';
export const SKETCH_TOOL_SHELF_BRACE = 'sketch_shelf:brace';
export const SKETCH_TOOL_ROD = 'sketch_rod';
export const SKETCH_TOOL_BOX_DIVIDER = 'sketch_box_divider';
export const SKETCH_TOOL_BOX_DOOR = 'sketch_box_door';
export const SKETCH_TOOL_BOX_DOUBLE_DOOR = 'sketch_box_double_door';
export const SKETCH_TOOL_BOX_DOOR_HINGE = 'sketch_box_door_hinge';
export const SKETCH_TOOL_BOX_CORNICE_PREFIX = 'sketch_box_cornice:';
export const SKETCH_TOOL_BOX_BASE_PREFIX = 'sketch_box_base:';
export const SKETCH_TOOL_INT_DRAWERS = SKETCH_INTERNAL_DRAWERS_TOOL_ID;
export const SKETCH_TOOL_EXT_DRAWERS_PREFIX = SKETCH_EXTERNAL_DRAWERS_TOOL_PREFIX;
export const SKETCH_TOOL_BOX_PREFIX = 'sketch_box:'; // suffix = height (cm)
export const SKETCH_TOOL_STORAGE_PREFIX = 'sketch_storage:'; // suffix = height (cm)
const SKETCH_BOX_DIM_SEP = '@';
export const SKETCH_BOX_HEIGHT_MIN_CM = 5;
export const SKETCH_BOX_HEIGHT_MAX_CM = 300;
export const SKETCH_BOX_OPTIONAL_DIM_MIN_CM = 5;
export const SKETCH_BOX_OPTIONAL_DIM_MAX_CM = 300;
export {
  DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM,
  DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM,
  SKETCH_DRAWER_HEIGHT_MAX_CM,
  SKETCH_DRAWER_HEIGHT_MIN_CM,
  isSketchInternalDrawersTool,
  normalizeSketchDrawerHeightCm,
};

export type SketchBoxToolSpec = {
  heightCm: number;
  widthCm: number | null;
  depthCm: number | null;
};

export type SketchBoxBaseToolSpec = {
  baseType: SketchBoxBaseType;
  baseLegStyle: SketchBoxLegStyle;
  baseLegColor: SketchBoxLegColor;
  baseLegHeightCm: number;
  baseLegWidthCm: number;
};

export function clampSketch(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

export function parseSketchBoxTool(tool: string): SketchBoxToolSpec | null {
  if (!tool || !tool.startsWith(SKETCH_TOOL_BOX_PREFIX)) return null;
  const raw = tool.slice(SKETCH_TOOL_BOX_PREFIX.length).trim();
  if (!raw) return null;

  const [heightRaw, widthRaw = '', depthRaw = ''] = raw.split(SKETCH_BOX_DIM_SEP);
  const heightCm = Number(heightRaw.trim());
  if (!Number.isFinite(heightCm)) return null;

  const parseOptional = (value: string): number | null => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  };

  return {
    heightCm,
    widthCm: parseOptional(widthRaw),
    depthCm: parseOptional(depthRaw),
  };
}

export function mkSketchBoxTool(heightCm: number, widthCm: number | null, depthCm: number | null): string {
  const h = Math.round(heightCm);
  const w = widthCm != null && Number.isFinite(widthCm) && widthCm > 0 ? String(Math.round(widthCm)) : '';
  const d = depthCm != null && Number.isFinite(depthCm) && depthCm > 0 ? String(Math.round(depthCm)) : '';

  if (!w && !d) return `${SKETCH_TOOL_BOX_PREFIX}${h}`;
  if (!d) return `${SKETCH_TOOL_BOX_PREFIX}${h}${SKETCH_BOX_DIM_SEP}${w}`;
  return `${SKETCH_TOOL_BOX_PREFIX}${h}${SKETCH_BOX_DIM_SEP}${w}${SKETCH_BOX_DIM_SEP}${d}`;
}

export function readSketchBoxCorniceType(tool: string): SketchBoxCorniceType | null {
  if (!tool || !tool.startsWith(SKETCH_TOOL_BOX_CORNICE_PREFIX)) return null;
  const raw = tool.slice(SKETCH_TOOL_BOX_CORNICE_PREFIX.length).trim().toLowerCase();
  return raw === 'wave' ? 'wave' : raw === 'classic' ? 'classic' : null;
}

export function mkSketchBoxCorniceTool(type: SketchBoxCorniceType): string {
  return `${SKETCH_TOOL_BOX_CORNICE_PREFIX}${type === 'wave' ? 'wave' : 'classic'}`;
}

export function readSketchBoxBaseType(tool: string): SketchBoxBaseType | null {
  return readSketchBoxBaseToolSpec(tool)?.baseType ?? null;
}

export function readSketchBoxBaseToolSpec(tool: string): SketchBoxBaseToolSpec | null {
  if (!tool || !tool.startsWith(SKETCH_TOOL_BOX_BASE_PREFIX)) return null;
  const rawFull = tool.slice(SKETCH_TOOL_BOX_BASE_PREFIX.length).trim();
  const [rawType = '', rawStyle = '', rawColor = '', rawHeight = '', rawWidth = ''] =
    rawFull.split(SKETCH_BOX_DIM_SEP);
  const raw = rawType.trim().toLowerCase();
  const baseType: SketchBoxBaseType | null =
    raw === 'legs' ? 'legs' : raw === 'none' ? 'none' : raw === 'plinth' ? 'plinth' : null;
  if (!baseType) return null;
  const baseLegStyle = normalizeBaseLegStyle(rawStyle);
  return {
    baseType,
    baseLegStyle,
    baseLegColor: normalizeBaseLegColor(rawColor),
    baseLegHeightCm: normalizeBaseLegHeightCm(rawHeight),
    baseLegWidthCm: normalizeBaseLegWidthCm(rawWidth, getDefaultBaseLegWidthCm(baseLegStyle)),
  };
}

export function readSketchBoxBaseLegOptions(tool: string): Omit<SketchBoxBaseToolSpec, 'baseType'> | null {
  const spec = readSketchBoxBaseToolSpec(tool);
  if (!spec) return null;
  return {
    baseLegStyle: spec.baseLegStyle,
    baseLegColor: spec.baseLegColor,
    baseLegHeightCm: spec.baseLegHeightCm,
    baseLegWidthCm: spec.baseLegWidthCm,
  };
}

export function mkSketchBoxBaseTool(
  type: SketchBoxBaseType,
  style: SketchBoxLegStyle = DEFAULT_BASE_LEG_STYLE,
  color: SketchBoxLegColor = DEFAULT_BASE_LEG_COLOR,
  heightCm: number = DEFAULT_BASE_LEG_HEIGHT_CM,
  widthCm?: number
): string {
  const normalizedType = type === 'legs' ? 'legs' : type === 'none' ? 'none' : 'plinth';
  if (normalizedType !== 'legs') return `${SKETCH_TOOL_BOX_BASE_PREFIX}${normalizedType}`;

  const normalizedStyle = normalizeBaseLegStyle(style);
  const normalizedColor = normalizeBaseLegColor(color);
  const normalizedHeight = normalizeBaseLegHeightCm(heightCm);
  const normalizedWidth = normalizeBaseLegWidthCm(widthCm, getDefaultBaseLegWidthCm(normalizedStyle));
  const defaultWidth = getDefaultBaseLegWidthCm(DEFAULT_BASE_LEG_STYLE);
  if (
    normalizedStyle === DEFAULT_BASE_LEG_STYLE &&
    normalizedColor === DEFAULT_BASE_LEG_COLOR &&
    normalizedHeight === DEFAULT_BASE_LEG_HEIGHT_CM &&
    normalizedWidth === defaultWidth
  ) {
    return `${SKETCH_TOOL_BOX_BASE_PREFIX}legs`;
  }
  return `${SKETCH_TOOL_BOX_BASE_PREFIX}legs${SKETCH_BOX_DIM_SEP}${normalizedStyle}${SKETCH_BOX_DIM_SEP}${normalizedColor}${SKETCH_BOX_DIM_SEP}${normalizedHeight}${SKETCH_BOX_DIM_SEP}${normalizedWidth}`;
}

export function isSketchBoxTool(tool: string): boolean {
  if (!tool) return false;
  return (
    tool.startsWith(SKETCH_TOOL_BOX_PREFIX) ||
    tool === SKETCH_TOOL_BOX_DIVIDER ||
    tool === SKETCH_TOOL_BOX_DOOR ||
    tool === SKETCH_TOOL_BOX_DOUBLE_DOOR ||
    tool === SKETCH_TOOL_BOX_DOOR_HINGE ||
    tool.startsWith(SKETCH_TOOL_BOX_CORNICE_PREFIX) ||
    tool.startsWith(SKETCH_TOOL_BOX_BASE_PREFIX)
  );
}

export function parseSketchExternalDrawersCount(tool: string): number | null {
  return parseSketchExternalDrawersTool(tool)?.count ?? null;
}

export function parseSketchExternalDrawersHeightCm(tool: string): number | null {
  return parseSketchExternalDrawersTool(tool)?.drawerHeightCm ?? null;
}

export function mkSketchExternalDrawersTool(
  count: number,
  drawerHeightCm = DEFAULT_SKETCH_EXTERNAL_DRAWER_HEIGHT_CM
): string {
  return createSketchExternalDrawersTool(count, drawerHeightCm);
}

export function parseSketchInternalDrawersHeightCm(tool: string): number | null {
  return parseSketchInternalDrawersTool(tool)?.drawerHeightCm ?? null;
}

export function mkSketchInternalDrawersTool(
  drawerHeightCm = DEFAULT_SKETCH_INTERNAL_DRAWER_HEIGHT_CM
): string {
  return createSketchInternalDrawersTool(drawerHeightCm);
}

export function parseSketchStorageHeightCm(tool: string): number | null {
  if (!tool || !tool.startsWith(SKETCH_TOOL_STORAGE_PREFIX)) return null;
  const raw = tool.slice(SKETCH_TOOL_STORAGE_PREFIX.length).trim();
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n;
}

export const SKETCH_TOOL_SHELF_PREFIX = 'sketch_shelf:';
const SKETCH_SHELF_DEPTH_SEP = '@';

export function parseSketchShelfVariant(tool: string): string | null {
  if (!tool || !tool.startsWith(SKETCH_TOOL_SHELF_PREFIX)) return null;
  const raw = tool.slice(SKETCH_TOOL_SHELF_PREFIX.length).trim();
  const at = raw.indexOf(SKETCH_SHELF_DEPTH_SEP);
  const v = (at >= 0 ? raw.slice(0, at) : raw).trim();
  return v || null;
}

export function parseSketchShelfDepthCm(tool: string): number | null {
  if (!tool || !tool.startsWith(SKETCH_TOOL_SHELF_PREFIX)) return null;
  const raw = tool.slice(SKETCH_TOOL_SHELF_PREFIX.length).trim();
  const at = raw.indexOf(SKETCH_SHELF_DEPTH_SEP);
  if (at < 0) return null;
  const n = Number(raw.slice(at + 1).trim());
  if (!Number.isFinite(n)) return null;
  return n;
}

export function mkSketchShelfTool(variant: string, depthCm: number | null): string {
  const v = String(variant || '').trim() || 'double';
  const base = `${SKETCH_TOOL_SHELF_PREFIX}${v}`;
  if (depthCm != null && Number.isFinite(depthCm) && depthCm > 0) {
    return `${base}${SKETCH_SHELF_DEPTH_SEP}${Math.round(depthCm)}`;
  }
  return base;
}
