import { useMemo } from 'react';

import type { AppContainer, MetaActionsNamespaceLike } from '../../../../../types';

import type {
  FloorStyle,
  SettingsVisualFloorType,
  RoomDesignData,
  RoomDesignRuntimeLike,
} from './settings_visual_shared_contracts.js';
import {
  DEFAULT_FLOOR_STYLES,
  getRoomDesignData,
  getRoomDesignRuntime,
} from './settings_visual_shared_room.js';
import { createSettingsVisualRoomDesignController } from './settings_visual_room_design_controller_runtime.js';

export type SettingsVisualRoomDesignModel = {
  roomData: RoomDesignData;
  roomDesignRuntime: RoomDesignRuntimeLike | null;
  floorStylesForType: FloorStyle[];
  setFloorType: (type: SettingsVisualFloorType) => void;
  pickFloorStyle: (style: FloorStyle) => void;
  pickWallColor: (value: string) => void;
};

type UseSettingsVisualRoomDesignArgs = {
  app: AppContainer;
  meta: MetaActionsNamespaceLike;
  floorType: SettingsVisualFloorType;
};

export function useSettingsVisualRoomDesign(
  args: UseSettingsVisualRoomDesignArgs
): SettingsVisualRoomDesignModel {
  const { app, meta, floorType } = args;

  const roomDesignRuntime = useMemo(() => getRoomDesignRuntime(app), [app]);
  const roomData = useMemo(() => getRoomDesignData(roomDesignRuntime), [roomDesignRuntime]);
  const floorStylesForType = useMemo(
    () => roomData.floorStyles[floorType] || DEFAULT_FLOOR_STYLES[floorType] || [],
    [floorType, roomData.floorStyles]
  );

  const roomDesignController = useMemo(
    () =>
      createSettingsVisualRoomDesignController({
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
