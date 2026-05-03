import type { RenderSketchBoxDoorFrontsArgs } from './render_interior_sketch_boxes_fronts_door_contracts.js';
import type { resolveSketchBoxDoorVisualState } from './render_interior_sketch_visuals.js';

import { isCallable } from './render_interior_sketch_shared.js';

export type SketchBoxDoorVisualState = ReturnType<typeof resolveSketchBoxDoorVisualState>;

export type ResolvedSketchBoxDoorVisualMaterials = {
  doorMat: unknown;
  doorFaceMat: unknown;
  doorBaseMat: unknown;
};

export function resolveSketchBoxDoorVisualMaterials(args: {
  renderArgs: RenderSketchBoxDoorFrontsArgs;
  doorPid: string;
  doorVisualState: SketchBoxDoorVisualState;
}): ResolvedSketchBoxDoorVisualMaterials {
  const { renderArgs, doorPid, doorVisualState } = args;
  const { frontsArgs, resolvePartMaterial } = renderArgs;
  const { App, currentShelfMat, bodyMat, THREE, ops } = frontsArgs.args;

  const doorMat = resolvePartMaterial(doorPid, bodyMat);
  let doorFaceMat = doorMat;
  let doorBaseMat = doorMat;

  if (!doorVisualState.isMirror) {
    return { doorMat, doorFaceMat, doorBaseMat };
  }

  const renderOps = ops || {};
  const rawGetMirrorMaterial = renderOps.getMirrorMaterial;
  const getMirrorMaterial = isCallable(rawGetMirrorMaterial)
    ? (opts: unknown) => rawGetMirrorMaterial(opts)
    : null;

  try {
    const resolvedMirrorMat = getMirrorMaterial ? getMirrorMaterial({ App, THREE }) : null;
    if (resolvedMirrorMat) {
      doorFaceMat = resolvedMirrorMat;
      if (doorBaseMat === doorFaceMat) {
        doorBaseMat = bodyMat || currentShelfMat || doorMat;
      }
    }
  } catch {
    doorFaceMat = doorMat;
    doorBaseMat = bodyMat || currentShelfMat || doorMat;
  }

  return { doorMat, doorFaceMat, doorBaseMat };
}
