import type { AppContainer } from '../../../../../types';
import { exitPrimaryMode } from '../actions/modes_actions.js';
import {
  enterLayoutMode,
  enterManualLayoutMode,
  toggleBraceShelvesMode,
  setGridDivisions as interiorSetGridDivisions,
  setGridShelfVariant as interiorSetGridShelfVariant,
} from '../actions/interior_actions.js';
import {
  SKETCH_BOX_HEIGHT_MAX_CM,
  SKETCH_BOX_HEIGHT_MIN_CM,
  clampSketch,
  mkSketchBoxBaseTool,
  mkSketchBoxCorniceTool,
  mkSketchBoxTool,
  mkSketchExternalDrawersTool,
  mkSketchInternalDrawersTool,
  mkSketchShelfTool,
} from './interior_tab_helpers.js';
import type {
  LayoutTypeId,
  ManualToolId,
  SketchBoxBaseType,
  SketchBoxCorniceType,
  SketchBoxLegColor,
  SketchBoxLegStyle,
} from './interior_tab_helpers.js';
import {
  CLOSE_DOORS_OPTS,
  type InteriorTabWorkflowController,
  type InteriorTabWorkflowStateLike,
  type InteriorWorkflowModeIds,
} from './interior_tab_workflows_controller_contracts.js';
import { clampInteriorSketchOptionalDim } from './interior_tab_workflows_controller_shared.js';

type CreateInteriorTabManualWorkflowControllerArgs = {
  app: AppContainer;
  state: InteriorTabWorkflowStateLike;
  modeIds: InteriorWorkflowModeIds;
};

type InteriorTabManualWorkflowController = Pick<
  InteriorTabWorkflowController,
  | 'enterLayout'
  | 'exitLayoutOrManual'
  | 'enterManual'
  | 'exitManual'
  | 'setGridDivisions'
  | 'setGridShelfVariant'
  | 'activateManualToolId'
  | 'enterSketchShelfTool'
  | 'enterSketchBoxTool'
  | 'enterSketchBoxCorniceTool'
  | 'enterSketchBoxBaseTool'
  | 'enterSketchExtDrawersTool'
  | 'enterSketchIntDrawersTool'
>;

export function createInteriorTabManualWorkflowController(
  args: CreateInteriorTabManualWorkflowControllerArgs
): InteriorTabManualWorkflowController {
  const { app, state, modeIds } = args;

  const activateManualToolId = (toolId: string) => {
    enterManualLayoutMode(app, toolId);
  };

  const enterSketchShelfTool = (variant: string) => {
    try {
      const draftDepth = state.sketchShelfDepthByVariant[variant];
      const depth = typeof draftDepth === 'number' ? draftDepth : null;
      enterManualLayoutMode(app, mkSketchShelfTool(variant, depth));
    } catch {
      // ignore
    }
  };

  return {
    activateManualToolId,
    enterSketchShelfTool,

    enterSketchBoxTool(heightCm: number, widthCm: number | '', depthCm: number | '') {
      enterManualLayoutMode(
        app,
        mkSketchBoxTool(
          clampSketch(heightCm, SKETCH_BOX_HEIGHT_MIN_CM, SKETCH_BOX_HEIGHT_MAX_CM),
          clampInteriorSketchOptionalDim(widthCm),
          clampInteriorSketchOptionalDim(depthCm)
        )
      );
    },

    enterSketchBoxCorniceTool(type: SketchBoxCorniceType) {
      enterManualLayoutMode(app, mkSketchBoxCorniceTool(type));
    },

    enterSketchBoxBaseTool(
      type: SketchBoxBaseType,
      style: SketchBoxLegStyle,
      color: SketchBoxLegColor,
      heightCm: number,
      widthCm: number
    ) {
      enterManualLayoutMode(app, mkSketchBoxBaseTool(type, style, color, heightCm, widthCm));
    },

    enterSketchExtDrawersTool(count: number, drawerHeightCm: number) {
      activateManualToolId(mkSketchExternalDrawersTool(count, drawerHeightCm));
    },

    enterSketchIntDrawersTool(drawerHeightCm: number) {
      activateManualToolId(mkSketchInternalDrawersTool(drawerHeightCm));
    },

    enterLayout(layoutType: LayoutTypeId) {
      if (layoutType === 'brace_shelves') {
        toggleBraceShelvesMode(app);
        return;
      }
      enterLayoutMode(app, layoutType);
    },

    exitLayoutOrManual() {
      if (state.isManualLayoutMode) {
        exitPrimaryMode(app, modeIds.manualLayout, CLOSE_DOORS_OPTS);
        return;
      }
      if (state.isLayoutMode) {
        exitPrimaryMode(app, modeIds.layout, CLOSE_DOORS_OPTS);
        return;
      }
      if (state.isBraceShelvesMode) {
        exitPrimaryMode(app, modeIds.braceShelves, CLOSE_DOORS_OPTS);
        return;
      }
      if (state.isDoorTrimMode) exitPrimaryMode(app, modeIds.doorTrim, CLOSE_DOORS_OPTS);
    },

    enterManual(tool: ManualToolId) {
      enterManualLayoutMode(app, tool);
    },

    exitManual() {
      exitPrimaryMode(app, modeIds.manualLayout, CLOSE_DOORS_OPTS);
    },

    setGridDivisions(count: number) {
      interiorSetGridDivisions(app, count);
    },

    setGridShelfVariant(variant: 'regular' | 'double' | 'glass' | 'brace') {
      interiorSetGridShelfVariant(app, variant);
    },
  };
}
