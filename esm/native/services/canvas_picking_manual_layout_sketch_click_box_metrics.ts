import type { AppContainer } from '../../../types';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import type {
  LocalPoint,
  ModuleKey,
  SelectorLocalBox,
} from './canvas_picking_manual_layout_sketch_contracts.js';
import { resolveSelectorInternalMetrics } from './canvas_picking_selector_internal_metrics.js';
import { findModuleSelectorHit } from './canvas_picking_module_selector_hits.js';

type CreateManualLayoutSketchPlacementMetricsResolverArgs = {
  App: AppContainer;
  intersects: RaycastHitLike[];
  activeModuleKey: ModuleKey | null;
  isBottomStack: boolean;
  gridInfo: Record<string, unknown> | null;
  woodThick: number;
  toModuleKey: (value: unknown) => ModuleKey | null;
  measureObjectLocalBox: (App: AppContainer, obj: unknown, parent?: unknown) => SelectorLocalBox | null;
  projectWorldPointToLocal: (App: AppContainer, point: unknown, parent?: unknown) => LocalPoint | null;
};

export type ManualLayoutSketchPlacementMetrics = {
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  hitLocalX: number | null;
};

export function createManualLayoutSketchPlacementMetricsResolver(
  args: CreateManualLayoutSketchPlacementMetricsResolverArgs
): () => ManualLayoutSketchPlacementMetrics {
  const {
    App,
    intersects,
    activeModuleKey,
    isBottomStack,
    gridInfo,
    woodThick,
    toModuleKey,
    measureObjectLocalBox,
    projectWorldPointToLocal,
  } = args;

  return () => {
    const selectorHit =
      activeModuleKey != null
        ? findModuleSelectorHit({
            intersects,
            moduleKey: activeModuleKey,
            stackKey: isBottomStack ? 'bottom' : 'top',
            toModuleKey,
          })
        : null;
    const selectorObj = selectorHit?.object ?? null;
    const selectorBox = selectorObj ? measureObjectLocalBox(App, selectorObj) : null;
    const selectorParent = selectorObj ? (selectorObj.parent ?? null) : null;
    const selectorLocalPoint = selectorHit?.hit.point
      ? projectWorldPointToLocal(App, selectorHit.hit.point, selectorParent)
      : null;
    const selectorMetrics = resolveSelectorInternalMetrics({
      info: gridInfo,
      selectorEnvelope: selectorBox,
      woodThickFallback: woodThick,
    });
    return {
      innerW: selectorMetrics.innerW,
      internalCenterX: selectorMetrics.internalCenterX,
      internalDepth: selectorMetrics.internalDepth,
      internalZ: selectorMetrics.internalZ,
      hitLocalX:
        selectorLocalPoint && Number.isFinite(Number(selectorLocalPoint.x))
          ? Number(selectorLocalPoint.x)
          : null,
    };
  };
}
