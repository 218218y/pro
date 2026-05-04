import type { TagDoorVisualPartFn } from './visuals_and_contents_door_visual_support_contracts.js';
import type {
  AppContainer,
  BuilderDoorVisualFrameStyle,
  Object3DLike,
  ThreeLike,
} from '../../../types/index.js';

export type AddOutlinesFn = (mesh: Object3DLike) => void;
export type DoorVisualGroupLike = Object3DLike;

export type GlassDoorVisualArgs = {
  App: AppContainer;
  THREE: ThreeLike;
  visualGroup: DoorVisualGroupLike;
  addOutlines: AddOutlinesFn;
  tagDoorVisualPart: TagDoorVisualPartFn;
  isSketch: boolean;
  w: number;
  h: number;
  thickness: number;
  mat: unknown;
  curtainType: string | null;
  zSign: number;
  forceCurtainFix: boolean;
  frameStyle?: BuilderDoorVisualFrameStyle | null;
};

export type StyledDoorVisualArgs = {
  App: AppContainer;
  THREE: ThreeLike;
  visualGroup: DoorVisualGroupLike;
  addOutlines: AddOutlinesFn;
  tagDoorVisualPart: TagDoorVisualPartFn;
  w: number;
  h: number;
  thickness: number;
  mat: unknown;
  hasGrooves: boolean;
  groovePartId?: string | null;
  isSketch: boolean;
  zSign: number;
};
