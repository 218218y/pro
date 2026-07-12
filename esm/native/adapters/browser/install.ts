// Browser adapters install surface (Pure ESM)

export { installBrowserDialogsAdapter } from './dialogs.js';
export { installBrowserEnvAdapter } from './env.js';
export { installDoorStatusCssAdapter } from './door_status_css.js';
export { installBrowserDomAdapter } from './dom.js';
export { installBrowserUiOpsAdapter } from './ui_ops.js';
export { installBrowserSurfaceAdapter } from './surface.js';
export {
  BROWSER_CSP_TELEMETRY_CONTRACT,
  createCspViolationRecord,
  installBrowserCspTelemetry,
} from './csp_telemetry.js';
export type { BrowserCspTelemetryOptions } from './csp_telemetry.js';
export { makeActiveElementIdReader } from './active_element.js';
