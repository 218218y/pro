import type { DoorStyleMap, DrawerVisualEntryLike, Object3DLike } from '../../../types';

import type {
  InteriorGroupLike,
  InteriorTHREESurface,
  InteriorValueRecord,
} from './render_interior_ops_contracts.js';
import type { ApplySketchExternalDrawersArgs } from './render_interior_sketch_drawers_shared.js';
import type { SketchExternalDrawerExtra } from './render_interior_sketch_shared.js';

export type SketchExternalDrawerRenderContext = ApplySketchExternalDrawersArgs & {
  THREE: InteriorTHREESurface;
  outerW: number;
  outerD: number;
  visualT: number;
  frontZ: number;
  outlineFn: ((value: unknown) => unknown) | null;
  doorStyle: 'flat' | 'profile' | 'tom';
  doorStyleMap: DoorStyleMap;
  drawersArray: DrawerVisualEntryLike[];
  doorFaceTopY: number;
  resolveCachedMirrorMaterial: () => unknown;
  resolvePartMaterial: (partId: string) => unknown;
};

export type SketchExternalDrawerStackPlan = {
  item: SketchExternalDrawerExtra;
  drawerIndex: number;
  drawerCount: number;
  drawerH: number;
  stackH: number;
  centerY: number;
  baseY: number;
  drawerId: string;
  keyPrefix: string;
  drawerFaceW: number;
  drawerFaceOffsetX: number;
  drawerOps: InteriorValueRecord[];
};

export type SketchExternalDrawerOpPlan = {
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
  omitBoxFrontPanel?: boolean;
  omitConnectorPanel?: boolean;
  connectorW: number | null;
  connectorH: number | null;
  connectorD: number | null;
  connectorZ: number;
};

export type SketchExternalDrawerGroupNode = InteriorGroupLike & Object3DLike;
