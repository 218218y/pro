import { exitPrimaryMode } from '../actions/modes_actions.js';
import {
  clampSketch,
  isSketchBoxTool,
  parseSketchBoxTool,
  parseSketchExternalDrawersCount,
  parseSketchExternalDrawersHeightCm,
  parseSketchInternalDrawersHeightCm,
  parseSketchShelfDepthCm,
  parseSketchShelfVariant,
  parseSketchStorageHeightCm,
  readSketchBoxBaseToolSpec,
  readSketchBoxBaseType,
  readSketchBoxCorniceType,
  SKETCH_BOX_HEIGHT_MAX_CM,
  SKETCH_BOX_HEIGHT_MIN_CM,
  SKETCH_BOX_OPTIONAL_DIM_MAX_CM,
  SKETCH_BOX_OPTIONAL_DIM_MIN_CM,
  SKETCH_TOOL_SHELF_PREFIX,
} from './interior_tab_helpers.js';
import {
  patchInteriorSketchShelfDepthDraftMap,
  patchInteriorSketchShelfDepthMap,
} from './interior_tab_view_state_controller_shared.js';
import type {
  CreateInteriorTabViewStateControllerArgs,
  InteriorTabViewStateController,
} from './interior_tab_view_state_controller_contracts.js';

export type InteriorTabSketchViewStateController = Pick<
  InteriorTabViewStateController,
  | 'syncSlidingWardrobeExtDrawerGuard'
  | 'syncSketchShelvesState'
  | 'syncSketchBoxPanelState'
  | 'syncSketchBoxDraftState'
  | 'syncSketchStorageHeightState'
  | 'syncSketchBoxCorniceState'
  | 'syncSketchBoxBaseState'
  | 'syncSketchExtDrawersState'
  | 'syncSketchIntDrawersState'
  | 'syncSketchShelfDepthState'
  | 'syncManualUiToolState'
>;

export function createInteriorTabSketchViewStateController(
  args: Pick<
    CreateInteriorTabViewStateControllerArgs,
    | 'app'
    | 'setSketchShelvesOpen'
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
    | 'setSketchExtDrawersPanelOpen'
    | 'setSketchExtDrawerHeightCm'
    | 'setSketchExtDrawerHeightDraft'
    | 'setSketchIntDrawerHeightCm'
    | 'setSketchIntDrawerHeightDraft'
    | 'setSketchShelfDepthByVariant'
    | 'setSketchShelfDepthDraftByVariant'
    | 'setManualUiTool'
  >
): InteriorTabSketchViewStateController {
  const {
    app,
    setSketchShelvesOpen,
    setSketchBoxPanelOpen,
    setSketchBoxHeightCm,
    setSketchBoxHeightDraft,
    setSketchBoxWidthCm,
    setSketchBoxWidthDraft,
    setSketchBoxDepthCm,
    setSketchBoxDepthDraft,
    setSketchStorageHeightCm,
    setSketchStorageHeightDraft,
    setSketchBoxCorniceType,
    setSketchBoxCornicePanelOpen,
    setSketchBoxBaseType,
    setSketchBoxBasePanelOpen,
    setSketchBoxLegWidthCm,
    setSketchBoxLegWidthDraft,
    setSketchBoxLegStyle,
    setSketchBoxLegColor,
    setSketchBoxLegHeightCm,
    setSketchBoxLegHeightDraft,
    setSketchExtDrawerCount,
    setSketchExtDrawersPanelOpen,
    setSketchExtDrawerHeightCm,
    setSketchExtDrawerHeightDraft,
    setSketchIntDrawerHeightCm,
    setSketchIntDrawerHeightDraft,
    setSketchShelfDepthByVariant,
    setSketchShelfDepthDraftByVariant,
    setManualUiTool,
  } = args;

  return {
    syncSlidingWardrobeExtDrawerGuard(wardrobeType, isExtDrawerMode, modeExtDrawer) {
      if (wardrobeType === 'sliding' && isExtDrawerMode) exitPrimaryMode(app, modeExtDrawer);
    },

    syncSketchShelvesState(isSketchToolActive, manualToolRaw) {
      if (!isSketchToolActive) {
        setSketchShelvesOpen(false);
        return;
      }
      if (manualToolRaw.startsWith(SKETCH_TOOL_SHELF_PREFIX)) setSketchShelvesOpen(true);
    },

    syncSketchBoxPanelState(isSketchToolActive, manualToolRaw) {
      if (!isSketchToolActive || !isSketchBoxTool(manualToolRaw)) return;
      setSketchBoxPanelOpen(true);
    },

    syncSketchBoxDraftState(isSketchToolActive, manualToolRaw) {
      if (!isSketchToolActive) return;
      const spec = parseSketchBoxTool(manualToolRaw);
      if (!spec) return;
      const nextHeight = clampSketch(spec.heightCm, SKETCH_BOX_HEIGHT_MIN_CM, SKETCH_BOX_HEIGHT_MAX_CM);
      const nextWidth =
        typeof spec.widthCm === 'number'
          ? clampSketch(spec.widthCm, SKETCH_BOX_OPTIONAL_DIM_MIN_CM, SKETCH_BOX_OPTIONAL_DIM_MAX_CM)
          : '';
      const nextDepth =
        typeof spec.depthCm === 'number'
          ? clampSketch(spec.depthCm, SKETCH_BOX_OPTIONAL_DIM_MIN_CM, SKETCH_BOX_OPTIONAL_DIM_MAX_CM)
          : '';
      setSketchBoxHeightCm(nextHeight);
      setSketchBoxHeightDraft(String(nextHeight));
      setSketchBoxWidthCm(nextWidth);
      setSketchBoxWidthDraft(typeof nextWidth === 'number' ? String(nextWidth) : '');
      setSketchBoxDepthCm(nextDepth);
      setSketchBoxDepthDraft(typeof nextDepth === 'number' ? String(nextDepth) : '');
    },

    syncSketchStorageHeightState(isSketchToolActive, manualToolRaw) {
      if (!isSketchToolActive) return;
      const nextHeight = parseSketchStorageHeightCm(manualToolRaw);
      if (typeof nextHeight !== 'number') return;
      const next = clampSketch(nextHeight, 5, 120);
      setSketchStorageHeightCm(next);
      setSketchStorageHeightDraft(String(next));
    },

    syncSketchBoxCorniceState(isSketchToolActive, manualToolRaw) {
      if (!isSketchToolActive) return;
      const next = readSketchBoxCorniceType(manualToolRaw);
      if (!next) return;
      setSketchBoxCorniceType(next);
      setSketchBoxCornicePanelOpen(true);
    },

    syncSketchBoxBaseState(isSketchToolActive, manualToolRaw) {
      if (!isSketchToolActive) return;
      const spec = readSketchBoxBaseToolSpec(manualToolRaw);
      const next = spec ? spec.baseType : readSketchBoxBaseType(manualToolRaw);
      if (!next || !spec) return;
      setSketchBoxBaseType(next);
      setSketchBoxLegStyle(spec.baseLegStyle);
      setSketchBoxLegColor(spec.baseLegColor);
      setSketchBoxLegHeightCm(spec.baseLegHeightCm);
      setSketchBoxLegHeightDraft(String(spec.baseLegHeightCm));
      setSketchBoxLegWidthCm(spec.baseLegWidthCm);
      setSketchBoxLegWidthDraft(String(spec.baseLegWidthCm));
      setSketchBoxBasePanelOpen(true);
    },

    syncSketchExtDrawersState(isSketchToolActive, manualToolRaw) {
      if (!isSketchToolActive) return;
      const next = parseSketchExternalDrawersCount(manualToolRaw);
      if (!next) return;
      const nextHeight = parseSketchExternalDrawersHeightCm(manualToolRaw);
      setSketchExtDrawerCount(next);
      if (typeof nextHeight === 'number') {
        setSketchExtDrawerHeightCm(nextHeight);
        setSketchExtDrawerHeightDraft(String(nextHeight));
      }
      setSketchExtDrawersPanelOpen(true);
    },

    syncSketchIntDrawersState(isSketchToolActive, manualToolRaw) {
      if (!isSketchToolActive) return;
      const nextHeight = parseSketchInternalDrawersHeightCm(manualToolRaw);
      if (typeof nextHeight !== 'number') return;
      setSketchIntDrawerHeightCm(nextHeight);
      setSketchIntDrawerHeightDraft(String(nextHeight));
    },

    syncSketchShelfDepthState(isSketchToolActive, manualToolRaw) {
      if (!isSketchToolActive) return;
      const variant = parseSketchShelfVariant(manualToolRaw);
      if (!variant) return;
      const depth = parseSketchShelfDepthCm(manualToolRaw);
      const nextDepth = typeof depth === 'number' ? clampSketch(depth, 5, 120) : '';
      const nextDepthDraft = typeof depth === 'number' && Number.isFinite(depth) ? String(nextDepth) : '';
      setSketchShelfDepthByVariant(prev => patchInteriorSketchShelfDepthMap(prev, variant, nextDepth));
      setSketchShelfDepthDraftByVariant(prev =>
        patchInteriorSketchShelfDepthDraftMap(prev, variant, nextDepthDraft)
      );
    },

    syncManualUiToolState(isManualLayoutMode, manualTool) {
      if (isManualLayoutMode) setManualUiTool(manualTool);
    },
  };
}
