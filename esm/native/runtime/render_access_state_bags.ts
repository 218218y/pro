import type {
  RenderCacheBag,
  RenderCacheMapsLike,
  RenderCacheMapsBag,
  RenderMaterialSlotsBag,
  RenderMaterialSlotsLike,
  RenderMaterialsBag,
  RenderMetaBag,
  RenderMetaMapsBag,
  RenderMetaMapsLike,
  UnknownRecord,
} from './render_access_shared.js';
import {
  createRenderCacheBag,
  createRenderCacheMapsBag,
  createRenderMaterialSlotsBag,
  createRenderMaterialsBag,
  createRenderMetaBag,
  createRenderMetaMapsBag,
  ensureArraySlot,
  ensureMapSlot,
  ensureRecordSlot,
  ensureRenderBag,
  readValue,
} from './render_access_shared.js';
import { asRecord } from './record.js';

function ensureOwnedBag<T extends UnknownRecord>(owner: UnknownRecord, key: string, create: () => T): T {
  const current = asRecord<T>(owner[key]);
  if (current) return current;
  const next = create();
  try {
    owner[key] = next;
  } catch {
    // ignore
  }
  return next;
}

function isRenderCacheMapsBag(value: RenderCacheBag): value is RenderCacheMapsBag {
  return (
    value.materialCache instanceof Map &&
    value.textureCache instanceof Map &&
    value.geometryCache instanceof Map &&
    value.edgesGeometryCache instanceof Map
  );
}

function createFullRenderCacheMapsBag(): RenderCacheMapsBag {
  const next = createRenderCacheMapsBag();
  next.geometryCache = new Map();
  next.edgesGeometryCache = new Map();
  if (isRenderCacheMapsBag(next)) return next;
  throw new Error('[WardrobePro] Failed to initialize render cache maps');
}

function isRenderMetaMapsBag(value: RenderMetaBag): value is RenderMetaMapsBag {
  return (
    value.material instanceof Map &&
    value.texture instanceof Map &&
    value.dimLabel instanceof Map &&
    value.edges instanceof Map &&
    value.geometry instanceof Map &&
    Array.isArray(value.mirrors)
  );
}

function createFullRenderMetaMapsBag(): RenderMetaMapsBag {
  const next = createRenderMetaMapsBag();
  next.dimLabel = new Map();
  next.edges = new Map();
  next.geometry = new Map();
  if (isRenderMetaMapsBag(next)) return next;
  throw new Error('[WardrobePro] Failed to initialize render meta maps');
}

function isRenderMaterialSlotsBag(value: RenderMaterialsBag): value is RenderMaterialSlotsBag {
  return (
    typeof value.dimLineMaterial !== 'undefined' &&
    typeof value.dimLineMaterialCell !== 'undefined' &&
    typeof value.outlineLineMaterial !== 'undefined' &&
    typeof value.sketchFillMaterial !== 'undefined'
  );
}

export function getRenderCache(App: unknown): RenderCacheBag {
  const renderBag = ensureRenderBag(App);
  return ensureOwnedBag(renderBag, 'cache', createRenderCacheBag);
}

export function getRenderMeta(App: unknown): RenderMetaBag {
  const renderBag = ensureRenderBag(App);
  return ensureOwnedBag(renderBag, 'meta', createRenderMetaBag);
}

export function getRenderMaterials(App: unknown): RenderMaterialsBag {
  const renderBag = ensureRenderBag(App);
  return ensureOwnedBag(renderBag, 'materials', createRenderMaterialsBag);
}

export function readRenderCacheValue<T = unknown>(App: unknown, key: string): T | null {
  const cache = getRenderCache(App);
  return readValue<T>(cache[key]);
}

export function writeRenderCacheValue<T = unknown>(App: unknown, key: string, value: T | null): T | null {
  const cache = getRenderCache(App);
  try {
    if (value == null) delete cache[key];
    else cache[key] = value;
  } catch {
    // ignore
  }
  return readValue<T>(cache[key]);
}

export function ensureRenderCacheObject(App: unknown, key: string): UnknownRecord {
  return ensureRecordSlot(getRenderCache(App), key);
}

export function ensureRenderMetaArray<T = unknown>(App: unknown, key: string): T[] {
  return ensureArraySlot<T>(getRenderMeta(App), key);
}

export function getAutoLightBuildKey(App: unknown): string | null {
  const value = readRenderCacheValue<string>(App, '__wpAutoLightBuildKey');
  return typeof value === 'string' && value ? value : null;
}

export function setAutoLightBuildKey(App: unknown, key: string | null): string | null {
  return writeRenderCacheValue<string>(App, '__wpAutoLightBuildKey', key);
}

export function getAutoCameraBuildKey(App: unknown): string | null {
  const value = readRenderCacheValue<string>(App, '__wpAutoCameraBuildKey');
  return typeof value === 'string' && value ? value : null;
}

export function setAutoCameraBuildKey(App: unknown, key: string | null): string | null {
  return writeRenderCacheValue<string>(App, '__wpAutoCameraBuildKey', key);
}

export function ensureRenderCacheMaps(App: unknown): RenderCacheMapsLike {
  const cache = getRenderCache(App);
  const defaults = createRenderCacheMapsBag();
  if (!(cache.materialCache instanceof Map)) cache.materialCache = defaults.materialCache;
  if (!(cache.textureCache instanceof Map)) cache.textureCache = defaults.textureCache;
  if (!(cache.geometryCache instanceof Map)) cache.geometryCache = new Map();
  if (!(cache.edgesGeometryCache instanceof Map)) cache.edgesGeometryCache = new Map();
  if (isRenderCacheMapsBag(cache)) return cache;
  const repaired = Object.assign(cache, createFullRenderCacheMapsBag());
  if (isRenderCacheMapsBag(repaired)) return repaired;
  return createFullRenderCacheMapsBag();
}

export function ensureRenderMetaMaps(App: unknown): RenderMetaMapsLike {
  const meta = getRenderMeta(App);
  const defaults = createRenderMetaMapsBag();
  if (!(meta.material instanceof Map)) meta.material = defaults.material;
  if (!(meta.texture instanceof Map)) meta.texture = defaults.texture;
  if (!(meta.dimLabel instanceof Map)) meta.dimLabel = new Map();
  if (!(meta.edges instanceof Map)) meta.edges = new Map();
  if (!(meta.geometry instanceof Map)) meta.geometry = new Map();
  if (!Array.isArray(meta.mirrors)) meta.mirrors = [];
  if (isRenderMetaMapsBag(meta)) return meta;
  const repaired = Object.assign(meta, createFullRenderMetaMapsBag());
  if (isRenderMetaMapsBag(repaired)) return repaired;
  return createFullRenderMetaMapsBag();
}

export function ensureRenderMaterialSlots(App: unknown): RenderMaterialSlotsLike {
  const materials = getRenderMaterials(App);
  const defaults = createRenderMaterialSlotsBag();
  if (typeof materials.dimLineMaterial === 'undefined') materials.dimLineMaterial = defaults.dimLineMaterial;
  if (typeof materials.dimLineMaterialCell === 'undefined')
    materials.dimLineMaterialCell = defaults.dimLineMaterialCell;
  if (typeof materials.outlineLineMaterial === 'undefined')
    materials.outlineLineMaterial = defaults.outlineLineMaterial;
  if (typeof materials.sketchFillMaterial === 'undefined')
    materials.sketchFillMaterial = defaults.sketchFillMaterial;
  if (isRenderMaterialSlotsBag(materials)) return materials;
  const repaired = Object.assign(materials, defaults);
  return isRenderMaterialSlotsBag(repaired) ? repaired : defaults;
}

export function ensureRenderMaterialSlot<T = unknown>(App: unknown, key: string, create: () => T): T {
  const materials = getRenderMaterials(App);
  const current = readValue<T>(materials[key]);
  if (current !== null) return current;
  const next = create();
  try {
    materials[key] = next;
  } catch {
    // ignore
  }
  return readValue<T>(materials[key]) || next;
}

export function readRenderMaterialSlot<T = unknown>(App: unknown, key: string): T | null {
  const materials = getRenderMaterials(App);
  return readValue<T>(materials[key]);
}

export function writeRenderMaterialSlot<T = unknown>(App: unknown, key: string, value: T | null): T | null {
  const materials = getRenderMaterials(App);
  try {
    if (value == null) delete materials[key];
    else materials[key] = value;
  } catch {
    // ignore
  }
  return readValue<T>(materials[key]);
}

export function bindLegacyRenderCompatRefs(App: unknown): void {
  const app = asRecord(App);
  if (!app) return;
  try {
    if ('__wpRenderCache' in app) delete app.__wpRenderCache;
    if ('__wpRenderMaterials' in app) delete app.__wpRenderMaterials;
    if ('__wpRenderMeta' in app) delete app.__wpRenderMeta;
  } catch {
    // ignore
  }
}

export function ensureRenderCacheMap<T = unknown>(App: unknown, key: string): Map<string, T> {
  return ensureMapSlot<T>(getRenderCache(App), key);
}

export function ensureRenderMetaMap(App: unknown, key: string): Map<string, number> {
  return ensureMapSlot<number>(getRenderMeta(App), key);
}
