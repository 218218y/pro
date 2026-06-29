import { SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
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
  const { shell, input, woodThick } = args;
  const innerD = toFiniteNumber(shell.geometry.innerD);
  if (innerD == null || !(innerD > 0)) return 0;
  if (resolveSketchBoxDoorMountMode(input) !== 'inset') return innerD;
  if (!readSketchBoxDoors(shell.box).length) return innerD;

  const contentClearance = Math.max(
    SKETCH_BOX_DIMENSIONS.preview.doorBackClearanceMaxM,
    SKETCH_BOX_DIMENSIONS.preview.doorPreviewClearanceM
  );
  const maxFrontZ = resolveSketchBoxClosedInsetDoorBackZ({ shell, woodThick }) - contentClearance;
  const availableDepth = maxFrontZ - shell.geometry.innerBackZ;
  return Math.max(SKETCH_BOX_DIMENSIONS.geometry.minInnerDimensionM, Math.min(innerD, availableDepth));
}

export function resolveSketchBoxUsableContentCenterZ(shell: ResolvedSketchBoxState, depth: number): number {
  return shell.geometry.innerBackZ + Math.max(0, depth) / 2;
}
