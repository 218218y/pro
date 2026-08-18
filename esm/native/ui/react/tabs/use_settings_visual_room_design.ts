import { useMemo } from 'react';

import type {
  AppContainer,
  MetaActionsNamespaceLike,
  RoomArchitectureConfigLike,
  RoomOpeningKind,
} from '../../../../../types';

import { useModeSelector } from '../hooks.js';
import { constrainProjectRoomArchitectureToWardrobeWidth } from '../actions/structural_build_refresh_actions.js';

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
import {
  createSettingsVisualRoomDesignController,
  ROOM_OPENING_MODE_ID,
} from './settings_visual_room_design_controller_runtime.js';

export type SettingsVisualRoomDesignModel = {
  roomData: RoomDesignData;
  roomDesignRuntime: RoomDesignRuntimeLike | null;
  floorStylesForType: FloorStyle[];
  roomArchitecture: RoomArchitectureConfigLike;
  wardrobeWidthCm: number;
  wardrobeOffsetRightCm: number;
  openingPlacementActive: boolean;
  setFloorType: (type: SettingsVisualFloorType) => void;
  pickFloorStyle: (style: FloorStyle) => void;
  pickWallColor: (value: string) => void;
  setArchitectureWallColor: (value: string) => void;
  setBackWallEnabled: (enabled: boolean) => void;
  setBackWallDimension: (key: 'widthCm' | 'heightCm' | 'wardrobeOffsetLeftCm', value: number) => void;
  setSideWallEnabled: (side: 'leftWall' | 'rightWall', enabled: boolean) => void;
  setSideWallDimension: (side: 'leftWall' | 'rightWall', key: 'depthCm' | 'heightCm', value: number) => void;
  setWardrobeOffsetRightCm: (value: number) => void;
  alignWardrobeOnWall: (mode: 'left' | 'center' | 'right') => void;
  setColumnEnabled: (enabled: boolean) => void;
  setColumnDimension: (
    key: 'offsetLeftCm' | 'widthCm' | 'depthCm' | 'heightCm' | 'bottomOffsetCm',
    value: number
  ) => void;
  toggleArchitectureVisibility: () => void;
  beginOpeningPlacement: (kind: RoomOpeningKind, widthCm: number, heightCm: number) => boolean;
  removeOpening: (openingId: string) => boolean;
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
  const constrainedRoomArchitecture = useMemo(
    () => constrainProjectRoomArchitectureToWardrobeWidth(roomArchitecture, wardrobeWidthCm),
    [roomArchitecture, wardrobeWidthCm]
  );

  const roomDesignRuntime = useMemo(() => getRoomDesignRuntime(app), [app]);
  const roomData = useMemo(() => getRoomDesignData(roomDesignRuntime), [roomDesignRuntime]);
  const floorStylesForType = useMemo(
    () => roomData.floorStyles[floorType] || DEFAULT_FLOOR_STYLES[floorType] || [],
    [floorType, roomData.floorStyles]
  );

  const openingPlacementActive = useModeSelector(
    mode => String(mode.primary || 'none') === ROOM_OPENING_MODE_ID
  );

  const roomDesignController = useMemo(
    () =>
      createSettingsVisualRoomDesignController({
        app,
        meta,
        roomData,
        roomDesignRuntime,
        roomArchitecture: constrainedRoomArchitecture,
        wardrobeWidthCm,
      }),
    [app, meta, roomData, roomDesignRuntime, constrainedRoomArchitecture, wardrobeWidthCm]
  );

  const wardrobeOffsetRightCm =
    Math.round(
      (constrainedRoomArchitecture.backWall.widthCm -
        constrainedRoomArchitecture.backWall.wardrobeOffsetLeftCm -
        wardrobeWidthCm) *
        10
    ) / 10;

  return useMemo(
    () => ({
      roomData,
      roomDesignRuntime,
      floorStylesForType,
      roomArchitecture: constrainedRoomArchitecture,
      wardrobeWidthCm,
      wardrobeOffsetRightCm,
      openingPlacementActive,
      setFloorType: roomDesignController.setFloorType,
      pickFloorStyle: roomDesignController.pickFloorStyle,
      pickWallColor: roomDesignController.pickWallColor,
      setArchitectureWallColor: roomDesignController.setArchitectureWallColor,
      setBackWallEnabled: roomDesignController.setBackWallEnabled,
      setBackWallDimension: roomDesignController.setBackWallDimension,
      setSideWallEnabled: roomDesignController.setSideWallEnabled,
      setSideWallDimension: roomDesignController.setSideWallDimension,
      setWardrobeOffsetRightCm: roomDesignController.setWardrobeOffsetRightCm,
      alignWardrobeOnWall: roomDesignController.alignWardrobeOnWall,
      setColumnEnabled: roomDesignController.setColumnEnabled,
      setColumnDimension: roomDesignController.setColumnDimension,
      toggleArchitectureVisibility: roomDesignController.toggleArchitectureVisibility,
      beginOpeningPlacement: roomDesignController.beginOpeningPlacement,
      removeOpening: roomDesignController.removeOpening,
    }),
    [
      roomData,
      roomDesignRuntime,
      floorStylesForType,
      constrainedRoomArchitecture,
      wardrobeWidthCm,
      wardrobeOffsetRightCm,
      openingPlacementActive,
      roomDesignController.setFloorType,
      roomDesignController.pickFloorStyle,
      roomDesignController.pickWallColor,
      roomDesignController.setArchitectureWallColor,
      roomDesignController.setBackWallEnabled,
      roomDesignController.setBackWallDimension,
      roomDesignController.setSideWallEnabled,
      roomDesignController.setSideWallDimension,
      roomDesignController.setWardrobeOffsetRightCm,
      roomDesignController.alignWardrobeOnWall,
      roomDesignController.setColumnEnabled,
      roomDesignController.setColumnDimension,
      roomDesignController.toggleArchitectureVisibility,
      roomDesignController.beginOpeningPlacement,
      roomDesignController.removeOpening,
    ]
  );
}
