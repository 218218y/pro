import type { AppContainer } from '../../../types';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import type { ModuleKey, ProjectWorldPointToLocalFn } from './canvas_picking_sketch_free_box_contracts.js';

import { getRecordProp } from '../runtime/record.js';

export function getSketchFreeBoxPartPrefix(hostModuleKey: ModuleKey, boxId: unknown): string {
  const moduleKeyStr = hostModuleKey != null ? String(hostModuleKey) : '';
  const bid = boxId != null && boxId !== '' ? String(boxId) : 'box';
  return moduleKeyStr ? `sketch_box_free_${moduleKeyStr}_${bid}` : `sketch_box_free_${bid}`;
}

export function findSketchFreeBoxLocalHit(args: {
  App: AppContainer;
  intersects: RaycastHitLike[];
  localParent: unknown;
  partPrefix: string;
  projectWorldPointToLocal: ProjectWorldPointToLocalFn;
}): { x: number; y: number; z: number } | null {
  const { App, intersects, localParent, partPrefix, projectWorldPointToLocal } = args;
  for (let i = 0; i < intersects.length; i++) {
    const hit = intersects[i];
    const userData = getRecordProp(hit?.object, 'userData');
    const partId = typeof userData?.partId === 'string' ? String(userData.partId) : '';
    if (!partId || (partId !== partPrefix && !partId.startsWith(`${partPrefix}_`))) continue;
    const localPoint = hit?.point ? projectWorldPointToLocal(App, hit.point, localParent) : null;
    if (localPoint) return localPoint;
  }
  return null;
}
