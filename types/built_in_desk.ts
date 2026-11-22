export type BuiltInDeskSide = 'left' | 'right';
export type BuiltInDeskSupport = 'leg' | 'wall';

export type BuiltInDeskOptions = {
  lengthCm: number;
  drawerCount: number;
  support: BuiltInDeskSupport;
};

export type BuiltInDeskPlacement = BuiltInDeskOptions & {
  topNorm: number;
  drawerSide: BuiltInDeskSide;
};

export type BuiltInDeskHostGeometry = {
  leftX: number;
  rightX: number;
  bottomY: number;
  topY: number;
  backZ: number;
  frontZ: number;
  thickness: number;
  preferredDrawerSide?: BuiltInDeskSide;
};

export type BuiltInDeskHost = {
  moduleKey: number | string;
  stack: 'top' | 'bottom';
  boxId?: string;
  boxIsStandalone?: boolean;
  geometry: BuiltInDeskHostGeometry;
};

export type BuiltInDeskBoard = {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
};
