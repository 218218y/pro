// Front reveal frame adaptive material runtime seam (Pure ESM)
//
// Owns canonical runtime assembly while focused helpers handle line-material caching,
// texture-tone sampling, and front-panel candidate picking.

import type { AppContainer, Object3DLike, ThreeLike } from '../../../types/index.js';

import type { LineMaterialLike } from './post_build_extras_shared.js';
import { createFrontRevealLineMaterialCache } from './post_build_front_reveal_frames_materials_shared.js';
import { createFrontRevealTextureToneSampler } from './post_build_front_reveal_frames_materials_texture.js';
import { createFrontRevealMaterialPicker } from './post_build_front_reveal_frames_materials_picker.js';

export type FrontRevealMaterialsRuntime = {
  baseLineMaterial: LineMaterialLike;
  pickRevealLineMaterial: (root: Object3DLike | null) => LineMaterialLike | null;
};

export type CreateFrontRevealMaterialsRuntimeArgs = {
  App: AppContainer;
  THREE: ThreeLike;
  docForTextureToneRead: Document | null;
  sketchMode: boolean;
  readLineMaterial: (key: string) => unknown;
  writeLineMaterial: (key: string, value: unknown) => unknown;
};

export function createFrontRevealMaterialsRuntime(
  args: CreateFrontRevealMaterialsRuntimeArgs
): FrontRevealMaterialsRuntime | null {
  const { THREE, docForTextureToneRead, sketchMode, readLineMaterial, writeLineMaterial } = args;

  const lineMaterialCache = createFrontRevealLineMaterialCache({
    THREE,
    sketchMode,
    readLineMaterial,
    writeLineMaterial,
  });
  if (!lineMaterialCache) return null;

  const textureToneSampler = createFrontRevealTextureToneSampler({ docForTextureToneRead });
  const picker = createFrontRevealMaterialPicker({
    THREE,
    baseLineMaterial: lineMaterialCache.baseLineMaterial,
    ensureAdaptiveRevealLineMaterial: lineMaterialCache.ensureAdaptiveRevealLineMaterial,
    sampleTextureToneHex: textureToneSampler.sampleTextureToneHex,
  });

  return {
    baseLineMaterial: lineMaterialCache.baseLineMaterial,
    pickRevealLineMaterial: picker.pickRevealLineMaterial,
  };
}
