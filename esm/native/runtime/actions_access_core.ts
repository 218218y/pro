// Core App.actions path/binding accessors (Pure ESM)
//
// This file owns generic root/namespace/action resolution. Domain-specific helpers
// and semantic mutation flows live in sibling same-layer files.

import type { ActionsNamespaceLike, UnknownCallable, UnknownRecord } from '../../../types';

import {
  asRecord as asActionRecord,
  bindAction as bindSharedAction,
  getActionBindingFromRoot as getSharedActionBindingFromRoot,
  getValueAtPath as getSharedValueAtPath,
  invokeActionFn as invokeSharedActionFn,
  type ActionBinding as SharedActionBinding,
} from './actions_access_shared.js';
import { ensureActionsRootSlot, getActionsRootMaybe } from './app_roots_access.js';

export type ActionCallable = UnknownCallable;
export type ActionAccessFn = ActionCallable | ((...args: never[]) => unknown);
export type ActionNode = UnknownRecord;
export type ActionsRootLike = ActionsNamespaceLike & ActionNode;
export type ActionBinding<T extends ActionAccessFn = ActionAccessFn> = {
  owner: unknown;
  fn: T;
};

function asRecord(value: unknown): ActionNode | null {
  return asActionRecord(value);
}

function invokeActionFn<T extends ActionAccessFn>(fn: T, args: Parameters<T>): ReturnType<T> {
  return invokeSharedActionFn(fn, args);
}

function getValueAtPath(root: unknown, path: string): unknown {
  return getSharedValueAtPath(root, path);
}

function getActionBindingFromRoot<T extends ActionAccessFn = ActionAccessFn>(
  root: unknown,
  path: string
): ActionBinding<T> | null {
  const binding = getSharedActionBindingFromRoot<T>(root, path);
  return binding ? bindActionBinding(binding) : null;
}

type BindAction = {
  <T extends ActionAccessFn>(owner: unknown, fn: T): T;
  (owner: unknown, fn: ActionAccessFn): ActionAccessFn;
};

const bindAction: BindAction = (owner: unknown, fn: ActionAccessFn) => bindSharedAction(owner, fn);

function bindActionBinding<T extends ActionAccessFn>(binding: SharedActionBinding<T>): ActionBinding<T> {
  return {
    owner: binding.owner,
    fn: binding.fn,
  };
}

function createActionNode(): ActionNode {
  const node: ActionNode = Object.create(null);
  return node;
}

export function ensureActionsRoot(App: unknown): ActionsRootLike {
  return ensureActionsRootSlot(App);
}

export function ensureActionNamespace(App: unknown, path: string): ActionNode {
  const root = ensureActionsRoot(App);
  const parts = String(path || '')
    .split('.')
    .map(part => String(part || '').trim())
    .filter(Boolean);
  if (!parts.length) return root;

  let cur: ActionNode = root;
  for (const part of parts) {
    const next = asRecord(cur[part]);
    if (next) {
      cur = next;
      continue;
    }
    const created = createActionNode();
    cur[part] = created;
    cur = created;
  }
  return cur;
}

export function getActions(App: unknown): ActionsRootLike | null {
  return asRecord(getActionsRootMaybe(App));
}

export function getAction(App: unknown, path: string): unknown {
  const actions = getActions(App);
  return actions ? getValueAtPath(actions, path) : undefined;
}

export function getActionNamespace(App: unknown, path: string): ActionNode | null {
  return asRecord(getAction(App, path));
}

type GetActionFn = {
  <T extends ActionAccessFn>(App: unknown, path: string): T | null;
  (App: unknown, path: string): ActionAccessFn | null;
};

// export function getActionFn<T extends ActionAccessFn>(App: unknown, path: string): T | null;
export const getActionFn: GetActionFn = (App: unknown, path: string) => {
  const binding = getActionBindingFromRoot(getActionsRootMaybe(App), path);
  if (!binding) return null;
  return bindAction(binding.owner, binding.fn);
};

export function requireActionNamespace(App: unknown, path: string, label?: string): ActionNode {
  const ns = getActionNamespace(App, path);
  if (ns) return ns;

  const cleanPath = String(path || '').trim();
  const suffix = cleanPath ? '.' + cleanPath : '';
  throw new Error(
    `[WardrobePro] Missing action namespace (${label || cleanPath || 'root'}): expected actions${suffix}`
  );
}

export function hasAction(App: unknown, path: string): boolean {
  return !!getActionFn(App, path);
}

export function getNamespacedActionFn<T extends ActionAccessFn>(
  App: unknown,
  namespace: string,
  key: string
): T | null {
  const cleanNs = String(namespace || '').trim();
  const cleanKey = String(key || '').trim();
  if (!cleanKey) return null;
  return getActionFn<T>(App, cleanNs ? `${cleanNs}.${cleanKey}` : cleanKey);
}

export function hasNamespacedAction(App: unknown, namespace: string, key: string): boolean {
  return !!getNamespacedActionFn(App, namespace, key);
}

export function callNamespacedAction<T extends ActionAccessFn>(
  App: unknown,
  namespace: string,
  key: string,
  ...args: Parameters<T>
): ReturnType<T> | undefined {
  const fn = getNamespacedActionFn<T>(App, namespace, key);
  if (!fn) return undefined;
  return invokeActionFn(fn, args);
}

export function callAction<T extends ActionAccessFn>(
  App: unknown,
  path: string,
  ...args: Parameters<T>
): ReturnType<T> | undefined {
  const fn = getActionFn<T>(App, path);
  if (!fn) return undefined;
  return invokeActionFn(fn, args);
}

export function listActionFns(App: unknown, path: string): string[] {
  const ns = getActionNamespace(App, path);
  if (!ns) return [];
  return Object.keys(ns).filter(key => typeof ns[key] === 'function');
}
