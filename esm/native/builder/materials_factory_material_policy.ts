import { readRuntimeScalarOrDefaultFromApp } from '../runtime/runtime_selectors.js';
import { getCustomUploadedTextureMaybe } from '../runtime/textures_cache_access.js';
import { getCfg } from './store_access.js';
import {
  FRONT_LIGHTNESS_BOOST,
  FRONT_SATURATION_BOOST,
  ensureMaterialsFactoryApp,
  ensureMaterialsRuntime,
  getMaterialsTHREE,
  readTextureLike,
  touchMaterialsCacheMeta,
  type AppLike,
  type MaterialLike,
  type TextureLike,
  type ThreeColorLike,
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

function resolveFrontColor(color: unknown, THREE: ReturnType<typeof getMaterialsTHREE>): string {
  const safeColor = typeof color === 'string' && /^#([0-9a-f]{3}){1,2}$/i.test(color) ? color : '#ffffff';
  if (
    safeColor.toLowerCase() === '#ffffff' ||
    (FRONT_SATURATION_BOOST === 0 && FRONT_LIGHTNESS_BOOST === 0)
  ) {
    return safeColor;
  }

  try {
    const c: ThreeColorLike = new THREE.Color();
    c.setStyle(safeColor);
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
    hsl.s = clamp01(hsl.s + FRONT_SATURATION_BOOST);
    hsl.l = clamp01(hsl.l + FRONT_LIGHTNESS_BOOST);
    c.setHSL(hsl.h, hsl.s, hsl.l);
    return '#' + c.getHexString();
  } catch {
    return safeColor;
  }
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
  const isWood = safeColor === '#eaddcf' || safeColor === '#a08060';
  if (isWood) {
    const woodTex = generateTexture(App, safeColor, 'wood');
    return new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: woodTex || null,
      roughness: 0.7,
      metalness: 0.05,
    });
  }

  return new THREE.MeshStandardMaterial({
    color: resolveFrontColor(safeColor, THREE),
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
  const punchSig =
    String(type) === 'front'
      ? '_p' + String(FRONT_SATURATION_BOOST) + '_' + String(FRONT_LIGHTNESS_BOOST)
      : '';
  const cacheKey =
    'mat_' + String(type) + '_' + String(color) + '_' + String(!!useCustomTexture) + '_' + texSig + punchSig;

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
