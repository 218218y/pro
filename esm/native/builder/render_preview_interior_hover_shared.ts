import type { UnknownCallable } from '../../../types';
import type {
  InteriorLayoutHoverPreviewArgs,
  InteriorLayoutHoverPreviewUserData,
  PreviewGroupLike,
  PreviewLineLike,
  PreviewMaterialLike,
  PreviewMeshLike,
  PreviewTHREESurface,
  RenderPreviewOpsDeps,
} from './render_preview_ops_contracts.js';

function __isFn(v: unknown): v is UnknownCallable {
  return typeof v === 'function';
}

export type RenderPreviewInteriorHoverShared = {
  app: RenderPreviewOpsDeps['app'];
  ops: RenderPreviewOpsDeps['ops'];
  cacheValue: RenderPreviewOpsDeps['cacheValue'];
  writeCacheValue: RenderPreviewOpsDeps['writeCacheValue'];
  wardrobeGroup: RenderPreviewOpsDeps['wardrobeGroup'];
  renderOpsHandleCatch: RenderPreviewOpsDeps['renderOpsHandleCatch'];
  assertTHREE: RenderPreviewOpsDeps['assertTHREE'];
  getThreeMaybe: RenderPreviewOpsDeps['getThreeMaybe'];
  asPreviewGroup: (x: unknown) => PreviewGroupLike | null;
  asPreviewMesh: (x: unknown) => PreviewMeshLike | null;
  asPreviewLine: (x: unknown) => PreviewLineLike | null;
  readArgs: (x: unknown) => InteriorLayoutHoverPreviewArgs;
  readUserData: (x: unknown) => InteriorLayoutHoverPreviewUserData;
  readOutline: (m: PreviewMeshLike | null | undefined) => PreviewLineLike | null;
  setOutlineVisible: (m: PreviewMeshLike | null | undefined, on: boolean) => void;
  readMeshList: (value: unknown) => PreviewMeshLike[];
  markKeepMaterial: (m: PreviewMaterialLike) => void;
  markIgnoreRaycast: (obj: PreviewMeshLike | PreviewLineLike | PreviewGroupLike) => void;
  isFn: (v: unknown) => v is UnknownCallable;
  asPreviewTHREE: (x: unknown) => PreviewTHREESurface | null;
};

export function createRenderPreviewInteriorHoverShared(
  deps: Pick<
    RenderPreviewOpsDeps,
    | 'app'
    | 'ops'
    | 'asObject'
    | 'cacheValue'
    | 'writeCacheValue'
    | 'wardrobeGroup'
    | 'renderOpsHandleCatch'
    | 'assertTHREE'
    | 'getThreeMaybe'
  >
): RenderPreviewInteriorHoverShared {
  const asPreviewGroup = (x: unknown) => deps.asObject<PreviewGroupLike>(x);
  const asPreviewMesh = (x: unknown) => deps.asObject<PreviewMeshLike>(x);
  const asPreviewLine = (x: unknown) => deps.asObject<PreviewLineLike>(x);
  const asPreviewTHREE = (x: unknown) => deps.asObject<PreviewTHREESurface>(x);
  const readArgs = (x: unknown): InteriorLayoutHoverPreviewArgs =>
    deps.asObject<InteriorLayoutHoverPreviewArgs>(x) ?? {};
  const readUserData = (x: unknown): InteriorLayoutHoverPreviewUserData =>
    deps.asObject<InteriorLayoutHoverPreviewUserData>(x) ?? {};
  const readOutline = (m: PreviewMeshLike | null | undefined): PreviewLineLike | null =>
    m ? asPreviewLine(m.userData?.__outline) : null;
  const setOutlineVisible = (m: PreviewMeshLike | null | undefined, on: boolean) => {
    const outline = readOutline(m);
    if (outline) outline.visible = on;
  };
  const readMeshList = (value: unknown): PreviewMeshLike[] =>
    Array.isArray(value)
      ? value.filter((item): item is PreviewMeshLike => !!item && typeof item === 'object')
      : [];
  const markKeepMaterial = (m: PreviewMaterialLike): void => {
    m.userData = m.userData || {};
    m.userData.__keepMaterial = true;
  };
  const markIgnoreRaycast = (obj: PreviewMeshLike | PreviewLineLike | PreviewGroupLike): void => {
    obj.userData = obj.userData || {};
    obj.userData.__ignoreRaycast = true;
  };

  return {
    app: deps.app,
    ops: deps.ops,
    cacheValue: deps.cacheValue,
    writeCacheValue: deps.writeCacheValue,
    wardrobeGroup: deps.wardrobeGroup,
    renderOpsHandleCatch: deps.renderOpsHandleCatch,
    assertTHREE: deps.assertTHREE,
    getThreeMaybe: deps.getThreeMaybe,
    asPreviewGroup,
    asPreviewMesh,
    asPreviewLine,
    readArgs,
    readUserData,
    readOutline,
    setOutlineVisible,
    readMeshList,
    markKeepMaterial,
    markIgnoreRaycast,
    isFn: __isFn,
    asPreviewTHREE,
  };
}

export function resolveInteriorHoverPreviewTHREE(
  shared: Pick<RenderPreviewInteriorHoverShared, 'asPreviewTHREE' | 'assertTHREE'>,
  App: ReturnType<RenderPreviewInteriorHoverShared['app']>,
  input: InteriorLayoutHoverPreviewArgs
): PreviewTHREESurface | null {
  const provided = shared.asPreviewTHREE(input.THREE);
  if (provided) return provided;
  try {
    return shared.asPreviewTHREE(
      shared.assertTHREE(App, 'native/builder/render_ops.interiorLayoutHoverPreview')
    );
  } catch {
    return null;
  }
}
