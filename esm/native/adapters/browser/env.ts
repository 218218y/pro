// Browser adapter: environment helpers (location/events/raf/clipboard/viewport).
//
// Keeps the public adapter owner small while delegating surface/timer wiring
// and clipboard support to focused same-layer seams.

import type { AppContainer } from '../../../../types';

import { assertApp } from '../../runtime/api.js';

import { installBrowserClipboardSurface } from './env_clipboard.js';
import { ensureBrowserEnvSurface } from './env_shared.js';
import { installBrowserEnvBaseSurface } from './env_surface.js';

/**
 * Install browser env adapter surfaces on App.
 */
export function installBrowserEnvAdapter(app: unknown): AppContainer {
  const App = assertApp(app, 'adapters/browser/env.install');
  const browser = ensureBrowserEnvSurface(App);

  installBrowserEnvBaseSurface(App, browser);
  installBrowserClipboardSurface(App, browser);

  return App;
}
