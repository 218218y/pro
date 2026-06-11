// Canvas picking (ESM core)
//
// This is a native ESM version of `js/services/pro_services_canvas_picking.js`
// with **no automatic global side-effects**.
//
// It exports the NDC handlers so modern code can import them directly,
// while `esm/native/services/canvas_picking.js` provides the explicit installer
// for legacy compatibility (App.core.canvas.*).

import { __wp_getApp, __wp_reportPickingIssue } from './canvas_picking_core_helpers.js';
import { __coreHandleCanvasClickNDC } from './canvas_picking_click_flow.js';
import { __coreHandleCanvasHoverNDC } from './canvas_picking_hover_flow.js';

// NOTE: legacy auto-registration removed in ESM core; use installCanvasPickingService().

export function handleCanvasClickNDC(ndcX: number, ndcY: number, app: unknown): void {
  const App = __wp_getApp(app);
  if (!App) return;
  try {
    return __coreHandleCanvasClickNDC(App, ndcX, ndcY);
  } catch (err) {
    __wp_reportPickingIssue(
      App,
      err,
      { where: 'canvasPicking', op: 'click', throttleMs: 500 },
      { failFast: true }
    );
    return;
  }
}

export function handleCanvasHoverNDC(ndcX: number, ndcY: number, app: unknown): boolean {
  const App = __wp_getApp(app);
  if (!App) return false;
  try {
    return __coreHandleCanvasHoverNDC(App, ndcX, ndcY);
  } catch (err) {
    __wp_reportPickingIssue(App, err, { where: 'canvasPicking', op: 'hover.exported', throttleMs: 750 });
    return false;
  }
}
