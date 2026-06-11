import type { ActionMetaLike, AppContainer } from '../../../types/index.js';

import { hasCallableContract } from '../runtime/install_idempotency_patterns.js';
import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';

import { createProceduralFloorTexture } from './room_floor_texture.js';
import {
  DEFAULT_WALL_COLOR,
  FLOOR_STYLES,
  WALL_COLORS,
  __ensureApp,
  __ensureRoomDesignService,
  __wp_room_getFloorType,
  __wp_room_getLastStyleId,
  __wp_room_resolveStyle,
  __wp_room_setLastStyleId,
  _asTextureParams,
  _asUpdateOpts,
  _normalizeFloorType,
  type RoomDesignServiceState,
  type RoomTextureParams,
  type RoomUpdateOpts,
} from './room_internal_shared.js';
import {
  buildRoom,
  resetRoomToDefault,
  setRoomDesignActive,
  updateFloorTexture,
  updateRoomWall,
} from './room_lifecycle.js';

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

function installFreshRoomDesignCallable<K extends RoomDesignCallableKey>(
  roomDesignService: InstallableRoomDesignService,
  context: RoomDesignInstallContext,
  key: K
): void {
  const binding = ROOM_DESIGN_SURFACE_BINDINGS[key];
  const canonical = binding.bind(context);
  assignRoomDesignStableCallable(roomDesignService, binding, canonical);
  roomDesignService[key] = canonical;
}

function installRoomDesignCallable<K extends RoomDesignCallableKey>(
  roomDesignService: InstallableRoomDesignService,
  context: RoomDesignInstallContext,
  key: K
): void {
  const binding = ROOM_DESIGN_SURFACE_BINDINGS[key];
  roomDesignService[key] = installStableSurfaceMethod(roomDesignService, key, binding.stableKey, () =>
    binding.bind(context)
  );
}

function fillRoomDesignSurface(
  roomDesignService: InstallableRoomDesignService,
  context: RoomDesignInstallContext
): RoomDesignServiceState {
  if (!roomDesignService.FLOOR_STYLES) roomDesignService.FLOOR_STYLES = FLOOR_STYLES;
  if (!roomDesignService.WALL_COLORS) roomDesignService.WALL_COLORS = WALL_COLORS;
  if (!roomDesignService.DEFAULT_WALL_COLOR) roomDesignService.DEFAULT_WALL_COLOR = DEFAULT_WALL_COLOR;

  for (let i = 0; i < ROOM_DESIGN_CALLABLE_KEYS.length; i += 1) {
    const key = ROOM_DESIGN_CALLABLE_KEYS[i];
    if (roomDesignService.__wpRoomDesignInstalled === true) {
      installRoomDesignCallable(roomDesignService, context, key);
    } else {
      installFreshRoomDesignCallable(roomDesignService, context, key);
    }
  }

  roomDesignService.__esm_v1 = true;
  roomDesignService.__wpRoomDesignInstalled = true;
  return roomDesignService;
}

export function hasInstalledRoomDesignSurface(
  roomDesignService: RoomDesignServiceState | null | undefined
): boolean {
  return hasCallableContract<RoomDesignServiceState>(roomDesignService, ROOM_DESIGN_CALLABLE_KEYS);
}

export function installRoomDesign(passedApp: unknown) {
  const A = __ensureApp(passedApp);

  const rd: InstallableRoomDesignService = __ensureRoomDesignService(A);
  const context = resolveRoomDesignInstallContext(rd, A);
  return fillRoomDesignSurface(rd, context);
}
