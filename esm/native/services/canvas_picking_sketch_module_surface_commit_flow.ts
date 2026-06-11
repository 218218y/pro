import type { CommitSketchModuleSurfaceToolArgs } from './canvas_picking_sketch_module_surface_commit_shared.js';
import { tryCommitSketchModuleSurfaceBoxTool } from './canvas_picking_sketch_module_surface_commit_box.js';
import { tryCommitSketchModuleVerticalContentTool } from './canvas_picking_sketch_module_surface_commit_vertical.js';

export function tryCommitSketchModuleSurfaceTool(args: CommitSketchModuleSurfaceToolArgs): boolean {
  if (tryCommitSketchModuleVerticalContentTool(args)) return true;
  return tryCommitSketchModuleSurfaceBoxTool(args);
}
