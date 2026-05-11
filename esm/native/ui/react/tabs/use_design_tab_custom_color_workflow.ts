import { useMemo, useRef, useState } from 'react';

import { __designTabReportNonFatal } from './design_tab_multicolor_panel.js';
import type {
  DesignTabCustomColorWorkflowModel,
  UseDesignTabCustomColorWorkflowArgs,
} from './design_tab_color_manager_shared.js';
import {
  createDesignTabCustomColorWorkflowController,
  type PrevCustomState,
} from './design_tab_custom_color_workflow_controller_runtime.js';

export function useDesignTabCustomColorWorkflow(
  args: UseDesignTabCustomColorWorkflowArgs
): DesignTabCustomColorWorkflowModel {
  const {
    app,
    colorChoice,
    customUploadedDataURL,
    feedback,
    savedColors,
    orderedSwatches,
    applyColorChoice,
  } = args;

  const [customOpen, setCustomOpen] = useState(false);
  const [draftColor, setDraftColor] = useState('#d0d4d8');
  const [draftTextureName, setDraftTextureName] = useState('');
  const [draftTextureData, setDraftTextureData] = useState<string | null>(null);

  const prevRef = useRef<PrevCustomState | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const workflowController = useMemo(
    () =>
      createDesignTabCustomColorWorkflowController({
        app,
        colorChoice,
        customUploadedDataURL,
        feedback,
        savedColors,
        orderedSwatches,
        applyColorChoice,
        customOpen,
        draftColor,
        draftTextureData,
        fileRef,
        prevRef,
        setCustomOpen,
        setDraftColor,
        setDraftTextureName,
        setDraftTextureData,
        reportNonFatal: (op, err) => __designTabReportNonFatal(app, op, err),
      }),
    [
      app,
      colorChoice,
      customUploadedDataURL,
      feedback,
      savedColors,
      orderedSwatches,
      applyColorChoice,
      customOpen,
      draftColor,
      draftTextureData,
    ]
  );

  return {
    customOpen,
    draftColor,
    draftTextureName,
    draftTextureData,
    fileRef,
    togglePanelOpen: workflowController.togglePanelOpen,
    openCustom: workflowController.openCustom,
    cancelCustom: workflowController.cancelCustom,
    onPickCustomColor: workflowController.onPickCustomColor,
    onPickTextureFile: workflowController.onPickTextureFile,
    removeTexture: workflowController.removeTexture,
    saveCustom: workflowController.saveCustom,
  };
}
