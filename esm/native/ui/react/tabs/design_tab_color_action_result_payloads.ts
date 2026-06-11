import { asRecord } from '../../../services/api.js';

import type {
  DesignTabColorActionBaseFields,
  DesignTabColorFailureExtrasByKind,
  DesignTabColorFailureKind,
  DesignTabColorSuccessExtrasByKind,
  DesignTabColorSuccessKind,
} from './design_tab_color_action_types.js';
import { readBoolean, readOptionalString } from './design_tab_color_action_result_shared.js';

export function readDesignTabColorActionBase(value: unknown): DesignTabColorActionBaseFields {
  const rec = asRecord<Record<string, unknown>>(value) || {};
  const id = readOptionalString(rec.id);
  const name = readOptionalString(rec.name);
  const locked = readBoolean(rec.locked);
  const textureName = readOptionalString(rec.textureName);
  const dataUrl = readOptionalString(rec.dataUrl);
  const message = readOptionalString(rec.message);
  return {
    ...(id ? { id } : {}),
    ...(name ? { name } : {}),
    ...(typeof locked === 'boolean' ? { locked } : {}),
    ...(textureName ? { textureName } : {}),
    ...(dataUrl ? { dataUrl } : {}),
    ...(message ? { message } : {}),
  };
}

export function readDesignTabColorActionMessage(value: unknown): string | undefined {
  return readDesignTabColorActionBase(value).message;
}

export function normalizeToggleLockSuccessExtras(
  value: unknown
): DesignTabColorSuccessExtrasByKind['toggle-lock'] {
  const base = readDesignTabColorActionBase(value);
  return {
    id: base.id || '',
    locked: !!base.locked,
    ...(base.name ? { name: base.name } : {}),
  };
}

export function normalizeDeleteSuccessExtras(
  value: unknown
): DesignTabColorSuccessExtrasByKind['delete-color'] {
  const base = readDesignTabColorActionBase(value);
  return {
    id: base.id || '',
    ...(base.name ? { name: base.name } : {}),
  };
}

export function normalizeUploadTextureSuccessExtras(
  value: unknown
): DesignTabColorSuccessExtrasByKind['upload-texture'] {
  const base = readDesignTabColorActionBase(value);
  return {
    dataUrl: base.dataUrl || '',
    ...(base.textureName ? { textureName: base.textureName } : {}),
  };
}

export function normalizeSaveCustomColorSuccessExtras(
  value: unknown
): DesignTabColorSuccessExtrasByKind['save-custom-color'] {
  const base = readDesignTabColorActionBase(value);
  return {
    id: base.id || '',
    name: base.name || '',
  };
}

export function normalizeToggleLockFailureExtras(
  value: unknown
): DesignTabColorFailureExtrasByKind['toggle-lock'] {
  const base = readDesignTabColorActionBase(value);
  return {
    ...(base.id ? { id: base.id } : {}),
    ...(base.name ? { name: base.name } : {}),
  };
}

export function normalizeDeleteFailureExtras(
  value: unknown
): DesignTabColorFailureExtrasByKind['delete-color'] {
  const base = readDesignTabColorActionBase(value);
  return {
    ...(base.id ? { id: base.id } : {}),
    ...(base.name ? { name: base.name } : {}),
  };
}

export function normalizeUploadTextureFailureExtras(
  value: unknown
): DesignTabColorFailureExtrasByKind['upload-texture'] {
  const base = readDesignTabColorActionBase(value);
  return {
    ...(base.textureName ? { textureName: base.textureName } : {}),
  };
}

export function normalizeSaveCustomColorFailureExtras(
  value: unknown
): DesignTabColorFailureExtrasByKind['save-custom-color'] {
  const base = readDesignTabColorActionBase(value);
  return {
    ...(base.id ? { id: base.id } : {}),
    ...(base.name ? { name: base.name } : {}),
  };
}

type DesignTabColorSuccessExtrasNormalizerMap = {
  [K in DesignTabColorSuccessKind]: (value: unknown) => DesignTabColorSuccessExtrasByKind[K];
};

const normalizeSuccessExtrasByKind: DesignTabColorSuccessExtrasNormalizerMap = {
  'reorder-swatches': () => ({}),
  'toggle-lock': normalizeToggleLockSuccessExtras,
  'delete-color': normalizeDeleteSuccessExtras,
  'upload-texture': normalizeUploadTextureSuccessExtras,
  'save-custom-color': normalizeSaveCustomColorSuccessExtras,
  'remove-texture': () => ({}),
};

export function normalizeDesignTabColorSuccessExtras<K extends DesignTabColorSuccessKind>(
  kind: K,
  value: unknown
): DesignTabColorSuccessExtrasByKind[K] {
  return normalizeSuccessExtrasByKind[kind](value);
}

type DesignTabColorFailureExtrasNormalizerMap = {
  [K in DesignTabColorFailureKind]: (value: unknown) => DesignTabColorFailureExtrasByKind[K];
};

const normalizeFailureExtrasByKind: DesignTabColorFailureExtrasNormalizerMap = {
  'toggle-lock': normalizeToggleLockFailureExtras,
  'delete-color': normalizeDeleteFailureExtras,
  'upload-texture': normalizeUploadTextureFailureExtras,
  'save-custom-color': normalizeSaveCustomColorFailureExtras,
};

export function normalizeDesignTabColorFailureExtras<K extends DesignTabColorFailureKind>(
  kind: K,
  value: unknown
): DesignTabColorFailureExtrasByKind[K] {
  return normalizeFailureExtrasByKind[kind](value);
}
