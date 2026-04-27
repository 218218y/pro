import { setCfgCustomUploadedDataURL } from '../actions/store_actions.js';

import type { AppContainer } from '../../../../../types';

import type { DesignTabApplyColorChoice } from './design_tab_color_manager_shared.js';
import { applySavedColorsAtomicMutation } from './design_tab_saved_colors_atomic_runtime.js';
import {
  buildSavedColorOrder,
  isHexColor,
  nextDefaultColorName,
  nextSavedColorId,
  trimDesignTabColorValue as trim,
} from './design_tab_color_command_shared.js';
import type { DesignTabColorActionResult } from './design_tab_color_action_result.js';
import {
  buildDesignTabColorActionFailure,
  buildDesignTabColorActionSuccess,
} from './design_tab_color_action_result.js';
import type { SaveCustomColorFlowArgs } from './design_tab_color_command_flows_contracts.js';
import { requestPromptFromFeedback } from '../../feedback_prompt_runtime.js';
import { runPromptedAction } from '../../feedback_action_runtime.js';
import type { SavedColor } from './design_tab_multicolor_panel.js';

export function saveCustomColorByName(
  app: AppContainer,
  savedColors: SavedColor[],
  orderedSwatches: SavedColor[],
  draftColor: string,
  draftTextureData: string | null,
  name: string,
  applyColorChoice: DesignTabApplyColorChoice,
  idFactory?: () => string
): DesignTabColorActionResult {
  const trimmedName = trim(name);
  if (!trimmedName) return buildDesignTabColorActionFailure('save-custom-color', 'cancelled');

  const texture = trim(draftTextureData || '');
  const hex = trim(draftColor);
  const isTexture = !!texture;
  if (!isTexture && !isHexColor(hex)) {
    return buildDesignTabColorActionFailure('save-custom-color', 'missing-input');
  }

  const id = nextSavedColorId(idFactory);
  const next: SavedColor[] = savedColors.slice();
  next.push(
    isTexture
      ? { id, name: trimmedName, type: 'texture', value: id, textureData: texture }
      : { id, name: trimmedName, type: 'color', value: hex, textureData: null }
  );

  const nextOrder = buildSavedColorOrder(orderedSwatches)
    .filter(value => value !== id)
    .concat(id);
  const meta = { source: 'react:design:savedColors:add', immediate: true };
  applySavedColorsAtomicMutation(
    app,
    {
      savedColors: next,
      colorSwatchesOrder: nextOrder,
      colorChoice: id,
    },
    meta
  );

  void applyColorChoice;
  return buildDesignTabColorActionSuccess('save-custom-color', {
    id,
    name: trimmedName,
  });
}

export function removeCustomTexture(
  app: AppContainer,
  colorChoice: string,
  draftColor: string,
  applyColorChoice: DesignTabApplyColorChoice
): DesignTabColorActionResult {
  setCfgCustomUploadedDataURL(app, null, { source: 'react:design:custom:removeTexture' });
  const hex = trim(draftColor);
  if (trim(colorChoice) === 'custom') {
    applyColorChoice(isHexColor(hex) ? hex : '#d0d4d8', 'react:design:custom:removeTexture');
  }
  return buildDesignTabColorActionSuccess('remove-texture');
}

export async function runSaveCustomColorFlow(
  args: SaveCustomColorFlowArgs
): Promise<DesignTabColorActionResult> {
  const defaultName = nextDefaultColorName(args.savedColors, !!trim(args.draftTextureData || ''));
  return await runPromptedAction<DesignTabColorActionResult>({
    request: () =>
      requestPromptFromFeedback(args.feedback, 'תן שם לגוון החדש:', defaultName, 'שמירת גוון לא זמינה כרגע'),
    onRequestError: message => buildDesignTabColorActionFailure('save-custom-color', 'error', {}, message),
    onCancelled: () => buildDesignTabColorActionFailure('save-custom-color', 'cancelled'),
    normalizeValue: value => String(value),
    runSubmitted: value =>
      saveCustomColorByName(
        args.app,
        args.savedColors,
        args.orderedSwatches,
        args.draftColor,
        args.draftTextureData,
        value,
        args.applyColorChoice,
        args.idFactory
      ),
  });
}
