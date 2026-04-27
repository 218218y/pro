import type { SyntheticEvent } from 'react';

import { notesOverlayReportNonFatal } from './notes_overlay_helpers.js';

export function stopToolbarEvent(
  event:
    | {
        preventDefault?: () => void;
        stopPropagation?: () => void;
      }
    | null
    | undefined,
  op: string,
  opts?: { preventDefault?: boolean }
): void {
  try {
    if (opts?.preventDefault) event?.preventDefault?.();
    event?.stopPropagation?.();
  } catch (__wpErr) {
    notesOverlayReportNonFatal(op, __wpErr);
  }
}

export function stopToolbarBubble(event: SyntheticEvent | null | undefined, op: string): void {
  stopToolbarEvent(event, op);
}

export function stopToolbarPointer(event: SyntheticEvent | null | undefined, op: string): void {
  stopToolbarEvent(event, op, { preventDefault: true });
}
