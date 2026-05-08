// Runtime assertions for Pure ESM mode.
//
// Goals:
// - No reliance on globals (no window App / global-scope App / global-scope THREE).
// - Fail fast with clear errors when required surfaces are missing.

import type {
  AppContainer,
  Deps3D,
  StoreLike,
  StateKernelLike,
  ThreeLike,
  ActionsNamespaceLike,
  ActionsDomainsLike,
} from '../../../types';

import { asRecord } from './record.js';
import { getActionNamespace } from './actions_access_core.js';
import { getDepMaybe, getDepsRootMaybe } from './deps_access.js';
import { getServiceSlotMaybe } from './services_root_access.js';
import { getStorePatchSurfaceMaybe } from './store_surface_access.js';

type BrowserDepsLike = {
  window?: Window | null;
  document?: Document | null;
};

type DepsCandidate = {
  browser?: BrowserDepsLike | null;
  THREE?: unknown;
};

type ActionsSurface = ActionsNamespaceLike & ActionsDomainsLike;

type StoreSurface = Pick<StoreLike, 'getState' | 'patch'> & Partial<StoreLike>;

function readDeps(app: AppContainer): DepsCandidate | null {
  return asRecord<DepsCandidate>(getDepsRootMaybe(app));
}

function readBrowserDeps(app: AppContainer): BrowserDepsLike | null {
  return asRecord<BrowserDepsLike>(getDepMaybe(app, 'browser'));
}

function hasThreeDeps(value: unknown): value is Deps3D {
  const deps = asRecord<DepsCandidate>(value);
  return !!(deps && deps.THREE);
}

function isStoreSurface(value: unknown): value is StoreLike {
  const store = asRecord<StoreSurface>(value);
  return !!(store && typeof store.getState === 'function' && typeof store.patch === 'function');
}

function isActionsSurface(value: unknown): value is ActionsSurface {
  const actions = asRecord<ActionsSurface>(value);
  return !!(actions && typeof actions.patch === 'function');
}

function isAppContainer(value: unknown): value is AppContainer {
  return !!value && typeof value === 'object';
}

function isStateKernelSurface(value: unknown): value is StateKernelLike {
  const kernel = asRecord<StateKernelLike>(value);
  if (!kernel) return false;
  const hasBuildState = typeof kernel.getBuildState === 'function';
  const hasConfigSurface =
    typeof kernel.captureConfig === 'function' ||
    typeof kernel.getStoreConfig === 'function' ||
    typeof kernel.patchConfigScalar === 'function' ||
    typeof kernel.applyConfig === 'function';
  return hasBuildState && hasConfigSurface;
}

export function asObject<T extends object = Record<string, unknown>>(x: unknown): T | null {
  // Preserve the established contract: arrays are accepted by this broad object helper.
  return x && typeof x === 'object' ? asRecord<T>(x) : null;
}

export function assertApp(app: unknown, label = ''): AppContainer {
  if (!isAppContainer(app)) {
    const where = label ? ` (${label})` : '';
    throw new Error(`[WardrobePro][ESM] Missing app object${where}. Pass the App instance explicitly.`);
  }
  return app;
}

export function assertDeps(app: unknown, label = ''): Deps3D {
  const A = assertApp(app, label);
  const deps = readDeps(A);
  if (!deps) {
    const where = label ? ` (${label})` : '';
    throw new Error(
      `[WardrobePro][ESM] Missing app.deps surface${where}. Ensure boot({ deps }) injects dependencies into the app.`
    );
  }

  if (!hasThreeDeps(deps)) {
    const where = label ? ` (${label})` : '';
    throw new Error(
      `[WardrobePro][ESM] Missing dep: app.deps.THREE${where}. Ensure boot({ deps: { THREE } }) injects THREE (ESM/module) before use.`
    );
  }
  return deps;
}

export function assertDep(app: unknown, key: string, label = ''): unknown {
  const deps = assertDeps(app, label);
  const where = label ? ` (${label})` : '';
  const hasOwn = Object.prototype.hasOwnProperty;
  if (!key || typeof key !== 'string' || !hasOwn.call(deps, key) || deps[key] == null) {
    throw new Error(
      `[WardrobePro][ESM] Missing dep: app.deps.${String(key || '<?>')}${where}. Inject via boot({ deps: { ${String(
        key || 'dep'
      )}: value } }).`
    );
  }
  return deps[key];
}

export function assertDepKeys(app: unknown, keys: string[] | unknown, label = ''): Deps3D {
  const deps = assertDeps(app, label);
  const arr = Array.isArray(keys) ? keys : [];
  for (let i = 0; i < arr.length; i++) {
    const k = arr[i];
    assertDep(app, k, label);
  }
  return deps;
}

export function assertTHREE(app: unknown, label = ''): ThreeLike {
  return assertDeps(app, label).THREE;
}

export function assertStore(app: unknown, label = ''): StoreLike {
  const A = assertApp(app, label);
  const store = getStorePatchSurfaceMaybe(A);
  if (isStoreSurface(store)) return store;

  const where = label ? ` (${label})` : '';
  throw new Error(
    `[WardrobePro][ESM] Missing canonical store surface${where}. Ensure platform installs store getState/patch.`
  );
}

export function assertActions(app: unknown, label = ''): ActionsNamespaceLike & ActionsDomainsLike {
  const A = assertApp(app, label);
  const actions = getActionNamespace(A, '');
  if (isActionsSurface(actions)) return actions;

  const where = label ? ` (${label})` : '';
  throw new Error(
    `[WardrobePro][ESM] Missing canonical actions surface${where}. Ensure platform installs actions patch/ui/config/runtime namespaces.`
  );
}

export function assertStateKernel(app: unknown, label = ''): StateKernelLike {
  const A = assertApp(app, label);
  const kernel = getServiceSlotMaybe<StateKernelLike>(A, 'stateKernel');
  if (isStateKernelSurface(kernel)) return kernel;

  const where = label ? ` (${label})` : '';
  throw new Error(
    `[WardrobePro][ESM] Missing app.services.stateKernel surface${where}. Ensure kernel installs canonical getBuildState + config surfaces.`
  );
}

export function getWindowMaybe(app: unknown): Window | null {
  try {
    const A = assertApp(app);
    const browser = readBrowserDeps(A);
    const w = browser?.window;
    return w && typeof w === 'object' ? w : null;
  } catch {
    return null;
  }
}

export function assertWindow(app: unknown, label = ''): Window {
  const w = getWindowMaybe(app);
  if (!w) {
    const where = label ? ` (${label})` : '';
    throw new Error(`[WardrobePro][ESM] Missing browser window${where}. Inject deps.browser.window.`);
  }
  return w;
}

export function getDocumentMaybe(app: unknown): Document | null {
  try {
    const A = assertApp(app);
    const browser = readBrowserDeps(A);
    const d = browser?.document;
    return d && typeof d === 'object' ? d : null;
  } catch {
    return null;
  }
}

export function assertDocument(app: unknown, label = ''): Document {
  const d = getDocumentMaybe(app);
  if (!d) {
    const where = label ? ` (${label})` : '';
    throw new Error(`[WardrobePro][ESM] Missing browser document${where}. Inject deps.browser.document.`);
  }
  return d;
}

export const assertBrowserWindow = assertWindow;
export const assertBrowserDocument = assertDocument;
