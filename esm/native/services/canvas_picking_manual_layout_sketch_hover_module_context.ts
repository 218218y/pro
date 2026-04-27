import type {
  ManualLayoutSketchHoverModuleContext,
  ManualLayoutSketchHoverModuleFlowArgs,
} from './canvas_picking_manual_layout_sketch_hover_module_contracts.js';
import { resolveManualLayoutSketchHoverModuleBaseContext } from './canvas_picking_manual_layout_sketch_hover_module_context_base.js';
import { resolveManualLayoutSketchHoverModuleConfigContext } from './canvas_picking_manual_layout_sketch_hover_module_context_config.js';

export { resolveManualLayoutSketchHoverModuleBaseContext, resolveManualLayoutSketchHoverModuleConfigContext };

export function resolveManualLayoutSketchHoverModuleContext(
  args: ManualLayoutSketchHoverModuleFlowArgs
): ManualLayoutSketchHoverModuleContext | null {
  const base = resolveManualLayoutSketchHoverModuleBaseContext(args);
  if (!base) return null;
  const config = resolveManualLayoutSketchHoverModuleConfigContext({
    App: args.App,
    hitModuleKey: args.hitModuleKey,
    __wp_isCornerKey: args.__wp_isCornerKey,
    __wp_isDefaultCornerCellCfgLike: args.__wp_isDefaultCornerCellCfgLike,
    __wp_findSketchModuleBoxAtPoint: args.__wp_findSketchModuleBoxAtPoint,
    isBottom: base.isBottom,
    hitLocalX: base.hitLocalX,
    yClamped: base.yClamped,
    bottomY: base.bottomY,
    spanH: base.spanH,
    innerW: base.innerW,
    internalCenterX: base.internalCenterX,
    internalDepth: base.internalDepth,
    internalZ: base.internalZ,
    woodThick: base.woodThick,
  });
  return {
    ...args,
    ...base,
    ...config,
  };
}
