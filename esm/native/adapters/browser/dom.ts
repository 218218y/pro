// Browser adapter: canvas creation (Pure ESM).
//
// Goal:
// - Keep direct document access OUT of platform/builder/kernel/services.
// - Provide a tiny, stable adapter surface for
//   - App.platform.createCanvas
//
// NOTE (Migration):
// - Older versions installed a larger App.dom helper surface (cached `$`, `qs`, ...).
// - The current UI/runtime no longer depends on App.dom. To avoid keeping dead code
//   around, we only install the minimal adapter pieces that are still used.

import type { AppContainer, BrowserNamespaceLike, PlatformNamespace } from '../../../../types';

import { assertApp, assertBrowserDocument } from '../../runtime/api.js';
import { ensurePlatformRoot } from '../../runtime/app_roots_access.js';
import { ensureBrowserDomState, ensureBrowserSurface } from '../../runtime/browser_surface_access.js';
import { installStableSurfaceMethod } from '../../runtime/stable_surface_methods.js';

type BrowserDomSurface = BrowserNamespaceLike;

type CanvasFactory = NonNullable<PlatformNamespace['createCanvas']>;

type BrowserPlatformSurface = PlatformNamespace & {
  __wpCreateCanvas?: CanvasFactory;
};

function ensurePlatformSurface(App: AppContainer): BrowserPlatformSurface {
  return ensurePlatformRoot(App);
}

function createCanvasFactory(doc: Document): CanvasFactory {
  return function createCanvas(width: number, height: number) {
    const w = Number.isFinite(width) && width > 0 ? width : 1;
    const h = Number.isFinite(height) && height > 0 ? height : 1;
    try {
      // Prefer OffscreenCanvas when available (no DOM needed).
      if (typeof OffscreenCanvas === 'function') {
        return new OffscreenCanvas(w, h);
      }
    } catch {
      // ignore
    }
    try {
      const canvas = doc.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      return canvas;
    } catch {
      return null;
    }
  };
}

/**
 * Install minimal browser DOM adapter surfaces.
 */
export function installBrowserDomAdapter(app: unknown): AppContainer {
  const App = assertApp(app, 'adapters/browser/dom.install');

  // Ensure parent namespaces exist.
  const browser: BrowserDomSurface = ensureBrowserSurface(App);
  const platform = ensurePlatformSurface(App);

  // Require an injected document (Pure ESM boot).
  const doc = assertBrowserDocument(App, 'adapters/browser/dom.install');

  // Keep an adapter namespace for future expansion (do NOT treat as public API).
  ensureBrowserDomState(App);

  // Platform helper: create a canvas without leaking document into platform/builder.
  installStableSurfaceMethod<CanvasFactory>(platform, 'createCanvas', '__wpCreateCanvas', () => {
    return createCanvasFactory(doc);
  });

  // Keep the local binding live for future adapter expansion / tests.
  void browser;

  return App;
}
