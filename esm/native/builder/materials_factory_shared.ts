import { assertApp, assertTHREE } from '../runtime/api.js';
import { asRecord } from '../runtime/record.js';
import {
  createCanvasViaPlatform,
  ensurePlatformHash32,
  getPlatformUtil,
} from '../runtime/platform_access.js';
import {
  ensureRenderCacheMap,
  ensureRenderCacheMaps,
  ensureRenderMetaMap,
  ensureRenderMetaMaps,
} from '../runtime/render_access.js';
import { ensureTexturesCacheService } from '../runtime/textures_cache_access.js';
import { ensureBuilderService } from '../runtime/builder_service_access.js';

import type { AppContainer, RenderCacheMapsLike, RenderMetaMapsLike, ThreeLike } from '../../../types';

export type ValueRecord = Record<string, unknown>;
export type CacheTouchFn = (meta: unknown, key: string) => void;
export type HashFn = (s: string) => string;

export type PlatformUtilLike = ValueRecord & {
  hash32?: HashFn;
  cacheTouch?: CacheTouchFn;
};

export type MaterialCacheLike = Map<string, unknown>;
export type TextureCacheLike = Map<string, TextureLike>;
export type MetaCacheLike = Map<string, number>;

export type AppLike = AppContainer;

export type MaterialsRuntime = {
  App: AppLike;
  renderCache: RenderCacheMapsLike & { materialCache: MaterialCacheLike; textureCache: TextureCacheLike };
  renderMeta: RenderMetaMapsLike & { material: MetaCacheLike; texture: MetaCacheLike };
};

export type CanvasLike = {
  width: number;
  height: number;
  getContext: (kind: '2d') => CanvasRenderingContext2D | null;
};

export type TextureLike = ValueRecord & {
  image?: unknown;
  needsUpdate?: boolean;
  uuid?: string;
  wrapS?: unknown;
  wrapT?: unknown;
  repeat?: { set: (x: number, y: number) => void };
  colorSpace?: unknown;
};

export type MaterialLike = ValueRecord & {
  userData?: ValueRecord;
};

export type ThreeColorLike = {
  setStyle: (style: string) => void;
  getHSL: (target: { h: number; s: number; l: number }) => void;
  setHSL: (h: number, s: number, l: number) => void;
  getHexString: () => string;
};

export type ThreeFactoryLike = ThreeLike & {
  Texture: new () => TextureLike;
  CanvasTexture: new (canvas: CanvasLike) => TextureLike;
  MeshBasicMaterial: new (opts: Record<string, unknown>) => MaterialLike;
  MeshStandardMaterial: new (opts: Record<string, unknown>) => MaterialLike;
  Color: new () => ThreeColorLike;
  RepeatWrapping: unknown;
  SRGBColorSpace?: unknown;
};

export const FRONT_SATURATION_BOOST: number = 0.18;
export const FRONT_LIGHTNESS_BOOST: number = -0.02;

export function isValueRecord(value: unknown): value is ValueRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asValueObject<T extends object = ValueRecord>(value: unknown): T | null {
  return asRecord<T>(value);
}

function isPlatformUtilLike(value: unknown): value is PlatformUtilLike {
  return isValueRecord(value) && (!('cacheTouch' in value) || typeof value.cacheTouch === 'function');
}

export function ensureMaterialsFactoryApp(
  appIn: unknown,
  label = 'native/builder/materials_factory'
): AppLike {
  return assertApp(appIn, label);
}

export function ensureMaterialsRuntime(App: AppLike): MaterialsRuntime {
  const builder = ensureBuilderService(App, 'native/builder/materials_factory');
  const materials = isValueRecord(builder.materials) ? builder.materials : null;
  builder.materials = materials || {};

  ensureTexturesCacheService(App);
  ensurePlatformHash32(App);

  const renderCacheBase = ensureRenderCacheMaps(App);
  const renderMetaBase = ensureRenderMetaMaps(App);
  const renderCache: MaterialsRuntime['renderCache'] = Object.assign(renderCacheBase, {
    materialCache: ensureRenderCacheMap(App, 'materialCache'),
    textureCache: ensureRenderCacheMap<TextureLike>(App, 'textureCache'),
  });
  const renderMeta: MaterialsRuntime['renderMeta'] = Object.assign(renderMetaBase, {
    material: ensureRenderMetaMap(App, 'material'),
    texture: ensureRenderMetaMap(App, 'texture'),
  });

  return { App, renderCache, renderMeta };
}

export function getMaterialsPlatformUtil(App: AppLike): PlatformUtilLike {
  const util = getPlatformUtil(App);
  return isPlatformUtilLike(util) ? util : {};
}

export function touchMaterialsCacheMeta(
  App: AppLike,
  metaMap: Map<string, number> | null | undefined,
  key: string
): void {
  const util = getMaterialsPlatformUtil(App);
  try {
    if (typeof util.cacheTouch === 'function') util.cacheTouch(metaMap, key);
    else if (metaMap instanceof Map) metaMap.set(key, Date.now());
  } catch {}
}

function isCanvasLike(value: unknown): value is CanvasLike {
  return (
    isValueRecord(value) &&
    typeof value.width === 'number' &&
    typeof value.height === 'number' &&
    typeof value.getContext === 'function'
  );
}

export function getMaterialsCanvas(App: AppLike, width: number, height: number): CanvasLike | null {
  try {
    const canvas = createCanvasViaPlatform(App, width, height);
    return isCanvasLike(canvas) ? canvas : null;
  } catch {
    return null;
  }
}

function isThreeFactoryLike(value: unknown): value is ThreeFactoryLike {
  return (
    isValueRecord(value) &&
    typeof value.Texture === 'function' &&
    typeof value.CanvasTexture === 'function' &&
    typeof value.MeshBasicMaterial === 'function' &&
    typeof value.MeshStandardMaterial === 'function' &&
    typeof value.Color === 'function' &&
    'RepeatWrapping' in value
  );
}

export function getMaterialsTHREE(App: AppLike): ThreeFactoryLike {
  const THREE = assertTHREE(App, 'native/builder/materials_factory.THREE');
  if (!isThreeFactoryLike(THREE)) {
    throw new Error('[native/builder/materials_factory] Invalid THREE surface');
  }
  return THREE;
}

export function readTextureLike(value: unknown): TextureLike | null {
  const rec = asValueObject<TextureLike>(value);
  return rec && typeof rec.repeat?.set === 'function' ? rec : null;
}

export function setTextureColorSpace(texture: TextureLike | null | undefined, THREE: ThreeFactoryLike): void {
  if (!texture || typeof texture !== 'object') return;
  if (typeof texture.colorSpace !== 'undefined' && typeof THREE.SRGBColorSpace !== 'undefined') {
    texture.colorSpace = THREE.SRGBColorSpace;
  }
}
