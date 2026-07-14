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

export async function reorderSavedColorSwatches(
  app: AppContainer,
  savedColors: SavedColor[],
  orderedSwatches: SavedColor[],
  dragId: string,
  overId: string | null,
  pos: DesignTabSwatchReorderPos
): Promise<DesignTabColorActionResult | null> {
  const ids = runSavedColorPerfStep(app, 'design.savedColor.reorder.order', () =>
    buildSavedColorOrder(orderedSwatches)
  );
  const nextIds = reorderIds(ids, dragId, overId, pos);
  if (!nextIds) return null;

  const meta = createStructuralMutationMeta('react:design:colorSwatches:reorder', {
    buildTiming: 'none',
  });
  const committed = await runSavedColorPerfStep(app, 'design.savedColor.reorder.mutation', () =>
    applySavedColorsAtomicMutation(
      app,
      current => {
        const currentIds = current.colorSwatchesOrder.length
          ? current.colorSwatchesOrder
          : buildSavedColorOrder(current.savedColors);
        const rebasedIds = reorderIds(currentIds, dragId, overId, pos);
        if (!rebasedIds) return {};
        const rebasedSaved = reorderSavedColors(current.savedColors, rebasedIds);
        const unchanged =
          rebasedSaved.length === current.savedColors.length &&
          rebasedSaved.every(
            (color, index) => readSavedColorId(color) === readSavedColorId(current.savedColors[index])
          );
        return {
          colorSwatchesOrder: rebasedIds,
          ...(unchanged ? {} : { savedColors: rebasedSaved }),
        };
      },
      meta
    )
  );
  if (!committed) return buildDesignTabColorActionFailure('reorder-swatches', 'error');

  void savedColors;
  return buildDesignTabColorActionSuccess('reorder-swatches');
}

export async function toggleSavedColorLock(
  app: AppContainer,
  savedColors: SavedColor[],
  id: string,
  source = 'react:design:savedColors:toggleLock'
): Promise<DesignTabColorActionResult> {
  const targetId = trim(id);
  if (!targetId) return buildDesignTabColorActionFailure('toggle-lock', 'missing-selection');

  const existing = findSavedColor(savedColors, targetId);
  if (!existing) return buildDesignTabColorActionFailure('toggle-lock', 'missing', { id: targetId });

  const lockedNow = !!existing.locked;
  const meta = createStructuralMutationMeta(source, { buildTiming: 'none' });
  const committed = await runSavedColorPerfStep(app, 'design.savedColor.toggleLock.mutation', () =>
    applySavedColorsAtomicMutation(
      app,
      current => ({
        savedColors: runSavedColorPerfStep(app, 'design.savedColor.toggleLock.prepare', () =>
          toggleLockedSavedColor(current.savedColors, targetId)
        ),
      }),
      meta
    )
  );
  if (!committed) return buildDesignTabColorActionFailure('toggle-lock', 'error', { id: targetId });
  return buildDesignTabColorActionSuccess('toggle-lock', {
    id: targetId,
    name: trim(existing.name),
    locked: !lockedNow,
  });
}

export async function deleteSavedColor(
  app: AppContainer,
  savedColors: SavedColor[],
  orderedSwatches: SavedColor[],
  colorChoice: string,
  id: string,
  applyColorChoice: DesignTabApplyColorChoice
): Promise<DesignTabColorActionResult> {
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

  const deletedWasSelected = trim(colorChoice) === targetId;
  const meta = createStructuralMutationMeta('react:design:savedColors:delete', {
    buildTiming: deletedWasSelected ? 'coalesced' : 'none',
  });

  const committed = await runSavedColorPerfStep(app, 'design.savedColor.delete.mutation', () =>
    applySavedColorsAtomicMutation(
      app,
      current => ({
        savedColors: runSavedColorPerfStep(app, 'design.savedColor.delete.prepare', () =>
          current.savedColors.filter(color => trim(color.id) !== targetId)
        ),
        colorSwatchesOrder: runSavedColorPerfStep(app, 'design.savedColor.delete.order', () =>
          current.colorSwatchesOrder.filter(value => value !== targetId)
        ),
        ...(deletedWasSelected ? { colorChoice: '#ffffff' } : {}),
      }),
      meta
    )
  );
  if (!committed) {
    return buildDesignTabColorActionFailure('delete-color', 'error', {
      id: targetId,
      name: trim(existing.name),
    });
  }

  void applyColorChoice;
  void orderedSwatches;

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
