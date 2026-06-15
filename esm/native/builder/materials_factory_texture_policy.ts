import { getCfg } from './store_access.js';
import { readTextureLike, type AppLike, type TextureLike } from './materials_factory_shared.js';
import { getDataURLTexture } from './materials_factory_texture_runtime.js';

export type FrontTextureSourceKind = 'none' | 'explicit-data-url' | 'config-data-url';

export type FrontTextureSource = {
  kind: FrontTextureSourceKind;
  dataURL: string | null;
};

function readDataURL(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

function readConfigCustomTextureDataURL(App: AppLike): string | null {
  const cfg = getCfg(App);
  return readDataURL(cfg.customUploadedDataURL);
}

export function resolveFrontTextureSource(
  App: AppLike,
  useCustomTexture: unknown,
  customTextureDataURL: unknown
): FrontTextureSource {
  if (!useCustomTexture) return { kind: 'none', dataURL: null };

  const explicitDataURL = readDataURL(customTextureDataURL);
  if (explicitDataURL) {
    return {
      kind: 'explicit-data-url',
      dataURL: explicitDataURL,
    };
  }

  const configDataURL = readConfigCustomTextureDataURL(App);
  if (configDataURL) {
    return {
      kind: 'config-data-url',
      dataURL: configDataURL,
    };
  }

  return { kind: 'none', dataURL: null };
}

export function resolveFrontTexture(
  App: AppLike,
  useCustomTexture: unknown,
  customTextureDataURL: unknown
): TextureLike | null {
  const source = resolveFrontTextureSource(App, useCustomTexture, customTextureDataURL);
  if (source.dataURL) {
    const texture = readTextureLike(getDataURLTexture(App, source.dataURL));
    if (texture) return texture;
  }
  return null;
}
