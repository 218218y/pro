import type { AppContainer, UnknownRecord } from '../../../types';
import type { HitObjectLike } from './canvas_picking_engine.js';
import {
  type IsViewportRootFn,
  type StrFn,
  __asObject,
  __readParentHitObject,
} from './canvas_picking_door_hover_targets_shared.js';

function __findResolvedDoorGroup(args: {
  App: AppContainer;
  startObject: HitObjectLike;
  targetPartId: string;
  isViewportRoot: IsViewportRootFn;
  str: StrFn;
}): HitObjectLike {
  const { App, startObject, targetPartId, isViewportRoot, str } = args;
  let resolvedGroup: HitObjectLike = startObject;
  let search: HitObjectLike | null = startObject;
  while (search && !isViewportRoot(App, search)) {
    const searchRec = __asObject<UnknownRecord>(search);
    const searchUd = searchRec ? __asObject<UnknownRecord>(searchRec.userData) : null;
    const searchPid = searchUd && searchUd.partId != null ? str(App, searchUd.partId) : '';
    const hasDoorMetrics = !!(
      searchUd &&
      typeof searchUd.__doorWidth === 'number' &&
      typeof searchUd.__doorHeight === 'number'
    );
    if (searchUd && hasDoorMetrics && (searchUd.__wpSketchBoxDoor === true || searchPid === targetPartId)) {
      resolvedGroup = search;
      break;
    }
    search = __readParentHitObject(searchRec);
  }
  return resolvedGroup;
}

export function __resolveDoorGroupForPartId(args: {
  App: AppContainer;
  startObject: HitObjectLike | null;
  targetPartId: string;
  isViewportRoot: IsViewportRootFn;
  str: StrFn;
}): HitObjectLike | null {
  const { App, startObject, targetPartId, isViewportRoot, str } = args;
  let curr: HitObjectLike | null = startObject;
  while (curr && !isViewportRoot(App, curr)) {
    const currRec = __asObject<UnknownRecord>(curr);
    const userData = currRec ? __asObject<UnknownRecord>(currRec.userData) : null;
    const pid = userData && userData.partId != null ? str(App, userData.partId) : '';
    if (pid === targetPartId)
      return __findResolvedDoorGroup({ App, startObject: curr, targetPartId, isViewportRoot, str });
    curr = __readParentHitObject(currRec);
  }
  return null;
}
