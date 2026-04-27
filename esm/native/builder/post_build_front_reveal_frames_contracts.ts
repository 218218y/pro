// Front reveal frame runtime contracts (Pure ESM)
//
// Owns the canonical runtime contracts shared by front reveal frame helpers.

import type { AppContainer, Object3DLike, ThreeLike } from '../../../types/index.js';
import type { Box3Like, LineMaterialLike, TraversableLike, ValueRecord } from './post_build_extras_shared.js';

export type FrontRevealFramesRuntime = {
  App: AppContainer;
  THREE: ThreeLike;
  wardrobeGroup: TraversableLike;
  zNudge: number;
  localName: string;
  reportSoft: (op: string, error: unknown) => void;
  cleanupLegacyFrames: () => void;
  cleanupStaleLocalFrames: () => void;
  cleanupLegacySeamHelpers: () => void;
  getRevealZSignOverride: (ud: ValueRecord | null) => number | null;
  getObjectLocalBounds: (root: Object3DLike | null) => Box3Like | null;
  pickRevealLineMaterial: (root: Object3DLike | null) => LineMaterialLike | null;
  buildRectLines: (
    xL: number,
    xR: number,
    yB: number,
    yT: number,
    z: number,
    lineMatOrDual?: LineMaterialLike | 'dual'
  ) => Object3DLike | null;
  removeLocalFrames: (root: Object3DLike | null) => void;
};
