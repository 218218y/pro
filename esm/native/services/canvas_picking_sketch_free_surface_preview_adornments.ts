import {
  normalizeSketchBoxBaseType,
  normalizeSketchBoxCorniceType,
  parseSketchBoxBaseTool,
  parseSketchBoxBaseToolSpec,
  parseSketchBoxCorniceTool,
} from './canvas_picking_sketch_box_dividers.js';
import { isSketchInternalDrawersTool } from '../features/sketch_drawer_sizing.js';
import { CARCASS_BASE_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { normalizeBaseLegPlatformMode } from '../features/base_leg_support.js';
import { getBasePlinthHeightM } from '../features/base_plinth_support.js';
import type { SketchFreeHoverContentKind } from './canvas_picking_sketch_free_surface_preview_contracts.js';

function readSupportHeightCm(source: unknown, key: 'baseLegHeightCm' | 'basePlinthHeightCm'): unknown {
  if (source && typeof source === 'object') return (source as Record<string, unknown>)[key];
  return source;
}

export function getSketchBoxAdornmentBaseHeight(baseType: unknown, source?: unknown): number {
  const normalized = normalizeSketchBoxBaseType(baseType);
  if (normalized === 'legs') {
    const heightCm = Number(readSupportHeightCm(source, 'baseLegHeightCm'));
    const legHeight = Number.isFinite(heightCm) && heightCm > 0 ? Math.max(0.01, heightCm / 100) : 0.12;
    const bottomPlatformHeight =
      normalizeBaseLegPlatformMode((source as Record<string, unknown> | null)?.baseLegPlatformMode) ===
      'stage'
        ? CARCASS_BASE_DIMENSIONS.legs.platform.heightM
        : 0;
    return legHeight + bottomPlatformHeight;
  }
  if (normalized === 'plinth') return getBasePlinthHeightM(readSupportHeightCm(source, 'basePlinthHeightCm'));
  return 0;
}

export function resolveSketchFreeHoverContentKind(tool: string): SketchFreeHoverContentKind {
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

export {
  normalizeSketchBoxBaseType,
  normalizeSketchBoxCorniceType,
  parseSketchBoxBaseTool,
  parseSketchBoxBaseToolSpec,
  parseSketchBoxCorniceTool,
};
