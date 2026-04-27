import type { AppContainer } from '../../../types';
import type {
  SketchBoxGeometryArgs,
  SketchBoxGeometry,
} from './canvas_picking_manual_layout_sketch_contracts.js';
import { __wp_writeSketchHover } from './canvas_picking_local_helpers.js';
import { type ManualLayoutSketchHoverHost } from './canvas_picking_manual_layout_sketch_hover_state.js';
import { tryCommitSketchModuleSurfaceTool } from './canvas_picking_sketch_module_surface_commit.js';
import { tryCommitSketchModuleStackTool } from './canvas_picking_sketch_module_stack_apply.js';

type RecordMap = Record<string, unknown>;
type ModuleKey = number | 'corner' | `corner:${number}` | null;
type SketchBoxPlacementMetrics = RecordMap & {
  innerW?: number;
  internalCenterX?: number;
  internalDepth?: number;
  internalZ?: number;
  hitLocalX?: number | null;
};

type ManualLayoutSketchClickModeFlowArgs = {
  App: AppContainer;
  __mt: string;
  __activeModuleKey: ModuleKey;
  __isBottomStack: boolean;
  bottomY: number;
  topY: number;
  totalHeight: number;
  hitY0: number;
  pad: number;
  hitYClamped: number;
  yNorm: number;
  woodThick: number;
  __hoverOk: boolean;
  __hoverKind: string;
  __hoverOp: string;
  __hoverRec: RecordMap;
  __patchConfigForKey: (mk: ModuleKey, patchFn: (cfg: RecordMap) => void, meta: RecordMap) => unknown;
  __resolveSketchBoxPlacementMetrics: () => SketchBoxPlacementMetrics;
  __wp_parseSketchBoxToolSpec: (tool: string) => RecordMap | null;
  __wp_resolveSketchBoxGeometry: (args: SketchBoxGeometryArgs) => SketchBoxGeometry;
  __SKETCH_BOX_TOOL_PREFIX: string;
};

export function tryApplyManualLayoutSketchModeClick(args: ManualLayoutSketchClickModeFlowArgs): boolean {
  const {
    App,
    __mt,
    __activeModuleKey,
    __isBottomStack,
    bottomY,
    topY,
    totalHeight,
    hitY0,
    pad,
    hitYClamped,
    yNorm,
    woodThick,
    __hoverOk,
    __hoverKind,
    __hoverOp,
    __hoverRec,
    __patchConfigForKey,
    __resolveSketchBoxPlacementMetrics,
    __wp_parseSketchBoxToolSpec,
    __wp_resolveSketchBoxGeometry,
    __SKETCH_BOX_TOOL_PREFIX,
  } = args;

  const hoverHost: ManualLayoutSketchHoverHost = {
    tool: __mt,
    moduleKey: __activeModuleKey,
    isBottom: __isBottomStack,
  };

  __patchConfigForKey(
    __activeModuleKey,
    (cfg: RecordMap) => {
      if (
        tryCommitSketchModuleSurfaceTool({
          cfg,
          tool: __mt,
          hoverOk: __hoverOk,
          hoverRec: __hoverRec,
          bottomY,
          topY,
          totalHeight,
          hitY0,
          hitYClamped,
          yNorm,
          pad,
          woodThick,
          resolveSketchBoxPlacementMetrics: __resolveSketchBoxPlacementMetrics,
          parseSketchBoxToolSpec: __wp_parseSketchBoxToolSpec,
          resolveSketchBoxGeometry: __wp_resolveSketchBoxGeometry,
          sketchBoxToolPrefix: __SKETCH_BOX_TOOL_PREFIX,
        })
      ) {
        return;
      }

      if (
        tryCommitSketchModuleStackTool({
          App,
          cfg,
          tool: __mt,
          hoverOk: __hoverOk,
          hoverRec: __hoverRec,
          bottomY,
          topY,
          totalHeight,
          pad,
          hitYClamped,
          hoverHost,
          writeSketchHover: __wp_writeSketchHover,
        })
      ) {
        return;
      }
    },
    { source: 'sketch.place', immediate: true }
  );
  return true;
}
