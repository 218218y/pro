import type { UnknownRecord } from '../../../types';
import { firstRenderableHitIsSketchFreeBox } from './canvas_picking_sketch_free_box_hit_policy.js';
import {
  findPreferredModuleSelectorHit,
  readModuleHitCandidateFromIntersection,
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
  hitAnchorObj: import('./canvas_picking_engine.js').HitObjectLike | null;
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

  if (firstRenderableHitIsSketchFreeBox(intersects)) return null;

  let hitModuleKey: ModuleKey | null = null;
  let hitSelectorObj: import('./canvas_picking_engine.js').HitObjectLike | null = null;
  let hitAnchorObj: import('./canvas_picking_engine.js').HitObjectLike | null = null;
  let hitStack: 'top' | 'bottom' = 'top';
  let hitY: number | null = null;
  let hitPoint: UnknownRecord | null = null;

  const selectorHit = findPreferredModuleSelectorHit({ intersects, toModuleKey });
  if (selectorHit) {
    hitModuleKey = selectorHit.moduleKey;
    hitSelectorObj = selectorHit.object;
    hitAnchorObj = hitSelectorObj;
    hitStack = selectorHit.stack;
    hitPoint = readPointRecord(selectorHit.hit) || null;
    hitY = readLocalHitY({
      App,
      hitPoint: selectorHit.hit.point || null,
      parent: readParent(selectorHit.object),
      projectWorldPointToLocal,
      defaultY: selectorHit.hitY,
    });
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
      hitAnchorObj = candidate.object;
      hitStack = candidate.stackHint === 'bottom' ? 'bottom' : 'top';
      hitPoint = readPointRecord(hit) || null;
      hitY = readLocalHitY({
        App,
        hitPoint: hit.point || null,
        parent: readParent(candidate.object),
        projectWorldPointToLocal,
        defaultY: candidate.hitY,
      });
    }
  }

  if (hitModuleKey == null || typeof hitY !== 'number') return null;

  return {
    intersects,
    hitModuleKey,
    hitSelectorObj,
    hitAnchorObj,
    hitStack,
    hitY,
    hitPoint,
  };
}
