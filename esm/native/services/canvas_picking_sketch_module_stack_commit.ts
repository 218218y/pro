import type {
  CommitSketchModuleExternalDrawerArgs,
  CommitSketchModuleInternalDrawerArgs,
  RecordMap,
} from './canvas_picking_sketch_module_stack_commit_contracts.js';
import { commitSketchModuleExternalDrawers } from './canvas_picking_sketch_module_stack_commit_ext_drawers.js';
import { commitSketchModuleInternalDrawers } from './canvas_picking_sketch_module_stack_commit_drawers.js';

export type {
  CommitSketchModuleExternalDrawerArgs,
  CommitSketchModuleInternalDrawerArgs,
  RecordMap,
} from './canvas_picking_sketch_module_stack_commit_contracts.js';

export function commitSketchModuleInternalDrawerStack(
  args: CommitSketchModuleInternalDrawerArgs
): RecordMap | null {
  return commitSketchModuleInternalDrawers(args);
}

export function commitSketchModuleExternalDrawerStack(
  args: CommitSketchModuleExternalDrawerArgs
): RecordMap | null {
  return commitSketchModuleExternalDrawers(args);
}
