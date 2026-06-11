import { getStandardCabinetTextureKind } from '../../shared/standard_cabinet_textures_shared.js';
import { readRuntimeScalarOrDefaultFromApp } from '../runtime/runtime_selectors.js';
import { getCustomUploadedTextureMaybe } from '../runtime/textures_cache_access.js';
import { getCfg } from './store_access.js';
import {
  ensureMaterialsFactoryApp,
  ensureMaterialsRuntime,
  getMaterialsTHREE,
  readTextureLike,
  touchMaterialsCacheMeta,
  type AppLike,
  type MaterialLike,
  type TextureLike,
} from './materials_factory_shared.js';
import { generateTexture, getDataURLTexture } from './materials_factory_texture_runtime.js';

function resolveCustomTextureDataUrl(App: AppLike, customTextureDataURL: unknown): string | null {
  if (typeof customTextureDataURL === 'string' && customTextureDataURL) return customTextureDataURL;
  const cfg = getCfg(App);
  return typeof cfg.customUploadedDataURL === 'string' ? cfg.customUploadedDataURL : null;
}

function resolveFrontTexture(
  App: AppLike,
  useCustomTexture: unknown,
  customTextureDataURL: unknown
): TextureLike | null {
  if (!useCustomTexture) return null;
  const dataUrl = resolveCustomTextureDataUrl(App, customTextureDataURL);
  return (
    readTextureLike(getDataURLTexture(App, dataUrl)) ||
    readTextureLike(getCustomUploadedTextureMaybe(App)) ||
    null
  );
}

function getSketchMaterial(App: AppLike, cacheKey: string) {
  const runtime = ensureMaterialsRuntime(App);
  const { renderCache, renderMeta } = runtime;
  const THREE = getMaterialsTHREE(App);
  if (!renderCache.materialCache.has(cacheKey)) {
    renderCache.materialCache.set(cacheKey, new THREE.MeshBasicMaterial({ color: 0xffffff }));
  }
  touchMaterialsCacheMeta(App, renderMeta.material, cacheKey);
  return renderCache.materialCache.get(cacheKey);
}

function resolveMetalColor(color: unknown): string | number {
  return typeof color === 'string' && /^#([0-9a-f]{3}){1,2}$/i.test(color) ? color : 0x888888;
}

function createFrontMaterial(
  App: AppLike,
  color: unknown,
  useCustomTexture: unknown,
  tex: TextureLike | null,
  THREE: ReturnType<typeof getMaterialsTHREE>
): MaterialLike {
  if (useCustomTexture && tex) {
    return new THREE.MeshStandardMaterial({ map: tex, color: 0xffffff, roughness: 0.6 });
  }

  const safeColor = typeof color === 'string' && /^#([0-9a-f]{3}){1,2}$/i.test(color) ? color : '#ffffff';
  const textureKind = getStandardCabinetTextureKind(safeColor);
  if (textureKind) {
    const texture = generateTexture(App, safeColor, textureKind);
    return new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: texture || null,
      roughness: textureKind === 'melamine' ? 0.55 : 0.7,
      metalness: textureKind === 'melamine' ? 0.03 : 0.05,
    });
  }

  return new THREE.MeshStandardMaterial({
    color: safeColor,
    roughness: 0.45,
    metalness: 0.02,
  });
}

export function getMaterial(
  appIn: unknown,
  color: unknown,
  type: unknown,
  useCustomTexture?: unknown,
  customTextureDataURL?: unknown
) {
  const runtime = ensureMaterialsRuntime(ensureMaterialsFactoryApp(appIn));
  const { App, renderCache, renderMeta } = runtime;
  const THREE = getMaterialsTHREE(App);

  try {
    if (readRuntimeScalarOrDefaultFromApp(App, 'sketchMode', false)) {
      return getSketchMaterial(App, 'sketch_white');
    }
  } catch {}

  const tex = resolveFrontTexture(App, useCustomTexture, customTextureDataURL);
  const texSig = tex && typeof tex.uuid === 'string' ? tex.uuid : '';
  const cacheKey =
    'mat_' + String(type) + '_' + String(color) + '_' + String(!!useCustomTexture) + '_' + texSig;

  const cachedMat = renderCache.materialCache.get(cacheKey);
  if (cachedMat) {
    touchMaterialsCacheMeta(App, renderMeta.material, cacheKey);
    return cachedMat;
  }

  let newMat: MaterialLike;
  if (type === 'body') {
    newMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
  } else if (type === 'metal') {
    newMat = new THREE.MeshStandardMaterial({
      color: resolveMetalColor(color),
      metalness: 0.8,
      roughness: 0.2,
    });
  } else if (type === 'front') {
    newMat = createFrontMaterial(App, color, useCustomTexture, tex, THREE);
  } else {
    newMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
  }

  try {
    newMat.userData = { isCached: true };
  } catch {}

  touchMaterialsCacheMeta(App, renderMeta.material, cacheKey);
  renderCache.materialCache.set(cacheKey, newMat);
  return newMat;
}
