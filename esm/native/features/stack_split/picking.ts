// Stack Split Picking helpers

import type { ThreeLike } from '../../../../types';
import type { Vector3Like } from '../../../../types/three_like';
import type { StackKey } from './stack_split.js';

type StackSplitCameraLike = { updateMatrixWorld?: (force?: boolean) => void } | null | undefined;
type ProjectableVector3Like = Vector3Like & { project?: (camera: unknown) => unknown };
type StackSplitThreeLike = Pick<ThreeLike, 'Vector3'> & {
  Vector3: new (x?: number, y?: number, z?: number) => ProjectableVector3Like;
};

export function projectWorldYToNdcY(
  THREE: StackSplitThreeLike | null | undefined,
  camera: StackSplitCameraLike | null | undefined,
  worldY: number
): number | null {
  try {
    if (!THREE || !camera) return null;
    if (typeof worldY !== 'number' || !Number.isFinite(worldY)) return null;

    try {
      if (typeof camera.updateMatrixWorld === 'function') camera.updateMatrixWorld(true);
    } catch (_) {}

    const v = new THREE.Vector3(0, worldY, 0);
    if (typeof v.project === 'function') v.project(camera);

    const y = v?.y;
    return typeof y === 'number' && Number.isFinite(y) ? y : null;
  } catch (_e) {
    return null;
  }
}

export function desiredStackFromNdcY(ndcY: number, boundaryNdcY: number, eps = 1e-6): StackKey {
  return ndcY <= boundaryNdcY + eps ? 'bottom' : 'top';
}

export function desiredStackFromWorldY(hitWorldY: number, boundaryWorldY: number, eps = 1e-6): StackKey {
  return hitWorldY <= boundaryWorldY + eps ? 'bottom' : 'top';
}

export function computeDesiredStackSplit(args: {
  THREE: StackSplitThreeLike | null | undefined;
  camera: StackSplitCameraLike | null | undefined;
  boundaryWorldY: number;
  ndcY: number | null;
  fallbackHitWorldY: number | null;
}): StackKey | null {
  const { THREE, camera, boundaryWorldY, ndcY, fallbackHitWorldY } = args;

  if (typeof boundaryWorldY !== 'number' || !Number.isFinite(boundaryWorldY)) return null;

  if (typeof ndcY === 'number' && Number.isFinite(ndcY)) {
    const boundaryNdcY = projectWorldYToNdcY(THREE, camera, boundaryWorldY);
    if (typeof boundaryNdcY === 'number') return desiredStackFromNdcY(ndcY, boundaryNdcY);
  }

  if (typeof fallbackHitWorldY === 'number' && Number.isFinite(fallbackHitWorldY)) {
    return desiredStackFromWorldY(fallbackHitWorldY, boundaryWorldY);
  }

  return null;
}
