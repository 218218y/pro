import type { ChangeEvent, DragEvent, RefObject } from 'react';

import type { AppContainer, UiFeedbackNamespaceLike } from '../../../../../types';

import type { SavedColor } from './design_tab_multicolor_panel.js';
import { DEFAULT_COLOR_SWATCHES, normalizeSavedColors } from './design_tab_multicolor_panel.js';
import { normalizeDesignTabColorOrderIds } from './design_tab_color_command_shared.js';
import {
  getSwatchStyle,
  isSavedColorLocked,
  readSavedColorId,
  readSavedColorName,
  readSavedColorValue,
} from './design_tab_shared.js';
import type { DesignTabFeedbackApi, DesignTabSwatchDropPos } from './design_tab_shared.js';

export type UseDesignTabColorManagerArgs = {
  app: AppContainer;
  fb: UiFeedbackNamespaceLike;
  savedColorsRaw: unknown;
  customUploadedDataURL: string;
  colorSwatchesOrderRaw: unknown;
  colorChoice: string;
};

export type DesignTabApplyColorChoice = (choice: string, source?: string) => void;

export type DesignTabColorManagerModel = {
  orderedSwatches: SavedColor[];
  selectedCustom: SavedColor | null;
  canReorderColorSwatches: boolean;
  draggingColorId: string;
  dragOverColorId: string;
  dragOverColorPos: DesignTabSwatchDropPos;
  customOpen: boolean;
  draftColor: string;
  draftTextureName: string;
  draftTextureData: string | null;
  fileRef: RefObject<HTMLInputElement | null>;
  getSwatchStyle: typeof getSwatchStyle;
  isSavedColorLocked: typeof isSavedColorLocked;
  readSavedColorId: typeof readSavedColorId;
  readSavedColorName: typeof readSavedColorName;
  readSavedColorValue: typeof readSavedColorValue;
  onPickSwatch: (color: SavedColor) => void;
  onSwatchRowDragLeave: () => void;
  onSwatchDragStart: (id: string, event: DragEvent<HTMLDivElement>) => void;
  onSwatchDragEnd: () => void;
  onSwatchDragOver: (id: string, event: DragEvent<HTMLDivElement>) => void;
  onSwatchDrop: (id: string, event: DragEvent<HTMLDivElement>) => void;
  onSwatchEndDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onSwatchEndDrop: (event: DragEvent<HTMLDivElement>) => void;
  togglePanelOpen: () => void;
  openCustom: () => void;
  cancelCustom: () => void;
  onPickCustomColor: (event: ChangeEvent<HTMLInputElement>) => void;
  onPickTextureFile: (event: ChangeEvent<HTMLInputElement>) => void;
  removeTexture: () => void;
  saveCustom: () => void;
  toggleSelectedColorLock: () => void;
  toggleColorLockById: (id: string) => void;
  deleteSelectedColor: () => void;
};

export type UseDesignTabSavedSwatchesArgs = {
  app: AppContainer;
  colorChoice: string;
  feedback: DesignTabFeedbackApi;
  savedColors: SavedColor[];
  orderedSwatches: SavedColor[];
  applyColorChoice: DesignTabApplyColorChoice;
};

export type DesignTabSavedSwatchesModel = Pick<
  DesignTabColorManagerModel,
  | 'selectedCustom'
  | 'canReorderColorSwatches'
  | 'draggingColorId'
  | 'dragOverColorId'
  | 'dragOverColorPos'
  | 'onPickSwatch'
  | 'onSwatchRowDragLeave'
  | 'onSwatchDragStart'
  | 'onSwatchDragEnd'
  | 'onSwatchDragOver'
  | 'onSwatchDrop'
  | 'onSwatchEndDragOver'
  | 'onSwatchEndDrop'
  | 'toggleSelectedColorLock'
  | 'toggleColorLockById'
  | 'deleteSelectedColor'
>;

export type UseDesignTabCustomColorWorkflowArgs = {
  app: AppContainer;
  colorChoice: string;
  customUploadedDataURL: string;
  feedback: DesignTabFeedbackApi;
  savedColors: SavedColor[];
  orderedSwatches: SavedColor[];
  applyColorChoice: DesignTabApplyColorChoice;
};

export type DesignTabCustomColorWorkflowModel = Pick<
  DesignTabColorManagerModel,
  | 'customOpen'
  | 'draftColor'
  | 'draftTextureName'
  | 'draftTextureData'
  | 'fileRef'
  | 'togglePanelOpen'
  | 'openCustom'
  | 'cancelCustom'
  | 'onPickCustomColor'
  | 'onPickTextureFile'
  | 'removeTexture'
  | 'saveCustom'
>;

export function normalizeColorSwatchesOrder(raw: unknown): string[] {
  return normalizeDesignTabColorOrderIds(raw);
}

export function normalizeDesignTabSavedColors(raw: unknown): SavedColor[] {
  return normalizeSavedColors(raw);
}

export function buildOrderedSwatches(savedColors: SavedColor[], colorSwatchesOrder: string[]): SavedColor[] {
  const allSwatches: SavedColor[] = [...DEFAULT_COLOR_SWATCHES, ...savedColors];
  const swatchMap = new Map<string, SavedColor>();
  for (const color of allSwatches) {
    const id = readSavedColorId(color);
    if (!id || swatchMap.has(id)) continue;
    swatchMap.set(id, color);
  }

  const used = new Set<string>();
  const ordered: SavedColor[] = [];

  for (const id of normalizeDesignTabColorOrderIds(colorSwatchesOrder)) {
    if (used.has(id)) continue;
    const color = swatchMap.get(id);
    if (!color) continue;
    ordered.push(color);
    used.add(id);
  }

  for (const color of allSwatches) {
    const id = readSavedColorId(color);
    if (!id || used.has(id)) continue;
    ordered.push(color);
    used.add(id);
  }

  return ordered;
}
