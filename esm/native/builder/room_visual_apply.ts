import type { AppContainer } from '../../../types/index.js';

import { createProceduralFloorTexture } from './room_floor_texture.js';
import {
  __buildRoomFloorSignature,
  __wp_room_getFloorType,
  __wp_room_setLastStyleId,
  __wp_triggerRender,
  _asObject,
  _asUpdateOpts,
  type FloorStyleEntry,
  type FloorType,
  type RoomTextureParams,
  type RoomUpdateOpts,
} from './room_internal_shared.js';
import {
  ROOM_VISUAL_RESET_FLOOR_SIGNATURE,
  ROOM_VISUAL_RESET_WALL_COLOR,
  ROOM_VISUAL_RESET_WALL_HEX,
  areRoomNodeMaterialsTaggedWithWallColor,
  clearAppliedRoomVisualState,
  isAppliedRoomVisualDefaultState,
  markAppliedRoomFloorSignature,
  markAppliedRoomVisualDefaults,
  markAppliedRoomWallColor,
  markRoomMaterialFloorSignature,
  readAppliedRoomFloorSignature,
  readAppliedRoomWallColor,
  readRoomMaterialFloorSignature,
  resetRoomFloorMaterialToDefault,
  setRoomMaterialTexture,
  syncRoomNodeMaterialsWallColor,
  syncRoomNodeVisibility,
} from './room_visual_state_runtime.js';
import {
  canApplyActiveRoomDesign,
  createRoomVisualMutationContext,
  shouldTriggerRoomRender,
  type RoomVisualMutationContext,
} from './room_visual_context.js';
import { ROOM_RESET_DEFAULT_META, ROOM_UPDATE_WALL_META } from './room_internal_shared.js';
import { setUiScalarSoft } from '../runtime/ui_write_access.js';

export type RoomDesignActivationState = {
  floorType: FloorType;
  style: FloorStyleEntry | null;
  wallColor: string;
};

function triggerRoomRenderFromContext(context: RoomVisualMutationContext): void {
  if (!shouldTriggerRoomRender(context.opts)) return;
  __wp_triggerRender(undefined, context.App);
}

function updateFloorTextureWithContext(
  styleData: RoomTextureParams | null | undefined,
  context: RoomVisualMutationContext
): boolean {
  if (!canApplyActiveRoomDesign(context)) return false;

  const { App, runtimeFlags, sceneNodes } = context;
  const { floor: floorMesh, floorMaterial } = sceneNodes;
  if (!floorMesh || !floorMaterial) return false;

  const floorType = __wp_room_getFloorType(App);
  const nextFloorSignature = __buildRoomFloorSignature(floorType, styleData);
  const appliedFloorSignature = readAppliedRoomFloorSignature(App);
  const materialFloorSignature = readRoomMaterialFloorSignature(floorMaterial);
  {
    const sd = _asObject(styleData);
    const id = sd && typeof sd.id === 'string' ? sd.id : null;
    if (id) __wp_room_setLastStyleId(floorType, id, App);
  }

  if (appliedFloorSignature === nextFloorSignature && materialFloorSignature === nextFloorSignature) {
    const visibilityChanged = syncRoomNodeVisibility(floorMesh, !runtimeFlags.isSketch);
    if (visibilityChanged) triggerRoomRenderFromContext(context);
    return visibilityChanged;
  }

  if (floorType === 'none') {
    setRoomMaterialTexture(floorMaterial, null);
    {
      const sd = _asObject(styleData);
      const c = sd && typeof sd.color === 'string' ? sd.color : null;
      floorMaterial.color?.set?.(c || ROOM_VISUAL_RESET_WALL_COLOR);
    }
    floorMaterial.needsUpdate = true;
  } else {
    const tex = createProceduralFloorTexture(floorType, styleData || {}, App);
    setRoomMaterialTexture(floorMaterial, tex || null);
    floorMaterial.color?.setHex?.(ROOM_VISUAL_RESET_WALL_HEX);
    floorMaterial.needsUpdate = true;
  }

  markAppliedRoomFloorSignature(App, nextFloorSignature);
  markRoomMaterialFloorSignature(floorMaterial, nextFloorSignature);
  syncRoomNodeVisibility(floorMesh, !runtimeFlags.isSketch);
  triggerRoomRenderFromContext(context);
  return true;
}

function updateRoomWallWithContext(
  colorVal: string | null | undefined,
  context: RoomVisualMutationContext
): boolean {
  if (!canApplyActiveRoomDesign(context)) return false;

  const { App, sceneNodes } = context;
  const cv = colorVal || ROOM_VISUAL_RESET_WALL_COLOR;
  try {
    setUiScalarSoft(App, 'lastSelectedWallColor', cv, ROOM_UPDATE_WALL_META);
  } catch (_) {
    // ignore
  }

  const { roomGroup, walls } = sceneNodes;
  if (!roomGroup) return false;
  const appliedWallColor = readAppliedRoomWallColor(App);
  const wallStateChanged = appliedWallColor !== cv;
  const wallMaterialChanged = syncRoomNodeMaterialsWallColor(walls, cv);
  if (!wallStateChanged && !wallMaterialChanged) return false;
  markAppliedRoomWallColor(App, cv);
  triggerRoomRenderFromContext(context);
  return wallStateChanged || wallMaterialChanged;
}

function resetRoomToDefaultWithContext(context: RoomVisualMutationContext): boolean {
  const { App, runtimeFlags, sceneNodes } = context;
  const { roomGroup, walls, floor, floorMaterial } = sceneNodes;
  if (!roomGroup) return false;

  const floorVisibilityChanged = syncRoomNodeVisibility(floor, !runtimeFlags.isSketch);
  const wallsAlreadyDefault = areRoomNodeMaterialsTaggedWithWallColor(walls, ROOM_VISUAL_RESET_WALL_COLOR);
  const floorAlreadyDefault =
    readRoomMaterialFloorSignature(floorMaterial) === ROOM_VISUAL_RESET_FLOOR_SIGNATURE;
  if (isAppliedRoomVisualDefaultState(App) && wallsAlreadyDefault && floorAlreadyDefault) {
    if (floorVisibilityChanged) triggerRoomRenderFromContext(context);
    return floorVisibilityChanged;
  }

  syncRoomNodeMaterialsWallColor(walls, ROOM_VISUAL_RESET_WALL_COLOR);

  if (floorMaterial) resetRoomFloorMaterialToDefault(floorMaterial);

  markAppliedRoomVisualDefaults(App);

  try {
    setUiScalarSoft(App, 'lastSelectedWallColor', ROOM_VISUAL_RESET_WALL_COLOR, ROOM_RESET_DEFAULT_META);
  } catch (_) {
    // ignore
  }
  triggerRoomRenderFromContext(context);
  return true;
}

export function updateRoomFloorTexture(
  styleData: RoomTextureParams | null | undefined,
  opts: RoomUpdateOpts | null | undefined,
  App: AppContainer
): boolean {
  return updateFloorTextureWithContext(styleData, createRoomVisualMutationContext(App, opts));
}

export function updateRoomWallColor(
  colorVal: string | null | undefined,
  opts: RoomUpdateOpts | null | undefined,
  App: AppContainer
): boolean {
  return updateRoomWallWithContext(colorVal, createRoomVisualMutationContext(App, opts));
}

export function resetRoomVisualDefaults(
  App: AppContainer,
  opts: RoomUpdateOpts | null | undefined = null
): boolean {
  return resetRoomToDefaultWithContext(createRoomVisualMutationContext(App, opts));
}

export function applyResolvedActiveRoomDesign(
  active: RoomDesignActivationState,
  forceDesign: boolean,
  App: AppContainer,
  opts: RoomUpdateOpts | null | undefined = null
): boolean {
  const batchedOpts = { ..._asUpdateOpts(opts), force: forceDesign, triggerRender: false };
  const context = createRoomVisualMutationContext(App, batchedOpts);
  const floorChanged = active.style ? updateFloorTextureWithContext(active.style, context) : false;
  const wallChanged = updateRoomWallWithContext(active.wallColor, context);
  const changed = floorChanged || wallChanged;
  if (changed && shouldTriggerRoomRender(opts)) __wp_triggerRender(undefined, App);
  return changed;
}

export function resetAppliedRoomVisualState(App: AppContainer): void {
  clearAppliedRoomVisualState(App);
}
