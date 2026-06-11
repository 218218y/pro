import type { AppContainer } from '../../../types';
import { __wp_toast } from './canvas_picking_core_helpers.js';

export function toastSketchBoxContentBlocked(
  App: AppContainer,
  contentKind: string | null | undefined,
  blockedReason: string | null | undefined
): void {
  if (!blockedReason) return;
  const itemLabel =
    contentKind === 'shelf'
      ? 'מדף'
      : contentKind === 'rod'
        ? 'מוט תלייה'
        : contentKind === 'storage'
          ? 'אוגר מצעים'
          : contentKind === 'ext_drawers' || contentKind === 'regular_ext_drawers'
            ? 'מגירות חיצוניות'
            : 'פריט';
  const message =
    blockedReason === 'no-room'
      ? `אין מקום בתא זה לבניית ${itemLabel}.`
      : `לא ניתן לבנות ${itemLabel} בתא זה.`;
  __wp_toast(App, message, 'error');
}
