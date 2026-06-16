export {
  isFailureResult,
  readBoolean,
  readKind,
  readOptionalString,
  readRequiredString,
  trimString,
} from './design_tab_color_action_result_shared.js';

export {
  normalizeDeleteReason,
  normalizeDesignTabColorActionReason,
  normalizeDesignTabColorDeleteReason,
  normalizeDesignTabColorSaveCustomColorReason,
  normalizeDesignTabColorToggleLockReason,
  normalizeDesignTabColorUploadTextureReason,
  normalizeSaveCustomColorReason,
  normalizeToggleLockReason,
  normalizeUploadTextureReason,
  readDeleteDefaultReason,
  readSaveCustomColorDefaultReason,
  readToggleLockDefaultReason,
  readUploadTextureDefaultReason,
} from './design_tab_color_action_result_reason.js';

export {
  normalizeDeleteFailureExtras,
  normalizeDeleteSuccessExtras,
  normalizeDesignTabColorFailureExtras,
  normalizeDesignTabColorSuccessExtras,
  normalizeSaveCustomColorFailureExtras,
  normalizeSaveCustomColorSuccessExtras,
  normalizeToggleLockFailureExtras,
  normalizeToggleLockSuccessExtras,
  normalizeUploadTextureFailureExtras,
  normalizeUploadTextureSuccessExtras,
  readDesignTabColorActionBase,
  readDesignTabColorActionMessage,
} from './design_tab_color_action_result_payloads.js';
