import type { AppContainer } from '../../../types';
import { getModeId } from '../runtime/api_browser_surface.js';
import type { CanvasPickingClickModeState } from './canvas_picking_click_contracts.js';
import { __wp_primaryMode } from './canvas_picking_core_helpers.js';

export function resolveCanvasPickingClickModeState(App: AppContainer): CanvasPickingClickModeState {
  const __pm = __wp_primaryMode(App);
  return {
    __pm,
    __isPaintMode: __pm === (getModeId(App, 'PAINT') || 'paint'),
    __isGrooveEditMode: __pm === (getModeId(App, 'GROOVE') || 'groove'),
    __isSplitEditMode: __pm === (getModeId(App, 'SPLIT') || 'split'),
    __isLayoutEditMode: __pm === (getModeId(App, 'LAYOUT') || 'layout'),
    __isManualLayoutMode: __pm === (getModeId(App, 'MANUAL_LAYOUT') || 'manual_layout'),
    __isBraceShelvesMode: __pm === (getModeId(App, 'BRACE_SHELVES') || 'brace_shelves'),
    __isCellDimsMode: __pm === (getModeId(App, 'CELL_DIMS') || 'cell_dims'),
    __isExtDrawerEditMode: __pm === (getModeId(App, 'EXT_DRAWER') || 'ext_drawer'),
    __isIntDrawerEditMode: __pm === (getModeId(App, 'INT_DRAWER') || 'int_drawer'),
    __isDividerEditMode: __pm === (getModeId(App, 'DIVIDER') || 'divider'),
    __isHandleEditMode: __pm === (getModeId(App, 'HANDLE') || 'handle'),
    __isHingeEditMode: __pm === (getModeId(App, 'HINGE') || 'hinge'),
    __isRemoveDoorMode: __pm === (getModeId(App, 'REMOVE_DOOR') || 'remove_door'),
    __isDoorTrimMode: __pm === (getModeId(App, 'DOOR_TRIM') || 'door_trim'),
  };
}
