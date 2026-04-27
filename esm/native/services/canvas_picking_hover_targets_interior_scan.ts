import type { UnknownRecord } from '../../../types';
import {
  readModuleHitCandidateFromIntersection,
  readModuleSelectorHit,
} from './canvas_picking_module_selector_hits.js';
import {
  asHitObject,
  type ModuleKey,
  readLocalHitY,
  readParent,
  readPointRecord,
  isRenderableHitObject,
  type ResolveInteriorHoverTargetArgs,
} from './canvas_picking_hover_targets_shared.js';

export type InteriorHoverScanResult = {
  intersects: ReturnType<ResolveInteriorHoverTargetArgs['raycastReuse']>;
  hitModuleKey: ModuleKey;
  hitSelectorObj: import('./canvas_picking_engine.js').HitObjectLike | null;
  hitFallbackObj: import('./canvas_picking_engine.js').HitObjectLike | null;
  hitStack: 'top' | 'bottom';
  hitY: number;
  hitPoint: UnknownRecord | null;
};

export function scanInteriorHoverHit(args: ResolveInteriorHoverTargetArgs): InteriorHoverScanResult | null {
  const {
    App,
    raycaster,
    mouse,
    ndcX,
    ndcY,
    getViewportRoots,
    raycastReuse,
    isViewportRoot,
    toModuleKey,
    projectWorldPointToLocal,
  } = args;

  const { camera, wardrobeGroup } = getViewportRoots(App);
  if (!camera || !wardrobeGroup) return null;

  const intersects = raycastReuse({
    App,
    raycaster,
    mouse,
    camera,
    ndcX,
    ndcY,
    objects: [wardrobeGroup],
    recursive: true,
  });

  let hitModuleKey: ModuleKey | null = null;
  let hitSelectorObj: import('./canvas_picking_engine.js').HitObjectLike | null = null;
  let hitFallbackObj: import('./canvas_picking_engine.js').HitObjectLike | null = null;
  let hitStack: 'top' | 'bottom' = 'top';
  let hitY: number | null = null;
  let hitPoint: UnknownRecord | null = null;

  for (let i = 0; i < intersects.length; i++) {
    const selectorHit = readModuleSelectorHit(intersects[i], toModuleKey);
    if (!selectorHit) continue;
    hitModuleKey = selectorHit.moduleKey;
    hitSelectorObj = selectorHit.object;
    hitFallbackObj = hitSelectorObj;
    hitStack = selectorHit.stack;
    hitPoint = readPointRecord(selectorHit.hit) || null;
    hitY = readLocalHitY({
      App,
      hitPoint: selectorHit.hit.point || null,
      parent: readParent(selectorHit.object),
      projectWorldPointToLocal,
      fallbackY: selectorHit.hitY,
    });
    break;
  }

  if (hitModuleKey == null) {
    for (let i = 0; i < intersects.length && hitModuleKey == null; i++) {
      const hit = intersects[i];
      const obj = asHitObject(hit?.object);
      if (!isRenderableHitObject(obj)) continue;

      const candidate = readModuleHitCandidateFromIntersection({
        hit,
        toModuleKey,
        stopAt: node => isViewportRoot(App, node),
      });
      if (!candidate) continue;

      hitModuleKey = candidate.moduleKey;
      hitFallbackObj = candidate.object;
      hitStack = candidate.stackHint === 'bottom' ? 'bottom' : 'top';
      hitPoint = readPointRecord(hit) || null;
      hitY = readLocalHitY({
        App,
        hitPoint: hit.point || null,
        parent: readParent(candidate.object),
        projectWorldPointToLocal,
        fallbackY: candidate.hitY,
      });
    }
  }

  if (hitModuleKey == null || typeof hitY !== 'number') return null;

  return {
    intersects,
    hitModuleKey,
    hitSelectorObj,
    hitFallbackObj,
    hitStack,
    hitY,
    hitPoint,
  };
}
