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

function hashTextureSeed(value: unknown): number {
  const text = String(value || '');
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createTextureRandom(seedInput: unknown): () => number {
  let seed = hashTextureSeed(seedInput) || 1;
  return () => {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507);
    seed = Math.imul(seed ^ (seed >>> 13), 3266489909);
    seed ^= seed >>> 16;
    return (seed >>> 0) / 4294967296;
  };
}

function drawWoodTexture(ctx: CanvasRenderingContext2D, random: () => number, dark: boolean): void {
  for (let i = 0; i < 440; i += 1) {
    const x = random() * 512;
    const w = random() * (dark ? 2.4 : 2) + 0.75;
    const alpha = dark ? 0.08 + random() * 0.05 : 0.045 + random() * 0.035;
    ctx.fillStyle = random() > 0.45 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha * 0.75})`;
    ctx.fillRect(x, 0, w, 512);
  }

  for (let i = 0; i < 46; i += 1) {
    const startY = random() * 512;
    const amp = 9 + random() * 24;
    const baseX = random() * 512;
    ctx.beginPath();
    ctx.moveTo(baseX, 0);
    for (let y = 0; y <= 512; y += 64) {
      ctx.lineTo(baseX + Math.sin((y + startY) / 42) * amp + (random() - 0.5) * 16, y);
    }
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.055)' : 'rgba(82,48,20,0.12)';
    ctx.lineWidth = 1 + random() * 2;
    ctx.stroke();
  }

  for (let j = 0; j < 3600; j += 1) {
    const x = random() * 512;
    const y = random() * 512;
    ctx.fillStyle = dark ? 'rgba(0,0,0,0.035)' : 'rgba(0,0,0,0.022)';
    ctx.fillRect(x, y, 1 + random() * 2, 4 + random() * 10);
  }
}

function drawStoneTexture(ctx: CanvasRenderingContext2D, random: () => number): void {
  for (let i = 0; i < 2600; i += 1) {
    const x = random() * 512;
    const y = random() * 512;
    const size = 1 + random() * 4;
    ctx.fillStyle = random() > 0.52 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.04)';
    ctx.fillRect(x, y, size, size);
  }

  for (let i = 0; i < 28; i += 1) {
    ctx.beginPath();
    const start = random() * 512;
    ctx.moveTo(-20, start);
    for (let x = -20; x <= 532; x += 72) {
      ctx.lineTo(x, start + Math.sin((x + random() * 100) / 58) * (10 + random() * 18));
    }
    ctx.strokeStyle = random() > 0.5 ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.055)';
    ctx.lineWidth = 1 + random() * 1.5;
    ctx.stroke();
  }
}

function drawTextileTexture(ctx: CanvasRenderingContext2D): void {
  for (let x = 0; x < 512; x += 8) {
    ctx.fillStyle = x % 16 === 0 ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.045)';
    ctx.fillRect(x, 0, 1, 512);
  }
  for (let y = 0; y < 512; y += 8) {
    ctx.fillStyle = y % 16 === 0 ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.045)';
    ctx.fillRect(0, y, 512, 1);
  }
  for (let y = 0; y < 512; y += 16) {
    ctx.fillStyle = 'rgba(0,0,0,0.025)';
    ctx.fillRect(0, y + 3, 512, 1);
  }
}

function drawMelamineTexture(ctx: CanvasRenderingContext2D, random: () => number): void {
  for (let i = 0; i < 900; i += 1) {
    const x = random() * 512;
    const y = random() * 512;
    ctx.fillStyle = random() > 0.55 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.02)';
    ctx.fillRect(x, y, 1 + random() * 8, 1);
  }
  for (let y = 0; y < 512; y += 54) {
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    ctx.fillRect(0, y, 512, 1);
  }
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

  const textureType = String(type || '');
  const random = createTextureRandom(texKey);
  if (textureType === 'wood' || textureType === 'wood-dark') {
    drawWoodTexture(ctx, random, textureType === 'wood-dark');
  } else if (textureType === 'stone') {
    drawStoneTexture(ctx, random);
  } else if (textureType === 'textile') {
    drawTextileTexture(ctx);
  } else if (textureType === 'melamine') {
    drawMelamineTexture(ctx, random);
  }

  const texture = new THREE.CanvasTexture(canvas);
  try {
    setTextureColorSpace(texture, THREE);
  } catch {}
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  if (textureType === 'wood' || textureType === 'wood-dark') texture.repeat.set(2, 4);
  else if (textureType === 'textile') texture.repeat.set(3, 3);
  else texture.repeat.set(2, 2);

  touchMaterialsCacheMeta(App, renderMeta.texture, texKey);
  renderCache.textureCache.set(texKey, texture);
  return texture;
}
