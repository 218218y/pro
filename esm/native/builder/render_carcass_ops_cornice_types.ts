import type { Object3DLike } from '../../../types';
import type { RenderCarcassRuntime } from './render_carcass_ops_shared.js';

export type CorniceThreeRuntime = NonNullable<RenderCarcassRuntime['THREE']>;

export interface CorniceSegmentMeshArgs {
  THREE: CorniceThreeRuntime;
  seg: import('./render_carcass_ops_shared.js').CorniceSegment;
  segMat: unknown;
}

export interface CorniceMeshPlacementArgs {
  x: number;
  y: number;
  z: number;
  flipX: boolean;
  rotY: number;
  segPid: string;
  fallbackY?: number;
}

export type CorniceMeshLike = Object3DLike & {
  castShadow?: boolean;
  receiveShadow?: boolean;
};
