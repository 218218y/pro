import {
  __wp_scopeCornerPartKeyForStack,
  __wp_scopeCornerPartKeysForStack,
} from './canvas_picking_core_helpers.js';
import type { CanvasPaintTargetScope } from './canvas_picking_paint_target_scope.js';
import {
  CHEST_BODY_PARTS,
  CORNER_BODY_PARTS,
  CORNER_CORNICE_PARTS,
  CORNER_PENTAGON_FRAME_PARTS,
  CORNER_WING_FRAME_PARTS,
  LOWER_MAIN_BODY_PARTS,
  MAIN_BODY_PARTS,
  __isCornicePart,
  __isCorniceWavePart,
  __isCornerCornicePart,
  resolveUnifiedCornerFramePaintTargetKeys,
} from './canvas_picking_paint_targets.js';
import { resolveSketchInternalDrawerCassettePanelPaintTargetKeys } from '../features/sketch_internal_drawer_cassette.js';
import {
  toggleCorniceGroupPaint,
  toggleGroupedPaint,
  toggleSinglePaintTarget,
} from './canvas_picking_paint_flow_shared.js';
import type { PaintFlowMutableState } from './canvas_picking_paint_flow_apply_state.js';

function readOwnPaintValue(map: Record<string, unknown>, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined;
}

function readUniformArchivedUnifiedColor(
  colors: Record<string, unknown>,
  requiredKeys: string[],
  absentKeys: string[]
): unknown {
  for (let i = 0; i < absentKeys.length; i += 1) {
    if (typeof readOwnPaintValue(colors, absentKeys[i]) !== 'undefined') return undefined;
  }
  let color: unknown;
  for (let i = 0; i < requiredKeys.length; i += 1) {
    const value = readOwnPaintValue(colors, requiredKeys[i]);
    if (typeof value !== 'string' || !value) return undefined;
    if (i === 0) color = value;
    else if (value !== color) return undefined;
  }
  return color;
}

function pruneArchivedUnifiedCornerFrameLowerKeys(colors: Record<string, unknown>): void {
  const wingColor = readUniformArchivedUnifiedColor(
    colors,
    [
      'corner_ceil',
      'corner_wing_side_left',
      'corner_wing_side_right',
      'lower_corner_wing_side_left',
      'lower_corner_wing_side_right',
      'lower_corner_floor',
    ],
    ['corner_floor', 'lower_corner_ceil']
  );
  if (typeof wingColor !== 'undefined') {
    colors.corner_floor = wingColor;
    delete colors.lower_corner_wing_side_left;
    delete colors.lower_corner_wing_side_right;
    delete colors.lower_corner_floor;
  }

  const pentagonColor = readUniformArchivedUnifiedColor(
    colors,
    [
      'corner_pent_ceil',
      'corner_pent_attach_main',
      'corner_pent_attach_wing',
      'lower_corner_pent_attach_main',
      'lower_corner_pent_attach_wing',
      'lower_corner_pent_floor',
    ],
    ['corner_pent_floor', 'lower_corner_pent_ceil']
  );
  if (typeof pentagonColor !== 'undefined') {
    colors.corner_pent_floor = pentagonColor;
    delete colors.lower_corner_pent_attach_main;
    delete colors.lower_corner_pent_attach_wing;
    delete colors.lower_corner_pent_floor;
  }
}

export function applyGroupedOrCornerPaintTarget(args: {
  state: PaintFlowMutableState;
  foundPartId: string;
  activeStack: 'top' | 'bottom';
  paintSelection: string;
  targetScope?: CanvasPaintTargetScope | null;
}): boolean {
  const { state, foundPartId, activeStack, paintSelection, targetScope } = args;
  const cassetteKeys = resolveSketchInternalDrawerCassettePanelPaintTargetKeys(foundPartId);
  if (cassetteKeys !== null) {
    toggleGroupedPaint(state.ensureColors(), cassetteKeys, paintSelection);
    return true;
  }
  const unifiedCornerFrameKeys = resolveUnifiedCornerFramePaintTargetKeys(
    foundPartId,
    activeStack,
    targetScope
  );
  if (unifiedCornerFrameKeys !== null) {
    const colors = state.ensureColors();
    pruneArchivedUnifiedCornerFrameLowerKeys(colors);
    if (unifiedCornerFrameKeys.length) {
      toggleGroupedPaint(colors, unifiedCornerFrameKeys, paintSelection);
    }
    return true;
  }
  if (MAIN_BODY_PARTS.includes(foundPartId)) {
    toggleGroupedPaint(state.ensureColors(), MAIN_BODY_PARTS, paintSelection);
    return true;
  }
  if (LOWER_MAIN_BODY_PARTS.includes(foundPartId)) {
    toggleGroupedPaint(state.ensureColors(), LOWER_MAIN_BODY_PARTS, paintSelection);
    return true;
  }
  if (CHEST_BODY_PARTS.includes(foundPartId)) {
    toggleGroupedPaint(state.ensureColors(), CHEST_BODY_PARTS, paintSelection);
    return true;
  }
  if (__isCorniceWavePart(foundPartId)) return false;
  if (__isCornicePart(foundPartId)) {
    toggleCorniceGroupPaint(state.ensureColors(), paintSelection);
    return true;
  }
  if (__isCornerCornicePart(foundPartId)) {
    toggleGroupedPaint(
      state.ensureColors(),
      __wp_scopeCornerPartKeysForStack(CORNER_CORNICE_PARTS, activeStack),
      paintSelection
    );
    return true;
  }
  if (
    CORNER_WING_FRAME_PARTS.includes(foundPartId) ||
    foundPartId === 'corner_wing_ceil' ||
    foundPartId.startsWith('corner_cell_top_') ||
    foundPartId === 'corner_floor_blind' ||
    foundPartId.startsWith('corner_floor_c')
  ) {
    const colors = state.ensureColors();
    pruneArchivedUnifiedCornerFrameLowerKeys(colors);
    toggleGroupedPaint(
      colors,
      __wp_scopeCornerPartKeysForStack(CORNER_WING_FRAME_PARTS, activeStack),
      paintSelection
    );
    return true;
  }
  if (CORNER_BODY_PARTS.includes(foundPartId)) {
    toggleGroupedPaint(
      state.ensureColors(),
      __wp_scopeCornerPartKeysForStack(CORNER_BODY_PARTS, activeStack),
      paintSelection
    );
    return true;
  }
  if (CORNER_PENTAGON_FRAME_PARTS.includes(foundPartId)) {
    const colors = state.ensureColors();
    pruneArchivedUnifiedCornerFrameLowerKeys(colors);
    toggleGroupedPaint(
      colors,
      __wp_scopeCornerPartKeysForStack(CORNER_PENTAGON_FRAME_PARTS, activeStack),
      paintSelection
    );
    return true;
  }
  if (foundPartId.startsWith('corner_floor_')) {
    toggleSinglePaintTarget(
      state.ensureColors(),
      __wp_scopeCornerPartKeyForStack('corner_floor', activeStack),
      paintSelection
    );
    return true;
  }
  if (foundPartId.startsWith('corner_plinth_')) {
    toggleSinglePaintTarget(
      state.ensureColors(),
      __wp_scopeCornerPartKeyForStack('corner_plinth', activeStack),
      paintSelection
    );
    return true;
  }
  if (foundPartId === 'corner_pent_plinth') {
    toggleSinglePaintTarget(
      state.ensureColors(),
      __wp_scopeCornerPartKeyForStack('corner_pent_plinth', activeStack),
      paintSelection
    );
    return true;
  }
  return false;
}
