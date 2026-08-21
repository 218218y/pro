import type { AppContainer } from '../../../types';

import {
  resolveSketchBoxDoorPatchTargets,
  type SketchBoxDoorTarget,
} from './canvas_picking_door_sketch_box_edit.js';
import { captureSketchBoxDoorTargetSnapshot } from './canvas_picking_door_sketch_box_edit_runtime.js';
import type { SketchBoxPatchTarget } from './canvas_picking_toggle_flow_sketch_box_contracts.js';

function normalizePreferredStack(preferredStack?: string | null): 'top' | 'bottom' {
  return preferredStack === 'bottom' ? 'bottom' : 'top';
}

export function resolveSketchBoxPatchTargets(
  App: AppContainer,
  target: SketchBoxDoorTarget | null,
  preferredStack?: string | null
): SketchBoxPatchTarget[] {
  if (!target?.boxId) return [];
  const snapshot = target.moduleKey ? null : captureSketchBoxDoorTargetSnapshot(App, target);
  return resolveSketchBoxDoorPatchTargets(snapshot, target, normalizePreferredStack(preferredStack));
}
