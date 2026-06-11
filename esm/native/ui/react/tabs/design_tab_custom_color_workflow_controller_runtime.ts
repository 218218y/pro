import type { AppContainer } from '../../../../../types';

import { setCfgCustomUploadedDataURL } from '../actions/store_actions.js';
import { buildPerfEntryOptionsFromActionResult, runPerfAction } from '../../../services/api.js';
import { reportDesignTabColorActionResult } from './design_tab_color_action_feedback.js';
import {
  buildDesignTabColorTextureUploadFlightKey,
  DESIGN_TAB_COLOR_ACTION_SAVE_KEY,
  runDesignTabColorActionSingleFlight,
} from './design_tab_color_action_singleflight.js';
import {
  readTextureFileAsDataUrl,
  removeCustomTexture,
  runSaveCustomColorFlow,
} from './design_tab_color_command_flows.js';
import type { DesignTabApplyColorChoice } from './design_tab_color_manager_shared.js';
import type { DesignTabColorActionResult } from './design_tab_color_action_result.js';
import type { DesignTabFeedbackApi } from './design_tab_shared.js';
import type { SavedColor } from './design_tab_multicolor_panel.js';

export type PrevCustomState = { choice: string; customUploaded: string };

export type FileInputLike = { value: string };
export type MutableRefLike<T> = { current: T };
export type CustomColorFileInputRef = MutableRefLike<FileInputLike | null>;
export type CustomColorPrevRef = MutableRefLike<PrevCustomState | null>;
export type NonFatalReporter = (op: string, err: unknown) => void;

export type SetStateLike<T> = (next: T) => void;

export type FilePickEventLike = {
  target?: {
    files?: ArrayLike<Blob | File> | null;
  } | null;
} | null;

export type ColorPickEventLike = {
  target?: {
    value?: unknown;
  } | null;
} | null;

export type DesignTabCustomColorWorkflowController = {
  openCustom: () => void;
  cancelCustom: () => void;
  togglePanelOpen: () => void;
  onPickCustomColor: (event: ColorPickEventLike) => void;
  onPickTextureFile: (event: FilePickEventLike) => Promise<DesignTabColorActionResult>;
  removeTexture: () => void;
  saveCustom: () => Promise<DesignTabColorActionResult>;
};

export type CreateDesignTabCustomColorWorkflowControllerArgs = {
  app: AppContainer;
  colorChoice: string;
  customUploadedDataURL: string;
  feedback: DesignTabFeedbackApi;
  savedColors: SavedColor[];
  orderedSwatches: SavedColor[];
  applyColorChoice: DesignTabApplyColorChoice;
  customOpen: boolean;
  draftColor: string;
  draftTextureData: string | null;
  fileRef: CustomColorFileInputRef;
  prevRef: CustomColorPrevRef;
  setCustomOpen: SetStateLike<boolean>;
  setDraftColor: SetStateLike<string>;
  setDraftTextureName: SetStateLike<string>;
  setDraftTextureData: SetStateLike<string | null>;
  reportNonFatal?: NonFatalReporter;
};

function trim(value: unknown): string {
  return String(value || '').trim();
}

function buildTextureFileFlightKey(file: Blob | File | null): string {
  if (!file) return '';
  const obj = file as Blob & Partial<File>;
  return [
    trim(obj.name),
    Number.isFinite(Number(obj.size)) ? String(Number(obj.size)) : '',
    trim(obj.type),
    Number.isFinite(Number(obj.lastModified)) ? String(Number(obj.lastModified)) : '',
  ].join('\u0001');
}

export function resetDesignTabCustomColorFileInput(
  fileRef: CustomColorFileInputRef,
  reportNonFatal?: NonFatalReporter,
  op = 'designTabCustomColorWorkflow:resetFile'
): void {
  try {
    if (fileRef.current) fileRef.current.value = '';
  } catch (err) {
    if (typeof reportNonFatal === 'function') reportNonFatal(op, err);
  }
}

export function readDesignTabCustomDraftColor(colorChoice: string): string {
  const cur = trim(colorChoice);
  if (cur && cur[0] === '#') return cur.toLowerCase() === '#ffffff' ? '#d0d4d8' : cur;
  return '#d0d4d8';
}

export function createPrevCustomState(colorChoice: string, customUploadedDataURL: string): PrevCustomState {
  return {
    choice: String(colorChoice || '#ffffff'),
    customUploaded: String(customUploadedDataURL || ''),
  };
}

export function readTextureFileFromEvent(event: FilePickEventLike): Blob | File | null {
  const files = event && event.target ? event.target.files : null;
  return files && files[0] ? files[0] : null;
}

export function readColorValueFromEvent(event: ColorPickEventLike): string {
  return trim(event && event.target ? event.target.value : '');
}

export function createDesignTabCustomColorWorkflowController(
  args: CreateDesignTabCustomColorWorkflowControllerArgs
): DesignTabCustomColorWorkflowController {
  const {
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
    reportNonFatal,
  } = args;

  const openCustom = () => {
    prevRef.current = createPrevCustomState(colorChoice, customUploadedDataURL);
    setDraftColor(readDesignTabCustomDraftColor(colorChoice));
    setCustomOpen(true);

    if (String(colorChoice || '') === 'custom' && customUploadedDataURL) {
      setDraftTextureData(customUploadedDataURL);
      setDraftTextureName('');
      return;
    }

    setDraftTextureData(null);
    setDraftTextureName('');
    resetDesignTabCustomColorFileInput(
      fileRef,
      reportNonFatal,
      'designTabCustomColorWorkflow:openCustom:resetFile'
    );
  };

  const cancelCustom = () => {
    const prev = prevRef.current;

    setCustomOpen(false);
    setDraftTextureData(null);
    setDraftTextureName('');
    resetDesignTabCustomColorFileInput(
      fileRef,
      reportNonFatal,
      'designTabCustomColorWorkflow:cancelCustom:resetFile'
    );

    if (!prev) return;

    if (String(customUploadedDataURL || '') !== String(prev.customUploaded || '')) {
      setCfgCustomUploadedDataURL(app, prev.customUploaded ? prev.customUploaded : null, {
        source: 'react:design:custom:cancel',
      });
    }

    applyColorChoice(prev.choice || '#ffffff', 'react:design:custom:cancel');
  };

  return {
    openCustom,

    cancelCustom,

    togglePanelOpen() {
      if (customOpen) {
        cancelCustom();
        return;
      }
      openCustom();
    },

    onPickCustomColor(event: ColorPickEventLike) {
      const hex = readColorValueFromEvent(event);
      if (!hex) return;

      setDraftColor(hex);
      setDraftTextureData(null);
      setDraftTextureName('');
      resetDesignTabCustomColorFileInput(
        fileRef,
        reportNonFatal,
        'designTabCustomColorWorkflow:onPickCustomColor:resetFile'
      );
      applyColorChoice(hex, 'react:design:custom:pickColor');
    },

    onPickTextureFile(event: FilePickEventLike) {
      const file = readTextureFileFromEvent(event);
      const applyTextureResult = async () => {
        const result = await readTextureFileAsDataUrl(file);
        if (result.ok && result.kind === 'upload-texture') {
          setDraftTextureData(result.dataUrl);
          setDraftTextureName(String(result.textureName || ''));
          setCfgCustomUploadedDataURL(app, result.dataUrl, { source: 'react:design:custom:texture' });
          applyColorChoice('custom', 'react:design:custom:pickTexture');
        }
        reportDesignTabColorActionResult(feedback, result);
        return result;
      };
      const key = buildTextureFileFlightKey(file);
      return key
        ? runDesignTabColorActionSingleFlight({
            app,
            key: buildDesignTabColorTextureUploadFlightKey(key),
            run: applyTextureResult,
            onBusy: result => {
              reportDesignTabColorActionResult(feedback, result);
            },
          })
        : applyTextureResult();
    },

    removeTexture() {
      setDraftTextureData(null);
      setDraftTextureName('');
      resetDesignTabCustomColorFileInput(
        fileRef,
        reportNonFatal,
        'designTabCustomColorWorkflow:removeTexture:resetFile'
      );

      reportDesignTabColorActionResult(
        feedback,
        removeCustomTexture(app, colorChoice, draftColor, applyColorChoice)
      );
    },

    saveCustom() {
      return runDesignTabColorActionSingleFlight({
        app,
        key: DESIGN_TAB_COLOR_ACTION_SAVE_KEY,
        onBusy: result => {
          reportDesignTabColorActionResult(feedback, result);
        },
        run: async () => {
          const result = await runPerfAction(
            app,
            'design.savedColor.add',
            async () =>
              await runSaveCustomColorFlow({
                app,
                feedback,
                savedColors,
                orderedSwatches,
                draftColor,
                draftTextureData,
                applyColorChoice,
              }),
            {
              resolveEndOptions: actionResult => buildPerfEntryOptionsFromActionResult(actionResult),
            }
          );
          reportDesignTabColorActionResult(feedback, result);
          if (!result.ok) return result;

          setCustomOpen(false);
          setDraftTextureData(null);
          setDraftTextureName('');
          resetDesignTabCustomColorFileInput(
            fileRef,
            reportNonFatal,
            'designTabCustomColorWorkflow:saveCustom:resetFile'
          );
          return result;
        },
      });
    },
  };
}
