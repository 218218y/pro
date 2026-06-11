import type { AppContainer } from '../../../types';
import type { HitObjectLike, RaycastHitLike, RaycasterLike } from './canvas_picking_engine.js';
import type { LocalPoint, ModuleKey } from './canvas_picking_manual_layout_sketch_contracts.js';
import {
  isSpecificCornerCellKey,
  preferModuleSelectorCandidate,
  readModuleSelectorHit,
} from './canvas_picking_module_selector_hits.js';

export type ManualLayoutSketchSelectorHit = {
  moduleKey: ModuleKey;
  obj: HitObjectLike;
  stack: 'top' | 'bottom';
  hitY: number | null;
  hitLocalX: number | null;
};

type ResolveManualLayoutSketchSelectorHitArgs = {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  camera: unknown;
  wardrobeGroup: unknown;
  intersects: RaycastHitLike[];
  raycaster: RaycasterLike;
  mouse: { x: number; y: number };
  toModuleKey: (value: unknown) => ModuleKey | null;
  projectWorldPointToLocal: (
    App: AppContainer,
    point: unknown,
    parent?: unknown
  ) => ({ x?: unknown; z?: unknown } & Record<string, unknown>) | null;
  intersectScreenWithLocalZPlane: (args: {
    App: AppContainer;
    raycaster: RaycasterLike;
    mouse: { x: number; y: number };
    camera: unknown;
    ndcX: number;
    ndcY: number;
    localParent: unknown;
    planeZ: number;
  }) => LocalPoint | null;
};

export function resolvePreferredManualLayoutSketchSelectorHit(
  args: ResolveManualLayoutSketchSelectorHitArgs
): ManualLayoutSketchSelectorHit | null {
  const {
    App,
    ndcX,
    ndcY,
    camera,
    wardrobeGroup,
    intersects,
    raycaster,
    mouse,
    toModuleKey,
    projectWorldPointToLocal,
    intersectScreenWithLocalZPlane,
  } = args;

  let preferredSelector: ManualLayoutSketchSelectorHit | null = null;

  for (let i = 0; i < intersects.length; i++) {
    const selectorHit = readModuleSelectorHit(intersects[i], toModuleKey);
    if (!selectorHit) continue;
    const o = selectorHit.object;

    // Selector-local X must stay in the selector parent's space.
    // Corner cell selectors commonly live under rotated/local wing groups, so
    // projecting to the wardrobe root breaks box remove hover (cursor and box centers
    // end up measured in different coordinate systems).
    const selectorParent = o?.parent ?? wardrobeGroup;
    const localPointInSelectorParent = selectorHit.hit.point
      ? projectWorldPointToLocal(App, selectorHit.hit.point, selectorParent)
      : null;
    const localPointX =
      localPointInSelectorParent && Number.isFinite(Number(localPointInSelectorParent.x))
        ? Number(localPointInSelectorParent.x)
        : null;
    const localPointZ =
      localPointInSelectorParent && Number.isFinite(Number(localPointInSelectorParent.z))
        ? Number(localPointInSelectorParent.z)
        : null;
    const selectorPlaneHit =
      localPointZ != null
        ? intersectScreenWithLocalZPlane({
            App,
            raycaster,
            mouse,
            camera,
            ndcX,
            ndcY,
            localParent: selectorParent,
            planeZ: localPointZ,
          })
        : null;
    const nextHitLocalX =
      selectorPlaneHit && Number.isFinite(Number(selectorPlaneHit.x))
        ? Number(selectorPlaneHit.x)
        : localPointX;

    preferredSelector = preferModuleSelectorCandidate(preferredSelector, {
      moduleKey: selectorHit.moduleKey,
      obj: o,
      stack: selectorHit.stack,
      hitY: selectorHit.hitY,
      hitLocalX: nextHitLocalX,
    });
    if (isSpecificCornerCellKey(selectorHit.moduleKey) || typeof selectorHit.moduleKey === 'number') break;
  }

  return preferredSelector;
}
