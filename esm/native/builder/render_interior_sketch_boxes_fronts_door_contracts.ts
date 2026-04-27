import type { RenderSketchBoxFrontsArgs } from './render_interior_sketch_boxes_shared.js';
import type {
  SketchBoxDoorPlacement,
  SketchBoxPartMaterialResolver,
  SketchDoorStyle,
  SketchDoorStyleMap,
} from './render_interior_sketch_boxes_fronts_support.js';
import type { InteriorValueRecord } from './render_interior_ops_contracts.js';

export type RenderSketchBoxDoorFrontsArgs = {
  frontsArgs: RenderSketchBoxFrontsArgs;
  doorStyle: SketchDoorStyle;
  doorStyleMap: SketchDoorStyleMap;
  resolvePartMaterial: SketchBoxPartMaterialResolver;
};

export type ResolvedSketchBoxDoorLayout = {
  placement: SketchBoxDoorPlacement;
  doorId: string;
  doorPid: string;
  hingeSide: 'left' | 'right';
  hingeLeft: boolean;
  doorOpen: boolean;
  isCenterDoubleDoorPair: boolean;
  doorW: number;
  doorH: number;
  doorD: number;
  doorZ: number;
  pivotX: number;
  slabLocalX: number;
  sharedDoorUserData: InteriorValueRecord;
  groupUserData: InteriorValueRecord;
};
