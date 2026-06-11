import { useMemo } from 'react';

import type { AppContainer, UiFeedbackNamespaceLike } from '../../../../../types';

import { useDesignTabColorManager } from './use_design_tab_color_manager.js';
import { useDesignTabEditModes } from './use_design_tab_edit_modes.js';
import { createDesignTabControllerRuntime } from './design_tab_controller_runtime.js';

import type {
  DesignTabColorSectionModel,
  DesignTabControllerModel,
  DesignTabControllerState,
  DesignTabCorniceSectionModel,
  DesignTabDoorFeaturesSectionModel,
  DesignTabDoorStyleSectionModel,
} from './use_design_tab_controller_contracts.js';

export function useDesignTabControllerSections(args: {
  app: AppContainer;
  fb: UiFeedbackNamespaceLike;
  state: DesignTabControllerState;
}): DesignTabControllerModel {
  const { app, fb, state } = args;

  const colorManager = useDesignTabColorManager({
    app,
    fb,
    savedColorsRaw: state.savedColorsRaw,
    customUploadedDataURL: String(state.customUploadedDataURL || ''),
    colorSwatchesOrderRaw: state.colorSwatchesOrderRaw,
    colorChoice: state.colorChoice,
  });

  const editModes = useDesignTabEditModes({
    app,
    fb,
    groovesEnabled: state.groovesEnabled,
    splitDoors: state.splitDoors,
    removeDoorsEnabled: state.removeDoorsEnabled,
    groovesDirty: state.groovesDirty,
    removedDoorsDirty: state.removedDoorsDirty,
    primaryMode: state.primaryMode,
    splitVariant: state.splitVariant,
  });

  const controllerRuntime = useMemo(
    () =>
      createDesignTabControllerRuntime({
        app,
        setFeatureToggle: editModes.setFeatureToggle,
      }),
    [app, editModes.setFeatureToggle]
  );

  const doorStyleSection = useMemo<DesignTabDoorStyleSectionModel>(
    () => ({ doorStyle: state.doorStyle, setDoorStyle: controllerRuntime.setDoorStyle }),
    [state.doorStyle, controllerRuntime.setDoorStyle]
  );

  const colorSection = useMemo<DesignTabColorSectionModel>(
    () => ({ colorChoice: state.colorChoice, ...colorManager }),
    [state.colorChoice, colorManager]
  );

  const doorFeaturesSection = useMemo<DesignTabDoorFeaturesSectionModel>(
    () => ({
      wardrobeType: state.wardrobeType,
      groovesEnabled: state.groovesEnabled,
      grooveLinesCount: state.grooveLinesCount,
      grooveLinesCountIsAuto: state.grooveLinesCountIsAuto,
      splitDoors: state.splitDoors,
      removeDoorsEnabled: state.removeDoorsEnabled,
      grooveActive: editModes.grooveActive,
      splitActive: editModes.splitActive,
      splitIsCustom: editModes.splitIsCustom,
      removeDoorActive: editModes.removeDoorActive,
      setFeatureToggle: controllerRuntime.setFeatureToggle,
      toggleGrooveEdit: editModes.toggleGrooveEdit,
      setGrooveLinesCount: controllerRuntime.setGrooveLinesCount,
      resetGrooveLinesCount: controllerRuntime.resetGrooveLinesCount,
      toggleSplitEdit: editModes.toggleSplitEdit,
      toggleSplitCustomEdit: editModes.toggleSplitCustomEdit,
      toggleRemoveDoorEdit: editModes.toggleRemoveDoorEdit,
    }),
    [
      state.wardrobeType,
      state.groovesEnabled,
      state.grooveLinesCount,
      state.grooveLinesCountIsAuto,
      state.splitDoors,
      state.removeDoorsEnabled,
      editModes.grooveActive,
      editModes.splitActive,
      editModes.splitIsCustom,
      editModes.removeDoorActive,
      controllerRuntime.setFeatureToggle,
      editModes.toggleGrooveEdit,
      controllerRuntime.setGrooveLinesCount,
      controllerRuntime.resetGrooveLinesCount,
      editModes.toggleSplitEdit,
      editModes.toggleSplitCustomEdit,
      editModes.toggleRemoveDoorEdit,
    ]
  );

  const corniceSection = useMemo<DesignTabCorniceSectionModel>(
    () => ({
      hasCornice: state.hasCornice,
      corniceType: state.corniceType,
      setHasCornice: controllerRuntime.setHasCornice,
      setCorniceType: controllerRuntime.setCorniceType,
    }),
    [state.hasCornice, state.corniceType, controllerRuntime.setHasCornice, controllerRuntime.setCorniceType]
  );

  return useMemo(
    () => ({
      doorStyleSection,
      colorSection,
      doorFeaturesSection,
      corniceSection,
    }),
    [doorStyleSection, colorSection, doorFeaturesSection, corniceSection]
  );
}
