// WardrobePro release entry (Pure ESM)
//
// Purpose:
// - Keep release HTML simple: it loads THREE + this single bundle, then calls boot({ deps }).
// - Enforce React UI mode (uiFramework='react') for a React-only build.
// - Mount the React UI roots (#reactSidebarRoot + #reactOverlayRoot) after the core boot sequence.
// - IMPORTANT: explicitly call app.boot.start() (release HTML does not run entry-page wiring).
//
// NOTE:
// This file is used by tools/wp_bundle.js as the bundling entry.

import { boot as bootCore, createApp as createAppCore } from './main.js';
import { runBrowserBootRuntime } from './boot/boot_browser_runtime.js';
import { bootReactUi } from './native/ui/react/boot_react_ui.js';

import { getBrowserDocumentFromDeps, getBrowserWindowFromDeps } from './native/runtime/runtime_globals.js';
import { validateReactBootDeps } from './native/runtime/runtime_boot_config.js';

import type { AppContainer, Deps } from '../types';

function requireReleaseDeps(deps: Deps | null | undefined): Deps {
  if (!deps) throw new Error('[WardrobePro][release] boot deps are required.');
  return validateReactBootDeps(deps, 'release_main');
}

async function mountReactUi(app: AppContainer, _win: Window, doc: Document): Promise<void> {
  bootReactUi({ app, document: doc });
}

export function createApp(opts: { deps: Deps }): AppContainer {
  const deps = requireReleaseDeps(opts.deps);
  return createAppCore({ deps });
}

export async function boot(opts: { deps: Deps }): Promise<AppContainer> {
  const deps = requireReleaseDeps(opts.deps);
  const doc = getBrowserDocumentFromDeps(deps);
  const win = getBrowserWindowFromDeps(deps);
  if (!win || !doc) {
    throw new Error('[WardrobePro][release] Injected browser window and document are required.');
  }

  const app = await bootCore({ deps });
  await runBrowserBootRuntime({
    app,
    window: win,
    document: doc,
    mountReactUi,
    startBootUi: true,
  });

  return app;
}
