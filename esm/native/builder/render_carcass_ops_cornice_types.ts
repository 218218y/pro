import type { Object3DLike } from '../../../types';
import type { CarcassCorniceSegment } from './carcass_cornice_ir.js';
import type { RenderCarcassRuntime } from './render_carcass_ops_shared.js';

export type CorniceThreeRuntime = NonNullable<RenderCarcassRuntime['THREE']>;

export interface CorniceSegmentMeshArgs<TSegment extends CarcassCorniceSegment = CarcassCorniceSegment> {
  THREE: CorniceThreeRuntime;
  seg: TSegment;
  segMat: unknown;
  getPartMaterial?: RenderCarcassRuntime['getPartMaterial'];
  segPid?: string;
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
