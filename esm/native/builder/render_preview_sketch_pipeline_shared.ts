import { MATERIAL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  readPreviewNumber,
  readPreviewPositiveNumber,
  readPreviewPositiveNumberOr,
} from './render_preview_number_contracts.js';
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
  const isBlocked = op === 'blocked' || input.isBlocked === true || typeof input.blockedReason === 'string';
  const isRemove = op === 'remove' || input.isRemove === true || isBlocked;

  const rawX = readPreviewNumber(input.x);
  const rawY = readPreviewNumber(input.y);
  const rawZ = readPreviewNumber(input.z);
  const rawW = readPreviewPositiveNumber(input.w);
  const rawH = readPreviewNumber(input.h);
  const rawD = readPreviewPositiveNumber(input.d);
  const x = rawX ?? 0;
  const y = rawY ?? 0;
  const z = rawZ ?? 0;
  const w = rawW ?? 0;
  const h = rawH ?? 0;
  const d = rawD ?? 0;
  const woodThick = readPreviewPositiveNumberOr(input.woodThick, MATERIAL_DIMENSIONS.wood.thicknessM);
  const hasFinitePlacement = rawX != null && rawY != null && rawZ != null && rawW != null && rawD != null;

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
    const overlayZ = readPreviewNumber(input.frontOverlayZ);
    if (overlayZ == null) return null;
    const overlayX = readPreviewNumber(input.frontOverlayX);
    const overlayY = readPreviewNumber(input.frontOverlayY);
    const overlayW = readPreviewPositiveNumber(input.frontOverlayW);
    const overlayH = readPreviewPositiveNumber(input.frontOverlayH);
    const overlayT = readPreviewPositiveNumber(input.frontOverlayThickness);
    return {
      x: overlayX != null ? overlayX : fallbackX,
      y: overlayY != null ? overlayY : fallbackY,
      z: overlayZ,
      w: overlayW != null ? overlayW : fallbackW,
      h: overlayH != null ? overlayH : fallbackH,
      t: overlayT != null ? overlayT : fallbackT,
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
    isBlocked,
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
