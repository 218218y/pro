// Front reveal frame texture-tone sampling helpers (Pure ESM)
//
// Owns best-effort texture readback and caching for adaptive reveal-line color analysis.

import {
  asCanvasImageSource,
  asCtx2DLike,
  asRecord,
  isRecord,
  type CanvasLike,
  type Ctx2DLike,
  type ValueRecord,
} from './post_build_extras_shared.js';

export type FrontRevealTextureToneSampler = {
  sampleTextureToneHex: (tex: ValueRecord | null) => number | null;
};

export type CreateFrontRevealTextureToneSamplerArgs = {
  docForTextureToneRead: Document | null;
};

const TEXTURE_TONE_HEX_KEY = '__wpFrontRevealToneHex';
const TEXTURE_TONE_MISS_KEY = '__wpFrontRevealToneHexMiss';

function readCachedTextureToneHex(tex: ValueRecord | null): number | null | undefined {
  const userData = asRecord(tex?.userData);
  if (!userData) return undefined;
  const cachedHex = Number(userData[TEXTURE_TONE_HEX_KEY]);
  if (Number.isFinite(cachedHex)) return cachedHex;
  if (userData[TEXTURE_TONE_MISS_KEY] === true) return null;
  return undefined;
}

function writeCachedTextureToneHex(tex: ValueRecord | null, value: number | null): void {
  const rec = asRecord(tex);
  if (!rec) return;
  const userData = asRecord(rec.userData) || {};
  rec.userData = userData;
  if (value == null) {
    delete userData[TEXTURE_TONE_HEX_KEY];
    userData[TEXTURE_TONE_MISS_KEY] = true;
    return;
  }
  userData[TEXTURE_TONE_HEX_KEY] = value;
  delete userData[TEXTURE_TONE_MISS_KEY];
}

export function createFrontRevealTextureToneSampler(
  args: CreateFrontRevealTextureToneSamplerArgs
): FrontRevealTextureToneSampler {
  const { docForTextureToneRead } = args;
  const revealTextureToneCache = new Map<unknown, number | null>();
  let textureToneReadCanvas: CanvasLike | null = null;
  let textureToneReadCtx: Ctx2DLike | null = null;

  const getTextureToneReadCtx = (wIn: number, hIn: number) => {
    const w = Math.max(1, Math.floor(Number(wIn) || 1));
    const h = Math.max(1, Math.floor(Number(hIn) || 1));
    let canvas = textureToneReadCanvas;
    let ctx2d = textureToneReadCtx;

    if (!canvas) {
      try {
        if (typeof OffscreenCanvas !== 'undefined') {
          canvas = new OffscreenCanvas(w, h);
        }
      } catch (_error) {
        canvas = null;
      }
      if (!canvas) {
        try {
          if (docForTextureToneRead && typeof docForTextureToneRead.createElement === 'function') {
            canvas = docForTextureToneRead.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
          }
        } catch (_error) {
          canvas = null;
        }
      }
      if (!canvas || typeof canvas.getContext !== 'function') return null;
      textureToneReadCanvas = canvas;
      try {
        const nextCtx = canvas.getContext('2d', { willReadFrequently: true });
        ctx2d = asCtx2DLike(nextCtx);
      } catch (_error) {
        ctx2d = null;
      }
      textureToneReadCtx = ctx2d;
    }

    if (!canvas || !ctx2d) return null;

    try {
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
    } catch (_error) {
      // best-effort only
    }

    return { canvas, ctx2d, w, h };
  };

  const sampleTextureToneHex = (tex: ValueRecord | null): number | null => {
    if (!tex) return null;

    const cachedOnTexture = readCachedTextureToneHex(tex);
    if (typeof cachedOnTexture !== 'undefined') return cachedOnTexture;

    if (revealTextureToneCache.has(tex)) return revealTextureToneCache.get(tex) ?? null;

    let out: number | null = null;
    try {
      const texImage = isRecord(tex?.image) ? tex.image : null;
      const texSource = isRecord(tex?.source) ? tex.source : null;
      const sourceData = texSource && isRecord(texSource.data) ? texSource.data : null;
      const img = texImage || sourceData;
      const w = Number(img && img.width);
      const h = Number(img && img.height);
      if (img && w > 0 && h > 0) {
        const readback = getTextureToneReadCtx(w, h);
        let ctx2d = readback ? readback.ctx2d : null;
        if (ctx2d && typeof ctx2d.getImageData === 'function' && typeof ctx2d.drawImage === 'function') {
          try {
            if (typeof ctx2d.clearRect === 'function') ctx2d.clearRect(0, 0, w, h);
            const source = asCanvasImageSource(img);
            if (!source) throw new Error('Texture image is not drawable');
            ctx2d.drawImage(source, 0, 0, w, h);
          } catch (_error) {
            ctx2d = null;
          }
        }
        if (ctx2d && typeof ctx2d.getImageData === 'function') {
          const data = ctx2d.getImageData(0, 0, w, h).data;
          if (data && data.length >= 4) {
            const pts = [
              [0.12, 0.12],
              [0.5, 0.12],
              [0.88, 0.12],
              [0.12, 0.5],
              [0.5, 0.5],
              [0.88, 0.5],
              [0.12, 0.88],
              [0.5, 0.88],
              [0.88, 0.88],
            ];
            let rAcc = 0;
            let gAcc = 0;
            let bAcc = 0;
            let aAcc = 0;
            let n = 0;
            for (let i = 0; i < pts.length; i++) {
              const px = Math.max(0, Math.min(w - 1, Math.round(pts[i][0] * (w - 1))));
              const py = Math.max(0, Math.min(h - 1, Math.round(pts[i][1] * (h - 1))));
              const offset = (py * w + px) * 4;
              if (offset + 3 >= data.length) continue;
              const a = Number(data[offset + 3]) / 255;
              if (!(a > 0)) continue;
              rAcc += Number(data[offset]) * a;
              gAcc += Number(data[offset + 1]) * a;
              bAcc += Number(data[offset + 2]) * a;
              aAcc += a;
              n++;
            }
            if (n > 0 && aAcc > 0) {
              const r = Math.max(0, Math.min(255, Math.round(rAcc / aAcc)));
              const g = Math.max(0, Math.min(255, Math.round(gAcc / aAcc)));
              const b = Math.max(0, Math.min(255, Math.round(bAcc / aAcc)));
              out = ((r & 255) << 16) | ((g & 255) << 8) | (b & 255);
            }
          }
        }
      }
    } catch (_error) {
      out = null;
    }

    revealTextureToneCache.set(tex, out);
    writeCachedTextureToneHex(tex, out);
    return out;
  };

  return { sampleTextureToneHex };
}
