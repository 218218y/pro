// Canvas picking paint click handling.
//
// Keep the public paint-click contract stable while grouped targets, special
// mirror/glass behavior, and map-diff/history policy live in focused owners.
import { getTools, getUiFeedback } from '../runtime/service_access.js';
import { isAdhesiveGlassValue } from '../features/door_authoring/api.js';
import { getPaintSourceTag, isSpecialPart } from './canvas_picking_paint_flow_shared.js';
import type { CanvasPaintClickArgs } from './canvas_picking_paint_flow_contracts.js';
import { createPaintFlowMutableState } from './canvas_picking_paint_flow_apply_state.js';
import { applyGroupedOrCornerPaintTarget } from './canvas_picking_paint_flow_apply_targets.js';
import {
  applyPaintPartMutation,
  resolveDirectPaintTargetKey,
} from './canvas_picking_paint_flow_apply_special.js';
import { tryHandleDoorStyleOverridePaintClick } from './canvas_picking_paint_flow_apply_door_style.js';
import { commitPaintFlowState } from './canvas_picking_paint_flow_apply_commit.js';
import { isNonPaintableCanvasPaintPartId } from './canvas_picking_paint_part_eligibility.js';
import { readCanvasPaintTargetScopeFromObject } from './canvas_picking_paint_target_scope.js';

function notifyUnsupportedMirrorPaintTarget(App: unknown, label = 'מראה'): void {
  try {
    getUiFeedback(App).toast(
      `${label} זמינה רק על חזיתות/דלתות שתומכות בתוסף דלת, לא על דפנות או גוף הארון.`,
      'info'
    );
  } catch {
    // Feedback is best-effort; the important part is not writing an invalid mirror paint value.
  }
}

export function tryHandleCanvasPaintClick(args: CanvasPaintClickArgs): boolean {
  const { App, foundPartId, effectiveDoorId, foundDrawerId, activeStack: paintStackKey, isPaintMode } = args;

  if (!isPaintMode || !foundPartId) return false;
  if (isNonPaintableCanvasPaintPartId(foundPartId)) return false;

  const tools = getTools(App);
  const paintSelection = typeof tools.getPaintColor === 'function' ? tools.getPaintColor() : null;
  if (!paintSelection) return false;
  const paintSource = getPaintSourceTag(paintSelection, foundPartId);

  const handledDoorStyle = tryHandleDoorStyleOverridePaintClick({
    App,
    foundPartId,
    effectiveDoorId,
    foundDrawerId,
    activeStack: paintStackKey,
    paintSelection,
    paintSource,
  });
  if (handledDoorStyle !== null) return handledDoorStyle;

  const state = createPaintFlowMutableState(App);
  const paintPartKey = resolveDirectPaintTargetKey({
    foundPartId,
    effectiveDoorId,
    foundDrawerId,
    activeStack: paintStackKey,
  });

  if ((paintSelection === 'mirror' || isAdhesiveGlassValue(paintSelection)) && !isSpecialPart(paintPartKey)) {
    notifyUnsupportedMirrorPaintTarget(App, paintSelection === 'mirror' ? 'מראה' : 'זכוכית');
    return true;
  }

  const targetScope = readCanvasPaintTargetScopeFromObject(App, args.primaryHitObject || args.doorHitObject);
  const handledGroupedTarget = applyGroupedOrCornerPaintTarget({
    state,
    foundPartId,
    activeStack: paintStackKey,
    paintSelection,
    targetScope,
  });

  if (!handledGroupedTarget) {
    applyPaintPartMutation({
      state,
      paintPartKey,
      paintSelection,
      clickArgs: args,
    });
  }

  const summary = commitPaintFlowState({
    App,
    state,
    paintSource,
  });
  if (!summary.didChange) return true;

  return true;
}
