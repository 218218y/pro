import {
  normalizeSketchBoxBaseType,
  normalizeSketchBoxCorniceType,
  parseSketchBoxBaseTool,
  parseSketchBoxBaseToolSpec,
  parseSketchBoxCorniceTool,
} from './canvas_picking_sketch_box_dividers.js';
import { isSketchInternalDrawersTool } from '../features/sketch_drawer_sizing.js';
import type { SketchFreeHoverContentKind } from './canvas_picking_sketch_free_surface_preview_contracts.js';

export function getSketchBoxAdornmentBaseHeight(baseType: unknown, legHeightCm?: unknown): number {
  const normalized = normalizeSketchBoxBaseType(baseType);
  if (normalized === 'legs') {
    const heightCm = Number(legHeightCm);
    return Number.isFinite(heightCm) && heightCm > 0 ? Math.max(0.01, heightCm / 100) : 0.12;
  }
  if (normalized === 'plinth') return 0.08;
  return 0;
}

export function resolveSketchFreeHoverContentKind(tool: string): SketchFreeHoverContentKind {
  if (tool === 'sketch_box_divider') return 'divider';
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
