import { useMemo } from 'react';

import type {
  AppContainer,
  MetaActionsNamespaceLike,
  RoomArchitectureConfigLike,
} from '../../../../../types';

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
  roomArchitecture: RoomArchitectureConfigLike;
  wardrobeWidthCm: number;
  wardrobeOffsetRightCm: number;
  setFloorType: (type: SettingsVisualFloorType) => void;
  pickFloorStyle: (style: FloorStyle) => void;
  pickWallColor: (value: string) => void;
  setBackWallEnabled: (enabled: boolean) => void;
  setBackWallDimension: (key: 'widthCm' | 'heightCm' | 'wardrobeOffsetLeftCm', value: number) => void;
  setWardrobeOffsetRightCm: (value: number) => void;
  alignWardrobeOnWall: (mode: 'left' | 'center' | 'right') => void;
  setColumnEnabled: (enabled: boolean) => void;
  setColumnDimension: (
    key: 'offsetLeftCm' | 'widthCm' | 'depthCm' | 'heightCm' | 'bottomOffsetCm',
    value: number
  ) => void;
  toggleArchitectureVisibility: () => void;
};

type UseSettingsVisualRoomDesignArgs = {
  app: AppContainer;
  meta: MetaActionsNamespaceLike;
  floorType: SettingsVisualFloorType;
  roomArchitecture: RoomArchitectureConfigLike;
  wardrobeWidthCm: number;
};

export function useSettingsVisualRoomDesign(
  args: UseSettingsVisualRoomDesignArgs
): SettingsVisualRoomDesignModel {
  const { app, meta, floorType, roomArchitecture, wardrobeWidthCm } = args;

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
        roomArchitecture,
        wardrobeWidthCm,
      }),
    [app, meta, roomData, roomDesignRuntime, roomArchitecture, wardrobeWidthCm]
  );

  const wardrobeOffsetRightCm =
    Math.round(
      (roomArchitecture.backWall.widthCm - roomArchitecture.backWall.wardrobeOffsetLeftCm - wardrobeWidthCm) *
        10
    ) / 10;

  return useMemo(
    () => ({
      roomData,
      roomDesignRuntime,
      floorStylesForType,
      roomArchitecture,
      wardrobeWidthCm,
      wardrobeOffsetRightCm,
      setFloorType: roomDesignController.setFloorType,
      pickFloorStyle: roomDesignController.pickFloorStyle,
      pickWallColor: roomDesignController.pickWallColor,
      setBackWallEnabled: roomDesignController.setBackWallEnabled,
      setBackWallDimension: roomDesignController.setBackWallDimension,
      setWardrobeOffsetRightCm: roomDesignController.setWardrobeOffsetRightCm,
      alignWardrobeOnWall: roomDesignController.alignWardrobeOnWall,
      setColumnEnabled: roomDesignController.setColumnEnabled,
      setColumnDimension: roomDesignController.setColumnDimension,
      toggleArchitectureVisibility: roomDesignController.toggleArchitectureVisibility,
    }),
    [
      roomData,
      roomDesignRuntime,
      floorStylesForType,
      roomArchitecture,
      wardrobeWidthCm,
      wardrobeOffsetRightCm,
      roomDesignController.setFloorType,
      roomDesignController.pickFloorStyle,
      roomDesignController.pickWallColor,
      roomDesignController.setBackWallEnabled,
      roomDesignController.setBackWallDimension,
      roomDesignController.setWardrobeOffsetRightCm,
      roomDesignController.alignWardrobeOnWall,
      roomDesignController.setColumnEnabled,
      roomDesignController.setColumnDimension,
      roomDesignController.toggleArchitectureVisibility,
    ]
  );
}
