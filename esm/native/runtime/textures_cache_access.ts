import type { DisposableTextureLike, TexturesCacheServiceLike } from '../../../types';

import { asRecord } from './record.js';
import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';

function asTexturesCacheService(value: unknown): TexturesCacheServiceLike | null {
  return asRecord<TexturesCacheServiceLike>(value);
}

function initializeTexturesCacheService(cache: TexturesCacheServiceLike): TexturesCacheServiceLike {
  if (typeof cache.customUploadedTexture === 'undefined') cache.customUploadedTexture = null;
  return cache;
}

export function getTexturesCacheServiceMaybe(App: unknown): TexturesCacheServiceLike | null {
  try {
    const cache = asTexturesCacheService(getServiceSlotMaybe<TexturesCacheServiceLike>(App, 'texturesCache'));
    return cache ? initializeTexturesCacheService(cache) : null;
  } catch {
    return null;
  }
}

export function ensureTexturesCacheService(App: unknown): TexturesCacheServiceLike {
  const existing = getTexturesCacheServiceMaybe(App);
  if (existing) return existing;
  const slot = ensureServiceSlot<TexturesCacheServiceLike>(App, 'texturesCache');
  return initializeTexturesCacheService(slot);
}

function isDisposableTextureLike(value: unknown): value is DisposableTextureLike {
  return !!value && typeof value === 'object';
}

function asDisposableTexture(value: unknown): DisposableTextureLike | null {
  return isDisposableTextureLike(value) ? value : null;
}

export function getCustomUploadedTextureMaybe(App: unknown): DisposableTextureLike | null {
  try {
    const cache = getTexturesCacheServiceMaybe(App);
    return cache ? asDisposableTexture(cache.customUploadedTexture) : null;
  } catch {
    return null;
  }
}

export function setCustomUploadedTextureViaService(
  App: unknown,
  tex: DisposableTextureLike | null
): DisposableTextureLike | null {
  try {
    const cache = ensureTexturesCacheService(App);
    const next = asDisposableTexture(tex) || null;
    cache.customUploadedTexture = next;
    return asDisposableTexture(cache.customUploadedTexture);
  } catch {
    return asDisposableTexture(tex);
  }
}

export function hasCustomUploadedTexture(App: unknown): boolean {
  return !!getCustomUploadedTextureMaybe(App);
}
