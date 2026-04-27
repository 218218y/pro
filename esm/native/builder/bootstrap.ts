// Native Builder bootstrap (ESM)
//
// Converted from `js/builder/pro_builder_bootstrap.js` into a real ES module:
// - No IIFE
// - No implicit reliance on `window App` (accepts an App reference)
// - No auto-run on import (call `installBuilderBootstrap(App)` explicitly)
//
// Responsibility:
// - Seeds and owns `App.deps.builder` as the explicit dependency surface for builder code.
// - Idempotent: safe to call multiple times.
//
// Notes:
// - This module is intentionally thin: focused bootstrap owners now hold context binding,
//   namespace binding maps, and drawer-meta wakeup follow-through.
// - BuilderCore should validate required deps at runtime.

import { assertTHREE } from '../runtime/api.js';
import { ensureBuilderDepsRoot, setBuilderDepsReady } from '../runtime/builder_deps_access.js';
import { ensureDepsRoot } from '../runtime/deps_access.js';

import type { AppContainer, BuilderDepsRootLike } from '../../../types/index.js';
import {
  createBuilderNamespaceRoots,
  getBuilderDeps,
  installBuilderDepsNamespaces,
  pickBuilderApp,
  refreshBuilderNamespaceInstallContexts,
} from './bootstrap_shared.js';
import { createBuilderNamespaceBindingMap } from './bootstrap_bindings.js';

export { getBuilderDeps };

export function installBuilderBootstrap(App: AppContainer): BuilderDepsRootLike {
  App = pickBuilderApp(App, 'native/builder/bootstrap.install');

  // Keep the legacy behavior: in non-browser contexts do nothing (but still be safe).
  // We still allow seeding builder deps on the provided App object.

  // Canonical surface for builder deps.
  ensureDepsRoot(App);
  const depsRoot = ensureBuilderDepsRoot(App);

  // Mark bootstrap install once, but allow re-running the wiring step.
  // This lets early boot seed builder deps, and late boot (after services/UI) fill missing keys.
  if (!depsRoot.__bootstrap_v1) depsRoot.__bootstrap_v1 = true;

  const namespaces = createBuilderNamespaceRoots(App);
  refreshBuilderNamespaceInstallContexts(namespaces, App);
  installBuilderDepsNamespaces(namespaces, createBuilderNamespaceBindingMap());

  // Validate required deps exist (explicit deps only).
  // Pure ESM: THREE must be injected via App.deps.THREE.
  assertTHREE(App, 'native/builder/bootstrap.THREE');

  // Mark as ready. BuilderCore does stricter per-function validation.
  setBuilderDepsReady(App, true);

  return depsRoot;
}
