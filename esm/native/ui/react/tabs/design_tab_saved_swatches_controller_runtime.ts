import type { AppContainer } from '../../../../../types';

import { buildPerfEntryOptionsFromActionResult, runPerfAction } from '../../../services/api.js';
import { reportDesignTabColorActionResult } from './design_tab_color_action_feedback.js';
import {
  buildDesignTabColorDeleteFlightKey,
  runDesignTabColorActionSingleFlight,
} from './design_tab_color_action_singleflight.js';
import {
  reorderSavedColorSwatches,
  runDeleteSavedColorFlow,
  toggleSavedColorLock,
} from './design_tab_color_command_flows.js';
import type { DesignTabApplyColorChoice } from './design_tab_color_manager_shared.js';
import type { DesignTabFeedbackApi, DesignTabSwatchReorderPos } from './design_tab_shared.js';
import type { SavedColor } from './design_tab_multicolor_panel.js';
import type { DesignTabColorActionResult } from './design_tab_color_action_result.js';

export type DesignTabSavedSwatchesController = {
  reorderByDnD: (dragId: string, overId: string | null, pos: DesignTabSwatchReorderPos) => void;
  toggleSelectedLock: (selected: SavedColor | null) => void;
  toggleLockById: (id: string) => void;
  deleteSelected: (selected: SavedColor | null) => Promise<DesignTabColorActionResult | undefined>;
};

export type CreateDesignTabSavedSwatchesControllerArgs = {
  app: AppContainer;
  feedback: DesignTabFeedbackApi;
  savedColors: SavedColor[];
  orderedSwatches: SavedColor[];
  colorChoice: string;
  applyColorChoice: DesignTabApplyColorChoice;
};

export function resolveSelectedSavedColor(savedColors: SavedColor[], colorChoice: string): SavedColor | null {
  const key = String(colorChoice || '');
  if (!key || key.indexOf('saved_') !== 0) return null;
  return savedColors.find(color => String(color.id || '') === key) || null;
}

export function createDesignTabSavedSwatchesController(
  args: CreateDesignTabSavedSwatchesControllerArgs
): DesignTabSavedSwatchesController {
  const { app, feedback, savedColors, orderedSwatches, colorChoice, applyColorChoice } = args;

  return {
    reorderByDnD(dragId: string, overId: string | null, pos: DesignTabSwatchReorderPos) {
      reportDesignTabColorActionResult(
        feedback,
        reorderSavedColorSwatches(app, savedColors, orderedSwatches, dragId, overId, pos)
      );
    },

    toggleSelectedLock(selected: SavedColor | null) {
      if (!selected) return;
      reportDesignTabColorActionResult(
        feedback,
        toggleSavedColorLock(
          app,
          savedColors,
          String(selected.id || ''),
          'react:design:savedColors:toggleLock'
        )
      );
    },

    toggleLockById(id: string) {
      reportDesignTabColorActionResult(
        feedback,
        toggleSavedColorLock(app, savedColors, id, 'react:design:savedColors:toggleLock:swatchIcon')
      );
    },

    deleteSelected(selected: SavedColor | null) {
      if (!selected) return Promise.resolve(undefined);
      const targetId = String(selected.id || '');
      return runDesignTabColorActionSingleFlight({
        app,
        key: buildDesignTabColorDeleteFlightKey(targetId),
        onBusy: busyResult => {
          reportDesignTabColorActionResult(feedback, busyResult);
        },
        run: async () => {
          const result = await runPerfAction(
            app,
            'design.savedColor.delete',
            async () =>
              await runDeleteSavedColorFlow({
                app,
                feedback,
                savedColors,
                orderedSwatches,
                colorChoice,
                id: targetId,
                applyColorChoice,
              }),
            {
              resolveEndOptions: actionResult => buildPerfEntryOptionsFromActionResult(actionResult),
            }
          );
          reportDesignTabColorActionResult(feedback, result);
          return result;
        },
      });
    },
  };
}
