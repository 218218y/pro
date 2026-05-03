import type {
  PreviewMeshLike,
  PreviewObject3DLike,
  PreviewTHREESurface,
  PreviewValueRecord,
  RenderPreviewOpsDeps,
} from './render_preview_ops_contracts.js';

export type PreviewMarkerArgs = PreviewValueRecord & { THREE?: unknown };

export type MarkerMaterialMap = PreviewValueRecord & {
  __matTop?: unknown;
  __matBottom?: unknown;
  __matGroove?: unknown;
  __matMirror?: unknown;
  __matRemove?: unknown;
  __matAdd?: unknown;
  __matCenter?: unknown;
  __ignoreRaycast?: boolean;
};

export type MarkerMeshLike = PreviewMeshLike & {
  isMesh?: boolean;
  parent?: PreviewObject3DLike | null;
  userData?: MarkerMaterialMap;
};

export type MarkerTHREESurface = PreviewTHREESurface & {
  PlaneGeometry: new (width?: number, height?: number) => unknown;
  MeshBasicMaterial: new (params: PreviewValueRecord) => unknown;
  Mesh: new (geometry: unknown, material: unknown) => MarkerMeshLike;
  DoubleSide: unknown;
};

export type WardrobeAttachmentGroup = PreviewObject3DLike & {
  add: (...objs: unknown[]) => unknown;
};

export type RenderPreviewMarkerContext = {
  app: RenderPreviewOpsDeps['app'];
  ops: RenderPreviewOpsDeps['ops'];
  cacheValue: RenderPreviewOpsDeps['cacheValue'];
  writeCacheValue: RenderPreviewOpsDeps['writeCacheValue'];
  wardrobeGroup: RenderPreviewOpsDeps['wardrobeGroup'];
  addToWardrobe: RenderPreviewOpsDeps['addToWardrobe'];
  renderOpsHandleCatch: RenderPreviewOpsDeps['renderOpsHandleCatch'];
  assertTHREE: RenderPreviewOpsDeps['assertTHREE'];
};
