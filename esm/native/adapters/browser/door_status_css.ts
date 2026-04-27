// Browser adapter: body CSS/state sync.
//
// Goal: allow core/runtime services to update CSS-driven state without
// touching document/body directly.

import type { AppContainer, BrowserNamespaceLike } from '../../../../types';

import { assertApp, getDocumentMaybe } from '../../runtime/api.js';
import { ensureBrowserSurface } from '../../runtime/browser_surface_access.js';
import { installStableSurfaceMethod } from '../../runtime/stable_surface_methods.js';

type DoorStatusCssSurface = BrowserNamespaceLike & {
  setDoorStatusCss?: (isOpen: boolean) => void;
  __wpSetDoorStatusCss?: (isOpen: boolean) => void;
};

function ensureDoorStatusCssSurface(App: AppContainer): DoorStatusCssSurface {
  return ensureBrowserSurface(App);
}

export function installDoorStatusCssAdapter(app: unknown): AppContainer {
  const App = assertApp(app, 'adapters/browser/door_status_css.install');
  const b = ensureDoorStatusCssSurface(App);

  installStableSurfaceMethod(b, 'setDoorStatusCss', '__wpSetDoorStatusCss', () => {
    return function (isOpen: boolean) {
      try {
        const doc = getDocumentMaybe(App);
        if (!doc || !doc.body || typeof doc.body.setAttribute !== 'function') return;
        doc.body.setAttribute('data-door-status', isOpen ? 'open' : 'closed');
      } catch {
        // ignore
      }
    };
  });

  return App;
}
