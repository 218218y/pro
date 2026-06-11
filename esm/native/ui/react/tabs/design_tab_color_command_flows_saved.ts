import { setCfgSavedColors } from '../actions/store_actions.js';

import type { AppContainer } from '../../../../../types';
import type { SavedColor } from './design_tab_multicolor_panel.js';

import type { DesignTabApplyColorChoice } from './design_tab_color_manager_shared.js';
import { applySavedColorsAtomicMutation } from './design_tab_saved_colors_atomic_runtime.js';
import {
  buildSavedColorOrder,
  findSavedColor,
  reorderIds,
  reorderSavedColors,
  toggleLockedSavedColor,
  trimDesignTabColorValue as trim,
} from './design_tab_color_command_shared.js';
import type { DesignTabColorActionResult } from './design_tab_color_action_result.js';
import {
  buildDesignTabColorActionFailure,
  buildDesignTabColorActionSuccess,
} from './design_tab_color_action_result.js';
import type { DeleteSavedColorFlowArgs } from './design_tab_color_command_flows_contracts.js';
import type { DesignTabSwatchReorderPos } from './design_tab_shared.js';
import { readSavedColorId } from './design_tab_shared.js';
import { requestConfirmationFromFeedback } from '../../feedback_confirm_runtime.js';
import { runConfirmedAction } from '../../feedback_action_runtime.js';

export function reorderSavedColorSwatches(
  app: AppContainer,
  savedColors: SavedColor[],
  orderedSwatches: SavedColor[],
  dragId: string,
  overId: string | null,
  pos: DesignTabSwatchReorderPos
): DesignTabColorActionResult | null {
  const ids = buildSavedColorOrder(orderedSwatches);
  const nextIds = reorderIds(ids, dragId, overId, pos);
  if (!nextIds) return null;

  const nextSaved = reorderSavedColors(savedColors, nextIds);
  const sameSavedOrder =
    nextSaved.length === savedColors.length &&
    nextSaved.every((color, index) => readSavedColorId(color) === readSavedColorId(savedColors[index]));

  const meta = { source: 'react:design:colorSwatches:reorder' };
  applySavedColorsAtomicMutation(
    app,
    {
      colorSwatchesOrder: nextIds,
      ...(sameSavedOrder ? {} : { savedColors: nextSaved }),
    },
    meta
  );

  return buildDesignTabColorActionSuccess('reorder-swatches');
}

export function toggleSavedColorLock(
  app: AppContainer,
  savedColors: SavedColor[],
  id: string,
  source = 'react:design:savedColors:toggleLock'
): DesignTabColorActionResult {
  const targetId = trim(id);
  if (!targetId) return buildDesignTabColorActionFailure('toggle-lock', 'missing-selection');

  const existing = findSavedColor(savedColors, targetId);
  if (!existing) return buildDesignTabColorActionFailure('toggle-lock', 'missing', { id: targetId });

  const lockedNow = !!existing.locked;
  const next = toggleLockedSavedColor(savedColors, targetId);

  setCfgSavedColors(app, next, { source });
  return buildDesignTabColorActionSuccess('toggle-lock', {
    id: targetId,
    name: trim(existing.name),
    locked: !lockedNow,
  });
}

export function deleteSavedColor(
  app: AppContainer,
  savedColors: SavedColor[],
  orderedSwatches: SavedColor[],
  colorChoice: string,
  id: string,
  applyColorChoice: DesignTabApplyColorChoice
): DesignTabColorActionResult {
  const targetId = trim(id);
  if (!targetId) return buildDesignTabColorActionFailure('delete-color', 'missing-selection');

  const existing = findSavedColor(savedColors, targetId);
  if (!existing) return buildDesignTabColorActionFailure('delete-color', 'missing', { id: targetId });
  if (existing.locked) {
    return buildDesignTabColorActionFailure('delete-color', 'locked', {
      id: targetId,
      name: trim(existing.name),
    });
  }

  const nextSaved = savedColors.filter(color => trim(color.id) !== targetId);
  const nextOrder = buildSavedColorOrder(orderedSwatches).filter(value => value !== targetId);
  const deletedWasSelected = trim(colorChoice) === targetId;
  const meta = { source: 'react:design:savedColors:delete', immediate: true };

  applySavedColorsAtomicMutation(
    app,
    {
      savedColors: nextSaved,
      colorSwatchesOrder: nextOrder,
      ...(deletedWasSelected ? { colorChoice: '#ffffff' } : {}),
    },
    meta
  );

  void applyColorChoice;

  return buildDesignTabColorActionSuccess('delete-color', {
    id: targetId,
    name: trim(existing.name),
  });
}

export async function runDeleteSavedColorFlow(
  args: DeleteSavedColorFlowArgs
): Promise<DesignTabColorActionResult> {
  const targetId = trim(args.id);
  if (!targetId) return buildDesignTabColorActionFailure('delete-color', 'missing-selection');
  const existing = findSavedColor(args.savedColors, targetId);
  if (!existing) return buildDesignTabColorActionFailure('delete-color', 'missing', { id: targetId });
  if (existing.locked) {
    return buildDesignTabColorActionFailure('delete-color', 'locked', {
      id: targetId,
      name: trim(existing.name),
    });
  }

  return await runConfirmedAction<DesignTabColorActionResult>({
    request: () =>
      requestConfirmationFromFeedback(
        args.feedback,
        'מחיקת גוון',
        `למחוק את "${trim(existing.name) || 'ללא שם'}" מהרשימה?`
      ),
    onRequestError: message =>
      buildDesignTabColorActionFailure(
        'delete-color',
        'error',
        { id: targetId, name: trim(existing.name) },
        message
      ),
    onCancelled: () =>
      buildDesignTabColorActionFailure('delete-color', 'cancelled', {
        id: targetId,
        name: trim(existing.name),
      }),
    runConfirmed: () =>
      deleteSavedColor(
        args.app,
        args.savedColors,
        args.orderedSwatches,
        args.colorChoice,
        targetId,
        args.applyColorChoice
      ),
  });
}
