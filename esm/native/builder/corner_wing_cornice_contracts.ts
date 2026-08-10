// Corner wing cornice contracts/helpers.
//
// Keep the public wing cornice owner focused on flow routing while the heavier
// profile builders consume one canonical set of contracts.

import type { CornerCell } from './corner_geometry_plan.js';

export type UnknownRecord = Record<string, unknown>;

export type GroupLike = {
  add(obj: unknown): void;
};

export type CorniceCtxLike = {
  App: unknown;
  THREE: unknown;
  woodThick: number;
  startY: number;
  wingH: number;
  wingD: number;
  wingW: number;
  blindWidth: number;
  baseLegTopPlatformHeightM?: number;
  cornerConnectorActive: boolean;
  hasCorniceEnabled: boolean;
  __corniceAllowedForThisStack: boolean;
  __corniceTypeNorm: string;
  getCornerMat: (partId: string, defaultMaterial: unknown) => unknown;
  bodyMat: unknown;
  addOutlines: (mesh: unknown) => void;
  __sketchMode: boolean;
  wingGroup: GroupLike;
};

export type CorniceLocalsLike = {
  __wingBackPanelThick: number;
  __wingBackPanelCenterZ: number;
  cornerCells?: CornerCell[];
};

export type CorniceParamsLike = {
  ctx: unknown;
  locals: unknown;
};

export function asObject(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  // Do not clone with Object.keys(): THREE.Group/Mesh and the THREE namespace expose
  // important API members such as add(), Shape, Mesh, and ExtrudeGeometry through
  // prototypes or module accessors.  Returning the original record keeps the runtime
  // contract checks aligned with the actual render objects.
  return value as UnknownRecord;
}

export function positiveCorniceTopPlatformHeight(ctx: { baseLegTopPlatformHeightM?: unknown }): number {
  const value = ctx.baseLegTopPlatformHeightM;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

export function resolveCornerWingCorniceTopY(
  ctx: { startY: number; baseLegTopPlatformHeightM?: unknown },
  bodyHeight: number
): number {
  const safeBodyHeight = Number.isFinite(bodyHeight) && bodyHeight > 0 ? bodyHeight : 0;
  return ctx.startY + safeBodyHeight + positiveCorniceTopPlatformHeight(ctx);
}

export function isGroupLike(value: unknown): value is GroupLike {
  const rec = asObject(value);
  return !!rec && typeof rec.add === 'function';
}

export function isCorniceCtxLike(value: unknown): value is CorniceCtxLike {
  const rec = asObject(value);
  return (
    !!rec &&
    typeof rec.getCornerMat === 'function' &&
    typeof rec.addOutlines === 'function' &&
    isGroupLike(rec.wingGroup)
  );
}

export function isCorniceLocalsLike(value: unknown): value is CorniceLocalsLike {
  const rec = asObject(value);
  return (
    !!rec && typeof rec.__wingBackPanelThick === 'number' && typeof rec.__wingBackPanelCenterZ === 'number'
  );
}
