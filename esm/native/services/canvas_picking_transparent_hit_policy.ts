import type { AppContainer, UnknownRecord } from '../../../types';

import { asRecord } from '../runtime/record.js';
import type { HitObjectLike } from './canvas_picking_engine.js';

type IsViewportRootFn = (App: AppContainer, node: unknown) => boolean;

export type CanvasPickingMaterialHitPolicy = {
  visible: boolean;
  fullyTransparent: boolean;
};

function readMaterialRecords(material: unknown): UnknownRecord[] {
  if (Array.isArray(material)) {
    const out: UnknownRecord[] = [];
    for (let i = 0; i < material.length; i += 1) {
      const rec = asRecord(material[i]);
      if (rec) out.push(rec);
    }
    return out;
  }

  const rec = asRecord(material);
  return rec ? [rec] : [];
}

export function readCanvasPickingMaterialHitPolicy(material: unknown): CanvasPickingMaterialHitPolicy {
  const materials = readMaterialRecords(material);
  if (!materials.length) return { visible: true, fullyTransparent: false };

  const visibleMaterials = materials.filter(materialRecord => materialRecord.visible !== false);
  if (!visibleMaterials.length) return { visible: false, fullyTransparent: false };

  return {
    visible: true,
    fullyTransparent: visibleMaterials.every(materialRecord => materialRecord.opacity === 0),
  };
}

export function isCanvasPickingTransparentRestoreTarget(args: {
  App: AppContainer;
  object: unknown;
  isViewportRoot: IsViewportRootFn;
}): boolean {
  const { App, object, isViewportRoot } = args;
  let curr: HitObjectLike | null = asRecord<HitObjectLike>(object);
  while (curr && !isViewportRoot(App, curr)) {
    const userData = asRecord(curr.userData);
    if (userData?.__wpDoorRemoved === true) return true;
    curr = asRecord<HitObjectLike>(curr.parent);
  }
  return false;
}

export function isCanvasPickingMaterialHitEligible(args: {
  App: AppContainer;
  object: unknown;
  isViewportRoot: IsViewportRootFn;
  allowTransparentRestoreTargets?: boolean;
}): boolean {
  const { App, object, isViewportRoot, allowTransparentRestoreTargets = false } = args;
  const objRec = asRecord<{ material?: unknown }>(object);
  if (!objRec) return false;

  const materialPolicy = readCanvasPickingMaterialHitPolicy(objRec.material);
  if (!materialPolicy.visible) return false;
  if (!materialPolicy.fullyTransparent) return true;
  if (!allowTransparentRestoreTargets) return false;

  return isCanvasPickingTransparentRestoreTarget({ App, object, isViewportRoot });
}
