import type { AppContainer } from '../../../types';
import { getModeId } from '../runtime/api_browser_surface.js';
import type { CanvasPickingClickModeState } from './canvas_picking_click_contracts.js';
import { __wp_primaryMode } from './canvas_picking_core_helpers.js';

export function resolveCanvasPickingClickModeState(App: AppContainer): CanvasPickingClickModeState {
  const __pm = __wp_primaryMode(App);
  return {
    __pm,
    __isPaintMode: __pm === (getModeId('PAINT') || 'paint'),
    __isGrooveEditMode: __pm === (getModeId('GROOVE') || 'groove'),
    __isSplitEditMode: __pm === (getModeId('SPLIT') || 'split'),
    __isLayoutEditMode: __pm === (getModeId('LAYOUT') || 'layout'),
    __isManualLayoutMode: __pm === (getModeId('MANUAL_LAYOUT') || 'manual_layout'),
    __isBraceShelvesMode: __pm === (getModeId('BRACE_SHELVES') || 'brace_shelves'),
    __isCellDimsMode: __pm === (getModeId('CELL_DIMS') || 'cell_dims'),
    __isExtDrawerEditMode: __pm === (getModeId('EXT_DRAWER') || 'ext_drawer'),
    __isIntDrawerEditMode: false,
    __isDividerEditMode: __pm === (getModeId('DIVIDER') || 'divider'),
    __isHandleEditMode: __pm === (getModeId('HANDLE') || 'handle'),
    __isHingeEditMode: __pm === (getModeId('HINGE') || 'hinge'),
    __isRemoveDoorMode: __pm === (getModeId('REMOVE_DOOR') || 'remove_door'),
    __isDoorTrimMode: __pm === (getModeId('DOOR_TRIM') || 'door_trim'),
  };
}
