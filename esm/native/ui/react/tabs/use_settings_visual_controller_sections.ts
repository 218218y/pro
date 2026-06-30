import { useEffect, useMemo } from 'react';

import type { AppContainer, MetaActionsNamespaceLike } from '../../../../../types';

import { createSettingsVisualDisplayController } from './settings_visual_display_controller_runtime.js';
import type {
  SettingsVisualControllerModel,
  SettingsVisualControllerState,
  SettingsVisualDisplaySectionModel,
  SettingsVisualLightingSectionModel,
  SettingsVisualRoomSectionModel,
} from './use_settings_visual_controller_contracts.js';
import { useSettingsVisualLighting } from './use_settings_visual_lighting.js';
import { useSettingsVisualRoomDesign } from './use_settings_visual_room_design.js';

export function useSettingsVisualSections(args: {
  app: AppContainer;
  meta: MetaActionsNamespaceLike;
  state: SettingsVisualControllerState;
}): SettingsVisualControllerModel {
  const { app, meta, state } = args;

  const roomSectionBase = useSettingsVisualRoomDesign({
    app,
    meta,
    floorType: state.floorType,
  });

  const lighting = useSettingsVisualLighting({
    app,
    meta,
    roomDesignRuntime: roomSectionBase.roomDesignRuntime,
    defaultWall: roomSectionBase.roomData.defaultWall,
  });

  const displayController = useMemo(() => createSettingsVisualDisplayController({ app, meta }), [app, meta]);

  useEffect(() => {
    displayController.syncGlobalClickState(state.globalClickRt, state.globalClickUi);
  }, [displayController, state.globalClickRt, state.globalClickUi]);

  const displaySection = useMemo<SettingsVisualDisplaySectionModel>(
    () => ({
      showDimensions: state.showDimensions,
      mirrorReflectorEnabled: state.mirrorReflectorEnabled,
      showContents: state.showContents,
      showHanger: state.showHanger,
      globalClickUi: state.globalClickUi,
      darkMode: state.darkMode,
      onToggleShowDimensions: displayController.onToggleShowDimensions,
      onToggleMirrorReflector: displayController.onToggleMirrorReflector,
      onToggleShowHanger: displayController.onToggleShowHanger,
      onToggleGlobalClick: displayController.onToggleGlobalClick,
      onToggleDarkMode: displayController.onToggleDarkMode,
    }),
    [
      state.showDimensions,
      state.mirrorReflectorEnabled,
      state.showContents,
      state.showHanger,
      state.globalClickUi,
      state.darkMode,
      displayController.onToggleShowDimensions,
      displayController.onToggleMirrorReflector,
      displayController.onToggleShowHanger,
      displayController.onToggleGlobalClick,
      displayController.onToggleDarkMode,
    ]
  );

  const roomSection = useMemo<SettingsVisualRoomSectionModel>(
    () => ({
      floorType: state.floorType,
      floorStyleId: state.floorStyleId,
      wallColor: state.wallColor,
      ...roomSectionBase,
    }),
    [state.floorType, state.floorStyleId, state.wallColor, roomSectionBase]
  );

  const lightingSection = useMemo<SettingsVisualLightingSectionModel>(
    () => ({
      lightingControl: state.lightingControl,
      lastLightPreset: state.lastLightPreset,
      lightAmb: state.lightAmb,
      lightDir: state.lightDir,
      lightX: state.lightX,
      lightY: state.lightY,
      lightZ: state.lightZ,
      ...lighting,
    }),
    [
      state.lightingControl,
      state.lastLightPreset,
      state.lightAmb,
      state.lightDir,
      state.lightX,
      state.lightY,
      state.lightZ,
      lighting,
    ]
  );

  return {
    displaySection,
    roomSection,
    lightingSection,
  };
}
