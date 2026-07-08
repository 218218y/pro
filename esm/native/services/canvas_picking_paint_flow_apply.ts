// Canvas picking paint click handling.
//
// Keep the public paint-click contract stable while grouped targets, special
// mirror/glass behavior, and map-diff/history policy live in focused owners.
import { getTools, getUiFeedback } from '../runtime/service_access.js';
import type { CanvasPaintClickArgs } from './canvas_picking_paint_flow_contracts.js';
import { resolveCanvasPaintCommand } from './canvas_picking_paint_command.js';
import { createPaintFlowMutableState } from './canvas_picking_paint_flow_apply_state.js';
import { applyGroupedOrCornerPaintTarget } from './canvas_picking_paint_flow_apply_targets.js';
import { applyPaintPartMutation } from './canvas_picking_paint_flow_apply_special.js';
import { tryHandleDoorStyleOverridePaintClick } from './canvas_picking_paint_flow_apply_door_style.js';
import { commitPaintFlowState } from './canvas_picking_paint_flow_apply_commit.js';
import { isNonPaintableCanvasPaintPartId } from './canvas_picking_paint_part_eligibility.js';

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
  const { App, foundPartId, isPaintMode } = args;

  if (!isPaintMode || !foundPartId) return false;
  if (isNonPaintableCanvasPaintPartId(foundPartId)) return false;

  const tools = getTools(App);
  const paintSelection = typeof tools.getPaintColor === 'function' ? tools.getPaintColor() : null;
  if (!paintSelection) return false;
  const command = resolveCanvasPaintCommand(args, paintSelection);

  const handledDoorStyle = tryHandleDoorStyleOverridePaintClick({
    App,
    command,
  });
  if (handledDoorStyle !== null) return handledDoorStyle;

  const state = createPaintFlowMutableState(App);

  if (command.mutationKind === 'unsupported') {
    notifyUnsupportedMirrorPaintTarget(App, paintSelection === 'mirror' ? 'מראה' : 'זכוכית');
    return true;
  }

  const handledGroupedTarget = applyGroupedOrCornerPaintTarget({
    state,
    command,
  });

  if (!handledGroupedTarget) {
    applyPaintPartMutation({
      state,
      command,
    });
  }

  const summary = commitPaintFlowState({
    App,
    state,
    paintSource: command.sourceTag,
    invalidationKind: command.invalidationKind,
  });
  if (!summary.didChange) return true;

  return true;
}
