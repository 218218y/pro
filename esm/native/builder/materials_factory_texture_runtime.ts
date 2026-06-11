import {
  ensureMaterialsFactoryApp,
  ensureMaterialsRuntime,
  getMaterialsCanvas,
  getMaterialsPlatformUtil,
  getMaterialsTHREE,
  setTextureColorSpace,
  touchMaterialsCacheMeta,
} from './materials_factory_shared.js';

export function getDataURLTexture(appIn: unknown, dataUrl: unknown) {
  const runtime = ensureMaterialsRuntime(ensureMaterialsFactoryApp(appIn));
  const { App, renderCache, renderMeta } = runtime;
  if (!dataUrl || typeof dataUrl !== 'string') return null;

  const THREE = getMaterialsTHREE(App);
  const util = getMaterialsPlatformUtil(App);
  const key =
    'tex_dataurl_' + (typeof util.hash32 === 'function' ? util.hash32(dataUrl) : String(dataUrl.length));
  const cached = renderCache.textureCache.get(key);
  if (cached) {
    touchMaterialsCacheMeta(App, renderMeta.texture, key);
    return cached;
  }

  if (typeof Image === 'undefined') return null;

  const tex = new THREE.Texture();
  try {
    setTextureColorSpace(tex, THREE);
  } catch {}

  const img = new Image();
  img.onload = function () {
    tex.image = img;
    tex.needsUpdate = true;
  };
  img.src = dataUrl;

  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);

  touchMaterialsCacheMeta(App, renderMeta.texture, key);
  renderCache.textureCache.set(key, tex);
  return tex;
}

export function generateTexture(appIn: unknown, colorHex: unknown, type: unknown) {
  const runtime = ensureMaterialsRuntime(ensureMaterialsFactoryApp(appIn));
  const { App, renderCache, renderMeta } = runtime;
  const THREE = getMaterialsTHREE(App);

  const texKey = 'tex_' + String(colorHex) + '_' + String(type);
  const cached = renderCache.textureCache.get(texKey);
  if (cached) {
    touchMaterialsCacheMeta(App, renderMeta.texture, texKey);
    return cached;
  }

  const canvas = getMaterialsCanvas(App, 512, 512);
  if (!canvas) throw new Error('[generateTexture] cannot create canvas');
  canvas.width = 512;
  canvas.height = 512;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = typeof colorHex === 'string' ? colorHex : String(colorHex || '#ffffff');
  ctx.fillRect(0, 0, 512, 512);

  if (type === 'wood') {
    for (let i = 0; i < 400; i++) {
      const x = Math.random() * 512;
      const w = Math.random() * 2 + 1;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)';
      ctx.fillRect(x, 0, w, 512);
    }
    for (let j = 0; j < 5000; j++) {
      const x2 = Math.random() * 512;
      const y2 = Math.random() * 512;
      ctx.fillStyle = 'rgba(0,0,0,0.02)';
      ctx.fillRect(x2, y2, 2, 8);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  try {
    setTextureColorSpace(texture, THREE);
  } catch {}
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  if (type === 'wood') texture.repeat.set(2, 4);

  touchMaterialsCacheMeta(App, renderMeta.texture, texKey);
  renderCache.textureCache.set(texKey, texture);
  return texture;
}
