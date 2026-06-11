// Shared helper primitives for runtime/actions_access (Pure ESM)
//
// Keep public action helpers in actions_access.ts so existing imports/tests stay stable.
// This file owns the low-level record/binding helpers and delegates meta-action stub policy
// to a focused owner.

import type { ActionsNamespaceLike, UnknownRecord } from '../../../types';

import {
  copyActionStubMeta,
  ensureMetaActionsNamespace,
  isActionStubFn,
  markActionStub,
  readActionStubMeta,
  type ActionAccessFn,
  type ActionCallable,
  type ActionNode,
} from './meta_actions_namespace.js';

export type { ActionAccessFn, ActionCallable, ActionNode };

export type ActionBinding<T extends ActionAccessFn = ActionAccessFn> = {
  owner: unknown;
  fn: T;
};

export type ActionsRootLike = ActionsNamespaceLike & ActionNode;
export { readActionStubMeta, isActionStubFn, markActionStub, copyActionStubMeta, ensureMetaActionsNamespace };

export function isRecord(value: unknown): value is ActionNode {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asRecord(value: unknown): ActionNode | null {
  return isRecord(value) ? value : null;
}

function isActionFn<T extends ActionAccessFn = ActionAccessFn>(value: unknown): value is T {
  return typeof value === 'function';
}

function asActionFn<T extends ActionAccessFn = ActionAccessFn>(value: unknown): T | null {
  return isActionFn<T>(value) ? value : null;
}

export function invokeActionFn<T extends ActionAccessFn>(fn: T, args: Parameters<T>): ReturnType<T> {
  return Reflect.apply(fn, undefined, args);
}

export function getValueAtPath(root: unknown, path: string): unknown {
  const obj = asRecord(root);
  if (!obj) return undefined;

  const parts = path.split('.').filter(Boolean);
  let cur: unknown = obj;
  if (!parts.length) return cur;
  for (const part of parts) {
    const node = asRecord(cur);
    if (!node) return undefined;
    cur = node[part];
  }
  return cur;
}

export function getActionBindingFromRoot<T extends ActionAccessFn = ActionAccessFn>(
  root: unknown,
  path: string
): ActionBinding<T> | null {
  const obj = asRecord(root);
  if (!obj) return null;

  const parts = path.split('.').filter(Boolean);
  let cur: unknown = obj;
  let owner: unknown = obj;
  for (const part of parts) {
    const node = asRecord(cur);
    if (!node) return null;
    owner = node;
    cur = node[part];
  }

  const fn = asActionFn<T>(cur);
  return fn ? { owner, fn } : null;
}

export function bindAction<TArgs extends unknown[], TResult>(
  owner: unknown,
  fn: (...args: TArgs) => TResult
): (...args: TArgs) => TResult {
  const bound = (...args: TArgs): TResult => Reflect.apply(fn, owner, args);
  return copyActionStubMeta(bound, fn);
}

function ensureActionNode(value: unknown): ActionNode {
  return asRecord(value) ?? Object.create(null);
}

export function ensureActionsShape(node: Partial<ActionsNamespaceLike> & UnknownRecord): ActionsRootLike {
  const meta = ensureMetaActionsNamespace(ensureActionNode(node.meta));
  return Object.assign(node, { meta });
}
