// Domain App.actions namespace helpers (Pure ESM)
//
// This file owns typed namespace helpers (meta/config/doors/modules/etc.) so runtime
// callers can depend on the narrow owner instead of the broad public barrel.

import type {
  ColorsActionsLike,
  ConfigActionsNamespaceLike,
  DividersActionsLike,
  DoorsActionsLike,
  GroovesActionsLike,
  HistoryActionsNamespaceLike,
  MetaActionsNamespaceLike,
  ModelsActionsLike,
  ModulesActionsLike,
  RoomActionsLike,
  RuntimeActionsNamespaceLike,
  StoreActionsNamespaceLike,
  UiActionsNamespaceLike,
} from '../../../types';

import { ensureMetaActionsNamespace, isActionStubFn } from './actions_access_shared.js';
import { asRecord } from './record.js';
import {
  type ActionAccessFn,
  getActionNamespace,
  ensureActionNamespace,
  requireActionNamespace,
  getNamespacedActionFn,
  hasNamespacedAction,
  callNamespacedAction,
  listActionFns,
} from './actions_access_core.js';

function readActionNamespace<T extends Record<string, unknown>>(App: unknown, path: string): T | null {
  return asRecord<T>(getActionNamespace(App, path));
}

function getTypedActionNamespace<T extends Record<string, unknown>>(App: unknown, path: string): T | null {
  return readActionNamespace<T>(App, path);
}

function getTypedNamespacedActionFn<T extends ActionAccessFn>(
  App: unknown,
  namespace: string,
  key: string
): T | null {
  return getNamespacedActionFn<T>(App, namespace, key);
}

function hasTypedNamespacedAction(App: unknown, namespace: string, key: string): boolean {
  return hasNamespacedAction(App, namespace, key);
}

function callTypedNamespacedAction<T extends ActionAccessFn>(
  App: unknown,
  namespace: string,
  key: string,
  ...args: Parameters<T>
): ReturnType<T> | undefined {
  return callNamespacedAction<T>(App, namespace, key, ...args);
}

const META_REQUIRED_LIVE_ACTIONS = new Set(['setDirty', 'touch', 'persist']);

function isLiveMetaAction(key: string, fn: unknown): boolean {
  if (typeof fn !== 'function') return false;
  if (!META_REQUIRED_LIVE_ACTIONS.has(key)) return true;
  return !isActionStubFn(fn, `meta:${key}`);
}

export function getMetaActions(App: unknown): MetaActionsNamespaceLike | null {
  const ns = getTypedActionNamespace<Partial<MetaActionsNamespaceLike> & Record<string, unknown>>(
    App,
    'meta'
  );
  return ns ? ensureMetaActionsNamespace(ns) : null;
}

export function ensureMetaActions(App: unknown): MetaActionsNamespaceLike {
  return ensureMetaActionsNamespace(ensureActionNamespace(App, 'meta'));
}

export function requireMetaActions(App: unknown, label?: string): MetaActionsNamespaceLike {
  return ensureMetaActionsNamespace(requireActionNamespace(App, 'meta', label || 'meta'));
}

export function getMetaActionFn<T extends ActionAccessFn>(App: unknown, key: string): T | null {
  const fn = getTypedNamespacedActionFn<T>(App, 'meta', key);
  return isLiveMetaAction(key, fn) ? fn : null;
}

export function hasMetaAction(App: unknown, key: string): boolean {
  return hasTypedNamespacedAction(App, 'meta', key);
}

export function callMetaAction<T extends ActionAccessFn>(
  App: unknown,
  key: string,
  ...args: Parameters<T>
): ReturnType<T> | undefined {
  return callTypedNamespacedAction<T>(App, 'meta', key, ...args);
}

export function getDoorsActions(App: unknown): DoorsActionsLike | null {
  return getTypedActionNamespace<DoorsActionsLike & Record<string, unknown>>(App, 'doors');
}

export function getDoorsActionFn<T extends ActionAccessFn>(App: unknown, key: string): T | null {
  return getTypedNamespacedActionFn<T>(App, 'doors', key);
}

export function hasDoorsAction(App: unknown, key: string): boolean {
  return hasTypedNamespacedAction(App, 'doors', key);
}

export function callDoorsAction<T extends ActionAccessFn>(
  App: unknown,
  key: string,
  ...args: Parameters<T>
): ReturnType<T> | undefined {
  return callTypedNamespacedAction<T>(App, 'doors', key, ...args);
}

export function getModulesActions(App: unknown): ModulesActionsLike | null {
  return getTypedActionNamespace<ModulesActionsLike & Record<string, unknown>>(App, 'modules');
}

export function getModulesActionFn<T extends ActionAccessFn>(App: unknown, key: string): T | null {
  return getTypedNamespacedActionFn<T>(App, 'modules', key);
}

export function hasModulesAction(App: unknown, key: string): boolean {
  return hasTypedNamespacedAction(App, 'modules', key);
}

export function callModulesAction<T extends ActionAccessFn>(
  App: unknown,
  key: string,
  ...args: Parameters<T>
): ReturnType<T> | undefined {
  return callTypedNamespacedAction<T>(App, 'modules', key, ...args);
}

export function listModulesActionFns(App: unknown): string[] {
  return listActionFns(App, 'modules');
}

export function getConfigActions(App: unknown): ConfigActionsNamespaceLike | null {
  return getTypedActionNamespace<ConfigActionsNamespaceLike & Record<string, unknown>>(App, 'config');
}

export function getConfigActionFn<T extends ActionAccessFn>(App: unknown, key: string): T | null {
  return getTypedNamespacedActionFn<T>(App, 'config', key);
}

export function hasConfigAction(App: unknown, key: string): boolean {
  return hasTypedNamespacedAction(App, 'config', key);
}

export function callConfigAction<T extends ActionAccessFn>(
  App: unknown,
  key: string,
  ...args: Parameters<T>
): ReturnType<T> | undefined {
  return callTypedNamespacedAction<T>(App, 'config', key, ...args);
}

export function getHistoryActions(App: unknown): HistoryActionsNamespaceLike | null {
  return getTypedActionNamespace<HistoryActionsNamespaceLike & Record<string, unknown>>(App, 'history');
}

export function getHistoryActionFn<T extends ActionAccessFn>(App: unknown, key: string): T | null {
  return getTypedNamespacedActionFn<T>(App, 'history', key);
}

export function getModelsActions(App: unknown): ModelsActionsLike | null {
  return getTypedActionNamespace<ModelsActionsLike & Record<string, unknown>>(App, 'models');
}

export function getModelsActionFn<T extends ActionAccessFn>(App: unknown, key: string): T | null {
  return getTypedNamespacedActionFn<T>(App, 'models', key);
}

export function callModelsAction<T extends ActionAccessFn>(
  App: unknown,
  key: string,
  ...args: Parameters<T>
): ReturnType<T> | undefined {
  return callTypedNamespacedAction<T>(App, 'models', key, ...args);
}

export function getColorsActions(App: unknown): ColorsActionsLike | null {
  return getTypedActionNamespace<ColorsActionsLike & Record<string, unknown>>(App, 'colors');
}

export function getColorsActionFn<T extends ActionAccessFn>(App: unknown, key: string): T | null {
  return getTypedNamespacedActionFn<T>(App, 'colors', key);
}

export function callColorsAction<T extends ActionAccessFn>(
  App: unknown,
  key: string,
  ...args: Parameters<T>
): ReturnType<T> | undefined {
  return callTypedNamespacedAction<T>(App, 'colors', key, ...args);
}

export function getDividersActions(App: unknown): DividersActionsLike | null {
  return getTypedActionNamespace<DividersActionsLike & Record<string, unknown>>(App, 'dividers');
}

export function getDividersActionFn<T extends ActionAccessFn>(App: unknown, key: string): T | null {
  return getTypedNamespacedActionFn<T>(App, 'dividers', key);
}

export function getGroovesActions(App: unknown): GroovesActionsLike | null {
  return getTypedActionNamespace<GroovesActionsLike & Record<string, unknown>>(App, 'grooves');
}

export function getGroovesActionFn<T extends ActionAccessFn>(App: unknown, key: string): T | null {
  return getTypedNamespacedActionFn<T>(App, 'grooves', key);
}

export function getRoomActions(App: unknown): RoomActionsLike | null {
  return getTypedActionNamespace<RoomActionsLike & Record<string, unknown>>(App, 'room');
}

export function getRoomActionFn<T extends ActionAccessFn>(App: unknown, key: string): T | null {
  return getTypedNamespacedActionFn<T>(App, 'room', key);
}

export function callRoomAction<T extends ActionAccessFn>(
  App: unknown,
  key: string,
  ...args: Parameters<T>
): ReturnType<T> | undefined {
  return callTypedNamespacedAction<T>(App, 'room', key, ...args);
}

export function getUiActions(App: unknown): UiActionsNamespaceLike | null {
  return getTypedActionNamespace<UiActionsNamespaceLike & Record<string, unknown>>(App, 'ui');
}

export function getUiActionFn<T extends ActionAccessFn>(App: unknown, key: string): T | null {
  return getTypedNamespacedActionFn<T>(App, 'ui', key);
}

export function callUiAction<T extends ActionAccessFn>(
  App: unknown,
  key: string,
  ...args: Parameters<T>
): ReturnType<T> | undefined {
  return callTypedNamespacedAction<T>(App, 'ui', key, ...args);
}

export function getRuntimeActions(App: unknown): RuntimeActionsNamespaceLike | null {
  return getTypedActionNamespace<RuntimeActionsNamespaceLike & Record<string, unknown>>(App, 'runtime');
}

export function getRuntimeActionFn<T extends ActionAccessFn>(App: unknown, key: string): T | null {
  return getTypedNamespacedActionFn<T>(App, 'runtime', key);
}

export function callRuntimeAction<T extends ActionAccessFn>(
  App: unknown,
  key: string,
  ...args: Parameters<T>
): ReturnType<T> | undefined {
  return callTypedNamespacedAction<T>(App, 'runtime', key, ...args);
}

export function getStoreActions(App: unknown): StoreActionsNamespaceLike | null {
  return getTypedActionNamespace<StoreActionsNamespaceLike>(App, 'store');
}

export function getStoreActionFn<T extends ActionAccessFn>(App: unknown, key: string): T | null {
  return getTypedNamespacedActionFn<T>(App, 'store', key);
}

export function callStoreAction<T extends ActionAccessFn>(
  App: unknown,
  key: string,
  ...args: Parameters<T>
): ReturnType<T> | undefined {
  return callTypedNamespacedAction<T>(App, 'store', key, ...args);
}
