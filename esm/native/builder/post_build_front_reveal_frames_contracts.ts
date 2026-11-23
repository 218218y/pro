// Front reveal frame runtime contracts (Pure ESM)
//
// Owns the canonical runtime contracts shared by front reveal frame helpers.

import type { AppContainer, Object3DLike, ThreeLike } from '../../../types/index.js';
import type { FrontRevealGeometryRuntime } from './post_build_front_reveal_frames_geometry.js';
import type { LineMaterialLike, TraversableLike } from './post_build_extras_shared.js';

export type FrontRevealFramesRuntime = {
  App: AppContainer;
  THREE: ThreeLike;
  wardrobeGroup: TraversableLike;
  zNudge: number;
  localName: string;
  reportSoft: (op: string, error: unknown) => void;
  cleanupStaleLocalFrames: () => void;
  pickRevealLineMaterial: (root: Object3DLike | null) => LineMaterialLike | null;
  removeLocalFrames: (root: Object3DLike | null) => void;
} & FrontRevealGeometryRuntime;
