// Native Builder registry (ESM)
//
// Converted from `js/builder/pro_builder_registry.js` into a real ES module.
//
// Responsibilities:
// - Central registry for interactive parts built by the builder.
// - Keeps render doorsArray / drawersArray / moduleHitBoxes stable (no reassign).
// - Collects partId -> object references (for picking / tools) via render.partIndex.
//
// Design:
// - No IIFE and no implicit side-effects on import.
// - Explicit installer binds the canonical service surface `App.services.builder.registry`.
// - Idempotent via `__esm_v1` marker.

import type {
  AppContainer,
  BuilderRegistryLike,
  DoorVisualEntryLike,
  DrawerVisualEntryLike,
  Object3DLike,
  PartIndexLike,
  RenderNamespaceLike,
  UnknownRecord,
} from '../../../types/index.js';

import { assertApp } from '../runtime/api.js';
import { asRecord } from '../runtime/record.js';
import { ensureRenderNamespace, getRenderNamespace } from '../runtime/render_access.js';
import { ensureBuilderService } from '../runtime/builder_service_access.js';

type RegistryValue = Object3DLike | DoorVisualEntryLike | DrawerVisualEntryLike;
type RegistryBucket = Record<string, RegistryValue | RegistryValue[]>;
type BuilderRegistryRecord = BuilderRegistryLike & UnknownRecord;

function _isObject3DLike(value: unknown): value is Object3DLike {
  const rec = asRecord(value);
  return !!(
    rec &&
    Array.isArray(rec.children) &&
    asRecord(rec.position) &&
    asRecord(rec.rotation) &&
    asRecord(rec.scale) &&
    asRecord(rec.userData) &&
    typeof rec.add === 'function' &&
    typeof rec.remove === 'function'
  );
}

function hasPartIndexBuckets(value: unknown): value is PartIndexLike {
  const index = asRecord<PartIndexLike>(value);
  return !!(
    index &&
    asRecord(index.all) &&
    asRecord(index.doors) &&
    asRecord(index.drawers) &&
    asRecord(index.parts) &&
    asRecord(index.modules)
  );
}

function _asPartIndex(value: unknown): PartIndexLike | null {
  return hasPartIndexBuckets(value) ? value : null;
}

function _ensureArrays(App: AppContainer): RenderNamespaceLike {
  const renderNs = ensureRenderNamespace(App);
  if (!Array.isArray(renderNs.doorsArray)) renderNs.doorsArray = [];
  if (!Array.isArray(renderNs.drawersArray)) renderNs.drawersArray = [];
  if (!Array.isArray(renderNs.moduleHitBoxes)) renderNs.moduleHitBoxes = [];
  if (!Array.isArray(renderNs._partObjects)) renderNs._partObjects = [];
  return renderNs;
}

function _newBucket(): RegistryBucket {
  return {};
}

function _newIndex(): PartIndexLike {
  return {
    all: _newBucket(),
    doors: _newBucket(),
    drawers: _newBucket(),
    parts: _newBucket(),
    modules: _newBucket(),
  };
}

function isRegistryValue(value: unknown): value is RegistryValue {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function _put(map: UnknownRecord, key: unknown, val: RegistryValue): void {
  if (!key) return;
  const normalizedKey = String(key);
  if (!normalizedKey) return;
  const current = map[normalizedKey];
  if (typeof current === 'undefined') {
    map[normalizedKey] = val;
    return;
  }
  if (Array.isArray(current)) {
    current.push(val);
    return;
  }
  map[normalizedKey] = isRegistryValue(current) ? [current, val] : val;
}

function _partIdFromVisualEntry(entry: DoorVisualEntryLike | DrawerVisualEntryLike): string | null {
  if (!entry) return null;
  if (entry.id != null && String(entry.id)) return String(entry.id);
  if (entry.group?.userData?.partId != null && String(entry.group.userData.partId)) {
    return String(entry.group.userData.partId);
  }
  if (entry.partId != null && String(entry.partId)) return String(entry.partId);
  return null;
}

function _getRegistryRecord(App: AppContainer): BuilderRegistryRecord | null {
  const builderService = ensureBuilderService(App, 'native/builder/registry');
  return asRecord<BuilderRegistryRecord>(builderService.registry);
}

// Reset for a new build; keep the array objects stable to avoid breaking references.
export function resetRegistry(App: AppContainer): void {
  const container = assertApp(App, 'native/builder/registry');
  const renderNs = _ensureArrays(container);
  renderNs.doorsArray.length = 0;
  renderNs.drawersArray.length = 0;
  renderNs.moduleHitBoxes.length = 0;
  renderNs._partObjects.length = 0;
  renderNs.partIndex = _newIndex();
}

// Register a general part object (mesh/group) by partId.
export function registerPartObject(App: AppContainer, partId: string, obj: unknown, kind?: string): void {
  const container = assertApp(App, 'native/builder/registry');
  const renderNs = _ensureArrays(container);
  if (!partId || !_isObject3DLike(obj)) return;
  renderNs._partObjects.push({ id: String(partId), obj, kind: kind || 'part' });
}

export function registerModuleHitBox(App: AppContainer, moduleIndex: number | string, hitBox: unknown): void {
  const container = assertApp(App, 'native/builder/registry');
  const renderNs = _ensureArrays(container);
  if ((typeof moduleIndex !== 'number' && typeof moduleIndex !== 'string') || !_isObject3DLike(hitBox))
    return;
  renderNs.moduleHitBoxes[Number(moduleIndex)] = hitBox;
}

// Finalize indexing after build (covers items pushed directly into doorsArray/drawersArray).
export function finalizeRegistry(App: AppContainer): void {
  const container = assertApp(App, 'native/builder/registry');
  const renderNs = _ensureArrays(container);
  const index = _newIndex();

  for (let moduleIndex = 0; moduleIndex < renderNs.moduleHitBoxes.length; moduleIndex++) {
    const hitBox = renderNs.moduleHitBoxes[moduleIndex];
    if (!hitBox) continue;
    _put(index.modules, String(moduleIndex), hitBox);
    _put(index.all, `module:${String(moduleIndex)}`, hitBox);
  }

  for (let i = 0; i < renderNs.doorsArray.length; i++) {
    const door = renderNs.doorsArray[i];
    if (!door) continue;
    const partId = _partIdFromVisualEntry(door);
    if (!partId) continue;
    _put(index.doors, partId, door);
    _put(index.all, partId, door);
  }

  for (let i = 0; i < renderNs.drawersArray.length; i++) {
    const drawer = renderNs.drawersArray[i];
    if (!drawer) continue;
    const partId = _partIdFromVisualEntry(drawer);
    if (!partId) continue;
    _put(index.drawers, partId, drawer);
    _put(index.all, partId, drawer);
  }

  for (let i = 0; i < renderNs._partObjects.length; i++) {
    const partObject = renderNs._partObjects[i];
    if (!partObject || !partObject.id || !partObject.obj) continue;
    _put(index.parts, partObject.id, partObject.obj);
    _put(index.all, partObject.id, partObject.obj);
  }

  renderNs.partIndex = index;
}

// Convenience lookup
export function getRegistered(App: AppContainer, partId: string): unknown {
  const container = assertApp(App, 'native/builder/registry');
  const renderNs = getRenderNamespace(container);
  const index = _asPartIndex(renderNs.partIndex);
  if (!index || !asRecord(index.all)) return null;
  return index.all[String(partId || '')] || null;
}

export function createBuilderRegistry(App: AppContainer): BuilderRegistryLike {
  const container = assertApp(App, 'native/builder/registry');

  return {
    reset() {
      return resetRegistry(container);
    },
    registerPartObject(partId: string, obj: unknown, kind?: string) {
      return registerPartObject(container, partId, obj, kind);
    },
    registerModuleHitBox(moduleIndex: number | string, hitBox: unknown) {
      return registerModuleHitBox(container, moduleIndex, hitBox);
    },
    finalize() {
      return finalizeRegistry(container);
    },
    get(partId: string) {
      return getRegistered(container, partId);
    },
  };
}

function _ensureRegistrySlot(builderService: UnknownRecord): BuilderRegistryRecord {
  const current = asRecord<BuilderRegistryRecord>(builderService.registry);
  if (current) return current;
  const next: BuilderRegistryRecord = {};
  builderService.registry = next;
  return next;
}

export function installBuilderRegistry(App: AppContainer): BuilderRegistryLike {
  const container = assertApp(App, 'native/builder/registry');
  _ensureArrays(container);

  const builderService = ensureBuilderService(container, 'native/builder/registry');
  const registry = _ensureRegistrySlot(builderService);

  const bound = createBuilderRegistry(container);
  if (typeof registry.reset !== 'function') registry.reset = bound.reset;
  if (typeof registry.registerPartObject !== 'function')
    registry.registerPartObject = bound.registerPartObject;
  if (typeof registry.registerModuleHitBox !== 'function')
    registry.registerModuleHitBox = bound.registerModuleHitBox;
  if (typeof registry.finalize !== 'function') registry.finalize = bound.finalize;
  if (typeof registry.get !== 'function') registry.get = bound.get;

  try {
    registry.__esm_v1 = true;
  } catch {
    // ignore
  }

  return registry;
}
