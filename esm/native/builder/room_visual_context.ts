import type { AppContainer } from '../../../types/index.js';

import {
  __readRoomDesignRuntimeFlags,
  __readRoomSceneNodes,
  _asUpdateOpts,
  _readBoolish,
  type RoomDesignRuntimeFlags,
  type RoomSceneNodes,
  type RoomUpdateOpts,
} from './room_internal_shared.js';

export type RoomVisualMutationContext = {
  App: AppContainer;
  opts: RoomUpdateOpts;
  force: boolean;
  runtimeFlags: RoomDesignRuntimeFlags;
  sceneNodes: RoomSceneNodes;
};

export function shouldTriggerRoomRender(opts: RoomUpdateOpts | null | undefined): boolean {
  return opts?.triggerRender !== false;
}

export function createRoomVisualMutationContext(
  App: AppContainer,
  opts: RoomUpdateOpts | null | undefined
): RoomVisualMutationContext {
  const safeOpts = _asUpdateOpts(opts);
  return {
    App,
    opts: safeOpts,
    force: _readBoolish(safeOpts.force),
    runtimeFlags: __readRoomDesignRuntimeFlags(App),
    sceneNodes: __readRoomSceneNodes(App),
  };
}

export function canApplyActiveRoomDesign(context: RoomVisualMutationContext): boolean {
  return context.force || context.runtimeFlags.isActive;
}
