// Native Builder RenderOps (ESM)
//
// Converted from `js/builder/pro_builder_render_ops.js` into a real ES module.
//
// Responsibilities:
// - THREE-side effects + deterministic application of build ops to scene.
// - No IIFE / no implicit side-effects on import.
// - Explicit installer: binds RenderOps onto App.services.builder.renderOps (no App.builder* globals).

import { assertApp, assertTHREE, assertBrowserWindow } from '../runtime/api.js';
import { ensureBuilderService, getBuilderService } from '../runtime/builder_service_access.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import {
  __addToWardrobe,
  __app,
  __asMap,
  __asObject,
  __boardArgs,
  __cacheValue,
  __commonArgs,
  __doors,
  __drawerShadowPlaneArgs,
  __drawers,
  __handleMeshOpts,
  __isBackPanelSeg,
  __isFn,
  __markSplitHoverPickablesDirty,
  __matCache,
  __moduleHitBoxArgs,
  __number,
  __ops,
  __reg,
  __renderOpsHandleCatch,
  __tagAndTrackMirrorSurfaces,
  __three,
  __wardrobeGroup,
  __writeCacheValue,
} from './render_ops_shared.js';
import { createBuilderRenderPreviewOps } from './render_preview_ops.js';
import { createBuilderRenderInteriorSketchOps } from './render_interior_sketch_ops.js';
import { createBuilderRenderCarcassOps } from './render_carcass_ops.js';
import { createBuilderRenderDimensionOps } from './render_dimension_ops.js';
import { createBuilderRenderInteriorOps } from './render_interior_ops.js';
import { createBuilderRenderDoorOps } from './render_door_ops.js';
import { createBuilderRenderDrawerOps } from './render_drawer_ops.js';
import { createBuilderRenderPrimitiveOps } from './render_ops_primitives.js';
import { createBuilderRenderOpsInstall } from './render_ops_install.js';

import type {
  BuilderCreateBoardArgsLike,
  BuilderCreateDrawerShadowPlaneArgsLike,
  BuilderCreateModuleHitBoxArgsLike,
  BuilderHandleMeshOptionsLike,
  RenderOpsLike,
} from '../../../types';

// JSDoc typedefs for gradual TS adoption
/** @typedef {import('../../../types').ApplyHingedDoorsArgsLike} ApplyHingedDoorsArgsLike */
/** @typedef {import('../../../types').ApplySlidingDoorsArgsLike} ApplySlidingDoorsArgsLike */
/** @typedef {import('../../../types').ApplyExternalDrawersArgsLike} ApplyExternalDrawersArgsLike */
/** @typedef {import('../../../types').ApplyInternalDrawersArgsLike} ApplyInternalDrawersArgsLike */
/** @typedef {import('../../../types').CarcassOpsLike} CarcassOpsLike */

// ---------------------------------------------------------------------------
// Common render helpers (Stage 3G-14): move remaining THREE construction out of
// BuilderCore into the render layer.
// ---------------------------------------------------------------------------

const __primitiveOps = createBuilderRenderPrimitiveOps({
  __app,
  __ops,
  __commonArgs,
  __handleMeshOpts,
  __boardArgs,
  __moduleHitBoxArgs,
  __drawerShadowPlaneArgs,
  __number,
  __isFn,
  __wardrobeGroup,
  __matCache,
});

export function getCommonMats(argsIn: unknown) {
  return __primitiveOps.getCommonMats(argsIn);
}

export function getMirrorMaterial(argsIn: unknown) {
  return __primitiveOps.getMirrorMaterial(argsIn);
}

// ---------------------------------------------------------------------------
// Preview/hover helpers extracted from RenderOps during the decomposition pass.
// Public API stays identical; only ownership moved into a focused helper module.
// ---------------------------------------------------------------------------

const __previewOps = createBuilderRenderPreviewOps({
  app: __app,
  ops: __ops,
  asObject: __asObject,
  cacheValue: __cacheValue,
  writeCacheValue: __writeCacheValue,
  wardrobeGroup: __wardrobeGroup,
  addToWardrobe: __addToWardrobe,
  renderOpsHandleCatch: __renderOpsHandleCatch,
  assertTHREE,
  getThreeMaybe,
});

export const ensureSplitHoverMarker = __previewOps.ensureSplitHoverMarker;
export const ensureDoorActionHoverMarker = __previewOps.ensureDoorActionHoverMarker;
export const ensureDoorCutHoverMarker = __previewOps.ensureDoorCutHoverMarker;
export const ensureSketchPlacementPreview = __previewOps.ensureSketchPlacementPreview;
export const hideSketchPlacementPreview = __previewOps.hideSketchPlacementPreview;
export const setSketchPlacementPreview = __previewOps.setSketchPlacementPreview;
export const ensureInteriorLayoutHoverPreview = __previewOps.ensureInteriorLayoutHoverPreview;
export const hideInteriorLayoutHoverPreview = __previewOps.hideInteriorLayoutHoverPreview;
export const setInteriorLayoutHoverPreview = __previewOps.setInteriorLayoutHoverPreview;

// Door/drawer hotspot compression: keep the public render owner canonical,
// but delegate door/drawer THREE mutation flows to dedicated helper modules.
const __doorOps = createBuilderRenderDoorOps({
  __app,
  __ops,
  __wardrobeGroup,
  __isFn,
  __reg,
  __doors,
  __markSplitHoverPickablesDirty,
  __tagAndTrackMirrorSurfaces,
  getMirrorMaterial,
});

const applySlidingDoorsOps = __doorOps.applySlidingDoorsOps;
const applyHingedDoorsOps = __doorOps.applyHingedDoorsOps;

const __drawerOps = createBuilderRenderDrawerOps({
  __app,
  __ops,
  __wardrobeGroup,
  __isFn,
  __reg,
  __drawers,
  getMirrorMaterial,
});

const applyExternalDrawersOps = __drawerOps.applyExternalDrawersOps;
const applyInternalDrawersOps = __drawerOps.applyInternalDrawersOps;

const __interiorSketchOps = createBuilderRenderInteriorSketchOps({
  app: __app,
  ops: __ops,
  wardrobeGroup: __wardrobeGroup,
  doors: __doors,
  markSplitHoverPickablesDirty: __markSplitHoverPickablesDirty,
  isFn: __isFn,
  asObject: __asObject,
  matCache: __matCache,
  three: __three,
  renderOpsHandleCatch: __renderOpsHandleCatch,
  assertTHREE,
  applyInternalDrawersOps,
});

const __carcassOps = createBuilderRenderCarcassOps({
  app: __app,
  ops: __ops,
  wardrobeGroup: __wardrobeGroup,
  three: __three,
  isBackPanelSeg: __isBackPanelSeg,
  reg: __reg,
  renderOpsHandleCatch: __renderOpsHandleCatch,
});

const __dimensionOps = createBuilderRenderDimensionOps({
  app: __app,
  ops: __ops,
});

const __interiorOps = createBuilderRenderInteriorOps({
  app: __app,
  ops: __ops,
  wardrobeGroup: __wardrobeGroup,
  three: __three,
  matCache: __matCache,
  renderOpsHandleCatch: __renderOpsHandleCatch,
  assertTHREE,
});

// Handle mesh factory used by hinged door ops.
// Signature kept for compatibility: (type, doorWidth, doorHeight, isLeftHinge) -> THREE.Group|null
export function createHandleMesh(
  type: string,
  w: number,
  h: number,
  isLeftHinge: boolean,
  optsIn: BuilderHandleMeshOptionsLike | null | undefined
) {
  return __primitiveOps.createHandleMesh(type, w, h, isLeftHinge, optsIn);
}

// Board factory used by interior ops. Keeps BuilderCore from instantiating meshes.
export function createBoard(argsIn: BuilderCreateBoardArgsLike | null | undefined) {
  return __primitiveOps.createBoard(argsIn);
}

export function createModuleHitBox(argsIn: BuilderCreateModuleHitBoxArgsLike | null | undefined) {
  return __primitiveOps.createModuleHitBox(argsIn);
}

export function createDrawerShadowPlane(argsIn: BuilderCreateDrawerShadowPlaneArgsLike | null | undefined) {
  return __primitiveOps.createDrawerShadowPlane(argsIn);
}

// Build and render dimension lines without creating THREE.Vector3 in BuilderCore.
// ---------------------------------------------------------------------------
// Dimension overlay helpers extracted into a focused helper module to shrink
// the render owner while preserving the canonical RenderOps entrypoint.
// ---------------------------------------------------------------------------

export const applyDimensions = __dimensionOps.applyDimensions;

// ---------------------------------------------------------------------------
// Interior preset/custom flows + rod content creation extracted into a focused
// helper module to reduce render owner blast radius without API churn.
// ---------------------------------------------------------------------------

export const applyInteriorPresetOps = __interiorOps.applyInteriorPresetOps;
export const applyInteriorCustomOps = __interiorOps.applyInteriorCustomOps;
export const createRodWithContents = __interiorOps.createRodWithContents;

// ---------------------------------------------------------------------------
// Sketch extras (free placement shelves/boxes)
// Applied AFTER preset/custom interior ops, based on config.sketchExtras.
// Extracted into a focused helper module to keep render_ops.ts ownership lighter
// while preserving the same public RenderOps surface.
// ---------------------------------------------------------------------------

export const applyInteriorSketchExtras = __interiorSketchOps.applyInteriorSketchExtras;

// Stage 3G-8: apply carcass/frame ops (THREE + wardrobe render-surface mutations)
// Extracted into a focused helper module to reduce the owner file size while
// keeping the canonical RenderOps entrypoint unchanged.
export const applyCarcassOps = __carcassOps.applyCarcassOps;

export const builderRenderOps = {
  getCommonMats,
  getMirrorMaterial,
  ensureSplitHoverMarker,
  ensureDoorActionHoverMarker,
  ensureDoorCutHoverMarker,
  ensureInteriorLayoutHoverPreview,
  hideInteriorLayoutHoverPreview,
  setInteriorLayoutHoverPreview,
  // Sketch placement preview (hover ghost) used by the "סקיצה" tab.
  ensureSketchPlacementPreview,
  hideSketchPlacementPreview,
  setSketchPlacementPreview,
  createHandleMesh,
  createBoard,
  createModuleHitBox,
  createDrawerShadowPlane,
  applyDimensions,
  applySlidingDoorsOps,
  applyHingedDoorsOps,
  applyExternalDrawersOps,
  applyInternalDrawersOps,
  applyInteriorPresetOps,
  applyInteriorCustomOps,
  // Free placement shelves/boxes (manual_layout + sketch_* tool) used by the "סקיצה" tab.
  applyInteriorSketchExtras,
  createRodWithContents,
  applyCarcassOps,
};

const __installOps = createBuilderRenderOpsInstall({
  assertApp,
  assertBrowserWindow,
  ensureBuilderService,
  getBuilderService,
  asMap: __asMap,
  asObject: __asObject,
  builderRenderOps,
});

export function getBuilderRenderOps(App: unknown): RenderOpsLike | typeof builderRenderOps {
  return __installOps.getBuilderRenderOps(App);
}

export function installBuilderRenderOps(appIn: unknown) {
  return __installOps.installBuilderRenderOps(appIn);
}
