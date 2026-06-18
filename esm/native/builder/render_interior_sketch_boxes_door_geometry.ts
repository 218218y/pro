import {
  DOOR_SYSTEM_DIMENSIONS,
  SKETCH_BOX_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { ResolvedSketchBoxState } from './render_interior_sketch_boxes_shared.js';

import { asValueRecord } from './render_interior_sketch_shared.js';

export function resolveSketchBoxDoorMountMode(input: unknown): 'overlay' | 'inset' {
  const root = asValueRecord(input);
  const cfgSnapshot = asValueRecord(root?.cfgSnapshot);
  return cfgSnapshot?.doorMountMode === 'inset' ? 'inset' : 'overlay';
}

export function resolveSketchBoxInsetReveal(woodThick: number): number {
  return Math.min(DOOR_SYSTEM_DIMENSIONS.hinged.insetRevealM, Math.max(0, woodThick / 3));
}

export function resolveSketchBoxDoorThickness(woodThick: number): number {
  return Math.max(
    SKETCH_BOX_DIMENSIONS.preview.doorThicknessMinM,
    Math.min(
      SKETCH_BOX_DIMENSIONS.preview.doorThicknessMaxM,
      Math.max(woodThick, SKETCH_BOX_DIMENSIONS.preview.doorThicknessMinM)
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
