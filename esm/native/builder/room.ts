// Native Builder Room / RoomDesign (ESM)
//
// Public facade for the room-design service surface. The implementation is
// split into lifecycle, active-state, install-surface, primitive, texture, and
// visual-apply owners so this module stays a stable import seam.

export type {
  FloorType,
  FloorStyleEntry,
  RoomTextureParams,
  RoomUiLike,
  RoomUpdateOpts,
  WallColorEntry,
} from './room_internal_shared.js';
export {
  FLOOR_STYLES,
  WALL_COLORS,
  DEFAULT_WALL_COLOR,
  __wp_triggerRender,
  __wp_room_getFloorType,
  __wp_room_getLastStyleId,
  __wp_room_setLastStyleId,
  __wp_room_resolveStyle,
} from './room_internal_shared.js';
export { createProceduralFloorTexture } from './room_floor_texture.js';
export {
  buildRoom,
  resetRoomToDefault,
  setRoomDesignActive,
  updateFloorTexture,
  updateRoomWall,
} from './room_lifecycle.js';
export { installRoomDesign } from './room_design_surface.js';
