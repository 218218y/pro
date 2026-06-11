import { useCallback, useMemo } from 'react';

import { setUiColorChoice } from '../actions/store_actions.js';
import {
  buildOrderedSwatches,
  normalizeColorSwatchesOrder,
  normalizeDesignTabSavedColors,
  type DesignTabColorManagerModel,
  type UseDesignTabColorManagerArgs,
} from './design_tab_color_manager_shared.js';
import {
  getSwatchStyle,
  isSavedColorLocked,
  readSavedColorId,
  readSavedColorName,
  readSavedColorValue,
  resolveDesignTabFeedback,
} from './design_tab_shared.js';
import { useDesignTabCustomColorWorkflow } from './use_design_tab_custom_color_workflow.js';
import { useDesignTabSavedSwatches } from './use_design_tab_saved_swatches.js';

export type { DesignTabColorManagerModel } from './design_tab_color_manager_shared.js';

export function useDesignTabColorManager(args: UseDesignTabColorManagerArgs): DesignTabColorManagerModel {
  const savedColors = useMemo(
    () => normalizeDesignTabSavedColors(args.savedColorsRaw),
    [args.savedColorsRaw]
  );
  const colorSwatchesOrder = useMemo(
    () => normalizeColorSwatchesOrder(args.colorSwatchesOrderRaw),
    [args.colorSwatchesOrderRaw]
  );
  const orderedSwatches = useMemo(
    () => buildOrderedSwatches(savedColors, colorSwatchesOrder),
    [savedColors, colorSwatchesOrder]
  );
  const feedback = useMemo(() => resolveDesignTabFeedback(args.fb), [args.fb]);

  const applyColorChoice = useCallback(
    (choice: string, source = 'react:design:colorChoice') => {
      const value = String(choice || '');
      if (!value || value === String(args.colorChoice || '')) return;
      setUiColorChoice(args.app, value, { source, immediate: true });
    },
    [args.app, args.colorChoice]
  );

  const savedSwatches = useDesignTabSavedSwatches({
    app: args.app,
    colorChoice: args.colorChoice,
    feedback,
    savedColors,
    orderedSwatches,
    applyColorChoice,
  });

  const customWorkflow = useDesignTabCustomColorWorkflow({
    app: args.app,
    colorChoice: args.colorChoice,
    customUploadedDataURL: args.customUploadedDataURL,
    feedback,
    savedColors,
    orderedSwatches,
    applyColorChoice,
  });

  return {
    orderedSwatches,
    ...savedSwatches,
    ...customWorkflow,
    getSwatchStyle,
    isSavedColorLocked,
    readSavedColorId,
    readSavedColorName,
    readSavedColorValue,
  };
}
