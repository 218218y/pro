import type {
  CameraLike,
  ControlsLike,
  Namespace,
  Object3DLike,
  RenderAutoHideFloorCacheLike,
  RenderCacheLike,
  RenderCacheMapsLike,
  RenderMaterialsLike,
  RenderMaterialSlotsLike,
  RenderMetaLike,
  RenderMetaMapsLike,
  RenderNamespaceLike,
  RenderViewportSurfaceLike,
  RendererCompatDefaultsLike,
  RendererLike,
  ShadowMapLike,
  UnknownRecord,
  WebGLRenderTargetLike,
} from '../../../types';

import { getRenderRootMaybe, ensureRenderRoot } from './app_roots_access.js';
import { asRecord, cloneRecord } from './record.js';

export type RenderBag = Namespace & RenderNamespaceLike & UnknownRecord;
export type RenderCacheBag = RenderCacheLike & UnknownRecord;
export type RenderCacheMapsBag = RenderCacheMapsLike & UnknownRecord;
export type RenderMetaBag = RenderMetaLike & UnknownRecord;
export type RenderMetaMapsBag = RenderMetaMapsLike & UnknownRecord;
export type RenderMaterialsBag = RenderMaterialsLike & UnknownRecord;
export type RenderMaterialSlotsBag = RenderMaterialSlotsLike & UnknownRecord;
export type SceneOpsLike = UnknownRecord & {
  getObjectByName?: (name: string) => unknown;
  add?: (obj: unknown) => unknown;
  remove?: (obj: unknown) => unknown;
};

export type GroupOpsLike = Object3DLike & {
  add?: (obj: unknown) => unknown;
};

export type {
  CameraLike,
  ControlsLike,
  Object3DLike,
  RenderAutoHideFloorCacheLike,
  RenderCacheMapsLike,
  RenderMaterialSlotsLike,
  RenderMetaMapsLike,
  RenderViewportSurfaceLike,
  RendererCompatDefaultsLike,
  RendererLike,
  ShadowMapLike,
  UnknownRecord,
  WebGLRenderTargetLike,
};

export function isRenderBag(value: unknown): value is RenderBag {
  return !!asRecord(value);
}

export function isSceneOpsLike(value: unknown): value is SceneOpsLike {
  return !!asRecord(value);
}

export function createRecord(): UnknownRecord {
  return cloneRecord(undefined, () => Object.create(null));
}

export function createRenderCacheBag(): RenderCacheBag {
  return cloneRecord<RenderCacheBag>(undefined, () => ({}));
}

export function createRenderMetaBag(): RenderMetaBag {
  return cloneRecord<RenderMetaBag>(undefined, () => ({}));
}

export function createRenderMaterialsBag(): RenderMaterialsBag {
  return cloneRecord<RenderMaterialsBag>(undefined, () => ({}));
}

export function createRenderCacheMapsBag(): RenderCacheMapsBag {
  return cloneRecord<RenderCacheMapsBag>(undefined, () => ({
    materialCache: new Map(),
    textureCache: new Map(),
  }));
}

export function createRenderMetaMapsBag(): RenderMetaMapsBag {
  return cloneRecord<RenderMetaMapsBag>(undefined, () => ({
    material: new Map(),
    texture: new Map(),
    mirrors: [],
  }));
}

export function createRenderMaterialSlotsBag(): RenderMaterialSlotsBag {
  return cloneRecord<RenderMaterialSlotsBag>(undefined, () => ({
    dimLineMaterial: null,
    dimLineMaterialCell: null,
    outlineLineMaterial: null,
    sketchFillMaterial: null,
  }));
}

function isPresent<T>(value: unknown): value is T {
  return typeof value !== 'undefined' && value !== null;
}

export function createRenderBag(): RenderBag {
  return {
    renderer: null,
    scene: null,
    camera: null,
    controls: null,
    wardrobeGroup: null,
    roomGroup: null,
    doorsArray: [],
    drawersArray: [],
    moduleHitBoxes: [],
    _partObjects: [],
  };
}

export function readValue<T>(value: unknown): T | null {
  return isPresent<T>(value) ? value : null;
}

export function readObject3D(value: unknown): Object3DLike | null {
  return readValue<Object3DLike>(value);
}

export function ensureRecordSlot(owner: UnknownRecord, key: string): UnknownRecord {
  const current = asRecord(owner[key]);
  if (current) return current;
  const next = createRecord();
  try {
    owner[key] = next;
  } catch {
    // ignore
  }
  return next;
}

export function ensureArraySlot<T = unknown>(owner: UnknownRecord, key: string): T[] {
  const current = owner[key];
  if (Array.isArray(current)) return current;
  const next: T[] = [];
  try {
    owner[key] = next;
  } catch {
    // ignore
  }
  return next;
}

export function ensureMapSlot<T = unknown>(owner: UnknownRecord, key: string): Map<string, T> {
  const current = owner[key];
  if (current instanceof Map) return current;
  const next = new Map<string, T>();
  try {
    owner[key] = next;
  } catch {
    // ignore
  }
  return next;
}

export function ensureRenderBag(App: unknown): RenderBag {
  const existing = getRenderRootMaybe<RenderBag>(App);
  const r: RenderBag = isRenderBag(existing) ? existing : ensureRenderRoot<RenderBag>(App, createRenderBag);

  if (typeof r.renderer === 'undefined') r.renderer = null;
  if (typeof r.scene === 'undefined') r.scene = null;
  if (typeof r.camera === 'undefined') r.camera = null;
  if (typeof r.controls === 'undefined') r.controls = null;
  if (typeof r.wardrobeGroup === 'undefined') r.wardrobeGroup = null;
  if (typeof r.roomGroup === 'undefined') r.roomGroup = null;

  if (!Array.isArray(r.doorsArray)) r.doorsArray = [];
  if (!Array.isArray(r.drawersArray)) r.drawersArray = [];
  if (!Array.isArray(r.moduleHitBoxes)) r.moduleHitBoxes = [];
  if (!Array.isArray(r._partObjects)) r._partObjects = [];

  return r;
}

export function readRenderSurface<T = unknown>(App: unknown, key: string): T | null {
  try {
    const renderBag = ensureRenderBag(App);
    return readValue<T>(renderBag[key]);
  } catch {
    return null;
  }
}

export function isShadowMapLike(value: unknown): value is ShadowMapLike {
  const rec = asRecord(value);
  return !!rec && typeof rec.autoUpdate === 'boolean';
}
