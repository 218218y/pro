import type { CSSProperties } from 'react';

import { MODES } from '../../../services/api.js';

import type { SavedColor } from './design_tab_multicolor_panel.js';
import type { UiFeedbackNamespaceLike, UnknownRecord } from '../../../../../types';

export type DesignTabDoorStyle = 'flat' | 'profile' | 'double_profile';
export type DesignTabCorniceType = 'classic' | 'wave';
export type DesignTabModeConstants = Partial<Record<'GROOVE' | 'SPLIT' | 'REMOVE_DOOR', string>>;
export type DesignTabSwatchDropPos = 'before' | 'after' | '';
export type DesignTabSwatchReorderPos = 'before' | 'after' | 'end';
export type DesignTabFeatureToggleKey = 'groovesEnabled' | 'splitDoors' | 'removeDoorsEnabled' | 'hasCornice';

export type SplitModeOptsLike = { splitVariant?: string } & UnknownRecord;

export type EnterModeOptsLike = {
  closeDoors: boolean;
  cursor: string;
  toast: string;
  modeOpts?: SplitModeOptsLike;
  source?: string;
  immediate?: boolean;
  uiPatch?: UnknownRecord;
};

export type DesignTabToastFn = (msg: string, kind?: string) => void;
export type DesignTabPromptFn = (
  title: string,
  defaultValue: string,
  cb: (value: string | null) => void
) => void;
export type DesignTabConfirmFn = (
  title: string,
  message: string,
  onYes: () => void,
  onNo?: (() => void) | null
) => void;

export type DesignTabFeedbackApi = {
  toast: DesignTabToastFn;
  prompt: DesignTabPromptFn;
  confirm: DesignTabConfirmFn;
};

export type DesignTabModeStateSummary = {
  primaryMode: string;
  splitVariant: string;
};

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asToastFn(value: unknown): DesignTabToastFn | null {
  if (typeof value !== 'function') return null;
  return (msg, kind) => {
    Reflect.apply(value, undefined, [msg, kind]);
  };
}

function asPromptFn(value: unknown): DesignTabPromptFn | null {
  if (typeof value !== 'function') return null;
  return (title, defaultValue, cb) => {
    Reflect.apply(value, undefined, [title, defaultValue, cb]);
  };
}

function asConfirmFn(value: unknown): DesignTabConfirmFn | null {
  if (typeof value !== 'function') return null;
  return (title, message, onYes, onNo) => {
    Reflect.apply(value, undefined, [title, message, onYes, onNo]);
  };
}

export function readDesignTabDoorStyle(
  value: unknown,
  defaultValue: DesignTabDoorStyle = 'flat'
): DesignTabDoorStyle {
  const raw = (typeof value === 'string' ? value : defaultValue).trim().toLowerCase();
  return raw === 'profile' || raw === 'double_profile' || raw === 'flat' ? raw : defaultValue;
}

export function readDesignTabCorniceType(
  value: unknown,
  defaultValue: DesignTabCorniceType = 'classic'
): DesignTabCorniceType {
  const raw = (typeof value === 'string' ? value : defaultValue).trim().toLowerCase();
  return raw === 'wave' || raw === 'classic' ? raw : defaultValue;
}

export function readSplitModeVariant(value: unknown): string {
  return typeof value === 'string' ? String(value) : '';
}

export function readDesignTabModeState(mode: unknown): DesignTabModeStateSummary {
  const modeRec = isRecord(mode) ? mode : null;
  const opts = isRecord(modeRec?.opts) ? modeRec.opts : null;
  return {
    primaryMode: typeof modeRec?.primary === 'string' && modeRec.primary ? modeRec.primary : 'none',
    splitVariant: readSplitModeVariant(opts?.splitVariant),
  };
}

export function resolveDesignTabFeedback(fb: UiFeedbackNamespaceLike): DesignTabFeedbackApi {
  const toastBase = asToastFn(fb.toast) || asToastFn(fb.showToast) || (() => {});
  const promptBase =
    asPromptFn(fb.prompt) || asPromptFn(fb.openCustomPrompt) || ((_title, _defaultValue, cb) => cb(null));
  const confirmBase = asConfirmFn(fb.confirm) || ((_title, _message, _onYes) => {});
  return {
    toast: (msg, kind) => {
      toastBase(msg, kind);
    },
    prompt: (title, defaultValue, cb) => {
      promptBase(title, defaultValue, cb);
    },
    confirm: (title, message, onYes, onNo) => {
      confirmBase(title, message, onYes, onNo);
    },
  };
}

export function readSavedColorId(color: SavedColor): string {
  return typeof color.id === 'string' ? color.id.trim() : '';
}

export function readSavedColorName(color: SavedColor): string {
  return typeof color.name === 'string' ? color.name.trim() : '';
}

export function readSavedColorValue(color: SavedColor): string {
  return typeof color.value === 'string' ? color.value : '';
}

export function isSavedColorLocked(color: SavedColor): boolean {
  return !!color.locked;
}

function cssUrl(value: string): string {
  return `url(${JSON.stringify(value)})`;
}

export function getSwatchStyle(color: SavedColor): CSSProperties {
  return color.type === 'texture' && color.textureData
    ? { backgroundImage: cssUrl(color.textureData) }
    : { backgroundColor: readSavedColorValue(color) };
}

export function getModeConst(key: keyof DesignTabModeConstants, defaultValue: string): string {
  try {
    const modes = isRecord(MODES) ? MODES : null;
    const value = modes?.[key];
    return typeof value === 'string' && value.trim() ? value : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function withoutLockedFlag(color: SavedColor): SavedColor {
  const { locked: _locked, ...rest } = color;
  return rest;
}
