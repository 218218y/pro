export type SettingsBackupActionKind = 'export' | 'import';

export type SettingsBackupExportFailureReason = 'download-unavailable' | 'busy' | 'error';

export type SettingsBackupImportFailureReason =
  | 'cancelled'
  | 'invalid-json'
  | 'invalid-backup'
  | 'read-failed'
  | 'models-unavailable'
  | 'busy'
  | 'error';

export type SettingsBackupExportSuccessResult = {
  ok: true;
  kind: 'export';
  modelsCount: number;
  colorsCount: number;
};

export type SettingsBackupImportSuccessResult = {
  ok: true;
  kind: 'import';
  modelsAdded: number;
  colorsAdded: number;
};

export type SettingsBackupSuccessResult =
  | SettingsBackupExportSuccessResult
  | SettingsBackupImportSuccessResult;

export type SettingsBackupExportFailureResult = {
  ok: false;
  kind: 'export';
  reason: SettingsBackupExportFailureReason;
  message?: string;
};

export type SettingsBackupImportFailureResult = {
  ok: false;
  kind: 'import';
  reason: SettingsBackupImportFailureReason;
  message?: string;
};

export type SettingsBackupFailureResult =
  | SettingsBackupExportFailureResult
  | SettingsBackupImportFailureResult;

export type SettingsBackupActionResult = SettingsBackupSuccessResult | SettingsBackupFailureResult;
