import type { AppContainer } from '../../../types';
import type {
  PreviewGroupLike,
  PreviewMaterialLike,
  PreviewMeshLike,
  PreviewTHREESurface,
  RenderPreviewOpsDeps,
  SketchPlacementPreviewArgs,
} from './render_preview_ops_contracts.js';
import type { RenderPreviewSketchShared } from './render_preview_sketch_shared.js';

export type RenderPreviewSketchOpsContext = {
  deps: RenderPreviewOpsDeps;
  app: RenderPreviewOpsDeps['app'];
  ops: RenderPreviewOpsDeps['ops'];
  cacheValue: RenderPreviewOpsDeps['cacheValue'];
  writeCacheValue: RenderPreviewOpsDeps['writeCacheValue'];
  wardrobeGroup: RenderPreviewOpsDeps['wardrobeGroup'];
  renderOpsHandleCatch: RenderPreviewOpsDeps['renderOpsHandleCatch'];
  assertTHREE: RenderPreviewOpsDeps['assertTHREE'];
  getThreeMaybe: RenderPreviewOpsDeps['getThreeMaybe'];
  shared: RenderPreviewSketchShared;
};

export type SketchPlacementPreviewMaterialSet = {
  matShelf: PreviewMaterialLike;
  matGlass: PreviewMaterialLike;
  matBox: PreviewMaterialLike;
  matBrace: PreviewMaterialLike;
  matRemove: PreviewMaterialLike;
  matRod: PreviewMaterialLike;
  matBoxOverlay: PreviewMaterialLike;
  matRemoveOverlay: PreviewMaterialLike;
  lineShelf: PreviewMaterialLike;
  lineGlass: PreviewMaterialLike;
  lineBox: PreviewMaterialLike;
  lineBrace: PreviewMaterialLike;
  lineRemove: PreviewMaterialLike;
  lineRod: PreviewMaterialLike;
  lineBoxOverlay: PreviewMaterialLike;
  lineRemoveOverlay: PreviewMaterialLike;
};

export type SketchPlacementPreviewMeshSlots = {
  shelfA: PreviewMeshLike | null;
  boxTop: PreviewMeshLike | null;
  boxBottom: PreviewMeshLike | null;
  boxLeft: PreviewMeshLike | null;
  boxRight: PreviewMeshLike | null;
  boxBack: PreviewMeshLike | null;
};

export type CreateSketchPlacementPreviewGroupArgs = {
  App: AppContainer;
  THREE: PreviewTHREESurface;
  owner: RenderPreviewSketchOpsContext;
};

export type SetSketchPlacementPreviewArgs = {
  input: SketchPlacementPreviewArgs;
  App: AppContainer;
  THREE: PreviewTHREESurface | null;
  group: PreviewGroupLike;
  owner: RenderPreviewSketchOpsContext;
};
