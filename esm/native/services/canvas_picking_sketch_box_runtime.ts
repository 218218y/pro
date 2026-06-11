import type { AppContainer } from '../../../types';
import type { FindSketchModuleBoxAtPointResult } from './canvas_picking_manual_layout_sketch_contracts.js';
import type { SketchBoxToolSpec as SharedSketchBoxToolSpec } from './canvas_picking_sketch_box_runtime_shared.js';
import { parseSketchBoxToolSpec } from './canvas_picking_sketch_box_runtime_spec.js';
import { resolveSketchBoxGeometry } from './canvas_picking_sketch_box_runtime_geometry.js';
import { findSketchModuleBoxAtPoint } from './canvas_picking_sketch_box_runtime_hit.js';
import { tryCommitSketchFreePlacementFromHover } from './canvas_picking_sketch_box_runtime_commit.js';

export type __wpSketchBoxToolSpec = SharedSketchBoxToolSpec;

export function __wp_parseSketchBoxToolSpec(tool: string): __wpSketchBoxToolSpec | null {
  return parseSketchBoxToolSpec(tool);
}

export function __wp_resolveSketchBoxGeometry(args: {
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  woodThick: number;
  widthM?: number | null;
  depthM?: number | null;
  xNorm?: number | null;
  centerXHint?: number | null;
  enableCenterSnap?: boolean;
}): {
  outerW: number;
  innerW: number;
  centerX: number;
  xNorm: number;
  centered: boolean;
  outerD: number;
  innerD: number;
  centerZ: number;
  innerCenterZ: number;
  innerBackZ: number;
} {
  return resolveSketchBoxGeometry(args);
}

export function __wp_findSketchModuleBoxAtPoint(args: {
  boxes: unknown[];
  cursorY: number;
  cursorX?: number | null;
  bottomY: number;
  spanH: number;
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  woodThick: number;
}): FindSketchModuleBoxAtPointResult | null {
  return findSketchModuleBoxAtPoint(args);
}

export function __wp_tryCommitSketchFreePlacementFromHover(App: AppContainer, manualTool: unknown): boolean {
  return tryCommitSketchFreePlacementFromHover(App, manualTool);
}
