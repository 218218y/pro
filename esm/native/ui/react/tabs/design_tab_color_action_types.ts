export type DesignTabColorActionKind =
  | 'reorder-swatches'
  | 'toggle-lock'
  | 'delete-color'
  | 'upload-texture'
  | 'save-custom-color'
  | 'remove-texture';

export type DesignTabColorActionFailureReason =
  | 'busy'
  | 'cancelled'
  | 'error'
  | 'locked'
  | 'missing'
  | 'missing-file'
  | 'missing-input'
  | 'missing-selection'
  | 'read-failed'
  | 'unavailable';

type DesignTabColorActionBase = {
  kind: DesignTabColorActionKind;
  id?: string;
  name?: string;
  locked?: boolean;
  textureName?: string;
  dataUrl?: string;
  message?: string;
};

export type DesignTabColorReorderSuccessResult = {
  ok: true;
  kind: 'reorder-swatches';
};

export type DesignTabColorToggleLockSuccessResult = {
  ok: true;
  kind: 'toggle-lock';
  id: string;
  name?: string;
  locked: boolean;
};

export type DesignTabColorDeleteSuccessResult = {
  ok: true;
  kind: 'delete-color';
  id: string;
  name?: string;
};

export type DesignTabColorUploadTextureSuccessResult = {
  ok: true;
  kind: 'upload-texture';
  textureName?: string;
  dataUrl: string;
};

export type DesignTabColorSaveCustomColorSuccessResult = {
  ok: true;
  kind: 'save-custom-color';
  id: string;
  name: string;
};

export type DesignTabColorRemoveTextureSuccessResult = {
  ok: true;
  kind: 'remove-texture';
};

export type DesignTabColorActionSuccessResult =
  | DesignTabColorReorderSuccessResult
  | DesignTabColorToggleLockSuccessResult
  | DesignTabColorDeleteSuccessResult
  | DesignTabColorUploadTextureSuccessResult
  | DesignTabColorSaveCustomColorSuccessResult
  | DesignTabColorRemoveTextureSuccessResult;

export type DesignTabColorToggleLockFailureReason = 'missing' | 'missing-selection' | 'error';
export type DesignTabColorDeleteFailureReason =
  | 'busy'
  | 'cancelled'
  | 'error'
  | 'locked'
  | 'missing'
  | 'missing-selection';
export type DesignTabColorUploadTextureFailureReason =
  | 'busy'
  | 'missing-file'
  | 'read-failed'
  | 'unavailable';
export type DesignTabColorSaveCustomColorFailureReason = 'busy' | 'cancelled' | 'error' | 'missing-input';

export type DesignTabColorToggleLockFailureResult = DesignTabColorActionBase & {
  ok: false;
  kind: 'toggle-lock';
  reason: DesignTabColorToggleLockFailureReason;
};

export type DesignTabColorDeleteFailureResult = DesignTabColorActionBase & {
  ok: false;
  kind: 'delete-color';
  reason: DesignTabColorDeleteFailureReason;
};

export type DesignTabColorUploadTextureFailureResult = DesignTabColorActionBase & {
  ok: false;
  kind: 'upload-texture';
  reason: DesignTabColorUploadTextureFailureReason;
};

export type DesignTabColorSaveCustomColorFailureResult = DesignTabColorActionBase & {
  ok: false;
  kind: 'save-custom-color';
  reason: DesignTabColorSaveCustomColorFailureReason;
};

export type DesignTabColorActionFailureResult =
  | DesignTabColorToggleLockFailureResult
  | DesignTabColorDeleteFailureResult
  | DesignTabColorUploadTextureFailureResult
  | DesignTabColorSaveCustomColorFailureResult;

export type DesignTabColorActionResult =
  | DesignTabColorActionSuccessResult
  | DesignTabColorActionFailureResult;

export type DesignTabColorSuccessKind = DesignTabColorActionSuccessResult['kind'];
export type DesignTabColorFailureKind = DesignTabColorActionFailureResult['kind'];
export type DesignTabColorActionBaseFields = Omit<DesignTabColorActionBase, 'kind'>;

export type DesignTabColorSuccessExtrasByKind = {
  'reorder-swatches': Record<never, never>;
  'toggle-lock': Omit<DesignTabColorToggleLockSuccessResult, 'ok' | 'kind'>;
  'delete-color': Omit<DesignTabColorDeleteSuccessResult, 'ok' | 'kind'>;
  'upload-texture': Omit<DesignTabColorUploadTextureSuccessResult, 'ok' | 'kind'>;
  'save-custom-color': Omit<DesignTabColorSaveCustomColorSuccessResult, 'ok' | 'kind'>;
  'remove-texture': Record<never, never>;
};

export type DesignTabColorFailureReasonByKind = {
  'toggle-lock': DesignTabColorToggleLockFailureReason;
  'delete-color': DesignTabColorDeleteFailureReason;
  'upload-texture': DesignTabColorUploadTextureFailureReason;
  'save-custom-color': DesignTabColorSaveCustomColorFailureReason;
};

export type DesignTabColorFailureExtrasByKind = {
  'toggle-lock': Omit<DesignTabColorToggleLockFailureResult, 'ok' | 'kind' | 'reason' | 'message'>;
  'delete-color': Omit<DesignTabColorDeleteFailureResult, 'ok' | 'kind' | 'reason' | 'message'>;
  'upload-texture': Omit<DesignTabColorUploadTextureFailureResult, 'ok' | 'kind' | 'reason' | 'message'>;
  'save-custom-color': Omit<DesignTabColorSaveCustomColorFailureResult, 'ok' | 'kind' | 'reason' | 'message'>;
};

export type DesignTabColorSuccessResultByKind<K extends DesignTabColorSuccessKind> = Extract<
  DesignTabColorActionSuccessResult,
  { kind: K }
>;

export type DesignTabColorFailureResultByKind<K extends DesignTabColorFailureKind> = Extract<
  DesignTabColorActionFailureResult,
  { kind: K }
>;
