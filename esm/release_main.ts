// WardrobePro release entry (Pure ESM)
//
// Purpose:
// - Keep release HTML simple: it loads THREE + this single bundle, then calls boot({ deps }).
// - Enforce React UI mode (uiFramework='react') for a React-only build.
// - Mount the React UI roots (#reactSidebarRoot + #reactOverlayRoot) after the core boot sequence.
// - IMPORTANT: explicitly call app.boot.start() (release HTML doesn't run legacy wiring).
//
// NOTE:
// This file is used by tools/wp_bundle.js as the bundling entry.

import { boot as bootCore, createApp as createAppCore } from './main.js';
import { runBrowserBootRuntime } from './boot/boot_browser_runtime.js';
import { bootReactUi } from './native/ui/react/boot_react_ui.js';

import {
  ensureUiFrameworkFlag,
  getBrowserDocumentFromDeps,
  getBrowserWindowFromDeps,
} from './native/runtime/runtime_globals.js';
import { validateRuntimeConfig, validateRuntimeFlags } from './native/runtime/runtime_config_validation.js';

import type { AppContainer, Deps } from '../types';

function ensureReactFlags(deps: Deps): Deps {
  // React-only build.
  ensureUiFrameworkFlag(deps, 'react');

  // Normalize flags/config (P9): keep release entry resilient to deployment mistakes.
  try {
    if (deps.flags && typeof deps.flags === 'object') deps.flags = validateRuntimeFlags(deps.flags).flags;
  } catch {
    // ignore
  }
  try {
    if (deps.config && typeof deps.config === 'object')
      deps.config = validateRuntimeConfig(deps.config).config;
  } catch {
    // ignore
  }

  return deps;
}

async function mountReactUi(app: AppContainer, win: Window, doc: Document): Promise<void> {
  void win;
  if (typeof bootReactUi !== 'function') return;
  bootReactUi({ app, document: doc, mountId: 'reactSidebarRoot' });
}

export function createApp(opts: { deps?: Deps } = {}): AppContainer {
  const deps = opts.deps;
  if (deps) ensureReactFlags(deps);
  return createAppCore({ deps });
}

export async function boot(opts: { deps?: Deps } = {}): Promise<AppContainer> {
  const deps = opts.deps;
  if (deps) ensureReactFlags(deps);

  const app = await bootCore({ deps });
  const doc = deps ? getBrowserDocumentFromDeps(deps) : null;
  const win = deps ? getBrowserWindowFromDeps(deps) : null;

  await runBrowserBootRuntime({
    app,
    window: win,
    document: doc,
    addReactBodyClass: true,
    mountReactUi,
    startBootUi: true,
  });

  return app;
}
