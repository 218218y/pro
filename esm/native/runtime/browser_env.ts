// Browser environment public surface (Pure ESM).
//
// Keeps the canonical public entry small while delegating window/document/
// navigator readers and timer/fetch adapters to focused same-layer modules.

export { getBrowserDeps } from './browser_env_shared.js';

export {
  getWindowMaybe,
  assertBrowserWindow,
  getDocumentMaybe,
  assertBrowserDocument,
  getLocationSearchMaybe,
  getNavigatorMaybe,
  getUserAgentMaybe,
} from './browser_env_surface.js';

export {
  requestAnimationFrameMaybe,
  cancelAnimationFrameMaybe,
  requestIdleCallbackMaybe,
  getBrowserTimers,
  getBrowserFetchMaybe,
  queueMicrotaskMaybe,
  performanceNowMaybe,
} from './browser_env_timers.js';

export type { BrowserTimersLike } from './browser_env_timers.js';

// Keep AppContainer available for direct browser-env consumers.
export type { AppContainer } from '../../../types';
