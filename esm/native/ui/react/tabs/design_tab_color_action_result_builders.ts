import { normalizeUnknownError } from '../../../services/api.js';

import type {
  DesignTabColorFailureExtrasByKind,
  DesignTabColorFailureKind,
  DesignTabColorFailureReasonByKind,
  DesignTabColorFailureResultByKind,
  DesignTabColorSuccessExtrasByKind,
  DesignTabColorSuccessKind,
  DesignTabColorSuccessResultByKind,
} from './design_tab_color_action_types.js';
import {
  normalizeDesignTabColorDeleteReason,
  normalizeDesignTabColorFailureExtras,
  normalizeDesignTabColorSaveCustomColorReason,
  normalizeDesignTabColorSuccessExtras,
  normalizeDesignTabColorToggleLockReason,
  normalizeDesignTabColorUploadTextureReason,
  readDeleteFallbackReason,
  readSaveCustomColorFallbackReason,
  readToggleLockFallbackReason,
  readUploadTextureFallbackReason,
} from './design_tab_color_action_result_helpers.js';

function buildToggleLockSuccess(
  extras: DesignTabColorSuccessExtrasByKind['toggle-lock']
): DesignTabColorSuccessResultByKind<'toggle-lock'> {
  return {
    ok: true,
    kind: 'toggle-lock',
    id: extras.id,
    locked: !!extras.locked,
    ...(extras.name ? { name: extras.name } : {}),
  };
}

function buildDeleteSuccess(
  extras: DesignTabColorSuccessExtrasByKind['delete-color']
): DesignTabColorSuccessResultByKind<'delete-color'> {
  return {
    ok: true,
    kind: 'delete-color',
    id: extras.id,
    ...(extras.name ? { name: extras.name } : {}),
  };
}

function buildUploadTextureSuccess(
  extras: DesignTabColorSuccessExtrasByKind['upload-texture']
): DesignTabColorSuccessResultByKind<'upload-texture'> {
  return {
    ok: true,
    kind: 'upload-texture',
    dataUrl: extras.dataUrl,
    ...(extras.textureName ? { textureName: extras.textureName } : {}),
  };
}

function buildSaveCustomColorSuccess(
  extras: DesignTabColorSuccessExtrasByKind['save-custom-color']
): DesignTabColorSuccessResultByKind<'save-custom-color'> {
  return {
    ok: true,
    kind: 'save-custom-color',
    id: extras.id,
    name: extras.name,
  };
}

function buildToggleLockFailure(
  reason: DesignTabColorFailureReasonByKind['toggle-lock'],
  extras: DesignTabColorFailureExtrasByKind['toggle-lock'],
  message?: string
): DesignTabColorFailureResultByKind<'toggle-lock'> {
  return {
    ok: false,
    kind: 'toggle-lock',
    reason,
    ...(extras.id ? { id: extras.id } : {}),
    ...(extras.name ? { name: extras.name } : {}),
    ...(message ? { message } : {}),
  };
}

function buildDeleteFailure(
  reason: DesignTabColorFailureReasonByKind['delete-color'],
  extras: DesignTabColorFailureExtrasByKind['delete-color'],
  message?: string
): DesignTabColorFailureResultByKind<'delete-color'> {
  return {
    ok: false,
    kind: 'delete-color',
    reason,
    ...(extras.id ? { id: extras.id } : {}),
    ...(extras.name ? { name: extras.name } : {}),
    ...(message ? { message } : {}),
  };
}

function buildUploadTextureFailure(
  reason: DesignTabColorFailureReasonByKind['upload-texture'],
  extras: DesignTabColorFailureExtrasByKind['upload-texture'],
  message?: string
): DesignTabColorFailureResultByKind<'upload-texture'> {
  return {
    ok: false,
    kind: 'upload-texture',
    reason,
    ...(extras.textureName ? { textureName: extras.textureName } : {}),
    ...(message ? { message } : {}),
  };
}

function buildSaveCustomColorFailure(
  reason: DesignTabColorFailureReasonByKind['save-custom-color'],
  extras: DesignTabColorFailureExtrasByKind['save-custom-color'],
  message?: string
): DesignTabColorFailureResultByKind<'save-custom-color'> {
  return {
    ok: false,
    kind: 'save-custom-color',
    reason,
    ...(extras.id ? { id: extras.id } : {}),
    ...(extras.name ? { name: extras.name } : {}),
    ...(message ? { message } : {}),
  };
}

type DesignTabColorSuccessBuilderMap = {
  [K in DesignTabColorSuccessKind]: (
    extras?: DesignTabColorSuccessExtrasByKind[K]
  ) => DesignTabColorSuccessResultByKind<K>;
};

const buildSuccessByKind: DesignTabColorSuccessBuilderMap = {
  'reorder-swatches': () => ({ ok: true, kind: 'reorder-swatches' }),
  'toggle-lock': extras =>
    buildToggleLockSuccess(normalizeDesignTabColorSuccessExtras('toggle-lock', extras)),
  'delete-color': extras => buildDeleteSuccess(normalizeDesignTabColorSuccessExtras('delete-color', extras)),
  'upload-texture': extras =>
    buildUploadTextureSuccess(normalizeDesignTabColorSuccessExtras('upload-texture', extras)),
  'save-custom-color': extras =>
    buildSaveCustomColorSuccess(normalizeDesignTabColorSuccessExtras('save-custom-color', extras)),
  'remove-texture': () => ({ ok: true, kind: 'remove-texture' }),
};

export function buildDesignTabColorActionSuccess<K extends DesignTabColorSuccessKind>(
  kind: K,
  extras?: DesignTabColorSuccessExtrasByKind[K]
): DesignTabColorSuccessResultByKind<K> {
  return buildSuccessByKind[kind](extras);
}

type DesignTabColorFailureBuilderMap = {
  [K in DesignTabColorFailureKind]: (
    reason: DesignTabColorFailureReasonByKind[K] | unknown,
    extras?: DesignTabColorFailureExtrasByKind[K] | unknown,
    message?: string
  ) => DesignTabColorFailureResultByKind<K>;
};

const buildFailureByKind: DesignTabColorFailureBuilderMap = {
  'toggle-lock': (reason, extras, message) =>
    buildToggleLockFailure(
      normalizeDesignTabColorToggleLockReason(reason),
      normalizeDesignTabColorFailureExtras('toggle-lock', extras),
      message
    ),
  'delete-color': (reason, extras, message) =>
    buildDeleteFailure(
      normalizeDesignTabColorDeleteReason(reason),
      normalizeDesignTabColorFailureExtras('delete-color', extras),
      message
    ),
  'upload-texture': (reason, extras, message) =>
    buildUploadTextureFailure(
      normalizeDesignTabColorUploadTextureReason(reason),
      normalizeDesignTabColorFailureExtras('upload-texture', extras),
      message
    ),
  'save-custom-color': (reason, extras, message) =>
    buildSaveCustomColorFailure(
      normalizeDesignTabColorSaveCustomColorReason(reason),
      normalizeDesignTabColorFailureExtras('save-custom-color', extras),
      message
    ),
};

export function buildDesignTabColorActionFailure<K extends DesignTabColorFailureKind>(
  kind: K,
  reason: DesignTabColorFailureReasonByKind[K] | unknown,
  extras?: DesignTabColorFailureExtrasByKind[K] | unknown,
  message?: string
): DesignTabColorFailureResultByKind<K> {
  return buildFailureByKind[kind](reason, extras, message);
}

type DesignTabColorErrorBuilderMap = {
  [K in DesignTabColorFailureKind]: (
    normalizedMessage: string,
    extras?: DesignTabColorFailureExtrasByKind[K] | unknown,
    fallbackReason?: DesignTabColorFailureReasonByKind[K] | unknown
  ) => DesignTabColorFailureResultByKind<K>;
};

const buildErrorByKind: DesignTabColorErrorBuilderMap = {
  'toggle-lock': (normalizedMessage, extras, fallbackReason) =>
    buildToggleLockFailure(
      normalizeDesignTabColorToggleLockReason('error', readToggleLockFallbackReason(fallbackReason)),
      normalizeDesignTabColorFailureExtras('toggle-lock', extras),
      normalizedMessage
    ),
  'delete-color': (normalizedMessage, extras, fallbackReason) =>
    buildDeleteFailure(
      normalizeDesignTabColorDeleteReason('error', readDeleteFallbackReason(fallbackReason)),
      normalizeDesignTabColorFailureExtras('delete-color', extras),
      normalizedMessage
    ),
  'upload-texture': (normalizedMessage, extras, fallbackReason) =>
    buildUploadTextureFailure(
      normalizeDesignTabColorUploadTextureReason('error', readUploadTextureFallbackReason(fallbackReason)),
      normalizeDesignTabColorFailureExtras('upload-texture', extras),
      normalizedMessage
    ),
  'save-custom-color': (normalizedMessage, extras, fallbackReason) =>
    buildSaveCustomColorFailure(
      normalizeDesignTabColorSaveCustomColorReason(
        'error',
        readSaveCustomColorFallbackReason(fallbackReason)
      ),
      normalizeDesignTabColorFailureExtras('save-custom-color', extras),
      normalizedMessage
    ),
};

export function buildDesignTabColorActionErrorResult<K extends DesignTabColorFailureKind>(
  kind: K,
  error: unknown,
  fallbackMessage: string,
  extras?: DesignTabColorFailureExtrasByKind[K] | unknown,
  fallbackReason?: DesignTabColorFailureReasonByKind[K] | unknown
): DesignTabColorFailureResultByKind<K> {
  const normalized = normalizeUnknownError(error, fallbackMessage);
  return buildErrorByKind[kind](normalized.message, extras, fallbackReason);
}
