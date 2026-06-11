// Browser adapters: unified surface installer (Pure ESM)
//
// Goal:
// - Provide ONE boot step that installs the entire stable `App.browser` surface.
// - Keep all direct window/document/navigator access isolated to adapters/browser/*.
// - Make it hard to forget installing a piece (dialogs/env/dom/ui ops/css).
//
// This module is intentionally tiny: it composes the existing adapters.

import type { AppContainer } from '../../../../types';

import { assertApp } from '../../runtime/api.js';
import { ensureBrowserSurface } from '../../runtime/browser_surface_access.js';

import { installBrowserDialogsAdapter } from './dialogs.js';
import { installBrowserEnvAdapter } from './env.js';
import { installBrowserDomAdapter } from './dom.js';
import { installDoorStatusCssAdapter } from './door_status_css.js';
import { installBrowserUiOpsAdapter } from './ui_ops.js';

function ensureBrowserSurfaceState(App: AppContainer) {
  return ensureBrowserSurface(App);
}

/**
 * Install the full browser adapter surface.
 */
export function installBrowserSurfaceAdapter(app: unknown): AppContainer {
  const App = assertApp(app, 'adapters/browser/surface.install');

  // Idempotent by composition: child installers only fill missing canonical browser seams.
  ensureBrowserSurfaceState(App);

  // Compose sub-adapters (each one is idempotent).
  installBrowserDialogsAdapter(App);
  installBrowserEnvAdapter(App);
  installBrowserDomAdapter(App);
  installDoorStatusCssAdapter(App);
  installBrowserUiOpsAdapter(App);

  return App;
}
