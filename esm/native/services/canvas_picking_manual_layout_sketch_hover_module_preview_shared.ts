import { SKETCH_BOX_PREVIEW_CORE_POLICY } from '../../shared/dimensions/sketch_box_preview_policy.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import type { ManualLayoutSketchHoverModuleContext } from './canvas_picking_manual_layout_sketch_hover_module_contracts.js';
import { readNumber } from './canvas_picking_manual_layout_sketch_hover_module_shared.js';

export const REMOVE_EPS_SHELF: number = SKETCH_BOX_PREVIEW_CORE_POLICY.removeEpsShelfM;
export const REMOVE_EPS_BOX: number = SKETCH_BOX_PREVIEW_CORE_POLICY.removeEpsBoxM;

export function createManualLayoutSketchHoverHost(ctx: ManualLayoutSketchHoverModuleContext) {
  const { tool, hitModuleKey, isBottom } = ctx;
  return { tool, moduleKey: hitModuleKey, isBottom };
}

export function resolveManualLayoutSketchHoverPointerX(pointerX: unknown, fallbackX: number): number {
  return readNumber(pointerX) ?? fallbackX;
}

export function writeManualLayoutSketchHoverPreview(
  ctx: ManualLayoutSketchHoverModuleContext,
  args: { hoverRecord?: Record<string, unknown>; preview: Record<string, unknown> | null }
): boolean {
  const { App, hitSelectorObj, hidePreview, setPreview, __wp_writeSketchHover } = ctx;
  if (args.hoverRecord) {
    __wp_writeSketchHover(App, args.hoverRecord);
  }
  if (args.preview && setPreview) {
    setPreview({
      App,
      THREE: getThreeMaybe(App),
      anchor: hitSelectorObj,
      ...args.preview,
    });
  } else if (!args.preview && hidePreview) {
    hidePreview({ App, THREE: getThreeMaybe(App) });
  }
  return true;
}

export function hideManualLayoutSketchHoverPreview(ctx: ManualLayoutSketchHoverModuleContext): boolean {
  const { App, hidePreview } = ctx;
  if (hidePreview) hidePreview({ App, THREE: getThreeMaybe(App) });
  return true;
}
