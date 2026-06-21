import { readTextureLike, type AppLike, type TextureLike } from './materials_factory_shared.js';
import { getDataURLTexture } from './materials_factory_texture_runtime.js';
import type { BuilderMaterialSnapshotLike } from '../../../types';

export type FrontTextureSourceKind = 'none' | 'explicit-data-url' | 'config-data-url';

export type FrontTextureSource = {
  kind: FrontTextureSourceKind;
  dataURL: string | null;
};

function readDataURL(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

function readConfigCustomTextureDataURL(snapshot: BuilderMaterialSnapshotLike): string | null {
  return readDataURL(snapshot.cfgSnapshot.customUploadedDataURL);
}

export function resolveFrontTextureSource(
  snapshot: BuilderMaterialSnapshotLike,
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

  const configDataURL = readConfigCustomTextureDataURL(snapshot);
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
  snapshot: BuilderMaterialSnapshotLike,
  useCustomTexture: unknown,
  customTextureDataURL: unknown
): TextureLike | null {
  const source = resolveFrontTextureSource(snapshot, useCustomTexture, customTextureDataURL);
  if (source.dataURL) {
    const texture = readTextureLike(getDataURLTexture(App, source.dataURL));
    if (texture) return texture;
  }
  return null;
}
