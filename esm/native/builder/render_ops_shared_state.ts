import {
  addToWardrobeGroup,
  getDoorsArray,
  getDrawersArray,
  getWardrobeGroup,
  markSplitHoverPickablesDirty,
  readRenderCacheValue,
  writeRenderCacheValue,
} from '../runtime/render_access.js';
import { ensureBuilderService } from '../runtime/builder_service_access.js';

import type {
  AddGroupLike,
  AppContainer,
  CommonMatsCache,
  DoorVisualEntryLike,
  DrawerVisualEntryLike,
  RenderOpsBag,
  TraversableLike,
} from './render_ops_shared_contracts.js';
import { __asMap, __asObject } from './render_ops_shared_args.js';

export function __isFn(v: unknown): v is (...args: readonly unknown[]) => unknown {
  return typeof v === 'function';
}

function __asAddGroup(x: unknown): AddGroupLike | null {
  const groupObj = __asMap(x);
  const addMethod = groupObj ? Reflect.get(groupObj, 'add') : null;
  if (!groupObj || typeof addMethod !== 'function') return null;
  return {
    add: (obj: unknown) => Reflect.apply(addMethod, groupObj, [obj]),
  };
}

export function __asTraversable(x: unknown): TraversableLike | null {
  const traversableObj = __asMap(x);
  const traverseMethod = traversableObj ? Reflect.get(traversableObj, 'traverse') : null;
  if (!traversableObj || typeof traverseMethod !== 'function') return null;
  return {
    traverse: (fn: (value: unknown) => void) => Reflect.apply(traverseMethod, traversableObj, [fn]),
  };
}

export function __ops(App: AppContainer): RenderOpsBag {
  const B = ensureBuilderService(App, 'native/builder/render_ops.ops');
  const current = __asObject<RenderOpsBag>(B.renderOps);
  if (current) return current;
  const next: RenderOpsBag = {};
  B.renderOps = next;
  return next;
}

export function __matCache(App: AppContainer): CommonMatsCache {
  const ro = __ops(App);
  const cache = __asObject<CommonMatsCache>(ro.__matCache) || {};
  ro.__matCache = cache;
  return cache;
}

export function __cacheValue<T = unknown>(App: AppContainer, key: string): T | null {
  return readRenderCacheValue<T>(App, key);
}

export function __writeCacheValue<T = unknown>(App: AppContainer, key: string, value: T | null): T | null {
  return writeRenderCacheValue<T>(App, key, value);
}

export function __wardrobeGroup(App: AppContainer): { add: (obj: unknown) => unknown } | null {
  return __asAddGroup(getWardrobeGroup(App));
}

export function __addToWardrobe(App: AppContainer, obj: unknown): boolean {
  return addToWardrobeGroup(App, obj);
}

export function __doors(App: AppContainer): DoorVisualEntryLike[] {
  return getDoorsArray(App);
}

export function __drawers(App: AppContainer): DrawerVisualEntryLike[] {
  return getDrawersArray(App);
}

export function __markSplitHoverPickablesDirty(App: AppContainer): void {
  markSplitHoverPickablesDirty(App);
}
