export type ExportUiActionKind = 'snapshot' | 'copy' | 'dual' | 'render-sketch' | 'auto-zoom';
export type ExportUiActionReason = 'not-installed' | 'error' | 'busy';

export type ExportUiActionResult =
  | {
      ok: true;
      kind: ExportUiActionKind;
      reason?: undefined;
      message?: undefined;
    }
  | {
      ok: false;
      kind: ExportUiActionKind;
      reason: ExportUiActionReason;
      message?: string;
    };
