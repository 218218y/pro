// Native ESM implementation of textures cache helpers.
//
// Goals:
// - No retired script imports on the ESM path.
// - No IIFE / implicit globals.
// - Canonical cache lives in `App.services.texturesCache` (no root-slot shim).
//
// New code may import and call the exported functions directly.

import type {
  AppContainer,
  DisposableTextureLike,
  TexturesCacheOptionsLike,
  TexturesCacheServiceLike,
} from '../../../types';

import {
  ensureTexturesCacheService,
  getCustomUploadedTextureMaybe,
  setCustomUploadedTextureViaService,
} from '../runtime/textures_cache_access.js';
import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';

type TexturesCacheAccessors = {
  __wpGetCustomUploadedTexture?: () => DisposableTextureLike | null;
  __wpSetCustomUploadedTexture?: (
    tex: DisposableTextureLike | null,
    opts?: TexturesCacheOptionsLike
  ) => DisposableTextureLike | null;
};

type InstalledTexturesCacheService = TexturesCacheServiceLike & TexturesCacheAccessors;

function ensureCache(App: AppContainer): InstalledTexturesCacheService | null {
  try {
    if (!App || typeof App !== 'object') return null;
    return ensureTexturesCacheService(App);
  } catch (_) {
    return null;
  }
}

function isDisposableTextureLike(value: unknown): value is DisposableTextureLike {
  return !!value && typeof value === 'object';
}

function asDisposableTexture(v: unknown): DisposableTextureLike | null {
  return isDisposableTextureLike(v) ? v : null;
}

function ensureInstalledAccessors(
  App: AppContainer,
  cache: InstalledTexturesCacheService
): InstalledTexturesCacheService {
  installStableSurfaceMethod(cache, 'getCustomUploadedTexture', '__wpGetCustomUploadedTexture', () => {
    return () => getCustomUploadedTexture(App);
  });
  installStableSurfaceMethod(cache, 'setCustomUploadedTexture', '__wpSetCustomUploadedTexture', () => {
    return (tex: DisposableTextureLike | null, opts?: TexturesCacheOptionsLike) =>
      setCustomUploadedTexture(App, tex, opts);
  });
  return cache;
}

export function getCustomUploadedTexture(App: AppContainer): DisposableTextureLike | null {
  const c = ensureCache(App);
  if (!c) return null;
  return asDisposableTexture(getCustomUploadedTextureMaybe(App));
}

export function setCustomUploadedTexture(
  App: AppContainer,
  tex: DisposableTextureLike | null,
  opts?: TexturesCacheOptionsLike
): DisposableTextureLike | null {
  const c = ensureCache(App);
  const safeOpts: TexturesCacheOptionsLike = opts ? { ...opts } : {};
  const next = tex || null;
  if (!c) return next;

  let prev: DisposableTextureLike | null = null;
  try {
    prev = asDisposableTexture(getCustomUploadedTextureMaybe(App));
  } catch (_) {}

  if (safeOpts.disposePrev && prev && prev !== next && typeof prev.dispose === 'function') {
    try {
      prev.dispose();
    } catch (_) {}
  }

  return asDisposableTexture(setCustomUploadedTextureViaService(App, next));
}

export function installTexturesCacheService(App: AppContainer): TexturesCacheServiceLike | null {
  if (!App || typeof App !== 'object') throw new Error('installTexturesCacheService(App): App is required');

  const c = ensureCache(App);
  if (!c) return null;

  return ensureInstalledAccessors(App, c);
}
