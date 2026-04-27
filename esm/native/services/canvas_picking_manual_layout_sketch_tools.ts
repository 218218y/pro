import type { AppContainer, UnknownRecord } from '../../../types';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import type {
  LocalPoint,
  ModuleKey,
  SelectorLocalBox,
  SketchBoxGeometryArgs,
  SketchBoxGeometry,
} from './canvas_picking_manual_layout_sketch_contracts.js';
import { asRecord } from '../runtime/record.js';
import { createManualLayoutSketchPlacementMetricsResolver } from './canvas_picking_manual_layout_sketch_click_box_metrics.js';
import { resolveManualLayoutSketchHoverMatchState } from './canvas_picking_manual_layout_sketch_hover_intent.js';

import { tryApplyManualLayoutSketchHoverClick } from './canvas_picking_manual_layout_sketch_click_hover_apply.js';
import { tryApplyManualLayoutSketchDirectHitActions } from './canvas_picking_manual_layout_sketch_click_direct_hit_actions.js';
import { tryApplyManualLayoutSketchModeClick } from './canvas_picking_manual_layout_sketch_click_mode_flow.js';

type PatchConfigForKeyFn = (
  mk: ModuleKey | 'corner' | null,
  patchFn: (cfg: UnknownRecord) => void,
  meta: UnknownRecord
) => unknown;

type ManualLayoutSketchToolClickArgs = {
  App: AppContainer;
  manualTool: unknown;
  __mt: string;
  __activeModuleKey: ModuleKey | 'corner' | null;
  __isBottomStack: boolean;
  topY: number;
  bottomY: number;
  mapKey: ModuleKey | 'corner' | null;
  __gridMap: UnknownRecord | null;
  moduleHitY: number | null;
  intersects: RaycastHitLike[];
  __patchConfigForKey: PatchConfigForKeyFn;
  __wp_tryCommitSketchFreePlacementFromHover: (App: AppContainer, manualTool: unknown) => boolean;
  __wp_readSketchHover: (App: AppContainer) => UnknownRecord | null;
  __wp_clearSketchHover: (App: AppContainer) => void;
  __wp_toModuleKey: (v: unknown) => ModuleKey | 'corner' | null;
  __wp_measureObjectLocalBox: (App: AppContainer, obj: unknown, parent?: unknown) => SelectorLocalBox | null;
  __wp_projectWorldPointToLocal: (App: AppContainer, point: unknown, parent?: unknown) => LocalPoint | null;
  __wp_parseSketchBoxToolSpec: (tool: string) => UnknownRecord | null;
  __wp_resolveSketchBoxGeometry: (args: SketchBoxGeometryArgs) => SketchBoxGeometry;
  __wp_isViewportRoot: (App: AppContainer, obj: unknown) => boolean;
};

const __SKETCH_BOX_TOOL_PREFIX = 'sketch_box:';

function readFiniteNumber(record: UnknownRecord | null, key: string): number | null {
  const value = record?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function tryHandleManualLayoutSketchToolClick(args: ManualLayoutSketchToolClickArgs): boolean {
  const {
    App,
    manualTool,
    __mt,
    __activeModuleKey,
    __isBottomStack,
    topY,
    bottomY,
    mapKey,
    __gridMap,
    moduleHitY,
    intersects,
    __patchConfigForKey,
    __wp_tryCommitSketchFreePlacementFromHover,
    __wp_readSketchHover,
    __wp_clearSketchHover,
    __wp_toModuleKey,
    __wp_measureObjectLocalBox,
    __wp_projectWorldPointToLocal,
    __wp_parseSketchBoxToolSpec,
    __wp_resolveSketchBoxGeometry,
    __wp_isViewportRoot,
  } = args;
  if (!__mt.startsWith('sketch_')) return false;
  if (__wp_tryCommitSketchFreePlacementFromHover(App, manualTool)) return true;
  const totalHeight = topY - bottomY;
  if (!(totalHeight > 0)) return true;
  const firstHitY = typeof intersects[0]?.point?.y === 'number' ? intersects[0].point.y : null;
  const hitY0 = moduleHitY !== null ? moduleHitY : firstHitY;
  if (typeof hitY0 !== 'number') return true;
  const __gridInfoKey = mapKey != null ? String(mapKey) : '';
  const __gridMapRec = asRecord(__gridMap);
  const __gridInfo = __gridInfoKey && __gridMapRec ? asRecord(__gridMapRec[__gridInfoKey]) : null;
  const woodThick = readFiniteNumber(__gridInfo, 'woodThick') ?? 0.018;
  const __resolveSketchBoxPlacementMetrics = createManualLayoutSketchPlacementMetricsResolver({
    App,
    intersects,
    activeModuleKey: __activeModuleKey,
    isBottomStack: __isBottomStack,
    gridInfo: __gridInfo,
    woodThick,
    toModuleKey: __wp_toModuleKey,
    measureObjectLocalBox: __wp_measureObjectLocalBox,
    projectWorldPointToLocal: __wp_projectWorldPointToLocal,
  });
  const pad = Math.min(0.006, Math.max(0.001, woodThick * 0.2));
  const {
    hoverRec: __hoverRec,
    hoverKind: __hoverKind,
    hoverOp: __hoverOp,
    hoverOk: __hoverOk,
  } = resolveManualLayoutSketchHoverMatchState({
    hover: __wp_readSketchHover(App),
    toModuleKey: __wp_toModuleKey,
    tool: __mt,
    moduleKey: __activeModuleKey,
    isBottom: __isBottomStack,
    now: Date.now(),
    maxAgeMs: 900,
  });
  if (
    tryApplyManualLayoutSketchHoverClick({
      App,
      __activeModuleKey,
      topY,
      bottomY,
      __gridInfo,
      __hoverRec,
      __hoverOk,
      __patchConfigForKey,
      __wp_clearSketchHover,
    })
  )
    return true;
  if (
    tryApplyManualLayoutSketchDirectHitActions({
      App,
      __mt,
      __activeModuleKey,
      topY,
      bottomY,
      mapKey,
      __gridMap: __gridMapRec,
      totalHeight,
      hitY0,
      pad,
      intersects,
      __patchConfigForKey,
      __wp_isViewportRoot,
      __hoverOk,
      __hoverKind,
      __hoverOp,
      __hoverRec,
    })
  )
    return true;
  const hitYClamped = Math.max(bottomY + pad, Math.min(topY - pad, hitY0));
  const yNormRaw = (hitYClamped - bottomY) / totalHeight;
  const yNorm = Math.max(0, Math.min(1, yNormRaw));
  if (
    tryApplyManualLayoutSketchModeClick({
      App,
      __mt,
      __activeModuleKey,
      __isBottomStack,
      bottomY,
      topY,
      totalHeight,
      hitY0,
      pad,
      hitYClamped,
      yNorm,
      woodThick,
      __hoverOk,
      __hoverKind,
      __hoverOp,
      __hoverRec,
      __patchConfigForKey,
      __resolveSketchBoxPlacementMetrics,
      __wp_parseSketchBoxToolSpec,
      __wp_resolveSketchBoxGeometry,
      __SKETCH_BOX_TOOL_PREFIX,
    })
  )
    return true;
  return true;
}
