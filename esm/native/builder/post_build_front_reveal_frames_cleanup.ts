// Front reveal frame cleanup helpers (Pure ESM)
//
// Owns stale reveal-frame cleanup and local-frame disposal helpers.

import type { Object3DLike } from '../../../types/index.js';

import { getGeometry, type TraversableLike, type ValueRecord } from './post_build_extras_shared.js';

export type FrontRevealCleanupRuntime = {
  cleanupStaleLocalFrames: () => void;
  removeLocalFrames: (root: Object3DLike | null) => void;
};

export type CreateFrontRevealCleanupRuntimeArgs = {
  wardrobeGroup: TraversableLike;
  localName: string;
  reportSoft: (op: string, error: unknown) => void;
};

export function createFrontRevealCleanupRuntime(
  args: CreateFrontRevealCleanupRuntimeArgs
): FrontRevealCleanupRuntime {
  const { wardrobeGroup, localName, reportSoft } = args;

  const disposeGeometryTreeSoft = (root: Object3DLike | null, op: string) => {
    if (!root || typeof root.traverse !== 'function') return;
    try {
      root.traverse((o: Object3DLike & ValueRecord) => {
        const geometry = getGeometry(o);
        if (geometry && typeof geometry.dispose === 'function') geometry.dispose();
      });
    } catch (error) {
      reportSoft(op, error);
    }
  };

  const cleanupStaleLocalFrames = () => {
    try {
      const toRemove: Object3DLike[] = [];
      if (wardrobeGroup.traverse) {
        wardrobeGroup.traverse((obj: Object3DLike) => {
          if (obj && obj.name === localName) toRemove.push(obj);
        });
      }
      for (const obj of toRemove) {
        if (obj && obj.parent) obj.parent.remove(obj);
        disposeGeometryTreeSoft(obj, 'applyFrontRevealFrames.disposeStaleLocalFrames');
      }
    } catch (error) {
      reportSoft('applyFrontRevealFrames.removeStaleLocalFrames', error);
    }
  };

  const removeLocalFrames = (root: Object3DLike | null) => {
    if (!root || typeof root.getObjectByName !== 'function') return;
    while (true) {
      const found = root.getObjectByName(localName);
      if (!found) break;
      if (found.parent) found.parent.remove(found);
      disposeGeometryTreeSoft(found, 'applyFrontRevealFrames.removeLocalFrames.dispose');
    }
  };

  return {
    cleanupStaleLocalFrames,
    removeLocalFrames,
  };
}
