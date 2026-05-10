import type { CornerCell } from './corner_geometry_plan.js';
import type { AppContainer, UnknownRecord } from '../../../types';

export type NodeLike = {
  position: { set(x: number, y: number, z: number): void };
  userData: UnknownRecord;
  castShadow?: boolean;
  receiveShadow?: boolean;
  renderOrder?: number;
};
export type GroupLike = { add(obj: unknown): void };
export type MeshMaterialLike = UnknownRecord & { clone?: () => MeshMaterialLike; side?: unknown };
export type ThreeWingCarcassLike = {
  Mesh: new (geometry: unknown, material: unknown) => NodeLike;
  BoxGeometry: new (width: number, height: number, depth: number) => unknown;
  MeshBasicMaterial: new (params: {
    color?: number;
    visible?: boolean;
    transparent?: boolean;
    opacity?: number;
  }) => MeshMaterialLike & { depthWrite?: boolean; colorWrite?: boolean };
  DoubleSide?: unknown;
};
export type CornerWingCarcassCtx = {
  THREE: ThreeWingCarcassLike;
  woodThick: number;
  startY: number;
  wingD: number;
  wingW: number;
  activeWidth: number;
  blindWidth: number;
  cornerConnectorEnabled: boolean;
  __mirrorX: number;
  __stackKey: string;
  stackOffsetY: number;
  baseType: string;
  baseH: number;
  cabinetBodyHeight: number;
  __individualColors: UnknownRecord;
  getCornerMat: (partId: string, defaultMaterial: unknown) => unknown;
  bodyMat: unknown;
  backPanelMaterialArray: unknown[];
  addOutlines: (mesh: unknown) => void;
  __sketchMode: boolean;
  wingGroup: GroupLike;
};
export type CornerWingCarcassLocals = {
  App: AppContainer;
  cornerCells: CornerCell[];
  activeFaceCenter: number;
};
export type CornerWingCarcassHelpers = {
  getCfg: (app: AppContainer) => UnknownRecord;
  getInternalGridMap: (app: unknown, isBottomStack?: boolean) => UnknownRecord;
  asRecord: (value: unknown) => UnknownRecord;
  readNumFrom: (obj: unknown, key: string, defaultValue: number) => number;
  readStrFrom: (obj: unknown, key: string, defaultValue?: string) => string;
  cloneMaybe: <T>(value: T) => T;
};
export type CornerWingCarcassFlowParams = {
  ctx: CornerWingCarcassCtx;
  locals: CornerWingCarcassLocals;
  helpers: CornerWingCarcassHelpers;
};

export type CornerWingCarcassResult = {
  __wingBackPanelThick: number;
  __wingBackPanelCenterZ: number;
};

function isMeshMaterialLike(value: unknown): value is MeshMaterialLike {
  return !!value && typeof value === 'object';
}

export function cloneMaterialRecord(
  material: unknown,
  cloneMaybe: <T>(value: T) => T
): MeshMaterialLike | null {
  if (!material || typeof material !== 'object') return null;
  const cloned = cloneMaybe(material);
  return isMeshMaterialLike(cloned) ? cloned : null;
}

export function cloneMaterialWithSide(
  material: unknown,
  side: unknown,
  cloneMaybe: <T>(value: T) => T
): unknown {
  if (!material || typeof material !== 'object') return material;
  const cloned = cloneMaterialRecord(material, cloneMaybe);
  if (!cloned) return material;
  cloned.side = side;
  return cloned;
}
