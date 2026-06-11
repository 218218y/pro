import type { AppContainer } from '../../../types';
import type {
  PreviewGroupLike,
  PreviewMaterialLike,
  PreviewMeshLike,
  PreviewTHREESurface,
  RenderPreviewOpsDeps,
  SketchPlacementPreviewArgs,
  SketchPlacementPreviewUserData,
} from './render_preview_ops_contracts.js';
import type { RenderPreviewSketchShared } from './render_preview_sketch_shared.js';

export type SketchPlacementPreviewMeshes = {
  shelfA: PreviewMeshLike | null;
  boxTop: PreviewMeshLike | null;
  boxBottom: PreviewMeshLike | null;
  boxLeft: PreviewMeshLike | null;
  boxRight: PreviewMeshLike | null;
  boxBack: PreviewMeshLike | null;
  helperMeshes: Array<PreviewMeshLike | null>;
};

export type ApplySketchPlacementPreviewArgs = {
  App: AppContainer;
  input: SketchPlacementPreviewArgs;
  THREE: PreviewTHREESurface;
  g: PreviewGroupLike;
  ud: SketchPlacementPreviewUserData;
  meshes: SketchPlacementPreviewMeshes;
  shared: RenderPreviewSketchShared;
  wardrobeGroup: RenderPreviewOpsDeps['wardrobeGroup'];
  asObject: RenderPreviewOpsDeps['asObject'];
};

export type FrontOverlay = {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  t: number;
};

type PreviewMaterialInput = PreviewMaterialLike | null | undefined;

type PreviewPlacementArgs = {
  mesh: PreviewMeshLike | null;
  sx: number;
  sy: number;
  sz: number;
  px: number;
  py: number;
  pz: number;
  material?: PreviewMaterialInput;
  lineMaterial?: PreviewMaterialInput;
  renderOrder?: number;
  outlineRenderOrder?: number;
};

export function createSketchPlacementPreviewContext(args: ApplySketchPlacementPreviewArgs) {
  const { App, input, THREE, g, ud, meshes, shared, wardrobeGroup, asObject } = args;
  const { shelfA, boxTop, boxBottom, boxLeft, boxRight, boxBack, helperMeshes } = meshes;
  const {
    asPreviewGroup,
    readOutline,
    setOutlineVisible,
    readValueRecord,
    callMethod,
    readPreviewDrawerList,
    readMatrix4,
    readVector3,
    readQuaternion,
    makeCtorValue,
    readPreviewObjectList,
    resetMeshOrientation,
    isFn,
  } = shared;

  const kind = typeof input.kind === 'string' ? String(input.kind) : '';
  const variant = typeof input.variant === 'string' ? String(input.variant) : '';
  const op = typeof input.op === 'string' ? String(input.op) : '';
  const isRemove = op === 'remove' || input.isRemove === true;

  const x = Number(input.x);
  const y = Number(input.y);
  const z = Number(input.z);
  const w = Number(input.w);
  const h = Number(input.h);
  const d = Number(input.d);
  const woodThick = Number(input.woodThick || 0.018);
  const hasFinitePlacement = Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) && w > 0 && d > 0;

  const setVisible = (m: PreviewMeshLike | null, on: boolean) => {
    if (!m) return;
    m.visible = !!on;
    try {
      setOutlineVisible(m, !!on);
    } catch {
      // ignore
    }
  };

  const hideAll = () => {
    setVisible(shelfA, false);
    setVisible(boxTop, false);
    setVisible(boxBottom, false);
    setVisible(boxLeft, false);
    setVisible(boxRight, false);
    setVisible(boxBack, false);
  };

  const readFrontOverlay = (
    fallbackX: number,
    fallbackY: number,
    fallbackW: number,
    fallbackH: number,
    fallbackT: number
  ): FrontOverlay | null => {
    const overlayZ = Number(input.frontOverlayZ);
    if (!Number.isFinite(overlayZ)) return null;
    const overlayX = Number(input.frontOverlayX);
    const overlayY = Number(input.frontOverlayY);
    const overlayW = Number(input.frontOverlayW);
    const overlayH = Number(input.frontOverlayH);
    const overlayT = Number(input.frontOverlayThickness);
    return {
      x: Number.isFinite(overlayX) ? overlayX : fallbackX,
      y: Number.isFinite(overlayY) ? overlayY : fallbackY,
      z: overlayZ,
      w: Number.isFinite(overlayW) && overlayW > 0 ? overlayW : fallbackW,
      h: Number.isFinite(overlayH) && overlayH > 0 ? overlayH : fallbackH,
      t: Number.isFinite(overlayT) && overlayT > 0 ? overlayT : fallbackT,
    };
  };

  const applyPreviewStyle = (
    mesh: PreviewMeshLike | null,
    material: PreviewMaterialInput,
    lineMaterial: PreviewMaterialInput,
    renderOrder?: number,
    outlineRenderOrder?: number
  ) => {
    if (!mesh) return;
    if (material) mesh.material = material;
    if (typeof renderOrder === 'number') mesh.renderOrder = renderOrder;
    try {
      const outline = readOutline(mesh);
      if (outline && lineMaterial) outline.material = lineMaterial;
      if (outline && typeof outlineRenderOrder === 'number') outline.renderOrder = outlineRenderOrder;
    } catch {
      // ignore
    }
  };

  const placePreviewBoxMesh = ({
    mesh,
    sx,
    sy,
    sz,
    px,
    py,
    pz,
    material,
    lineMaterial,
    renderOrder,
    outlineRenderOrder,
  }: PreviewPlacementArgs) => {
    if (!mesh) return;
    setVisible(mesh, true);
    resetMeshOrientation(mesh);
    applyPreviewStyle(mesh, material, lineMaterial, renderOrder, outlineRenderOrder);
    if (typeof mesh.position?.set === 'function') mesh.position.set(px, py, pz);
    if (typeof mesh.scale?.set === 'function') {
      mesh.scale.set(Math.max(0.0001, sx), Math.max(0.0001, sy), Math.max(0.0001, sz));
    }
  };

  return {
    App,
    input,
    THREE,
    g,
    ud,
    meshes,
    shared,
    wardrobeGroup,
    asObject,
    shelfA,
    boxTop,
    boxBottom,
    boxLeft,
    boxRight,
    boxBack,
    helperMeshes,
    asPreviewGroup,
    readOutline,
    readValueRecord,
    callMethod,
    readPreviewDrawerList,
    readMatrix4,
    readVector3,
    readQuaternion,
    makeCtorValue,
    readPreviewObjectList,
    resetMeshOrientation,
    isFn,
    kind,
    variant,
    op,
    isRemove,
    x,
    y,
    z,
    w,
    h,
    d,
    woodThick,
    hasFinitePlacement,
    setVisible,
    hideAll,
    readFrontOverlay,
    applyPreviewStyle,
    placePreviewBoxMesh,
  };
}

export type SketchPlacementPreviewContext = ReturnType<typeof createSketchPlacementPreviewContext>;
