// WardrobePro pro entrypoint (Pure ESM)
//
// Design goals:
// - No static third-party imports (small local boot-policy helper is OK).
// - Early error handlers (catch unhandled boot/runtime errors).
// - Best-effort fatal overlay in browser; console reporting in non-DOM environments.

import { autoStartEntryPro } from './entry_pro_start.js';

export { showBootFatalOverlay } from './entry_pro_overlay.js';
export type { BootFatalOverlayController, BootFatalOverlayOpts } from './entry_pro_shared.js';

autoStartEntryPro();
