import type { AppContainer } from '../../../../../types';

import type { InteriorTabLocalStateModel } from './interior_tab_local_state_runtime.js';
import type { CreateInteriorTabViewStateControllerArgs } from './interior_tab_view_state_controller_contracts.js';

export type InteriorTabViewStateControllerBindings = Pick<
  InteriorTabLocalStateModel,
  | 'setSketchShelvesOpen'
  | 'setDoorTrimPanelOpen'
  | 'setDoorTrimColor'
  | 'setDoorTrimHorizontalSpan'
  | 'setDoorTrimHorizontalCustomCm'
  | 'setDoorTrimHorizontalCustomDraft'
  | 'setDoorTrimHorizontalCrossCm'
  | 'setDoorTrimHorizontalCrossDraft'
  | 'setDoorTrimVerticalSpan'
  | 'setDoorTrimVerticalCustomCm'
  | 'setDoorTrimVerticalCustomDraft'
  | 'setDoorTrimVerticalCrossCm'
  | 'setDoorTrimVerticalCrossDraft'
  | 'setSketchBoxPanelOpen'
  | 'setSketchBoxHeightCm'
  | 'setSketchBoxHeightDraft'
  | 'setSketchBoxWidthCm'
  | 'setSketchBoxWidthDraft'
  | 'setSketchBoxDepthCm'
  | 'setSketchBoxDepthDraft'
  | 'setSketchStorageHeightCm'
  | 'setSketchStorageHeightDraft'
  | 'setSketchBoxCorniceType'
  | 'setSketchBoxCornicePanelOpen'
  | 'setSketchBoxBaseType'
  | 'setSketchBoxBasePanelOpen'
  | 'setSketchBoxLegWidthCm'
  | 'setSketchBoxLegWidthDraft'
  | 'setSketchBoxLegStyle'
  | 'setSketchBoxLegColor'
  | 'setSketchBoxLegHeightCm'
  | 'setSketchBoxLegHeightDraft'
  | 'setSketchExtDrawerCount'
  | 'setSketchExtDrawerHeightCm'
  | 'setSketchExtDrawerHeightDraft'
  | 'setSketchIntDrawerHeightCm'
  | 'setSketchIntDrawerHeightDraft'
  | 'setSketchExtDrawersPanelOpen'
  | 'setSketchShelfDepthByVariant'
  | 'setSketchShelfDepthDraftByVariant'
  | 'setManualUiTool'
>;

export function createInteriorTabViewStateControllerMemoDeps(
  app: AppContainer,
  bindings: InteriorTabViewStateControllerBindings
): readonly unknown[] {
  return [
    app,
    bindings.setSketchShelvesOpen,
    bindings.setDoorTrimPanelOpen,
    bindings.setDoorTrimColor,
    bindings.setDoorTrimHorizontalSpan,
    bindings.setDoorTrimHorizontalCustomCm,
    bindings.setDoorTrimHorizontalCustomDraft,
    bindings.setDoorTrimHorizontalCrossCm,
    bindings.setDoorTrimHorizontalCrossDraft,
    bindings.setDoorTrimVerticalSpan,
    bindings.setDoorTrimVerticalCustomCm,
    bindings.setDoorTrimVerticalCustomDraft,
    bindings.setDoorTrimVerticalCrossCm,
    bindings.setDoorTrimVerticalCrossDraft,
    bindings.setSketchBoxPanelOpen,
    bindings.setSketchBoxHeightCm,
    bindings.setSketchBoxHeightDraft,
    bindings.setSketchBoxWidthCm,
    bindings.setSketchBoxWidthDraft,
    bindings.setSketchBoxDepthCm,
    bindings.setSketchBoxDepthDraft,
    bindings.setSketchStorageHeightCm,
    bindings.setSketchStorageHeightDraft,
    bindings.setSketchBoxCorniceType,
    bindings.setSketchBoxCornicePanelOpen,
    bindings.setSketchBoxBaseType,
    bindings.setSketchBoxBasePanelOpen,
    bindings.setSketchBoxLegWidthCm,
    bindings.setSketchBoxLegWidthDraft,
    bindings.setSketchBoxLegStyle,
    bindings.setSketchBoxLegColor,
    bindings.setSketchBoxLegHeightCm,
    bindings.setSketchBoxLegHeightDraft,
    bindings.setSketchExtDrawerCount,
    bindings.setSketchExtDrawerHeightCm,
    bindings.setSketchExtDrawerHeightDraft,
    bindings.setSketchIntDrawerHeightCm,
    bindings.setSketchIntDrawerHeightDraft,
    bindings.setSketchExtDrawersPanelOpen,
    bindings.setSketchShelfDepthByVariant,
    bindings.setSketchShelfDepthDraftByVariant,
    bindings.setManualUiTool,
  ];
}

export function createInteriorTabViewStateControllerArgs(
  app: AppContainer,
  bindings: InteriorTabViewStateControllerBindings
): CreateInteriorTabViewStateControllerArgs {
  return {
    app,
    setSketchShelvesOpen: bindings.setSketchShelvesOpen,
    setDoorTrimPanelOpen: bindings.setDoorTrimPanelOpen,
    setDoorTrimColor: bindings.setDoorTrimColor,
    setDoorTrimHorizontalSpan: bindings.setDoorTrimHorizontalSpan,
    setDoorTrimHorizontalCustomCm: bindings.setDoorTrimHorizontalCustomCm,
    setDoorTrimHorizontalCustomDraft: bindings.setDoorTrimHorizontalCustomDraft,
    setDoorTrimHorizontalCrossCm: bindings.setDoorTrimHorizontalCrossCm,
    setDoorTrimHorizontalCrossDraft: bindings.setDoorTrimHorizontalCrossDraft,
    setDoorTrimVerticalSpan: bindings.setDoorTrimVerticalSpan,
    setDoorTrimVerticalCustomCm: bindings.setDoorTrimVerticalCustomCm,
    setDoorTrimVerticalCustomDraft: bindings.setDoorTrimVerticalCustomDraft,
    setDoorTrimVerticalCrossCm: bindings.setDoorTrimVerticalCrossCm,
    setDoorTrimVerticalCrossDraft: bindings.setDoorTrimVerticalCrossDraft,
    setSketchBoxPanelOpen: bindings.setSketchBoxPanelOpen,
    setSketchBoxHeightCm: bindings.setSketchBoxHeightCm,
    setSketchBoxHeightDraft: bindings.setSketchBoxHeightDraft,
    setSketchBoxWidthCm: bindings.setSketchBoxWidthCm,
    setSketchBoxWidthDraft: bindings.setSketchBoxWidthDraft,
    setSketchBoxDepthCm: bindings.setSketchBoxDepthCm,
    setSketchBoxDepthDraft: bindings.setSketchBoxDepthDraft,
    setSketchStorageHeightCm: bindings.setSketchStorageHeightCm,
    setSketchStorageHeightDraft: bindings.setSketchStorageHeightDraft,
    setSketchBoxCorniceType: bindings.setSketchBoxCorniceType,
    setSketchBoxCornicePanelOpen: bindings.setSketchBoxCornicePanelOpen,
    setSketchBoxBaseType: bindings.setSketchBoxBaseType,
    setSketchBoxBasePanelOpen: bindings.setSketchBoxBasePanelOpen,
    setSketchBoxLegWidthCm: bindings.setSketchBoxLegWidthCm,
    setSketchBoxLegWidthDraft: bindings.setSketchBoxLegWidthDraft,
    setSketchBoxLegStyle: bindings.setSketchBoxLegStyle,
    setSketchBoxLegColor: bindings.setSketchBoxLegColor,
    setSketchBoxLegHeightCm: bindings.setSketchBoxLegHeightCm,
    setSketchBoxLegHeightDraft: bindings.setSketchBoxLegHeightDraft,
    setSketchExtDrawerCount: bindings.setSketchExtDrawerCount,
    setSketchExtDrawerHeightCm: bindings.setSketchExtDrawerHeightCm,
    setSketchExtDrawerHeightDraft: bindings.setSketchExtDrawerHeightDraft,
    setSketchIntDrawerHeightCm: bindings.setSketchIntDrawerHeightCm,
    setSketchIntDrawerHeightDraft: bindings.setSketchIntDrawerHeightDraft,
    setSketchExtDrawersPanelOpen: bindings.setSketchExtDrawersPanelOpen,
    setSketchShelfDepthByVariant: bindings.setSketchShelfDepthByVariant,
    setSketchShelfDepthDraftByVariant: bindings.setSketchShelfDepthDraftByVariant,
    setManualUiTool: bindings.setManualUiTool,
  };
}
