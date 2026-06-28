import type { UnknownRecord } from '../../../types';
import { isSketchInternalDrawersTool } from '../features/sketch_drawer_sizing.js';
import {
  getDefaultBaseLegWidthCm,
  normalizeBaseLegColor,
  normalizeBaseLegHeightCm,
  normalizeBaseLegPlatformMode,
  normalizeBaseLegPlatformSideMode,
  normalizeBaseLegStyle,
  normalizeBaseLegWidthCm,
  type BaseLegPlatformMode,
  type BaseLegPlatformSideMode,
  type BaseLegColor,
  type BaseLegStyle,
} from '../features/base_leg_support.js';
import { normalizeBasePlinthHeightCm } from '../features/base_plinth_support.js';
import {
  normalizeBaseLegPlatformFrontOverhangCm,
  normalizeBaseLegPlatformSideOverhangCm,
} from '../features/platform_overhang_support.js';
import { asRecord, isRecord } from '../runtime/record.js';

export type SketchBoxDividerState = {
  id: string;
  xNorm: number;
  centered: boolean;
  frontZ?: number;
  /** Undefined means a full-height vertical divider. */
  yNorm?: number;
};

export type SketchBoxHorizontalDividerState = {
  id: string;
  yNorm: number;
  centered: boolean;
  frontZ?: number;
  /** Undefined means a full-width horizontal divider. */
  xNorm?: number;
};

export type SketchBoxSegmentState = {
  index: number;
  leftX: number;
  rightX: number;
  centerX: number;
  width: number;
  xNorm: number;
};

export type SketchBoxVerticalSegmentState = {
  index: number;
  bottomY: number;
  topY: number;
  centerY: number;
  height: number;
  yNorm: number;
};

export type SketchBoxAdornmentCorniceType = 'classic' | 'wave';
export type SketchBoxAdornmentBaseType = 'plinth' | 'legs' | 'none';
export type SketchBoxAdornmentBaseToolSpec = {
  baseType: SketchBoxAdornmentBaseType;
  baseLegStyle: BaseLegStyle;
  baseLegColor: BaseLegColor;
  baseLegPlatformMode: BaseLegPlatformMode;
  baseLegPlatformSideMode: BaseLegPlatformSideMode;
  baseLegPlatformSideOverhangCm: number;
  baseLegPlatformFrontOverhangCm: number;
  baseLegHeightCm: number;
  baseLegWidthCm: number;
  basePlinthHeightCm: number;
};

export type SketchBoxDoorState = {
  id: string;
  xNorm: number;
  yNorm?: number;
  hinge: 'left' | 'right';
  enabled: boolean;
  open: boolean;
  groove: boolean;
  grooveLinesCount?: number | null;
};

export type SketchBoxDoorPlacement = {
  door: SketchBoxDoorState;
  index: number;
  segment: SketchBoxSegmentState | null;
  verticalSegment: SketchBoxVerticalSegmentState | null;
};

export function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function readDividerRecordList(value: unknown): UnknownRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord);
}

export function normalizeSketchBoxDividerXNorm(dividerXNorm: unknown): number | null {
  const n = Number(dividerXNorm);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1, n));
}

export function normalizeSketchBoxDividerYNorm(dividerYNorm: unknown): number | null {
  const n = Number(dividerYNorm);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(1, n));
}

export function normalizeSketchBoxCorniceType(value: unknown): SketchBoxAdornmentCorniceType {
  return String(value || '')
    .trim()
    .toLowerCase() === 'wave'
    ? 'wave'
    : 'classic';
}

export function normalizeSketchBoxBaseType(value: unknown): SketchBoxAdornmentBaseType {
  const raw = String(value || '')
    .trim()
    .toLowerCase();
  if (raw === 'legs') return 'legs';
  if (raw === 'plinth') return 'plinth';
  return 'none';
}

export function parseSketchBoxCorniceTool(tool: string): SketchBoxAdornmentCorniceType | null {
  if (!tool || !tool.startsWith('sketch_box_cornice:')) return null;
  const raw = tool.slice('sketch_box_cornice:'.length).trim();
  return raw ? normalizeSketchBoxCorniceType(raw) : null;
}

export function parseSketchBoxBaseTool(tool: string): SketchBoxAdornmentBaseType | null {
  return parseSketchBoxBaseToolSpec(tool)?.baseType ?? null;
}

export function parseSketchBoxBaseToolSpec(tool: string): SketchBoxAdornmentBaseToolSpec | null {
  if (!tool || !tool.startsWith('sketch_box_base:')) return null;
  const rawFull = tool.slice('sketch_box_base:'.length).trim();
  const [
    rawType = '',
    rawStyle = '',
    rawColor = '',
    rawHeight = '',
    rawWidth = '',
    rawPlatformMode = '',
    rawPlatformSideMode = '',
    rawPlatformSideOverhang = '',
    rawPlatformFrontOverhang = '',
  ] = rawFull.split('@');
  const raw = rawType.trim().toLowerCase();
  if (!raw) return null;
  if (raw !== 'legs' && raw !== 'plinth' && raw !== 'none') return null;
  const baseLegStyle = normalizeBaseLegStyle(rawStyle);
  return {
    baseType: normalizeSketchBoxBaseType(raw),
    baseLegStyle,
    baseLegColor: normalizeBaseLegColor(rawColor),
    baseLegPlatformMode: normalizeBaseLegPlatformMode(rawPlatformMode),
    baseLegPlatformSideMode: normalizeBaseLegPlatformSideMode(rawPlatformSideMode),
    baseLegPlatformSideOverhangCm: normalizeBaseLegPlatformSideOverhangCm(rawPlatformSideOverhang),
    baseLegPlatformFrontOverhangCm: normalizeBaseLegPlatformFrontOverhangCm(rawPlatformFrontOverhang),
    baseLegHeightCm: normalizeBaseLegHeightCm(rawHeight),
    baseLegWidthCm: normalizeBaseLegWidthCm(rawWidth, getDefaultBaseLegWidthCm(baseLegStyle)),
    basePlinthHeightCm: normalizeBasePlinthHeightCm(raw === 'plinth' ? rawStyle : undefined),
  };
}

export function getSketchFreeBoxContentKind(
  tool: string
):
  | 'divider'
  | 'shelf'
  | 'rod'
  | 'storage'
  | 'door'
  | 'double_door'
  | 'door_hinge'
  | 'cornice'
  | 'base'
  | 'drawers'
  | 'ext_drawers'
  | '' {
  if (tool === 'sketch_box_divider') return 'divider';
  if (tool === 'sketch_box_divider_horizontal') return 'divider';
  if (tool.startsWith('sketch_shelf:')) return 'shelf';
  if (tool === 'sketch_rod') return 'rod';
  if (tool.startsWith('sketch_storage:')) return 'storage';
  if (tool === 'sketch_box_door') return 'door';
  if (tool === 'sketch_box_double_door') return 'double_door';
  if (tool === 'sketch_box_door_hinge') return 'door_hinge';
  if (tool.startsWith('sketch_box_cornice:')) return 'cornice';
  if (tool.startsWith('sketch_box_base:')) return 'base';
  if (isSketchInternalDrawersTool(tool)) return 'drawers';
  if (tool.startsWith('sketch_ext_drawers:')) return 'ext_drawers';
  return '';
}

export function normalizeSketchBoxDoorState(raw: unknown, fallbackId: string): SketchBoxDoorState | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const xNorm = normalizeSketchBoxDividerXNorm(rec.xNorm);
  if (xNorm == null) return null;
  const yNorm = normalizeSketchBoxDividerYNorm(rec.yNorm);
  const idRaw = rec.id;
  const id = idRaw != null && String(idRaw) ? String(idRaw) : fallbackId;
  const hingeRaw = typeof rec.hinge === 'string' ? String(rec.hinge).trim().toLowerCase() : '';
  return {
    id,
    xNorm,
    ...(yNorm != null ? { yNorm } : {}),
    hinge: hingeRaw === 'right' ? 'right' : 'left',
    enabled: rec.enabled !== false,
    open: rec.open === true,
    groove: rec.groove === true,
    grooveLinesCount:
      Number.isFinite(Number(rec.grooveLinesCount)) && Number(rec.grooveLinesCount) >= 1
        ? Math.max(1, Math.floor(Number(rec.grooveLinesCount)))
        : null,
  };
}
