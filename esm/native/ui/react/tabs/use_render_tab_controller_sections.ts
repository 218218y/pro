import { useEffect, useMemo } from 'react';

import type { AppContainer, MetaActionsNamespaceLike } from '../../../../../types';

import { createRenderTabDisplayController } from './render_tab_display_controller_runtime.js';
import type {
  RenderTabControllerModel,
  RenderTabControllerState,
  RenderTabDisplaySectionModel,
  RenderTabLightingSectionModel,
  RenderTabRoomSectionModel,
} from './use_render_tab_controller_contracts.js';
import { useRenderTabLighting } from './use_render_tab_lighting.js';
import { useRenderTabNotes } from './use_render_tab_notes.js';
import { useRenderTabRoomDesign } from './use_render_tab_room_design.js';

export function useRenderTabSections(args: {
  app: AppContainer;
  meta: MetaActionsNamespaceLike;
  state: RenderTabControllerState;
}): RenderTabControllerModel {
  const { app, meta, state } = args;

  const notesSection = useRenderTabNotes({
    app,
    meta,
    notesEnabled: state.notesEnabled,
    savedNotesCount: state.savedNotesCount,
  });

  const roomSectionBase = useRenderTabRoomDesign({
    app,
    meta,
    floorType: state.floorType,
  });

  const lighting = useRenderTabLighting({
    app,
    meta,
    roomDesignRuntime: roomSectionBase.roomDesignRuntime,
    defaultWall: roomSectionBase.roomData.defaultWall,
  });

  const displayController = useMemo(
    () => createRenderTabDisplayController({ app, meta, sketchMode: state.sketchMode }),
    [app, meta, state.sketchMode]
  );

  useEffect(() => {
    displayController.syncGlobalClickState(state.globalClickRt, state.globalClickUi);
  }, [displayController, state.globalClickRt, state.globalClickUi]);

  const displaySection = useMemo<RenderTabDisplaySectionModel>(
    () => ({
      showDimensions: state.showDimensions,
      showContents: state.showContents,
      showHanger: state.showHanger,
      sketchMode: state.sketchMode,
      globalClickUi: state.globalClickUi,
      onToggleShowDimensions: displayController.onToggleShowDimensions,
      onToggleShowContents: displayController.onToggleShowContents,
      onToggleShowHanger: displayController.onToggleShowHanger,
      onToggleSketchMode: displayController.onToggleSketchMode,
      onToggleGlobalClick: displayController.onToggleGlobalClick,
    }),
    [
      state.showDimensions,
      state.showContents,
      state.showHanger,
      state.sketchMode,
      state.globalClickUi,
      displayController.onToggleShowDimensions,
      displayController.onToggleShowContents,
      displayController.onToggleShowHanger,
      displayController.onToggleSketchMode,
      displayController.onToggleGlobalClick,
    ]
  );

  const roomSection = useMemo<RenderTabRoomSectionModel>(
    () => ({
      floorType: state.floorType,
      floorStyleId: state.floorStyleId,
      wallColor: state.wallColor,
      ...roomSectionBase,
    }),
    [state.floorType, state.floorStyleId, state.wallColor, roomSectionBase]
  );

  const lightingSection = useMemo<RenderTabLightingSectionModel>(
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
    notesSection,
    displaySection,
    roomSection,
    lightingSection,
  };
}
