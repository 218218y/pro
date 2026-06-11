import { assertApp } from '../runtime/api.js';
import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';
import {
  ensureBuilderDepsNamespace,
  ensureBuilderDepsRoot,
  getBuilderDepsRoot,
} from '../runtime/builder_deps_access.js';

import type { AppContainer, BuilderDepsRootLike, UnknownRecord } from '../../../types/index.js';

export type BuilderNamespace = UnknownRecord;
export type BuilderNamespaceName = 'util' | 'materials' | 'modules' | 'contents' | 'notes' | 'render';
export type BuilderNamespaceRoots = Record<BuilderNamespaceName, BuilderNamespace>;
export type BuilderNamespaceBindingInstallMode = 'missing' | 'value';
export type BuilderNamespaceCallable = (...args: never[]) => unknown;
export type BuilderBootstrapInstallContext = { App: AppContainer };
export type BuilderNamespaceBinding = Readonly<{
  key: string;
  mode: BuilderNamespaceBindingInstallMode;
  value: unknown;
  stableKey?: string | null;
  bind?: ((context: BuilderBootstrapInstallContext) => unknown) | null;
}>;
export type BuilderNamespaceBindingMap = Record<BuilderNamespaceName, readonly BuilderNamespaceBinding[]>;

const BUILDER_NAMESPACE_NAMES: readonly BuilderNamespaceName[] = [
  'util',
  'materials',
  'modules',
  'contents',
  'notes',
  'render',
];

const builderBootstrapInstallContexts = new WeakMap<object, BuilderBootstrapInstallContext>();

export function createBuilderBootstrapInstallContext(App: AppContainer): BuilderBootstrapInstallContext {
  return { App };
}

export function refreshBuilderBootstrapInstallContext(
  context: BuilderBootstrapInstallContext,
  App: AppContainer
): BuilderBootstrapInstallContext {
  context.App = App;
  return context;
}

export function resolveBuilderBootstrapInstallContext(
  namespace: BuilderNamespace,
  App: AppContainer
): BuilderBootstrapInstallContext {
  const owner = asRecord(namespace);
  if (!owner) return createBuilderBootstrapInstallContext(App);
  let context = builderBootstrapInstallContexts.get(owner);
  if (!context) {
    context = createBuilderBootstrapInstallContext(App);
    builderBootstrapInstallContexts.set(owner, context);
    return context;
  }
  return refreshBuilderBootstrapInstallContext(context, App);
}

export function getBuilderBootstrapInstallContext(
  namespace: BuilderNamespace
): BuilderBootstrapInstallContext | null {
  const owner = asRecord(namespace);
  return owner ? builderBootstrapInstallContexts.get(owner) || null : null;
}

export function pickBuilderApp(app: unknown, label = 'native/builder/bootstrap'): AppContainer {
  return assertApp(app, label);
}

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object';
}

export function asRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

export function asBuilderNamespace(value: unknown): BuilderNamespace {
  return asRecord(value) || {};
}

function readBuilderNamespaceEntry(namespace: BuilderNamespace, key: string): unknown {
  return namespace[key];
}

function shouldInstallMissingBinding(current: unknown, nextValue: unknown): boolean {
  if (current == null) return true;
  if (nextValue == null) return false;
  if (typeof nextValue === 'function') return typeof current !== 'function';
  return false;
}

function exportMissing(obj: unknown, key: string, val: unknown): void {
  const rec = asRecord(obj);
  if (!rec) return;
  if (!shouldInstallMissingBinding(rec[key], val)) return;
  rec[key] = val;
}

function exportValue(obj: unknown, key: string, val: unknown): void {
  const rec = asRecord(obj);
  if (!rec || val == null) return;
  rec[key] = val;
}

function resolveBuilderNamespaceBindingValue(
  binding: BuilderNamespaceBinding,
  context: BuilderBootstrapInstallContext
): unknown {
  if (typeof binding.bind === 'function') return binding.bind(context);
  return binding.value;
}

function isBuilderNamespaceCallable(value: unknown): value is BuilderNamespaceCallable {
  return typeof value === 'function';
}

function shouldInstallStableBuilderBinding(
  namespace: BuilderNamespace,
  binding: BuilderNamespaceBinding,
  nextValue: unknown
): boolean {
  if (
    binding.stableKey &&
    isBuilderNamespaceCallable(readBuilderNamespaceEntry(namespace, binding.stableKey))
  ) {
    return true;
  }
  return binding.mode === 'value'
    ? isBuilderNamespaceCallable(nextValue)
    : shouldInstallMissingBinding(readBuilderNamespaceEntry(namespace, binding.key), nextValue);
}

function createStableBuilderNamespaceBinding(
  namespace: BuilderNamespace,
  binding: BuilderNamespaceBinding,
  context: BuilderBootstrapInstallContext
): BuilderNamespaceCallable {
  const stableKey = binding.stableKey || `__wpBuilderBootstrap_${String(binding.key)}`;
  return installStableSurfaceMethod<BuilderNamespaceCallable>(namespace, binding.key, stableKey, () => {
    const stableBinding: BuilderNamespaceCallable = (...args) => {
      const callable = resolveBuilderNamespaceBindingValue(binding, context);
      if (!isBuilderNamespaceCallable(callable)) return undefined;
      return Reflect.apply(callable, undefined, args);
    };
    return stableBinding;
  });
}

export function installBuilderNamespaceBindings(
  namespace: BuilderNamespace,
  bindings: readonly BuilderNamespaceBinding[]
): void {
  const context = getBuilderBootstrapInstallContext(namespace);
  if (!context) return;
  for (const binding of bindings) {
    const nextValue = resolveBuilderNamespaceBindingValue(binding, context);
    if (shouldInstallStableBuilderBinding(namespace, binding, nextValue)) {
      createStableBuilderNamespaceBinding(namespace, binding, context);
      continue;
    }
    if (binding.mode === 'missing') exportMissing(namespace, binding.key, nextValue);
    else exportValue(namespace, binding.key, nextValue);
  }
}

export function installBuilderDepsNamespaces(
  namespaces: BuilderNamespaceRoots,
  bindingMap: BuilderNamespaceBindingMap
): void {
  for (const namespaceName of BUILDER_NAMESPACE_NAMES) {
    installBuilderNamespaceBindings(namespaces[namespaceName], bindingMap[namespaceName]);
  }
}

export function createBuilderNamespaceRoots(App: AppContainer): BuilderNamespaceRoots {
  return {
    util: asBuilderNamespace(ensureBuilderDepsNamespace(App, 'util')),
    materials: asBuilderNamespace(ensureBuilderDepsNamespace(App, 'materials')),
    modules: asBuilderNamespace(ensureBuilderDepsNamespace(App, 'modules')),
    contents: asBuilderNamespace(ensureBuilderDepsNamespace(App, 'contents')),
    notes: asBuilderNamespace(ensureBuilderDepsNamespace(App, 'notes')),
    render: asBuilderNamespace(ensureBuilderDepsNamespace(App, 'render')),
  };
}

export function refreshBuilderNamespaceInstallContexts(
  namespaces: BuilderNamespaceRoots,
  App: AppContainer
): void {
  for (const namespaceName of BUILDER_NAMESPACE_NAMES) {
    resolveBuilderBootstrapInstallContext(namespaces[namespaceName], App);
  }
}

export function getBuilderDeps(App: AppContainer): BuilderDepsRootLike {
  App = pickBuilderApp(App, 'native/builder/bootstrap.getBuilderDeps');
  return getBuilderDepsRoot(App) || ensureBuilderDepsRoot(App);
}
