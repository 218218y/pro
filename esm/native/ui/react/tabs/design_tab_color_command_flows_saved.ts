import { createStructuralMutationMeta } from '../actions/structural_build_refresh_actions.js';

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
import { runSavedColorPerfStep } from './design_tab_saved_colors_perf_runtime.js';

export function reorderSavedColorSwatches(
  app: AppContainer,
  savedColors: SavedColor[],
  orderedSwatches: SavedColor[],
  dragId: string,
  overId: string | null,
  pos: DesignTabSwatchReorderPos
): DesignTabColorActionResult | null {
  const ids = runSavedColorPerfStep(app, 'design.savedColor.reorder.order', () =>
    buildSavedColorOrder(orderedSwatches)
  );
  const nextIds = reorderIds(ids, dragId, overId, pos);
  if (!nextIds) return null;

  const nextSaved = runSavedColorPerfStep(app, 'design.savedColor.reorder.prepare', () =>
    reorderSavedColors(savedColors, nextIds)
  );
  const sameSavedOrder =
    nextSaved.length === savedColors.length &&
    nextSaved.every((color, index) => readSavedColorId(color) === readSavedColorId(savedColors[index]));

  const meta = createStructuralMutationMeta('react:design:colorSwatches:reorder', {
    buildTiming: 'none',
  });
  runSavedColorPerfStep(app, 'design.savedColor.reorder.mutation', () =>
    applySavedColorsAtomicMutation(
      app,
      {
        colorSwatchesOrder: nextIds,
        ...(sameSavedOrder ? {} : { savedColors: nextSaved }),
      },
      meta
    )
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
  const next = runSavedColorPerfStep(app, 'design.savedColor.toggleLock.prepare', () =>
    toggleLockedSavedColor(savedColors, targetId)
  );

  const meta = createStructuralMutationMeta(source, { buildTiming: 'none' });
  runSavedColorPerfStep(app, 'design.savedColor.toggleLock.mutation', () =>
    applySavedColorsAtomicMutation(app, { savedColors: next }, meta)
  );
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

  const nextSaved = runSavedColorPerfStep(app, 'design.savedColor.delete.prepare', () =>
    savedColors.filter(color => trim(color.id) !== targetId)
  );
  const nextOrder = runSavedColorPerfStep(app, 'design.savedColor.delete.order', () =>
    buildSavedColorOrder(orderedSwatches).filter(value => value !== targetId)
  );
  const deletedWasSelected = trim(colorChoice) === targetId;
  const meta = createStructuralMutationMeta('react:design:savedColors:delete', {
    buildTiming: deletedWasSelected ? 'coalesced' : 'none',
  });

  runSavedColorPerfStep(app, 'design.savedColor.delete.mutation', () =>
    applySavedColorsAtomicMutation(
      app,
      {
        savedColors: nextSaved,
        colorSwatchesOrder: nextOrder,
        ...(deletedWasSelected ? { colorChoice: '#ffffff' } : {}),
      },
      meta
    )
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
      runSavedColorPerfStep(args.app, 'design.savedColor.delete.confirm', () =>
        requestConfirmationFromFeedback(
          args.feedback,
          'מחיקת גוון',
          `למחוק את "${trim(existing.name) || 'ללא שם'}" מהרשימה?`
        )
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
