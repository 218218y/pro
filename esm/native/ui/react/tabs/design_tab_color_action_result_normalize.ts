import { asRecord } from '../../../services/api.js';

import type { DesignTabColorActionResult } from './design_tab_color_action_types.js';
import {
  buildDesignTabColorActionFailure,
  buildDesignTabColorActionSuccess,
} from './design_tab_color_action_result_builders.js';
import {
  normalizeDesignTabColorDeleteReason,
  normalizeDesignTabColorFailureExtras,
  normalizeDesignTabColorSaveCustomColorReason,
  normalizeDesignTabColorSuccessExtras,
  normalizeDesignTabColorToggleLockReason,
  normalizeDesignTabColorUploadTextureReason,
  readDesignTabColorActionMessage,
  readKind,
} from './design_tab_color_action_result_helpers.js';

const normalizeSuccessResultByKind = {
  'reorder-swatches': () => buildDesignTabColorActionSuccess('reorder-swatches'),
  'toggle-lock': (value: unknown) =>
    buildDesignTabColorActionSuccess(
      'toggle-lock',
      normalizeDesignTabColorSuccessExtras('toggle-lock', value)
    ),
  'delete-color': (value: unknown) =>
    buildDesignTabColorActionSuccess(
      'delete-color',
      normalizeDesignTabColorSuccessExtras('delete-color', value)
    ),
  'upload-texture': (value: unknown) => {
    const extras = normalizeDesignTabColorSuccessExtras('upload-texture', value);
    return extras.dataUrl
      ? buildDesignTabColorActionSuccess('upload-texture', extras)
      : buildDesignTabColorActionFailure('upload-texture', 'read-failed');
  },
  'save-custom-color': (value: unknown) =>
    buildDesignTabColorActionSuccess(
      'save-custom-color',
      normalizeDesignTabColorSuccessExtras('save-custom-color', value)
    ),
  'remove-texture': () => buildDesignTabColorActionSuccess('remove-texture'),
} satisfies Record<DesignTabColorActionResult['kind'], (value: unknown) => DesignTabColorActionResult | null>;

const normalizeFailureResultByKind = {
  'toggle-lock': (value: unknown) =>
    buildDesignTabColorActionFailure(
      'toggle-lock',
      normalizeDesignTabColorToggleLockReason(asRecord<Record<string, unknown>>(value)?.reason),
      normalizeDesignTabColorFailureExtras('toggle-lock', value),
      readDesignTabColorActionMessage(value)
    ),
  'delete-color': (value: unknown) =>
    buildDesignTabColorActionFailure(
      'delete-color',
      normalizeDesignTabColorDeleteReason(asRecord<Record<string, unknown>>(value)?.reason),
      normalizeDesignTabColorFailureExtras('delete-color', value),
      readDesignTabColorActionMessage(value)
    ),
  'upload-texture': (value: unknown) =>
    buildDesignTabColorActionFailure(
      'upload-texture',
      normalizeDesignTabColorUploadTextureReason(asRecord<Record<string, unknown>>(value)?.reason),
      normalizeDesignTabColorFailureExtras('upload-texture', value),
      readDesignTabColorActionMessage(value)
    ),
  'save-custom-color': (value: unknown) =>
    buildDesignTabColorActionFailure(
      'save-custom-color',
      normalizeDesignTabColorSaveCustomColorReason(asRecord<Record<string, unknown>>(value)?.reason),
      normalizeDesignTabColorFailureExtras('save-custom-color', value),
      readDesignTabColorActionMessage(value)
    ),
} satisfies Record<
  Exclude<DesignTabColorActionResult['kind'], 'reorder-swatches' | 'remove-texture'>,
  (value: unknown) => DesignTabColorActionResult
>;

export function normalizeDesignTabColorActionResult(value: unknown): DesignTabColorActionResult | null {
  const rec = asRecord<Record<string, unknown>>(value);
  if (!rec) return null;
  const kind = readKind(rec.kind);
  if (!kind) return null;
  if (rec.ok === true) return normalizeSuccessResultByKind[kind](rec);
  if (kind === 'reorder-swatches' || kind === 'remove-texture') return null;
  return normalizeFailureResultByKind[kind](rec);
}
