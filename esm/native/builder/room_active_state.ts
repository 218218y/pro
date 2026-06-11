import type { AppContainer } from '../../../types/index.js';

import {
  DEFAULT_WALL_COLOR,
  __ensureRoomDesignService,
  __readRoomDesignRuntimeFlags,
  __readRoomUiSelectionState,
  __readUi,
  __wp_room_resolveStyle,
} from './room_internal_shared.js';
import type { RoomDesignActivationState } from './room_visual_apply.js';

export function resolveActiveRoomDesignState(A: AppContainer): RoomDesignActivationState {
  const roomDesignService = __ensureRoomDesignService(A);
  const uiSelection = __readRoomUiSelectionState(__readUi(A), {
    wallColor: String(roomDesignService.DEFAULT_WALL_COLOR || '') || DEFAULT_WALL_COLOR,
  });
  const style = __wp_room_resolveStyle(uiSelection.floorType, uiSelection.floorStyleId);
  return {
    floorType: uiSelection.floorType,
    style,
    wallColor: uiSelection.wallColor || DEFAULT_WALL_COLOR,
  };
}

export function readRuntimeRoomDesignActive(A: AppContainer): boolean {
  return __readRoomDesignRuntimeFlags(A).isActive;
}
