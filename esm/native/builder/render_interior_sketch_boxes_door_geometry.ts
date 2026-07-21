import { HINGED_DOOR_MOUNT_POLICY } from '../../shared/dimensions/door_system_policy.js';
import { SKETCH_BOX_DOOR_PREVIEW_POLICY } from '../../shared/dimensions/sketch_box_preview_policy.js';
import type { ResolvedSketchBoxState } from './render_interior_sketch_boxes_shared.js';

import { asValueRecord } from './render_interior_sketch_shared.js';

export function resolveSketchBoxDoorMountMode(input: unknown): 'overlay' | 'inset' {
  const root = asValueRecord(input);
  const cfgSnapshot = asValueRecord(root?.cfgSnapshot);
  return cfgSnapshot?.doorMountMode === 'inset' ? 'inset' : 'overlay';
}

export function resolveSketchBoxInsetReveal(woodThick: number): number {
  return Math.min(HINGED_DOOR_MOUNT_POLICY.insetRevealM, Math.max(0, woodThick / 3));
}

export function resolveSketchBoxDoorThickness(woodThick: number): number {
  return Math.max(
    SKETCH_BOX_DOOR_PREVIEW_POLICY.doorThicknessMinM,
    Math.min(
      SKETCH_BOX_DOOR_PREVIEW_POLICY.doorThicknessMaxM,
      Math.max(woodThick, SKETCH_BOX_DOOR_PREVIEW_POLICY.doorThicknessMinM)
    )
  );
}

export function resolveSketchBoxClosedInsetDoorBackZ(args: {
  shell: ResolvedSketchBoxState;
  woodThick: number;
}): number {
  const { shell, woodThick } = args;
  const doorFrontZ = Number.isFinite(shell.frontZ)
    ? shell.frontZ
    : shell.geometry.centerZ + shell.geometry.outerD / 2;
  return doorFrontZ - resolveSketchBoxDoorThickness(woodThick) - resolveSketchBoxInsetReveal(woodThick);
}
