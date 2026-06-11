import { trackMirrorSurface } from '../runtime/render_access.js';

import type {
  AppContainer,
  AnyMap,
  MirrorTrackableObject,
  Object3DLike,
} from './render_ops_shared_contracts.js';
import { __asObject } from './render_ops_shared_args.js';
import { __asTraversable } from './render_ops_shared_state.js';

function __isMirrorSurfaceByMaterial(obj: MirrorTrackableObject, mirrorMat: unknown): boolean {
  if (!obj || !obj['isMesh']) return false;
  if (!mirrorMat) return false;
  const mat0 = obj['material'];
  if (!mat0) return false;
  if (!Array.isArray(mat0)) return mat0 === mirrorMat;
  for (let i = 0; i < mat0.length; i++) {
    if (mat0[i] === mirrorMat) return true;
  }
  return false;
}

function __pushTrackedMirrorSurface(App: AppContainer, obj: unknown): void {
  trackMirrorSurface(App, obj);
}

export function __tagAndTrackMirrorSurfaces(App: AppContainer, rootObj: unknown, mirrorMat: unknown): number {
  const root = __asObject<Object3DLike>(rootObj);
  if (!root) return 0;

  const seen = new Set<Object3DLike>();
  let count = 0;

  const visit = (candidate: unknown): void => {
    const obj = __asObject<MirrorTrackableObject>(candidate);
    if (!obj || seen.has(obj) || !obj['isMesh']) return;
    seen.add(obj);

    const userData = __asObject<AnyMap>(obj.userData) || {};
    const isTagged = userData['__wpMirrorSurface'] === true;
    const matchesMirrorMat = __isMirrorSurfaceByMaterial(obj, mirrorMat);
    if (!isTagged && !matchesMirrorMat) return;

    obj.userData = userData;
    userData.__wpMirrorSurface = true;
    __pushTrackedMirrorSurface(App, obj);
    count++;
  };

  const traversable = __asTraversable(root);
  if (traversable) {
    try {
      traversable.traverse(visit);
    } catch {
      visit(root);
    }
  } else {
    visit(root);
  }

  return count;
}
