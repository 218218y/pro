// Front reveal frame runtime seam (Pure ESM)
//
// Owns canonical runtime assembly while focused helpers handle cleanup, adaptive material
// selection, and local reveal-frame geometry/bounds helpers.

import {
  getWardrobeGroup,
  readRenderMaterialSlot,
  writeRenderMaterialSlot,
} from '../runtime/render_access.js';
import { getDocumentMaybe } from '../runtime/api.js';
import { readRuntimeScalarOrDefaultFromApp } from '../runtime/runtime_selectors.js';
import type { BuildContextLike } from '../../../types/index.js';

import { asTraversable, reportPostBuildSoft } from './post_build_extras_shared.js';
import type { FrontRevealFramesRuntime } from './post_build_front_reveal_frames_contracts.js';
import { createFrontRevealCleanupRuntime } from './post_build_front_reveal_frames_cleanup.js';
import { createFrontRevealGeometryRuntime } from './post_build_front_reveal_frames_geometry.js';
import { createFrontRevealMaterialsRuntime } from './post_build_front_reveal_frames_materials.js';

export type { FrontRevealFramesRuntime } from './post_build_front_reveal_frames_contracts.js';

function isSketchMode(App: FrontRevealFramesRuntime['App'] | null): boolean {
  return !!readRuntimeScalarOrDefaultFromApp(App, 'sketchMode', false);
}

export function createFrontRevealFramesRuntime(ctx: BuildContextLike): FrontRevealFramesRuntime | null {
  const App = ctx && ctx.App ? ctx.App : null;
  const THREE = ctx && ctx.THREE ? ctx.THREE : null;
  if (!App || !THREE) return null;

  const wardrobeGroup = asTraversable(getWardrobeGroup(App));
  if (!wardrobeGroup) return null;

  const docForTextureToneRead: Document | null = getDocumentMaybe(App);
  const sketchMode = isSketchMode(App);
  const reportSoft = (op: string, error: unknown) => {
    reportPostBuildSoft(App, op, error);
  };

  const readLineMaterial = (key: string) => readRenderMaterialSlot(App, key);
  const writeLineMaterial = (key: string, value: unknown) => writeRenderMaterialSlot(App, key, value);
  const zNudge = 0.0008;
  const localName = 'wp_front_reveal_frame_local';

  const materials = createFrontRevealMaterialsRuntime({
    App,
    THREE,
    docForTextureToneRead,
    sketchMode,
    readLineMaterial,
    writeLineMaterial,
  });
  if (!materials) return null;

  const geometry = createFrontRevealGeometryRuntime({
    THREE,
    baseLineMaterial: materials.baseLineMaterial,
    localName,
  });
  const cleanup = createFrontRevealCleanupRuntime({
    wardrobeGroup,
    localName,
    reportSoft,
  });

  return {
    App,
    THREE,
    wardrobeGroup,
    zNudge,
    localName,
    reportSoft,
    ...cleanup,
    ...geometry,
    pickRevealLineMaterial: materials.pickRevealLineMaterial,
  };
}
