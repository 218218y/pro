import { SKETCH_BOX_SHELL_GEOMETRY_POLICY } from '../../shared/dimensions/sketch_box_geometry_policy.js';
import { SKETCH_BOX_DOOR_PREVIEW_POLICY } from '../../shared/dimensions/sketch_box_preview_policy.js';
import type { ResolvedSketchBoxState } from './render_interior_sketch_boxes_shared.js';

import { readSketchBoxDoors, toFiniteNumber } from './render_interior_sketch_shared.js';
import {
  resolveSketchBoxClosedInsetDoorBackZ,
  resolveSketchBoxDoorMountMode,
} from './render_interior_sketch_boxes_door_geometry.js';

export function resolveSketchBoxUsableContentDepth(args: {
  shell: ResolvedSketchBoxState;
  input: unknown;
  woodThick: number;
}): number {
  return resolveSketchBoxContentDepth(
    args,
    Math.max(
      SKETCH_BOX_DOOR_PREVIEW_POLICY.doorBackClearanceMaxM,
      SKETCH_BOX_DOOR_PREVIEW_POLICY.doorPreviewClearanceM
    )
  );
}

export function resolveSketchBoxBraceDepth(args: {
  shell: ResolvedSketchBoxState;
  input: unknown;
  woodThick: number;
}): number {
  return resolveSketchBoxContentDepth(args, 0.0005);
}

function resolveSketchBoxContentDepth(
  args: {
    shell: ResolvedSketchBoxState;
    input: unknown;
    woodThick: number;
  },
  contentClearance: number
): number {
  const { shell, input, woodThick } = args;
  const innerD = toFiniteNumber(shell.geometry.innerD);
  if (innerD == null || !(innerD > 0)) return 0;
  if (resolveSketchBoxDoorMountMode(input) !== 'inset') return innerD;
  if (!readSketchBoxDoors(shell.box).length) return innerD;

  const maxFrontZ = resolveSketchBoxClosedInsetDoorBackZ({ shell, woodThick }) - contentClearance;
  const availableDepth = maxFrontZ - shell.geometry.innerBackZ;
  return Math.max(SKETCH_BOX_SHELL_GEOMETRY_POLICY.minInnerDimensionM, Math.min(innerD, availableDepth));
}

export function resolveSketchBoxUsableContentCenterZ(shell: ResolvedSketchBoxState, depth: number): number {
  return shell.geometry.innerBackZ + Math.max(0, depth) / 2;
}
