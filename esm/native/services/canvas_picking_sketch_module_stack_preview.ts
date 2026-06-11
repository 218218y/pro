import type {
  ResolveSketchModuleStackPreviewArgs,
  ResolveSketchModuleStackPreviewResult,
} from './canvas_picking_sketch_module_stack_preview_contracts.js';
import { resolveSketchModuleDrawersPreview } from './canvas_picking_sketch_module_stack_preview_drawers.js';
import { resolveSketchModuleExternalDrawersPreview } from './canvas_picking_sketch_module_stack_preview_ext_drawers.js';

export type {
  ModuleKey,
  RecordMap,
  ResolveSketchModuleStackPreviewArgs,
  ResolveSketchModuleStackPreviewResult,
  SelectorFrontEnvelope,
} from './canvas_picking_sketch_module_stack_preview_contracts.js';

export function resolveSketchModuleStackPreview(
  args: ResolveSketchModuleStackPreviewArgs
): ResolveSketchModuleStackPreviewResult {
  return args.contentKind === 'drawers'
    ? resolveSketchModuleDrawersPreview(args)
    : resolveSketchModuleExternalDrawersPreview(args);
}
