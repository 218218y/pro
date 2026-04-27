import type { AppContainer, BuilderDepsRootLike, UnknownRecord } from '../../../types';

import { asRecord } from './record.js';
import { ensureDepsNamespace, getDepsNamespaceMaybe } from './deps_access.js';

function asBuilderDepsRoot(value: unknown): BuilderDepsRootLike | null {
  return asRecord<BuilderDepsRootLike>(value);
}

export function getBuilderDepsRoot(App: unknown): BuilderDepsRootLike | null {
  return asBuilderDepsRoot(getDepsNamespaceMaybe(App, 'builder'));
}

export function ensureBuilderDepsRoot(App: unknown): BuilderDepsRootLike {
  return ensureDepsNamespace<BuilderDepsRootLike>(App, 'builder');
}

export function getBuilderDepsNamespace(App: unknown, key: string): UnknownRecord | null {
  const root = getBuilderDepsRoot(App);
  return root && key ? asRecord<UnknownRecord>(root[key]) : null;
}

export function ensureBuilderDepsNamespace(App: unknown, key: string): UnknownRecord {
  const root = ensureBuilderDepsRoot(App);
  if (!key) return root;
  const current = asRecord<UnknownRecord>(root[key]);
  if (current) return current;
  const next: UnknownRecord = Object.create(null);
  root[key] = next;
  return next;
}

export function isBuilderDepsReady(App: unknown): boolean {
  const root = getBuilderDepsRoot(App);
  return !!(root && root.__ready === true);
}

export function setBuilderDepsReady(App: unknown, ready: boolean = true): BuilderDepsRootLike {
  const root = ensureBuilderDepsRoot(App);
  root.__ready = ready === true;
  return root;
}

export function requireBuilderDepsRoot(
  App: AppContainer,
  label = 'runtime/builder_deps_access.require'
): BuilderDepsRootLike {
  const root = getBuilderDepsRoot(App);
  if (!root) {
    throw new Error(`[WardrobePro] Builder deps missing (${label}): expected deps.builder root`);
  }
  return root;
}

export function requireBuilderDepsReady(
  App: AppContainer,
  label = 'runtime/builder_deps_access.ready'
): BuilderDepsRootLike {
  const root = requireBuilderDepsRoot(App, label);
  if (root.__ready !== true) {
    throw new Error(
      `[WardrobePro] Builder deps not ready (${label}): expected deps.builder.__ready === true`
    );
  }
  return root;
}
