import type { InteriorMeshLike, InteriorValueRecord } from './render_interior_ops_contracts.js';
import type {
  RenderInteriorSketchBoxesArgs,
  ResolvedSketchBoxState,
} from './render_interior_sketch_boxes_shared.js';

import { asMesh, toFiniteNumber } from './render_interior_sketch_shared.js';
import { applySketchBoxPickMeta } from './render_interior_sketch_pick_meta.js';
import { renderSketchFreeBoxDimensions } from './render_interior_sketch_layout.js';
import { renderSketchBoxCarcassAdornment } from './render_interior_sketch_visuals.js';
import { readSketchBoxRemovedSideShelfState, sketchBoxSideToPartId } from '../features/part_identity/api.js';

type SketchBoxHorizontalCapSpan = {
  width: number;
  centerX: number;
};

type SketchBoxFootprintPoint = { x: number; z: number };

type SketchBoxDimensionEnvelope = {
  centerZ: number;
  depth: number;
};

function resolveSketchBoxDimensionEnvelope(state: ResolvedSketchBoxState): SketchBoxDimensionEnvelope {
  const regularEnvelope = { centerZ: state.geometry.centerZ, depth: state.geometry.outerD };
  if (!state.hexGeometry) return regularEnvelope;

  const fullDepth = toFiniteNumber(state.fullDepth);
  const backZ = toFiniteNumber(state.backZ);
  if (fullDepth == null || !(fullDepth > state.geometry.outerD) || backZ == null) {
    return regularEnvelope;
  }

  return {
    centerZ: backZ + fullDepth / 2,
    depth: fullDepth,
  };
}

type SketchBoxShapeLike = {
  moveTo: (x: number, y: number) => unknown;
  lineTo: (x: number, y: number) => unknown;
  closePath?: () => unknown;
};

type SketchBoxHexThree = NonNullable<RenderInteriorSketchBoxesArgs['THREE']> & {
  Shape?: new () => SketchBoxShapeLike;
  ExtrudeGeometry?: new (shape: SketchBoxShapeLike, opts: Record<string, unknown>) => unknown;
};

function createSketchBoxShape(
  THREE: SketchBoxHexThree,
  points: SketchBoxFootprintPoint[]
): SketchBoxShapeLike | null {
  if (typeof THREE.Shape !== 'function' || !points.length) return null;
  const shape = new THREE.Shape();
  shape.moveTo(points[0].x, points[0].z);
  for (let i = 1; i < points.length; i += 1) shape.lineTo(points[i].x, points[i].z);
  if (typeof shape.closePath === 'function') shape.closePath();
  return shape;
}

function resolveSketchBoxHexFootprint(args: {
  state: ResolvedSketchBoxState;
  capSpan?: SketchBoxHorizontalCapSpan | null;
  woodThick: number;
}): SketchBoxFootprintPoint[] | null {
  const { state, capSpan, woodThick } = args;
  const hex = state.hexGeometry;
  if (!hex) return null;

  const outerLeftX = state.geometry.centerX - state.geometry.outerW / 2;
  const outerRightX = state.geometry.centerX + state.geometry.outerW / 2;
  const capLeftX = capSpan ? capSpan.centerX - capSpan.width / 2 : outerLeftX;
  const capRightX = capSpan ? capSpan.centerX + capSpan.width / 2 : outerRightX;
  const halfDoorW = hex.doorWidthM / 2;
  const doorLeftX = Math.max(outerLeftX + woodThick, state.geometry.centerX - halfDoorW);
  const doorRightX = Math.min(outerRightX - woodThick, state.geometry.centerX + halfDoorW);
  const sideFrontZ = state.backZ + hex.sideDepthM;
  const doorZ = state.backZ + hex.doorDepthM;

  return [
    { x: capLeftX, z: state.backZ },
    { x: capRightX, z: state.backZ },
    { x: capRightX, z: sideFrontZ },
    { x: Math.min(capRightX, doorRightX), z: doorZ },
    { x: Math.max(capLeftX, doorLeftX), z: doorZ },
    { x: capLeftX, z: sideFrontZ },
  ];
}

function resolveSketchBoxPartMaterial(args: {
  renderArgs: RenderInteriorSketchBoxesArgs;
  partId: string;
  defaultMaterial: unknown;
}): unknown {
  const { renderArgs, partId, defaultMaterial } = args;
  try {
    if (renderArgs.isFn(renderArgs.getPartMaterial))
      return renderArgs.getPartMaterial(partId) || defaultMaterial;
  } catch {
    // Material lookup is optional; the supplied material keeps the shell visible.
  }
  return defaultMaterial;
}

function addSketchBoxOutlines(renderArgs: RenderInteriorSketchBoxesArgs, mesh: unknown): void {
  try {
    const addOutlines = renderArgs.input.addOutlines;
    if (renderArgs.isFn(addOutlines)) addOutlines(mesh);
  } catch {
    // Outlines are decorative and must not block the structural mesh.
  }
}

function createSketchBoxHexHorizontalCapMesh(args: {
  state: ResolvedSketchBoxState;
  renderArgs: RenderInteriorSketchBoxesArgs;
  capSpan: SketchBoxHorizontalCapSpan;
  partId: string;
  y: number;
}): InteriorMeshLike | null {
  const THREE = args.renderArgs.THREE as SketchBoxHexThree | null;
  if (!THREE || typeof THREE.ExtrudeGeometry !== 'function' || typeof THREE.Mesh !== 'function') return null;
  const footprint = resolveSketchBoxHexFootprint({
    state: args.state,
    capSpan: args.capSpan,
    woodThick: args.renderArgs.woodThick,
  });
  if (!footprint) return null;
  const shape = createSketchBoxShape(THREE, footprint);
  if (!shape) return null;

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: args.renderArgs.woodThick,
    bevelEnabled: false,
  });
  const material = resolveSketchBoxPartMaterial({
    renderArgs: args.renderArgs,
    partId: args.partId,
    defaultMaterial: args.state.boxMat,
  });
  const mesh = new THREE.Mesh(geometry, material) as InteriorMeshLike;
  mesh.position?.set?.(0, args.y, 0);
  if (mesh.rotation) mesh.rotation.x = Math.PI / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  applySketchBoxPickMeta(mesh, args.partId, args.renderArgs.moduleKeyStr, args.state.boxId);
  addSketchBoxOutlines(args.renderArgs, mesh);
  args.renderArgs.group.add?.(mesh);
  return mesh;
}

function addSketchBoxHexDiagonalPanel(args: {
  state: ResolvedSketchBoxState;
  renderArgs: RenderInteriorSketchBoxesArgs;
  partId: string;
  a: SketchBoxFootprintPoint;
  b: SketchBoxFootprintPoint;
}): void {
  const THREE = args.renderArgs.THREE;
  if (!THREE || typeof THREE.BoxGeometry !== 'function' || typeof THREE.Mesh !== 'function') return;
  const dx = args.b.x - args.a.x;
  const dz = args.b.z - args.a.z;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (!Number.isFinite(len) || len <= args.renderArgs.woodThick) return;

  const material = resolveSketchBoxPartMaterial({
    renderArgs: args.renderArgs,
    partId: args.partId,
    defaultMaterial: args.state.boxMat,
  });
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(len, args.state.sideH, args.renderArgs.woodThick),
    material
  ) as InteriorMeshLike;
  mesh.position?.set?.((args.a.x + args.b.x) / 2, args.state.centerY, (args.a.z + args.b.z) / 2);
  if (mesh.rotation) mesh.rotation.y = -Math.atan2(dz, dx);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  applySketchBoxPickMeta(mesh, args.partId, args.renderArgs.moduleKeyStr, args.state.boxId);
  const userData = (mesh.userData || {}) as InteriorValueRecord;
  userData.__wpSketchFreePlacement = args.state.isFreePlacement === true;
  userData.kind = 'sketchBoxHexDiagonal';
  mesh.userData = userData;
  addSketchBoxOutlines(args.renderArgs, mesh);
  args.renderArgs.group.add?.(mesh);
}

function addSketchBoxHexDiagonalPanels(args: {
  state: ResolvedSketchBoxState;
  renderArgs: RenderInteriorSketchBoxesArgs;
}): void {
  const hex = args.state.hexGeometry;
  if (!hex) return;
  const outerLeftX = args.state.geometry.centerX - args.state.geometry.outerW / 2;
  const outerRightX = args.state.geometry.centerX + args.state.geometry.outerW / 2;
  const sideFrontZ = args.state.backZ + hex.sideDepthM;
  const doorZ = args.state.backZ + hex.doorDepthM;
  const halfDoorW = hex.doorWidthM / 2;
  const doorLeftX = Math.max(outerLeftX + args.renderArgs.woodThick, args.state.geometry.centerX - halfDoorW);
  const doorRightX = Math.min(
    outerRightX - args.renderArgs.woodThick,
    args.state.geometry.centerX + halfDoorW
  );

  addSketchBoxHexDiagonalPanel({
    state: args.state,
    renderArgs: args.renderArgs,
    partId: `${args.state.boxPid}_hex_diag_left`,
    a: { x: outerLeftX, z: sideFrontZ },
    b: { x: doorLeftX, z: doorZ },
  });
  addSketchBoxHexDiagonalPanel({
    state: args.state,
    renderArgs: args.renderArgs,
    partId: `${args.state.boxPid}_hex_diag_right`,
    a: { x: doorRightX, z: doorZ },
    b: { x: outerRightX, z: sideFrontZ },
  });
}

function resolveSketchBoxHorizontalCapSpan(args: {
  state: ResolvedSketchBoxState;
  cfg: unknown;
  woodThick: number;
}): SketchBoxHorizontalCapSpan {
  const { state, cfg, woodThick } = args;
  const removedSideState = readSketchBoxRemovedSideShelfState(cfg, state.boxPid);
  const leftInset = removedSideState.leftRemoved ? woodThick : 0;
  const rightInset = removedSideState.rightRemoved ? woodThick : 0;

  if (!(leftInset > 0) && !(rightInset > 0)) {
    return { width: state.geometry.outerW, centerX: state.geometry.centerX };
  }

  const outerLeftX = state.geometry.centerX - state.geometry.outerW / 2;
  const outerRightX = state.geometry.centerX + state.geometry.outerW / 2;
  const capLeftX = outerLeftX + leftInset;
  const capRightX = outerRightX - rightInset;
  const width = Math.max(woodThick, capRightX - capLeftX);
  return {
    width,
    centerX: capLeftX + width / 2,
  };
}

export function renderSketchBoxShellFrame(args: {
  state: ResolvedSketchBoxState;
  renderArgs: RenderInteriorSketchBoxesArgs;
}): void {
  const { state, renderArgs } = args;
  const {
    createBoard,
    group,
    moduleKeyStr,
    input,
    getPartMaterial,
    THREE,
    addDimensionLine,
    renderFreeBoxDimensionsEnabled,
    freeBoxDimensionEntries,
  } = renderArgs;
  const { box, boxId, boxPid, isFreePlacement, height, halfH, centerY, sideH, boxMat, geometry } = state;

  const yTop = centerY + halfH - renderArgs.woodThick / 2;
  const yBot = centerY - halfH + renderArgs.woodThick / 2;
  const capSpan = resolveSketchBoxHorizontalCapSpan({
    state,
    cfg: input.cfgSnapshot,
    woodThick: renderArgs.woodThick,
  });
  const xL = geometry.centerX - geometry.outerW / 2 + renderArgs.woodThick / 2;
  const xR = geometry.centerX + geometry.outerW / 2 - renderArgs.woodThick / 2;
  const backPanelZ = geometry.centerZ - geometry.outerD / 2 + renderArgs.woodThick / 2;

  const leftSidePartId = sketchBoxSideToPartId(boxPid, 'left');
  const rightSidePartId = sketchBoxSideToPartId(boxPid, 'right');

  const boxTopMesh =
    (state.hexGeometry
      ? createSketchBoxHexHorizontalCapMesh({ state, renderArgs, capSpan, partId: boxPid, y: yTop })
      : null) ||
    asMesh(
      createBoard(
        capSpan.width,
        renderArgs.woodThick,
        geometry.outerD,
        capSpan.centerX,
        yTop,
        geometry.centerZ,
        boxMat,
        boxPid
      )
    );
  const boxBottomMesh =
    (state.hexGeometry
      ? createSketchBoxHexHorizontalCapMesh({ state, renderArgs, capSpan, partId: boxPid, y: yBot })
      : null) ||
    asMesh(
      createBoard(
        capSpan.width,
        renderArgs.woodThick,
        geometry.outerD,
        capSpan.centerX,
        yBot,
        geometry.centerZ,
        boxMat,
        boxPid
      )
    );
  const boxLeftMesh = asMesh(
    createBoard(
      renderArgs.woodThick,
      sideH,
      geometry.outerD,
      xL,
      centerY,
      geometry.centerZ,
      boxMat,
      leftSidePartId || boxPid
    )
  );
  const boxRightMesh = asMesh(
    createBoard(
      renderArgs.woodThick,
      sideH,
      geometry.outerD,
      xR,
      centerY,
      geometry.centerZ,
      boxMat,
      rightSidePartId || boxPid
    )
  );
  const boxBackMesh = asMesh(
    createBoard(
      geometry.innerW,
      sideH,
      renderArgs.woodThick,
      geometry.centerX,
      centerY,
      backPanelZ,
      boxMat,
      boxPid
    )
  );
  applySketchBoxPickMeta(boxTopMesh, boxPid, moduleKeyStr, boxId);
  applySketchBoxPickMeta(boxBottomMesh, boxPid, moduleKeyStr, boxId);
  applySketchBoxPickMeta(boxLeftMesh, leftSidePartId || boxPid, moduleKeyStr, boxId);
  applySketchBoxPickMeta(boxRightMesh, rightSidePartId || boxPid, moduleKeyStr, boxId);
  applySketchBoxPickMeta(boxBackMesh, boxPid, moduleKeyStr, boxId);
  addSketchBoxHexDiagonalPanels({ state, renderArgs });

  if (THREE) {
    renderSketchBoxCarcassAdornment({
      THREE,
      group,
      box,
      boxPid,
      moduleKeyStr,
      boxId,
      boxGeo: {
        centerX: geometry.centerX,
        centerZ: geometry.centerZ,
        outerW: geometry.outerW,
        outerD: geometry.outerD,
      },
      boxCenterY: centerY,
      boxHeight: height,
      woodThick: renderArgs.woodThick,
      bodyMat: boxMat,
      getPartMaterial,
      addOutlines: input.addOutlines,
      isFreePlacement,
    });
  }

  if (isFreePlacement && renderFreeBoxDimensionsEnabled && THREE && addDimensionLine) {
    const dimensionEnvelope = resolveSketchBoxDimensionEnvelope(state);
    if (Array.isArray(freeBoxDimensionEntries)) {
      freeBoxDimensionEntries.push({
        centerX: geometry.centerX,
        centerY,
        centerZ: dimensionEnvelope.centerZ,
        width: geometry.outerW,
        height,
        depth: dimensionEnvelope.depth,
      });
    } else {
      renderSketchFreeBoxDimensions({
        THREE,
        addDimensionLine,
        centerX: geometry.centerX,
        centerY,
        centerZ: dimensionEnvelope.centerZ,
        width: geometry.outerW,
        height,
        depth: dimensionEnvelope.depth,
      });
    }
  }
}
