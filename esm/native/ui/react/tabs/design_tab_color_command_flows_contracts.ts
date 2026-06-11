import type { AppContainer } from '../../../../../types';

import type { DesignTabApplyColorChoice } from './design_tab_color_manager_shared.js';
import type { DesignTabFeedbackApi } from './design_tab_shared.js';
import type { SavedColor } from './design_tab_multicolor_panel.js';

export type FileReaderLike = {
  result: unknown;
  error?: unknown;
  onload: null | ((evt?: ProgressEvent<FileReader>) => void);
  onerror: null | (() => void);
  readAsText(file: Blob): void;
  readAsDataURL(file: Blob): void;
};

export type ReadTextureFileOptions = {
  createReader?: () => FileReaderLike;
};

export type DeleteSavedColorFlowArgs = {
  app: AppContainer;
  feedback: DesignTabFeedbackApi;
  savedColors: SavedColor[];
  orderedSwatches: SavedColor[];
  colorChoice: string;
  id: string;
  applyColorChoice: DesignTabApplyColorChoice;
};

export type SaveCustomColorFlowArgs = {
  app: AppContainer;
  feedback: DesignTabFeedbackApi;
  savedColors: SavedColor[];
  orderedSwatches: SavedColor[];
  draftColor: string;
  draftTextureData: string | null;
  applyColorChoice: DesignTabApplyColorChoice;
  idFactory?: () => string;
};
