import type { AppContainer, BrowserDomStateLike, BrowserNamespaceLike } from '../../../types';

import { ensureBrowserRoot, getBrowserRootMaybe } from './app_roots_access.js';
import { asRecord, createNullRecord } from './record.js';

type BrowserMethod<Args extends unknown[] = never[], Ret = unknown> = (...args: Args) => Ret;

type BrowserSurfaceOwner = AppContainer | Record<string, unknown>;

export function getBrowserSurfaceMaybe(App: unknown): BrowserNamespaceLike | null {
  return asRecord<BrowserNamespaceLike>(getBrowserRootMaybe(App));
}

export function ensureBrowserSurface(App: BrowserSurfaceOwner): BrowserNamespaceLike {
  const current = asRecord<BrowserNamespaceLike>(getBrowserRootMaybe(App));
  if (current) return current;
  return asRecord<BrowserNamespaceLike>(ensureBrowserRoot(App)) || createNullRecord<BrowserNamespaceLike>();
}

export function getBrowserDomStateMaybe(App: unknown): BrowserDomStateLike | null {
  return asRecord<BrowserDomStateLike>(getBrowserSurfaceMaybe(App)?.dom);
}

export function ensureBrowserDomState(App: BrowserSurfaceOwner): BrowserDomStateLike {
  const browser = ensureBrowserSurface(App);
  const existing = asRecord<BrowserDomStateLike>(browser.dom);
  if (existing) return existing;
  const next = createNullRecord<BrowserDomStateLike>();
  browser.dom = next;
  return next;
}

export function getBrowserMethodMaybe<Args extends unknown[] = never[], Ret = unknown>(
  App: unknown,
  key: string
): BrowserMethod<Args, Ret> | null {
  if (!key) return null;
  const surface = getBrowserSurfaceMaybe(App);
  const fn = surface?.[key];
  if (typeof fn !== 'function') return null;
  return (...args: Args): Ret => Reflect.apply(fn, surface, args);
}

export function readBrowserStringMaybe(App: unknown, key: string): string | null {
  if (!key) return null;
  const surface = getBrowserSurfaceMaybe(App);
  const value = surface?.[key];
  return typeof value === 'string' ? value : null;
}
