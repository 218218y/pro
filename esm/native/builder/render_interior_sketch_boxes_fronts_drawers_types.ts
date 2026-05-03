import type { DrawerVisualEntryLike, Object3DLike } from '../../../types';

import type {
  InteriorGroupLike,
  InteriorTHREESurface,
  InteriorValueRecord,
} from './render_interior_ops_contracts.js';
import type { RenderSketchBoxFrontsArgs } from './render_interior_sketch_boxes_shared.js';
import type {
  SketchBoxPartMaterialResolver,
  SketchDoorStyle,
  SketchDoorStyleMap,
} from './render_interior_sketch_boxes_fronts_support.js';

export type RenderSketchBoxExternalDrawersArgs = {
  frontsArgs: RenderSketchBoxFrontsArgs;
  doorStyle: SketchDoorStyle;
  doorStyleMap: SketchDoorStyleMap;
  resolvePartMaterial: SketchBoxPartMaterialResolver;
};

export type SketchBoxExternalDrawersContext = RenderSketchBoxExternalDrawersArgs & {
  shell: RenderSketchBoxFrontsArgs['shell'];
  resolveBoxDrawerSpan: RenderSketchBoxFrontsArgs['resolveBoxDrawerSpan'];
  App: RenderSketchBoxFrontsArgs['args']['App'];
  input: RenderSketchBoxFrontsArgs['args']['input'];
  group: RenderSketchBoxFrontsArgs['args']['group'];
  woodThick: number;
  moduleIndex: number;
  moduleKeyStr: string;
  createDoorVisual: RenderSketchBoxFrontsArgs['args']['createDoorVisual'];
  THREE: InteriorTHREESurface;
  isFn: RenderSketchBoxFrontsArgs['args']['isFn'];
  boxExtDrawers: InteriorValueRecord[];
  createInternalDrawerBox: unknown;
  outerD: number;
  visualT: number;
  frontZ: number;
  drawersArray: DrawerVisualEntryLike[];
  resolveCachedMirrorMaterial: () => unknown;
  clampDrawerCenterY: (centerY: number, stackH: number) => number;
};

export type SketchBoxExternalDrawerStackPlan = {
  item: InteriorValueRecord;
  drawerIndex: number;
  drawerCount: number;
  drawerH: number;
  stackH: number;
  centerY: number;
  baseY: number;
  drawerId: string;
  keyPrefix: string;
  outerW: number;
  drawerFaceW: number;
  drawerFaceOffsetX: number;
  drawerOps: InteriorValueRecord[];
};

export type SketchBoxExternalDrawerOpPlan = {
  op: InteriorValueRecord;
  closed: InteriorValueRecord | null;
  open: InteriorValueRecord | null;
  opIndex: number;
  px: number;
  py: number;
  pz: number;
  partId: string;
  frontMat: unknown;
  visualW: number;
  faceW: number;
  faceOffsetX: number;
  visualH: number;
  faceOffsetY: number;
  faceMinY: number;
  faceMaxY: number;
  visualD: number;
  boxW: number;
  boxH: number;
  boxD: number;
  boxOffsetZ: number;
  connectorW: number | null;
  connectorH: number | null;
  connectorD: number | null;
  connectorZ: number;
};

export type SketchBoxExternalDrawerGroupNode = InteriorGroupLike & Object3DLike;
