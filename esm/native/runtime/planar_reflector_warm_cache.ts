import type { UnknownRecord } from '../../../types/index.js';

import { getRenderSlot, setRenderSlot } from './render_access_surface.js';
import { ensureRenderMetaArray } from './render_access_state_bags.js';
import {
  isTaggedPlanarMirrorSurface,
  readPlanarReflectorCacheKey,
  readPlanarReflectorRecord,
  readPlanarReflectorState,
} from './planar_reflector_state.js';

const PLANAR_WARM_CACHE_RENDER_SLOT = '__mirrorPlanarWarmCache';
const PLANAR_WARM_CACHE_MAX_ENTRIES = 64;

export type PlanarWarmCacheEntry = {
  key: string;
  renderTarget: UnknownRecord;
  textureMatrix?: UnknownRecord;
  updateCount: number;
};

type PlanarWarmCacheBag = {
  entries: Record<string, PlanarWarmCacheEntry>;
  order: string[];
};

function readFn<T extends (...args: never[]) => unknown>(obj: UnknownRecord | null, key: string): T | null {
  const fn = obj ? obj[key] : null;
  return typeof fn === 'function' ? (fn as T) : null;
}

function call1(ctx: unknown, fn: unknown, a: unknown): unknown {
  return typeof fn === 'function' ? Reflect.apply(fn, ctx, [a]) : undefined;
}

function callDispose(value: unknown): void {
  const record = readPlanarReflectorRecord(value);
  const dispose = readFn<() => unknown>(record, 'dispose');
  if (dispose) Reflect.apply(dispose, record, []);
}

function readPlanarWarmCacheBag(value: unknown): PlanarWarmCacheBag | null {
  const bag = readPlanarReflectorRecord(value);
  const entries = readPlanarReflectorRecord(bag?.entries);
  const order = Array.isArray(bag?.order)
    ? bag.order.filter((key): key is string => typeof key === 'string')
    : null;
  if (!bag || !entries || !order) return null;
  return {
    entries: entries as Record<string, PlanarWarmCacheEntry>,
    order,
  };
}

function makeEmptyPlanarWarmCacheBag(): PlanarWarmCacheBag {
  return { entries: {}, order: [] };
}

function disposePlanarWarmCacheEntry(entry: unknown): void {
  const record = readPlanarReflectorRecord(entry);
  if (!record) return;
  callDispose(record.renderTarget);
}

function disposePlanarWarmCacheBag(value: unknown): void {
  const bag = readPlanarWarmCacheBag(value);
  if (!bag) return;
  for (const key of bag.order) disposePlanarWarmCacheEntry(bag.entries[key]);
}

function addPlanarWarmCacheEntry(bag: PlanarWarmCacheBag, entry: PlanarWarmCacheEntry): void {
  const existing = bag.entries[entry.key];
  if (existing && existing !== entry) disposePlanarWarmCacheEntry(existing);
  bag.entries[entry.key] = entry;
  bag.order = bag.order.filter(key => key !== entry.key);
  bag.order.push(entry.key);
  while (bag.order.length > PLANAR_WARM_CACHE_MAX_ENTRIES) {
    const evictedKey = bag.order.shift();
    if (!evictedKey) break;
    const evicted = bag.entries[evictedKey];
    delete bag.entries[evictedKey];
    disposePlanarWarmCacheEntry(evicted);
  }
}

export function consumePlanarReflectorWarmCacheEntry(
  App: unknown,
  key: string | null
): PlanarWarmCacheEntry | null {
  if (!key) return null;
  const bag = readPlanarWarmCacheBag(getRenderSlot<UnknownRecord>(App, PLANAR_WARM_CACHE_RENDER_SLOT));
  if (!bag) return null;
  const entry = readPlanarReflectorRecord(bag.entries[key]) as PlanarWarmCacheEntry | null;
  if (!entry || !readPlanarReflectorRecord(entry.renderTarget)) return null;
  delete bag.entries[key];
  bag.order = bag.order.filter(existingKey => existingKey !== key);
  setRenderSlot(App, PLANAR_WARM_CACHE_RENDER_SLOT, bag);
  return entry;
}

export function copyPlanarReflectorWarmTextureMatrix(target: UnknownRecord, source: unknown): boolean {
  const sourceRecord = readPlanarReflectorRecord(source);
  if (!target || !sourceRecord) return false;

  const copy = readFn<(value: unknown) => unknown>(target, 'copy');
  if (copy) {
    try {
      call1(target, copy, sourceRecord);
      return true;
    } catch {
      // Fall back to raw matrix elements below.
    }
  }

  const targetElements = Array.isArray(target.elements) ? target.elements : null;
  const sourceElements = Array.isArray(sourceRecord.elements) ? sourceRecord.elements : null;
  if (!targetElements || !sourceElements || sourceElements.length < 16) return false;
  for (let index = 0; index < 16; index += 1) targetElements[index] = sourceElements[index];
  return true;
}

export function capturePlanarReflectorWarmCache(App: unknown): number {
  disposePlanarWarmCacheBag(getRenderSlot<UnknownRecord>(App, PLANAR_WARM_CACHE_RENDER_SLOT));
  const mirrors = ensureRenderMetaArray<UnknownRecord>(App, 'mirrors');
  const bag = makeEmptyPlanarWarmCacheBag();
  const seen = new Set<UnknownRecord>();

  for (let index = 0; index < mirrors.length; index += 1) {
    const mirror = readPlanarReflectorRecord(mirrors[index]);
    if (!mirror || seen.has(mirror)) continue;
    seen.add(mirror);
    if (!isTaggedPlanarMirrorSurface(mirror)) continue;
    const key = readPlanarReflectorCacheKey(mirror);
    if (!key) continue;
    const state = readPlanarReflectorState(mirror);
    if (!state || !(state.updateCount > 0)) continue;
    const renderTarget = readPlanarReflectorRecord(state.renderTarget);
    if (!renderTarget) continue;
    const textureMatrix = readPlanarReflectorRecord(state.textureMatrix) || undefined;
    addPlanarWarmCacheEntry(bag, {
      key,
      renderTarget,
      textureMatrix,
      updateCount: Math.max(1, Math.floor(Number(state.updateCount) || 1)),
    });
  }

  setRenderSlot(App, PLANAR_WARM_CACHE_RENDER_SLOT, bag);
  return bag.order.length;
}

export function finalizePlanarReflectorWarmCache(App: unknown): boolean {
  const bag = readPlanarWarmCacheBag(getRenderSlot<UnknownRecord>(App, PLANAR_WARM_CACHE_RENDER_SLOT));
  if (!bag || bag.order.length <= 0) {
    setRenderSlot(App, PLANAR_WARM_CACHE_RENDER_SLOT, makeEmptyPlanarWarmCacheBag());
    return false;
  }
  disposePlanarWarmCacheBag(bag);
  setRenderSlot(App, PLANAR_WARM_CACHE_RENDER_SLOT, makeEmptyPlanarWarmCacheBag());
  return true;
}
