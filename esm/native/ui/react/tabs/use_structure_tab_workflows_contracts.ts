import type { ReactElement } from 'react';

import type { AppContainer, MetaActionsNamespaceLike, UiFeedbackNamespaceLike } from '../../../../../types';
import type { BaseLegColor, BaseLegStyle } from '../../../features/base_leg_support.js';
import type { StructureTabNumericKey } from './structure_tab_shared.js';
import type { StructureUiPartial } from './structure_tab_structural_controller_contracts.js';
import type { StructureTabViewState } from './use_structure_tab_view_state_contracts.js';

export type StructureStackLinkField = 'depth' | 'width' | 'doors';

export type UseStructureTabWorkflowsArgs = {
  app: AppContainer;
  meta: MetaActionsNamespaceLike;
  fb: UiFeedbackNamespaceLike | null | undefined;
  state: StructureTabViewState;
  setHingeDirection: (nextOn: boolean, reasonSource: string) => void;
};

export type UseStructureTabWorkflowsResult = {
  commitStructural: (partial: StructureUiPartial, source: string) => void;
  setRaw: (key: StructureTabNumericKey, value: number) => void;
  enterCellDimsMode: (source: string) => void;
  exitCellDimsMode: (source: string) => void;
  renderStackLinkBadge: (field: StructureStackLinkField, isManual: boolean) => ReactElement;
  toggleStackSplit: () => void;
  toggleStackSplitDecorativeSeparator: () => void;
  toggleLibraryMode: () => void;
  toggleLibraryUpperDoors: () => void;
  pickLibraryGlass: (paintId: string) => void;
  resetAllCellDimsOverrides: () => void;
  clearCellDimsWidth: () => void;
  clearCellDimsHeight: () => void;
  clearCellDimsDepth: () => void;
  resetAutoWidth: () => void;
  setBaseType: (next: 'plinth' | 'legs' | 'none') => void;
  setBaseLegStyle: (next: BaseLegStyle) => void;
  setBaseLegColor: (next: BaseLegColor) => void;
  setBaseLegHeightCm: (next: number) => void;
  setBaseLegWidthCm: (next: number) => void;
  setSlidingTracksColor: (next: 'nickel' | 'black') => void;
};
