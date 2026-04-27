import { __wp_ui } from './canvas_picking_core_helpers.js';
import { tryHandleCanvasBraceShelvesClick } from './canvas_picking_layout_edit_flow_brace.js';
import { tryHandleCanvasManualLayoutClick } from './canvas_picking_layout_edit_flow_manual.js';
import type {
  CanvasLayoutEditClickArgs,
  LayoutConfigRecordLike,
} from './canvas_picking_layout_edit_flow_shared.js';

export type { CanvasLayoutEditClickArgs } from './canvas_picking_layout_edit_flow_shared.js';

function tryHandleCanvasLayoutPresetClick(args: CanvasLayoutEditClickArgs): boolean {
  const { App, foundModuleIndex, __activeModuleKey, __isLayoutEditMode, __patchConfigForKey } = args;
  if (!__isLayoutEditMode || foundModuleIndex === null) return false;

  const __ui_s3a = __wp_ui(App);
  const __layoutType =
    __ui_s3a && typeof __ui_s3a.currentLayoutType === 'string' ? __ui_s3a.currentLayoutType : 'shelves';

  __patchConfigForKey(
    __activeModuleKey,
    (cfg: LayoutConfigRecordLike) => {
      cfg.layout = __layoutType;
      cfg.isCustom = false;
      cfg.braceShelves = [];
    },
    { source: 'layoutPreset', immediate: true }
  );
  return true;
}

export function tryHandleCanvasLayoutEditClick(args: CanvasLayoutEditClickArgs): boolean {
  if (tryHandleCanvasLayoutPresetClick(args)) return true;
  if (tryHandleCanvasManualLayoutClick(args)) return true;
  if (tryHandleCanvasBraceShelvesClick(args)) return true;
  return false;
}
