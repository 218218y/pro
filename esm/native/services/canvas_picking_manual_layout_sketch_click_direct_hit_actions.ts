import type { ManualLayoutSketchDirectHitContext } from './canvas_picking_sketch_direct_hit_workflow.js';
import {
  tryApplySketchDirectHitDrawerActions,
  tryApplySketchDirectHitShelfActions,
} from './canvas_picking_sketch_direct_hit_workflow.js';

export type ManualLayoutSketchClickDirectHitActionsArgs = ManualLayoutSketchDirectHitContext;

export function tryApplyManualLayoutSketchDirectHitActions(
  args: ManualLayoutSketchClickDirectHitActionsArgs
): boolean {
  if (tryApplySketchDirectHitDrawerActions(args)) return true;
  if (tryApplySketchDirectHitShelfActions(args)) return true;
  return false;
}
