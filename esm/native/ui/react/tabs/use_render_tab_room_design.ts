import { useMemo } from 'react';

import type { AppContainer, MetaActionsNamespaceLike } from '../../../../../types';

import type {
  FloorStyle,
  RenderTabFloorType,
  RoomDesignData,
  RoomDesignRuntimeLike,
} from './render_tab_shared_contracts.js';
import { FALLBACK_FLOOR_STYLES, getRoomDesignData, getRoomDesignRuntime } from './render_tab_shared_room.js';
import { createRenderTabRoomDesignController } from './render_tab_room_design_controller_runtime.js';

export type RenderTabRoomDesignModel = {
  roomData: RoomDesignData;
  roomDesignRuntime: RoomDesignRuntimeLike | null;
  floorStylesForType: FloorStyle[];
  setFloorType: (type: RenderTabFloorType) => void;
  pickFloorStyle: (style: FloorStyle) => void;
  pickWallColor: (value: string) => void;
};

type UseRenderTabRoomDesignArgs = {
  app: AppContainer;
  meta: MetaActionsNamespaceLike;
  floorType: RenderTabFloorType;
};

export function useRenderTabRoomDesign(args: UseRenderTabRoomDesignArgs): RenderTabRoomDesignModel {
  const { app, meta, floorType } = args;

  const roomDesignRuntime = useMemo(() => getRoomDesignRuntime(app), [app]);
  const roomData = useMemo(() => getRoomDesignData(roomDesignRuntime), [roomDesignRuntime]);
  const floorStylesForType = useMemo(
    () => roomData.floorStyles[floorType] || FALLBACK_FLOOR_STYLES[floorType] || [],
    [floorType, roomData.floorStyles]
  );

  const roomDesignController = useMemo(
    () =>
      createRenderTabRoomDesignController({
        app,
        meta,
        roomData,
        roomDesignRuntime,
      }),
    [app, meta, roomData, roomDesignRuntime]
  );

  return useMemo(
    () => ({
      roomData,
      roomDesignRuntime,
      floorStylesForType,
      setFloorType: roomDesignController.setFloorType,
      pickFloorStyle: roomDesignController.pickFloorStyle,
      pickWallColor: roomDesignController.pickWallColor,
    }),
    [
      roomData,
      roomDesignRuntime,
      floorStylesForType,
      roomDesignController.setFloorType,
      roomDesignController.pickFloorStyle,
      roomDesignController.pickWallColor,
    ]
  );
}
