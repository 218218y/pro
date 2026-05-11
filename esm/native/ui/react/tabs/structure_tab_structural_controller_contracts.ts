import type { AppContainer, MetaActionsNamespaceLike, UnknownRecord } from '../../../../../types';
import type { BaseLegColor, BaseLegStyle } from '../../../features/base_leg_support.js';

import type { StructureTabNumericKey } from './structure_tab_shared.js';

export type StructureUiPartial = UnknownRecord & {
  structureSelect?: unknown;
  singleDoorPos?: unknown;
};

export type StructureTabStructuralController = {
  commitStructural: (partial: StructureUiPartial, source: string) => void;
  syncSingleDoorPos: () => void;
  syncHingeVisibility: () => void;
  setRaw: (key: StructureTabNumericKey, nextValue: number) => void;
  setStackSplitLowerLinkMode: (field: 'depth' | 'width' | 'doors', nextManual: boolean) => void;
  toggleStackSplit: () => void;
  toggleStackSplitDecorativeSeparator: () => void;
  setBaseType: (next: 'plinth' | 'legs' | 'none') => void;
  setBaseLegStyle: (next: BaseLegStyle) => void;
  setBaseLegColor: (next: BaseLegColor) => void;
  setBasePlinthHeightCm: (next: number) => void;
  setBaseLegHeightCm: (next: number) => void;
  setBaseLegWidthCm: (next: number) => void;
  setSlidingTracksColor: (next: 'nickel' | 'black') => void;
};

export type CreateStructureTabStructuralControllerArgs = {
  app: AppContainer;
  meta: MetaActionsNamespaceLike;
  wardrobeType: string;
  isChestMode: boolean;
  isManualWidth: boolean;
  width: number;
  height: number;
  depth: number;
  doors: number;
  structureSelectRaw: string;
  singleDoorPosRaw: string;
  shouldShowSingleDoor: boolean;
  shouldShowHingeBtn: boolean;
  hingeDirection: boolean;
  chestCommodeEnabled: boolean;
  chestCommodeMirrorWidthManual: boolean;
  stackSplitEnabled: boolean;
  stackSplitDecorativeSeparatorEnabled: boolean;
  stackSplitLowerHeight: number;
  stackSplitLowerDepth: number;
  stackSplitLowerWidth: number;
  stackSplitLowerDoors: number;
  stackSplitLowerDepthManual: boolean;
  stackSplitLowerWidthManual: boolean;
  stackSplitLowerDoorsManual: boolean;
  onSetHingeDirection: (nextOn: boolean, reasonSource: string) => void;
};
