import {
  _asCanvasLike,
  _asRecord,
  _asTextureParams,
  _readCtor,
  __ensureApp,
  __ensureTHREE,
  type FloorType,
  type RoomTextureParams,
  type TextureLike,
} from './room_internal_shared.js';
import { createCanvasViaPlatform } from '../runtime/platform_access.js';

// Some build profiles ban `globalThis` (eslint no-restricted-globals).
// Using `typeof OffscreenCanvas` is safe even when the global doesn't exist.
declare const OffscreenCanvas: undefined | (new (w: number, h: number) => unknown);

function __createRoomCanvas(passedApp: unknown): unknown {
  const A = __ensureApp(passedApp);
  const canvas = createCanvasViaPlatform(A, 512, 512);
  if (canvas) return canvas;
  try {
    const OffscreenCanvasCtor = typeof OffscreenCanvas === 'function' ? OffscreenCanvas : undefined;
    if (typeof OffscreenCanvasCtor === 'function') return new OffscreenCanvasCtor(512, 512);
  } catch {
    // Optional canvas creation can fail in constrained runtimes; the texture is not required.
  }
  return null;
}

function __paintParquetTexture(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  p: RoomTextureParams
): void {
  const plankW = 180;
  const plankH = 60;
  const plankColor = typeof p.color2 === 'string' ? p.color2 : '#d4c5b0';
  ctx.fillStyle = plankColor;
  for (let y = 0; y < 512; y += plankH) {
    const offset = (y / plankH) % 2 === 0 ? 0 : -100;
    for (let x = offset; x < 512; x += plankW) {
      if (Math.random() > 0.5) {
        ctx.globalAlpha = 0.3;
        ctx.fillRect(x + 2, y + 2, plankW - 4, plankH - 4);
        ctx.globalAlpha = 1.0;
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, plankW, plankH);
    }
  }
}

function __paintTileTexture(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  p: RoomTextureParams
): void {
  const size = 512 / (typeof p.size === 'number' && Number.isFinite(p.size) ? p.size : 4);
  ctx.strokeStyle = typeof p.lines === 'string' ? p.lines : '#e0e0e0';
  ctx.lineWidth = 3;
  for (let y = 0; y < 512; y += size) {
    for (let x = 0; x < 512; x += size) {
      ctx.strokeRect(x, y, size, size);
      if (p.id === 'terrazzo') {
        ctx.globalAlpha = 0.4;
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = i % 2 === 0 ? '#ffccbc' : '#b2dfdb';
          ctx.beginPath();
          ctx.arc(x + Math.random() * size, y + Math.random() * size, Math.random() * 10, 0, 6.28);
          ctx.fill();
        }
        ctx.globalAlpha = 1.0;
      }
    }
  }
}

function __finalizeCanvasTexture(canvas: unknown): {
  canvas: unknown;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
} | null {
  const can = _asCanvasLike(canvas);
  if (!can) return null;
  can.width = 512;
  can.height = 512;
  const ctx = can.getContext('2d');
  if (!ctx) return null;
  return { canvas: can, ctx };
}

export function createProceduralFloorTexture(
  type: FloorType,
  params: RoomTextureParams | null | undefined,
  passedApp: unknown
) {
  const A = __ensureApp(passedApp);
  const T = __ensureTHREE(A);
  const prep = __finalizeCanvasTexture(__createRoomCanvas(A));
  if (!prep) return null;

  const ctx = prep.ctx;
  const p = _asTextureParams(params);
  const baseColor =
    typeof p.color === 'string' ? p.color : typeof p.color1 === 'string' ? p.color1 : '#ffffff';
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  if (type === 'parquet') __paintParquetTexture(ctx, p);
  else if (type === 'tiles') __paintTileTexture(ctx, p);

  const Tr = _asRecord(T);
  const CanvasTextureCtor = _readCtor<[unknown], TextureLike>(Tr, 'CanvasTexture');
  if (!CanvasTextureCtor) return null;

  const tex = new CanvasTextureCtor(prep.canvas);
  // CanvasTexture is authored in sRGB; mark it as such so three.js performs correct decoding.
  const texWithColorSpace: TextureLike = tex;
  const srgbColorSpace = Tr.SRGBColorSpace;
  if ('SRGBColorSpace' in Tr && typeof texWithColorSpace.colorSpace !== 'undefined') {
    texWithColorSpace.colorSpace = srgbColorSpace;
  }
  if ('RepeatWrapping' in Tr) {
    tex.wrapS = Tr.RepeatWrapping;
    tex.wrapT = Tr.RepeatWrapping;
  }
  if (tex.repeat && typeof tex.repeat.set === 'function') tex.repeat.set(6, 6);
  return tex;
}
