import type { ActionMetaLike } from '../../../types/index.js';

import {
  addToScene,
  getRoomGroup,
  getScene,
  removeFromSceneByName,
  setRoomGroup,
} from '../runtime/render_access.js';
import { setRuntimeScalar } from '../runtime/runtime_write_access.js';

import {
  ROOM_GROUP_OBJECT_NAME,
  __ensureApp,
  __ensureTHREE,
  _asActionMeta,
  _asObject,
  type RoomTextureParams,
  type RoomUpdateOpts,
} from './room_internal_shared.js';
import { createRoomScenePrimitives } from './room_scene_primitives.js';
import {
  applyResolvedActiveRoomDesign,
  resetAppliedRoomVisualState,
  resetRoomVisualDefaults,
  updateRoomFloorTexture,
  updateRoomWallColor,
} from './room_visual_apply.js';
import { readRuntimeRoomDesignActive, resolveActiveRoomDesignState } from './room_active_state.js';

export function updateFloorTexture(
  styleData: RoomTextureParams | null | undefined,
  opts: RoomUpdateOpts | null | undefined,
  passedApp: unknown
) {
  const A = __ensureApp(passedApp);
  updateRoomFloorTexture(styleData, opts, A);
}

export function updateRoomWall(
  colorVal: string | null | undefined,
  opts: RoomUpdateOpts | null | undefined,
  passedApp: unknown
) {
  const A = __ensureApp(passedApp);
  updateRoomWallColor(colorVal, opts, A);
}

export function resetRoomToDefault(passedApp: unknown) {
  const A = __ensureApp(passedApp);
  resetRoomVisualDefaults(A);
}

export function buildRoom(forceDesign = false, passedApp: unknown) {
  const A = __ensureApp(passedApp);
  const T = __ensureTHREE(A);

  const scene = _asObject(getScene(A));
  if (!scene || typeof T === 'undefined') return;

  removeFromSceneByName(A, ROOM_GROUP_OBJECT_NAME);
  removeFromSceneByName(A, 'floor');

  const primitives = createRoomScenePrimitives(T);
  if (!primitives) return;

  const roomGroupObj = _asObject(setRoomGroup(A, primitives.roomGroup));
  if (!roomGroupObj) return;
  roomGroupObj.name = ROOM_GROUP_OBJECT_NAME;

  addToScene(A, roomGroupObj);

  resetAppliedRoomVisualState(A);

  const active = resolveActiveRoomDesignState(A);
  if (forceDesign || !!readRuntimeRoomDesignActive(A)) {
    applyResolvedActiveRoomDesign(active, forceDesign, A);
    return;
  }

  resetRoomVisualDefaults(A);
}

export function setRoomDesignActive(
  on: boolean,
  meta: ActionMetaLike | null | undefined,
  passedApp: unknown
) {
  const A = __ensureApp(passedApp);
  const enabled = !!on;
  const m = _asActionMeta(meta, 'room:setActive');

  setRuntimeScalar(A, 'roomDesignActive', enabled, m);

  if (enabled) {
    const hasRoomGroup = !!getRoomGroup(A);
    if (!hasRoomGroup) {
      buildRoom(true, A);
      return;
    }
    applyResolvedActiveRoomDesign(resolveActiveRoomDesignState(A), true, A);
    return;
  }

  resetRoomVisualDefaults(A);
}
