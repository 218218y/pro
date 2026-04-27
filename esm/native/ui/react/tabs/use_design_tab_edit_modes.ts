import { useMemo } from 'react';

import type { AppContainer, UiFeedbackNamespaceLike } from '../../../../../types';
import type { DesignTabFeatureToggleKey } from './design_tab_shared.js';
import { getModeConst, resolveDesignTabFeedback } from './design_tab_shared.js';
import {
  createDesignTabEditModesController,
  readDesignTabEditModesState,
} from './design_tab_edit_modes_controller_runtime.js';

type UseDesignTabEditModesArgs = {
  app: AppContainer;
  fb: UiFeedbackNamespaceLike;
  groovesEnabled: boolean;
  splitDoors: boolean;
  removeDoorsEnabled: boolean;
  groovesDirty: boolean;
  removedDoorsDirty: boolean;
  primaryMode: string;
  splitVariant: string;
};

export type DesignTabEditModesModel = {
  grooveActive: boolean;
  splitActive: boolean;
  splitIsCustom: boolean;
  removeDoorActive: boolean;
  setFeatureToggle: (key: DesignTabFeatureToggleKey, on: boolean) => void;
  toggleGrooveEdit: () => void;
  toggleSplitEdit: () => void;
  toggleSplitCustomEdit: () => void;
  toggleRemoveDoorEdit: () => void;
};

export function useDesignTabEditModes(args: UseDesignTabEditModesArgs): DesignTabEditModesModel {
  const MODE_GROOVE_RAW = useMemo(() => getModeConst('GROOVE', 'groove'), []);
  const MODE_SPLIT_RAW = useMemo(() => getModeConst('SPLIT', 'split'), []);
  const MODE_REMOVE_DOOR_RAW = useMemo(() => getModeConst('REMOVE_DOOR', 'remove_door'), []);

  const feedback = useMemo(() => resolveDesignTabFeedback(args.fb), [args.fb]);
  const modeState = useMemo(
    () =>
      readDesignTabEditModesState({
        primaryMode: args.primaryMode,
        splitVariant: args.splitVariant,
        grooveModeId: MODE_GROOVE_RAW,
        splitModeId: MODE_SPLIT_RAW,
        removeDoorModeId: MODE_REMOVE_DOOR_RAW,
      }),
    [args.primaryMode, args.splitVariant, MODE_GROOVE_RAW, MODE_SPLIT_RAW, MODE_REMOVE_DOOR_RAW]
  );

  const controller = useMemo(
    () =>
      createDesignTabEditModesController({
        app: args.app,
        feedback,
        grooveModeId: MODE_GROOVE_RAW,
        splitModeId: MODE_SPLIT_RAW,
        removeDoorModeId: MODE_REMOVE_DOOR_RAW,
        groovesEnabled: args.groovesEnabled,
        splitDoors: args.splitDoors,
        removeDoorsEnabled: args.removeDoorsEnabled,
        groovesDirty: args.groovesDirty,
        removedDoorsDirty: args.removedDoorsDirty,
        grooveActive: modeState.grooveActive,
        splitActive: modeState.splitActive,
        splitIsCustom: modeState.splitIsCustom,
        removeDoorActive: modeState.removeDoorActive,
      }),
    [
      args.app,
      feedback,
      MODE_GROOVE_RAW,
      MODE_SPLIT_RAW,
      MODE_REMOVE_DOOR_RAW,
      args.groovesEnabled,
      args.splitDoors,
      args.removeDoorsEnabled,
      args.groovesDirty,
      args.removedDoorsDirty,
      modeState.grooveActive,
      modeState.splitActive,
      modeState.splitIsCustom,
      modeState.removeDoorActive,
    ]
  );

  return {
    grooveActive: modeState.grooveActive,
    splitActive: modeState.splitActive,
    splitIsCustom: modeState.splitIsCustom,
    removeDoorActive: modeState.removeDoorActive,
    setFeatureToggle: controller.setFeatureToggle,
    toggleGrooveEdit: controller.toggleGrooveEdit,
    toggleSplitEdit: controller.toggleSplitEdit,
    toggleSplitCustomEdit: controller.toggleSplitCustomEdit,
    toggleRemoveDoorEdit: controller.toggleRemoveDoorEdit,
  };
}
