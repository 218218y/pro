import type {
  DesignTabColorDeleteFailureReason,
  DesignTabColorFailureKind,
  DesignTabColorFailureReasonByKind,
  DesignTabColorSaveCustomColorFailureReason,
  DesignTabColorToggleLockFailureReason,
  DesignTabColorUploadTextureFailureReason,
} from './design_tab_color_action_types.js';
import { trimString } from './design_tab_color_action_result_shared.js';

export function normalizeToggleLockReason(
  value: unknown,
  fallbackReason?: DesignTabColorToggleLockFailureReason
): DesignTabColorToggleLockFailureReason {
  const token = trimString(value).toLowerCase();
  if (token === 'missing' || token === 'not-found') return 'missing';
  if (token === 'missing-selection' || token === 'missing_selection' || token === 'missing selection') {
    return 'missing-selection';
  }
  return fallbackReason === 'missing' || fallbackReason === 'missing-selection' ? fallbackReason : 'error';
}

export function normalizeDeleteReason(
  value: unknown,
  fallbackReason?: DesignTabColorDeleteFailureReason
): DesignTabColorDeleteFailureReason {
  const token = trimString(value).toLowerCase();
  if (token === 'busy') return 'busy';
  if (token === 'cancelled' || token === 'canceled' || token === 'cancel') return 'cancelled';
  if (token === 'locked') return 'locked';
  if (token === 'missing' || token === 'not-found') return 'missing';
  if (token === 'missing-selection' || token === 'missing_selection' || token === 'missing selection') {
    return 'missing-selection';
  }
  return fallbackReason === 'busy' ||
    fallbackReason === 'cancelled' ||
    fallbackReason === 'locked' ||
    fallbackReason === 'missing' ||
    fallbackReason === 'missing-selection'
    ? fallbackReason
    : 'error';
}

export function normalizeUploadTextureReason(
  value: unknown,
  fallbackReason?: DesignTabColorUploadTextureFailureReason
): DesignTabColorUploadTextureFailureReason {
  const token = trimString(value).toLowerCase();
  if (token === 'busy') return 'busy';
  if (token === 'missing-file' || token === 'missing_file' || token === 'missing file') return 'missing-file';
  if (
    token === 'unavailable' ||
    token === 'unsupported' ||
    token === 'not-supported' ||
    token === 'not_supported'
  ) {
    return 'unavailable';
  }
  if (token === 'read-failed' || token === 'read_failed' || token === 'read failed' || token === 'error') {
    return 'read-failed';
  }
  return fallbackReason === 'busy' || fallbackReason === 'missing-file' || fallbackReason === 'unavailable'
    ? fallbackReason
    : 'read-failed';
}

export function normalizeSaveCustomColorReason(
  value: unknown,
  fallbackReason?: DesignTabColorSaveCustomColorFailureReason
): DesignTabColorSaveCustomColorFailureReason {
  const token = trimString(value).toLowerCase();
  if (token === 'busy') return 'busy';
  if (token === 'cancelled' || token === 'canceled' || token === 'cancel') return 'cancelled';
  if (token === 'missing-input' || token === 'missing_input' || token === 'missing input') {
    return 'missing-input';
  }
  return fallbackReason === 'busy' || fallbackReason === 'cancelled' || fallbackReason === 'missing-input'
    ? fallbackReason
    : 'error';
}

type DesignTabColorReasonNormalizerMap = {
  [K in DesignTabColorFailureKind]: (
    value: unknown,
    fallbackReason?: DesignTabColorFailureReasonByKind[K]
  ) => DesignTabColorFailureReasonByKind[K];
};

const normalizeFailureReasonByKind: DesignTabColorReasonNormalizerMap = {
  'toggle-lock': normalizeToggleLockReason,
  'delete-color': normalizeDeleteReason,
  'upload-texture': normalizeUploadTextureReason,
  'save-custom-color': normalizeSaveCustomColorReason,
};

export function normalizeDesignTabColorActionReason<K extends DesignTabColorFailureKind>(
  kind: K,
  value: unknown,
  fallbackReason?: DesignTabColorFailureReasonByKind[K]
): DesignTabColorFailureReasonByKind[K] {
  return normalizeFailureReasonByKind[kind](value, fallbackReason);
}

export function normalizeDesignTabColorToggleLockReason(
  value: unknown,
  fallbackReason: DesignTabColorToggleLockFailureReason = 'error'
): DesignTabColorToggleLockFailureReason {
  return normalizeDesignTabColorActionReason('toggle-lock', value, fallbackReason);
}

export function normalizeDesignTabColorDeleteReason(
  value: unknown,
  fallbackReason: DesignTabColorDeleteFailureReason = 'error'
): DesignTabColorDeleteFailureReason {
  return normalizeDesignTabColorActionReason('delete-color', value, fallbackReason);
}

export function normalizeDesignTabColorUploadTextureReason(
  value: unknown,
  fallbackReason: DesignTabColorUploadTextureFailureReason = 'read-failed'
): DesignTabColorUploadTextureFailureReason {
  return normalizeDesignTabColorActionReason('upload-texture', value, fallbackReason);
}

export function normalizeDesignTabColorSaveCustomColorReason(
  value: unknown,
  fallbackReason: DesignTabColorSaveCustomColorFailureReason = 'error'
): DesignTabColorSaveCustomColorFailureReason {
  return normalizeDesignTabColorActionReason('save-custom-color', value, fallbackReason);
}

export function readToggleLockFallbackReason(
  value: unknown
): DesignTabColorToggleLockFailureReason | undefined {
  const token = trimString(value).toLowerCase();
  switch (token) {
    case 'error':
      return 'error';
    case 'missing':
    case 'not-found':
      return 'missing';
    case 'missing-selection':
    case 'missing_selection':
    case 'missing selection':
      return 'missing-selection';
    default:
      return undefined;
  }
}

export function readDeleteFallbackReason(value: unknown): DesignTabColorDeleteFailureReason | undefined {
  const token = trimString(value).toLowerCase();
  switch (token) {
    case 'busy':
      return 'busy';
    case 'error':
      return 'error';
    case 'cancelled':
    case 'canceled':
    case 'cancel':
      return 'cancelled';
    case 'locked':
      return 'locked';
    case 'missing':
    case 'not-found':
      return 'missing';
    case 'missing-selection':
    case 'missing_selection':
    case 'missing selection':
      return 'missing-selection';
    default:
      return undefined;
  }
}

export function readUploadTextureFallbackReason(
  value: unknown
): DesignTabColorUploadTextureFailureReason | undefined {
  const token = trimString(value).toLowerCase();
  switch (token) {
    case 'busy':
      return 'busy';
    case 'read-failed':
    case 'read_failed':
    case 'read failed':
    case 'error':
      return 'read-failed';
    case 'missing-file':
    case 'missing_file':
    case 'missing file':
      return 'missing-file';
    case 'unavailable':
    case 'unsupported':
    case 'not-supported':
    case 'not_supported':
      return 'unavailable';
    default:
      return undefined;
  }
}

export function readSaveCustomColorFallbackReason(
  value: unknown
): DesignTabColorSaveCustomColorFailureReason | undefined {
  const token = trimString(value).toLowerCase();
  switch (token) {
    case 'busy':
      return 'busy';
    case 'error':
      return 'error';
    case 'cancelled':
    case 'canceled':
    case 'cancel':
      return 'cancelled';
    case 'missing-input':
    case 'missing_input':
    case 'missing input':
      return 'missing-input';
    default:
      return undefined;
  }
}
