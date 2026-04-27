import {
  __wp_scopeCornerPartKeyForStack,
  __wp_scopeCornerPartKeysForStack,
} from './canvas_picking_core_helpers.js';
import {
  CHEST_BODY_PARTS,
  CORNER_BODY_PARTS,
  CORNER_CORNICE_PARTS,
  MAIN_BODY_PARTS,
  __isCornicePart,
  __isCornerCornicePart,
} from './canvas_picking_paint_targets.js';
import {
  toggleCorniceGroupPaint,
  toggleGroupedPaint,
  toggleSinglePaintTarget,
} from './canvas_picking_paint_flow_shared.js';
import type { PaintFlowMutableState } from './canvas_picking_paint_flow_apply_state.js';

export function applyGroupedOrCornerPaintTarget(args: {
  state: PaintFlowMutableState;
  foundPartId: string;
  activeStack: 'top' | 'bottom';
  paintSelection: string;
}): boolean {
  const { state, foundPartId, activeStack, paintSelection } = args;
  if (MAIN_BODY_PARTS.includes(foundPartId)) {
    toggleGroupedPaint(state.ensureColors(), MAIN_BODY_PARTS, paintSelection);
    return true;
  }
  if (CHEST_BODY_PARTS.includes(foundPartId)) {
    toggleGroupedPaint(state.ensureColors(), CHEST_BODY_PARTS, paintSelection);
    return true;
  }
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
  if (CORNER_BODY_PARTS.includes(foundPartId)) {
    toggleGroupedPaint(
      state.ensureColors(),
      __wp_scopeCornerPartKeysForStack(CORNER_BODY_PARTS, activeStack),
      paintSelection
    );
    return true;
  }
  if (foundPartId === 'corner_wing_ceil' || foundPartId.startsWith('corner_cell_top_')) {
    toggleGroupedPaint(
      state.ensureColors(),
      __wp_scopeCornerPartKeysForStack(
        ['corner_ceil', 'corner_wing_side_left', 'corner_wing_side_right', 'corner_floor'],
        activeStack
      ),
      paintSelection
    );
    return true;
  }
  if (foundPartId === 'corner_pent_ceil') {
    toggleSinglePaintTarget(
      state.ensureColors(),
      __wp_scopeCornerPartKeyForStack('corner_pent_ceil', activeStack),
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
