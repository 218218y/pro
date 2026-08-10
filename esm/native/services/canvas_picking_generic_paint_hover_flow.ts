import type { AppContainer, SketchPlacementPreviewArgsLike } from '../../../types';
import { __wp_map } from './canvas_picking_core_helpers.js';
import { resolvePaintPreviewKeysForTarget, resolvePaintTargetKeys } from './canvas_picking_paint_flow.js';
import { resolveCanvasPickingClickHitState } from './canvas_picking_click_hit_flow.js';
import { __wp_getViewportRoots } from './canvas_picking_local_helpers.js';
import {
  __applyCornicePreviewPadding,
  __isCornicePaintKey,
  __readPaintHoverOp,
  __resolvePaintPreviewTargetKeys,
  asMouseVectorLike,
  asRaycasterLike,
  asRecordMap,
  type PaintPreviewGroupBox,
} from './canvas_picking_generic_paint_hover_shared.js';
import { resolveGenericPartPaintTarget } from './canvas_picking_generic_paint_target_resolution.js';
import {
  isAdhesiveGlassValue,
  isDoorStyleOverridePaintToken,
  isGlassPaintSelection,
} from '../features/door_authoring/api.js';
import { resolvePaintPreviewGroupBox } from './canvas_picking_generic_paint_hover_preview.js';
import { isNonPaintableCanvasPaintPartId } from './canvas_picking_paint_part_eligibility.js';
import type {
  PartHoverPreviewCommand,
  PartHoverPreviewDecision,
} from './canvas_picking_part_hover_preview_protocol.js';
import { createPartHoverPreviewRuntime } from './canvas_picking_part_hover_preview_runtime.js';

type PreviewCallback = (args: SketchPlacementPreviewArgsLike) => unknown;

function clearPreviewDecision(
  scope: 'sketch' | 'layout-and-sketch',
  reason:
    'non-paintable-part' | 'target-not-resolved' | 'target-has-no-paint-keys' | 'preview-geometry-unavailable'
): PartHoverPreviewDecision {
  return { type: 'clear', clearScope: scope, reason };
}

function createPaintPreviewCommand(args: {
  previewGroup: PaintPreviewGroupBox;
  op: 'add' | 'remove';
  fillFaces: boolean;
}): PartHoverPreviewCommand {
  const { previewGroup, op, fillFaces } = args;
  const common = {
    anchor: previewGroup.anchor,
    anchorParent: previewGroup.anchorParent,
    op,
    x: previewGroup.centerX,
    y: previewGroup.centerY,
    z: previewGroup.centerZ,
    w: previewGroup.width,
    boxH: previewGroup.height,
    d: previewGroup.depth,
    woodThick: previewGroup.woodThick,
    fillFront: fillFaces,
    fillBack: fillFaces,
    overlayThroughScene: false as const,
  };
  return previewGroup.kind === 'object_boxes'
    ? { ...common, kind: 'object_boxes', previewObjects: previewGroup.previewObjects }
    : { ...common, kind: 'box' };
}

function resolveGenericPartPaintHoverDecision(args: {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  selection: string;
  raycaster: unknown;
  mouse: unknown;
}): PartHoverPreviewDecision | null {
  const { App, ndcX, ndcY, selection, raycaster, mouse } = args;
  const raycasterLike = asRaycasterLike(raycaster);
  const mouseLike = asMouseVectorLike(mouse);
  if (!raycasterLike || !mouseLike) return null;

  const wardrobeGroup = __wp_getViewportRoots(App).wardrobeGroup;
  if (!wardrobeGroup) return null;

  const hitState = resolveCanvasPickingClickHitState({
    App,
    ndcX,
    ndcY,
    isRemoveDoorMode: false,
    raycaster: raycasterLike,
    mouse: mouseLike,
  });
  const primaryHitObject = asRecordMap(hitState?.primaryHitObject);
  const foundPartId = typeof hitState?.foundPartId === 'string' ? String(hitState.foundPartId) : '';
  if (isNonPaintableCanvasPaintPartId(foundPartId)) {
    return clearPreviewDecision('layout-and-sketch', 'non-paintable-part');
  }

  const resolvedTarget = resolveGenericPartPaintTarget({
    App,
    wardrobeGroup,
    primaryHitObject,
    foundPartId,
    intersects: hitState?.intersects,
    primaryHitPoint: hitState?.primaryHitPoint || null,
  });
  if (!resolvedTarget) return clearPreviewDecision('sketch', 'target-not-resolved');

  const targetKeys = resolvePaintTargetKeys(
    resolvedTarget.partId,
    resolvedTarget.stackKey,
    resolvedTarget.targetScope
  );
  if (!targetKeys.length) {
    return clearPreviewDecision('layout-and-sketch', 'target-has-no-paint-keys');
  }

  const groupedPreviewKeys = resolvePaintPreviewKeysForTarget(
    resolvedTarget.partId,
    resolvedTarget.stackKey,
    targetKeys,
    resolvedTarget.targetScope
  );
  const previewTargetKeys = __resolvePaintPreviewTargetKeys(
    resolvedTarget.partId,
    resolvedTarget.stackKey,
    groupedPreviewKeys
  );
  const previewGroupRaw = resolvePaintPreviewGroupBox({
    App,
    wardrobeGroup,
    partKeys: previewTargetKeys,
    anchorObject: resolvedTarget.object,
    anchorParent: resolvedTarget.parent,
  });
  if (!previewGroupRaw) {
    return clearPreviewDecision('layout-and-sketch', 'preview-geometry-unavailable');
  }

  const colors = asRecordMap(__wp_map(App, 'individualColors')) || {};
  const effectiveKeys = targetKeys.length ? targetKeys : [resolvedTarget.partId];
  const isCornicePreview = effectiveKeys.some(__isCornicePaintKey);
  const previewGroup = isCornicePreview ? __applyCornicePreviewPadding(previewGroupRaw) : previewGroupRaw;
  const op = __readPaintHoverOp(colors, effectiveKeys, selection);
  const isGroupedShellPreview = effectiveKeys.length > 1 && !isCornicePreview;

  return {
    type: 'show',
    clearScope: 'layout-and-sketch',
    reason: 'paint-target-resolved',
    command: createPaintPreviewCommand({
      previewGroup,
      op,
      fillFaces: !isGroupedShellPreview && !isCornicePreview,
    }),
  };
}

export function tryHandleGenericPartPaintHover(args: {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  paintSelection: string | null;
  raycaster: unknown;
  mouse: unknown;
  hideLayoutPreview?: PreviewCallback | null;
  hideSketchPreview?: PreviewCallback | null;
  previewRo?: unknown;
}): boolean {
  const {
    App,
    ndcX,
    ndcY,
    paintSelection,
    raycaster,
    mouse,
    hideLayoutPreview,
    hideSketchPreview,
    previewRo,
  } = args;
  const selection = typeof paintSelection === 'string' ? paintSelection.trim() : '';
  if (
    !selection ||
    selection === 'mirror' ||
    isAdhesiveGlassValue(selection) ||
    isGlassPaintSelection(selection) ||
    isDoorStyleOverridePaintToken(selection)
  ) {
    return false;
  }

  const previewRuntime = createPartHoverPreviewRuntime({
    App,
    hideLayoutPreview,
    hideSketchPreview,
    previewRo,
  });
  if (!previewRuntime.canShow) return false;

  const decision = resolveGenericPartPaintHoverDecision({ App, ndcX, ndcY, selection, raycaster, mouse });
  return decision ? previewRuntime.apply(decision) : false;
}
