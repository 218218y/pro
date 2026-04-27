// Native Builder Room / RoomDesign (ESM)
//
// Converted from `js/builder/pro_builder_room.js` into a real ES module.
//
// Responsibilities:
// - Own the room-design service surface installed onto `App.services.roomDesign`.
// - Orchestrate room build/reset/update flows against the render scene.
// - Re-export the room palettes + helper utilities consumed by the Room UI widget.
//
// Design:
// - No IIFE and no implicit side-effects on import.
// - Explicit installer binds the roomDesign service onto `App.services.roomDesign`.
// - Low-level scene primitives + procedural floor texture rendering now live in
//   dedicated owners (`room_scene_primitives.ts` / `room_floor_texture.ts`).
// - THREE is resolved lazily from App.deps.THREE.

import type { ActionMetaLike, AppContainer, RoomTextureParamsLike } from '../../../types/index.js';

import { hasCallableContract } from '../runtime/install_idempotency_patterns.js';
import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';
import {
  addToScene,
  getRoomGroup,
  getScene,
  removeFromSceneByName,
  setRoomGroup,
} from '../runtime/render_access.js';
import { setRuntimeScalar } from '../runtime/runtime_write_access.js';

import { createProceduralFloorTexture } from './room_floor_texture.js';
import {
  DEFAULT_WALL_COLOR,
  FLOOR_STYLES,
  ROOM_GROUP_OBJECT_NAME,
  WALL_COLORS,
  __ensureApp,
  __ensureRoomDesignService,
  __ensureTHREE,
  __readRoomDesignRuntimeFlags,
  __readRoomUiSelectionState,
  __readUi,
  __wp_room_getFloorType,
  __wp_room_getLastStyleId,
  __wp_room_resolveStyle,
  __wp_room_setLastStyleId,
  __wp_triggerRender,
  _asActionMeta,
  _asObject,
  _asTextureParams,
  _asUpdateOpts,
  _normalizeFloorType,
  type FloorType,
  type FloorStyleEntry,
  type RoomDesignServiceState,
  type RoomUiLike,
  type RoomUpdateOpts,
  type WallColorEntry,
} from './room_internal_shared.js';
import { createRoomScenePrimitives } from './room_scene_primitives.js';
import {
  applyResolvedActiveRoomDesign,
  resetAppliedRoomVisualState,
  resetRoomVisualDefaults,
  updateRoomFloorTexture,
  updateRoomWallColor,
  type RoomDesignActivationState,
} from './room_visual_apply.js';

export type { FloorType, FloorStyleEntry, RoomTextureParams, RoomUiLike, RoomUpdateOpts, WallColorEntry };
export {
  FLOOR_STYLES,
  WALL_COLORS,
  DEFAULT_WALL_COLOR,
  __wp_triggerRender,
  __wp_room_getFloorType,
  __wp_room_getLastStyleId,
  __wp_room_setLastStyleId,
  __wp_room_resolveStyle,
  createProceduralFloorTexture,
};

type InstallableRoomDesignService = RoomDesignServiceState & {
  __wpRoomDesignInstalled?: boolean;
  __wpRoomBuild?: RoomDesignServiceState['buildRoom'];
  __wpRoomResetToDefault?: RoomDesignServiceState['resetRoomToDefault'];
  __wpRoomUpdateFloorTexture?: RoomDesignServiceState['updateFloorTexture'];
  __wpRoomUpdateWall?: RoomDesignServiceState['updateRoomWall'];
  __wpRoomSetActive?: RoomDesignServiceState['setActive'];
  __wpRoomGetFloorType?: RoomDesignServiceState['__wp_room_getFloorType'];
  __wpRoomGetLastStyleId?: RoomDesignServiceState['__wp_room_getLastStyleId'];
  __wpRoomSetLastStyleId?: RoomDesignServiceState['__wp_room_setLastStyleId'];
  __wpRoomResolveStyle?: RoomDesignServiceState['__wp_room_resolveStyle'];
  __wpRoomCreateProceduralFloorTexture?: RoomDesignServiceState['createProceduralFloorTexture'];
};

type RoomDesignCallableKey =
  | 'buildRoom'
  | 'resetRoomToDefault'
  | 'updateFloorTexture'
  | 'updateRoomWall'
  | 'setActive'
  | '__wp_room_getFloorType'
  | '__wp_room_getLastStyleId'
  | '__wp_room_setLastStyleId'
  | '__wp_room_resolveStyle'
  | 'createProceduralFloorTexture';

type RoomDesignStableMethodKeyBySurfaceKey = {
  buildRoom: '__wpRoomBuild';
  resetRoomToDefault: '__wpRoomResetToDefault';
  updateFloorTexture: '__wpRoomUpdateFloorTexture';
  updateRoomWall: '__wpRoomUpdateWall';
  setActive: '__wpRoomSetActive';
  __wp_room_getFloorType: '__wpRoomGetFloorType';
  __wp_room_getLastStyleId: '__wpRoomGetLastStyleId';
  __wp_room_setLastStyleId: '__wpRoomSetLastStyleId';
  __wp_room_resolveStyle: '__wpRoomResolveStyle';
  createProceduralFloorTexture: '__wpRoomCreateProceduralFloorTexture';
};

type RoomDesignInstallContext = {
  App: AppContainer;
};

type RoomDesignSurfaceBinding<K extends RoomDesignCallableKey = RoomDesignCallableKey> = {
  stableKey: RoomDesignStableMethodKeyBySurfaceKey[K];
  bind: (context: RoomDesignInstallContext) => NonNullable<RoomDesignServiceState[K]>;
};

type RoomDesignSurfaceBindingMap = {
  [K in RoomDesignCallableKey]: RoomDesignSurfaceBinding<K>;
};

const ROOM_DESIGN_CALLABLE_KEYS: readonly RoomDesignCallableKey[] = [
  'buildRoom',
  'resetRoomToDefault',
  'updateFloorTexture',
  'updateRoomWall',
  'setActive',
  '__wp_room_getFloorType',
  '__wp_room_getLastStyleId',
  '__wp_room_setLastStyleId',
  '__wp_room_resolveStyle',
  'createProceduralFloorTexture',
];

const roomDesignInstallContexts = new WeakMap<object, RoomDesignInstallContext>();

function createRoomDesignInstallContext(App: AppContainer): RoomDesignInstallContext {
  return { App };
}

function refreshRoomDesignInstallContext(
  context: RoomDesignInstallContext,
  App: AppContainer
): RoomDesignInstallContext {
  context.App = App;
  return context;
}

function resolveRoomDesignInstallContext(
  roomDesignService: InstallableRoomDesignService,
  App: AppContainer
): RoomDesignInstallContext {
  let context = roomDesignInstallContexts.get(roomDesignService);
  if (!context) {
    context = createRoomDesignInstallContext(App);
    roomDesignInstallContexts.set(roomDesignService, context);
    return context;
  }
  return refreshRoomDesignInstallContext(context, App);
}

// Keep the shared contract explicit in the public room service surface.
type RoomTextureParams = RoomTextureParamsLike;

function __resolveActiveRoomDesignState(A: AppContainer): RoomDesignActivationState {
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

function readRuntimeRoomDesignActive(A: AppContainer): boolean {
  return __readRoomDesignRuntimeFlags(A).isActive;
}

const ROOM_DESIGN_SURFACE_BINDINGS: RoomDesignSurfaceBindingMap = {
  buildRoom: {
    stableKey: '__wpRoomBuild',
    bind:
      context =>
      (forceDesign = false) =>
        buildRoom(forceDesign, context.App),
  },
  resetRoomToDefault: {
    stableKey: '__wpRoomResetToDefault',
    bind: context => () => resetRoomToDefault(context.App),
  },
  updateFloorTexture: {
    stableKey: '__wpRoomUpdateFloorTexture',
    bind: context => (style: unknown, opts?: RoomUpdateOpts) =>
      updateFloorTexture(_asTextureParams(style), _asUpdateOpts(opts), context.App),
  },
  updateRoomWall: {
    stableKey: '__wpRoomUpdateWall',
    bind: context => (wallColor: string, opts?: RoomUpdateOpts) =>
      updateRoomWall(typeof wallColor === 'string' ? wallColor : null, _asUpdateOpts(opts), context.App),
  },
  setActive: {
    stableKey: '__wpRoomSetActive',
    bind: context => (on: boolean, meta?: ActionMetaLike) => setRoomDesignActive(on, meta, context.App),
  },
  __wp_room_getFloorType: {
    stableKey: '__wpRoomGetFloorType',
    bind: context => () => __wp_room_getFloorType(context.App),
  },
  __wp_room_getLastStyleId: {
    stableKey: '__wpRoomGetLastStyleId',
    bind: context => (type: string) => __wp_room_getLastStyleId(_normalizeFloorType(type), context.App),
  },
  __wp_room_setLastStyleId: {
    stableKey: '__wpRoomSetLastStyleId',
    bind: context => (type: string, styleId: string | null) =>
      __wp_room_setLastStyleId(_normalizeFloorType(type), styleId, context.App),
  },
  __wp_room_resolveStyle: {
    stableKey: '__wpRoomResolveStyle',
    bind: () => (type: string, styleId?: string | null) =>
      __wp_room_resolveStyle(_normalizeFloorType(type), styleId),
  },
  createProceduralFloorTexture: {
    stableKey: '__wpRoomCreateProceduralFloorTexture',
    bind: context => (type: string, params: RoomTextureParams) =>
      createProceduralFloorTexture(_normalizeFloorType(type), params, context.App),
  },
};

function assignRoomDesignStableCallable<K extends RoomDesignCallableKey>(
  roomDesignService: InstallableRoomDesignService,
  binding: RoomDesignSurfaceBinding<K>,
  canonical: NonNullable<RoomDesignServiceState[K]>
): void {
  Reflect.set(roomDesignService, binding.stableKey, canonical);
}

function __installFreshRoomDesignCallable<K extends RoomDesignCallableKey>(
  roomDesignService: InstallableRoomDesignService,
  context: RoomDesignInstallContext,
  key: K
): void {
  const binding = ROOM_DESIGN_SURFACE_BINDINGS[key];
  const canonical = binding.bind(context);
  assignRoomDesignStableCallable(roomDesignService, binding, canonical);
  roomDesignService[key] = canonical;
}

function __installRoomDesignCallable<K extends RoomDesignCallableKey>(
  roomDesignService: InstallableRoomDesignService,
  context: RoomDesignInstallContext,
  key: K
): void {
  const binding = ROOM_DESIGN_SURFACE_BINDINGS[key];
  roomDesignService[key] = installStableSurfaceMethod(roomDesignService, key, binding.stableKey, () =>
    binding.bind(context)
  );
}

function __fillRoomDesignSurface(
  roomDesignService: InstallableRoomDesignService,
  context: RoomDesignInstallContext
): RoomDesignServiceState {
  if (!roomDesignService.FLOOR_STYLES) roomDesignService.FLOOR_STYLES = FLOOR_STYLES;
  if (!roomDesignService.WALL_COLORS) roomDesignService.WALL_COLORS = WALL_COLORS;
  if (!roomDesignService.DEFAULT_WALL_COLOR) roomDesignService.DEFAULT_WALL_COLOR = DEFAULT_WALL_COLOR;

  for (let i = 0; i < ROOM_DESIGN_CALLABLE_KEYS.length; i += 1) {
    const key = ROOM_DESIGN_CALLABLE_KEYS[i];
    if (roomDesignService.__wpRoomDesignInstalled === true) {
      __installRoomDesignCallable(roomDesignService, context, key);
    } else {
      __installFreshRoomDesignCallable(roomDesignService, context, key);
    }
  }

  roomDesignService.__esm_v1 = true;
  roomDesignService.__wpRoomDesignInstalled = true;
  return roomDesignService;
}

function __hasInstalledRoomDesignSurface(
  roomDesignService: RoomDesignServiceState | null | undefined
): boolean {
  return hasCallableContract<RoomDesignServiceState>(roomDesignService, ROOM_DESIGN_CALLABLE_KEYS);
}

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

  const active = __resolveActiveRoomDesignState(A);
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
    applyResolvedActiveRoomDesign(__resolveActiveRoomDesignState(A), true, A);
    return;
  }

  resetRoomVisualDefaults(A);
}

export function installRoomDesign(passedApp: unknown) {
  const A = __ensureApp(passedApp);

  const rd: InstallableRoomDesignService = __ensureRoomDesignService(A);
  const context = resolveRoomDesignInstallContext(rd, A);
  return __fillRoomDesignSurface(rd, context);
}
