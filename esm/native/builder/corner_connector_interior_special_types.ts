// Corner connector special interior public contracts.
//
// Keep the public special-interior facade thin while metrics, geometry,
// folded-content planning, and scene emission live in focused owners.

import type {
  CornerConnectorInteriorFlowParams,
  CornerConnectorInteriorEmitters,
} from './corner_connector_interior_shared.js';

export type CornerConnectorSpecialInteriorFlowParams = CornerConnectorInteriorFlowParams & {
  emitters: Pick<CornerConnectorInteriorEmitters, 'emitFoldedClothes'>;
};

export type CornerConnectorSpecialMetrics = {
  depth: number;
  backInset: number;
  sideInset: number;
  floorTopY: number;
  ceilBottomY: number;
  availH: number;
  postHClamped: number;
  needH: number;
  shelf1BottomY: number;
  shelf2BottomY: number;
  wallX: number;
  postX: number;
};

export type FoldedClothesSurfacePlan = {
  x: number;
  y: number;
  z: number;
  width: number;
  maxHeight: number;
  maxDepth: number;
  op: string;
};
