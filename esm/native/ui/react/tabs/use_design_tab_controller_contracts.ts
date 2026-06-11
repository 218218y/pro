import type { FrontColorShelfInheritanceMode } from '../../../features/front_color_shelf_inheritance.js';
import type { DesignTabColorManagerModel } from './use_design_tab_color_manager.js';
import type {
  DesignTabCorniceType,
  DesignTabDoorStyle,
  DesignTabFeatureToggleKey,
  DesignTabModeStateSummary,
} from './design_tab_shared.js';

export type DesignTabDoorStyleSectionModel = {
  doorStyle: DesignTabDoorStyle;
  setDoorStyle: (style: DesignTabDoorStyle) => void;
};

export type DesignTabColorSectionModel = DesignTabColorManagerModel & {
  colorChoice: string;
  frontColorShelfInheritanceMode: FrontColorShelfInheritanceMode;
  toggleFrontColorShelfInheritanceMode: () => void;
};

export type DesignTabDoorFeaturesSectionModel = {
  wardrobeType: string;
  isChestMode: boolean;
  noMainWardrobeActive: boolean;
  groovesEnabled: boolean;
  grooveLinesCount: string;
  grooveLinesCountIsAuto: boolean;
  splitDoors: boolean;
  removeDoorsEnabled: boolean;
  roundedFrameSideShelvesVisible: boolean;
  roundedFrameSideShelvesActive: boolean;
  grooveActive: boolean;
  splitActive: boolean;
  splitIsCustom: boolean;
  removeDoorActive: boolean;
  setFeatureToggle: (key: DesignTabFeatureToggleKey, on: boolean) => void;
  toggleGrooveEdit: () => void;
  setGrooveLinesCount: (count: number) => void;
  resetGrooveLinesCount: () => void;
  toggleSplitEdit: () => void;
  toggleSplitCustomEdit: () => void;
  toggleRemoveDoorEdit: () => void;
  toggleRoundedFrameSideShelves: () => void;
};

export type DesignTabCorniceSectionModel = {
  isChestMode: boolean;
  noMainWardrobeActive: boolean;
  hasCornice: boolean;
  corniceType: DesignTabCorniceType;
  setHasCornice: (checked: boolean) => void;
  setCorniceType: (value: DesignTabCorniceType) => void;
};

export type DesignTabControllerModel = {
  doorStyleSection: DesignTabDoorStyleSectionModel;
  colorSection: DesignTabColorSectionModel;
  doorFeaturesSection: DesignTabDoorFeaturesSectionModel;
  corniceSection: DesignTabCorniceSectionModel;
};

export type DesignTabControllerState = {
  wardrobeType: string;
  savedColorsRaw: unknown;
  customUploadedDataURL: string;
  colorSwatchesOrderRaw: unknown;
  grooveLinesCountOverride: unknown;
  groovesDirty: boolean;
  removedDoorsDirty: boolean;
  leftFrameSideRemoved: boolean;
  rightFrameSideRemoved: boolean;
  leftFrameSideShelvesRounded: boolean;
  rightFrameSideShelvesRounded: boolean;
  doorStyle: DesignTabDoorStyle;
  colorChoice: string;
  frontColorShelfInheritanceMode: FrontColorShelfInheritanceMode;
  isChestMode: boolean;
  noMainWardrobeActive: boolean;
  groovesEnabled: boolean;
  splitDoors: boolean;
  removeDoorsEnabled: boolean;
  hasCornice: boolean;
  corniceType: DesignTabCorniceType;
  grooveLinesCount: string;
  grooveLinesCountIsAuto: boolean;
} & DesignTabModeStateSummary;
