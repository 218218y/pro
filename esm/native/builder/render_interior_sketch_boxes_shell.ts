import type {
  RenderInteriorSketchBoxesArgs,
  RenderSketchBoxGeometry,
  RenderSketchBoxShellResult,
  ResolvedSketchBoxState,
} from './render_interior_sketch_boxes_shared.js';
import { asMesh } from './render_interior_sketch_shared.js';
import { applySketchBoxPickMeta } from './render_interior_sketch_pick_meta.js';
import {
  clampSketchFreeBoxCenterY,
  renderSketchFreeBoxDimensions,
  resolveSketchBoxGeometry,
  resolveSketchFreeBoxGeometry,
} from './render_interior_sketch_layout.js';
import { renderSketchBoxCarcassAdornment } from './render_interior_sketch_visuals.js';

function resolveBoxHeight(args: {
  rawHeight: unknown;
  fallbackHeight: unknown;
  woodThick: number;
  spanH: number;
  isFreePlacement: boolean;
}): number | null {
  let height = Number(args.rawHeight);
  if (!Number.isFinite(height)) height = Number(args.fallbackHeight);
  if (!Number.isFinite(height)) return null;
  if (height < args.woodThick * 2 + 0.02) height = args.woodThick * 2 + 0.02;
  if (!args.isFreePlacement && height > args.spanH) height = args.spanH;
  return height;
}

function resolveBoxGeometry(args: {
  box: RenderInteriorSketchBoxesArgs['boxes'][number];
  isFreePlacement: boolean;
  height: number;
  renderArgs: RenderInteriorSketchBoxesArgs;
  freeWardrobeBox: ReturnType<RenderInteriorSketchBoxesArgs['measureWardrobeLocalBox']>;
}): {
  centerY: number;
  geometry: RenderSketchBoxGeometry;
  absEntry: RenderSketchBoxShellResult['absEntry'];
} | null {
  const { box, isFreePlacement, height, renderArgs, freeWardrobeBox } = args;
  const {
    effectiveBottomY,
    effectiveTopY,
    spanH,
    innerW,
    woodThick,
    internalDepth,
    internalCenterX,
    internalZ,
    clampY,
  } = renderArgs;
  const halfH = height / 2;
  const wRaw = box.widthM;
  const dRaw = box.depthM;
  const widthM = typeof wRaw === 'number' ? wRaw : wRaw != null ? Number(wRaw) : NaN;
  const depthM = typeof dRaw === 'number' ? dRaw : dRaw != null ? Number(dRaw) : NaN;

  if (isFreePlacement) {
    const absX = Number(box.absX);
    const absY = Number(box.absY);
    const freeBackZ =
      freeWardrobeBox && Number.isFinite(freeWardrobeBox.centerZ) && Number.isFinite(freeWardrobeBox.depth)
        ? Number(freeWardrobeBox.centerZ) - Number(freeWardrobeBox.depth) / 2
        : internalZ - internalDepth / 2;
    if (!Number.isFinite(absX) || !Number.isFinite(absY) || !Number.isFinite(freeBackZ)) return null;
    const centerY =
      freeWardrobeBox && Number.isFinite(freeWardrobeBox.centerY) && Number.isFinite(freeWardrobeBox.height)
        ? clampSketchFreeBoxCenterY({
            centerY: absY,
            boxH: height,
            wardrobeCenterY: Number(freeWardrobeBox.centerY),
            wardrobeHeight: Number(freeWardrobeBox.height),
            pad: Math.min(0.006, Math.max(0.001, woodThick * 0.2)),
          })
        : absY;
    const geometry = resolveSketchFreeBoxGeometry({
      wardrobeWidth: freeWardrobeBox ? Number(freeWardrobeBox.width) : innerW,
      wardrobeDepth: freeWardrobeBox ? Number(freeWardrobeBox.depth) : internalDepth,
      backZ: freeBackZ,
      centerX: absX,
      woodThick,
      widthM: Number.isFinite(widthM) && widthM > 0 ? widthM : null,
      depthM: Number.isFinite(depthM) && depthM > 0 ? depthM : null,
    });
    return { centerY, geometry, absEntry: null };
  }

  const yNormRaw = box.yNorm;
  const xNormRaw = box.xNorm;
  const yNorm = typeof yNormRaw === 'number' ? yNormRaw : Number(yNormRaw);
  const xNorm = typeof xNormRaw === 'number' ? xNormRaw : xNormRaw != null ? Number(xNormRaw) : NaN;
  if (!Number.isFinite(yNorm)) return null;

  const centerYBase = effectiveBottomY + Math.max(0, Math.min(1, yNorm)) * spanH;
  const padBox = Math.min(0.006, Math.max(0.001, woodThick * 0.2));
  const lo = effectiveBottomY + padBox + halfH;
  const hi = effectiveTopY - padBox - halfH;
  const centerY = hi > lo ? Math.max(lo, Math.min(hi, centerYBase)) : clampY(centerYBase);
  const geometry = resolveSketchBoxGeometry({
    innerW,
    internalCenterX,
    internalDepth,
    internalZ,
    woodThick,
    widthM: Number.isFinite(widthM) && widthM > 0 ? widthM : null,
    depthM: Number.isFinite(depthM) && depthM > 0 ? depthM : null,
    xNorm: Number.isFinite(xNorm) ? xNorm : null,
  });
  return {
    centerY,
    geometry,
    absEntry: {
      y: centerY,
      halfH,
      innerW: geometry.innerW,
      centerX: geometry.centerX,
      innerD: geometry.innerD,
      innerBackZ: geometry.innerBackZ,
    },
  };
}

function resolveBoxMaterial(args: {
  getPartMaterial?: RenderInteriorSketchBoxesArgs['getPartMaterial'];
  isFn: RenderInteriorSketchBoxesArgs['isFn'];
  boxPid: string;
  fallback: unknown;
}): unknown {
  const { getPartMaterial, isFn, boxPid, fallback } = args;
  let boxMat = fallback;
  try {
    if (isFn(getPartMaterial)) {
      const resolved = getPartMaterial(boxPid);
      if (resolved) boxMat = resolved;
    }
  } catch {
    // ignore
  }
  return boxMat;
}

function renderSketchBoxFrame(args: {
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
  const xL = geometry.centerX - geometry.outerW / 2 + renderArgs.woodThick / 2;
  const xR = geometry.centerX + geometry.outerW / 2 - renderArgs.woodThick / 2;
  const backPanelZ = geometry.centerZ - geometry.outerD / 2 + renderArgs.woodThick / 2;

  const boxTopMesh = asMesh(
    createBoard(
      geometry.outerW,
      renderArgs.woodThick,
      geometry.outerD,
      geometry.centerX,
      yTop,
      geometry.centerZ,
      boxMat,
      boxPid
    )
  );
  const boxBottomMesh = asMesh(
    createBoard(
      geometry.outerW,
      renderArgs.woodThick,
      geometry.outerD,
      geometry.centerX,
      yBot,
      geometry.centerZ,
      boxMat,
      boxPid
    )
  );
  const boxLeftMesh = asMesh(
    createBoard(renderArgs.woodThick, sideH, geometry.outerD, xL, centerY, geometry.centerZ, boxMat, boxPid)
  );
  const boxRightMesh = asMesh(
    createBoard(renderArgs.woodThick, sideH, geometry.outerD, xR, centerY, geometry.centerZ, boxMat, boxPid)
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
  applySketchBoxPickMeta(boxLeftMesh, boxPid, moduleKeyStr, boxId);
  applySketchBoxPickMeta(boxRightMesh, boxPid, moduleKeyStr, boxId);
  applySketchBoxPickMeta(boxBackMesh, boxPid, moduleKeyStr, boxId);

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
    if (Array.isArray(freeBoxDimensionEntries)) {
      freeBoxDimensionEntries.push({
        centerX: geometry.centerX,
        centerY,
        centerZ: geometry.centerZ,
        width: geometry.outerW,
        height,
        depth: geometry.outerD,
      });
    } else {
      renderSketchFreeBoxDimensions({
        THREE,
        addDimensionLine,
        centerX: geometry.centerX,
        centerY,
        centerZ: geometry.centerZ,
        width: geometry.outerW,
        height,
        depth: geometry.outerD,
      });
    }
  }
}

export function renderSketchBoxShell(args: {
  box: RenderInteriorSketchBoxesArgs['boxes'][number];
  boxIndex: number;
  renderArgs: RenderInteriorSketchBoxesArgs;
  freeWardrobeBox: ReturnType<RenderInteriorSketchBoxesArgs['measureWardrobeLocalBox']>;
}): RenderSketchBoxShellResult | null {
  const { box, boxIndex, renderArgs, freeWardrobeBox } = args;
  if (!box) return null;

  const isFreePlacement = box.freePlacement === true;
  const height = resolveBoxHeight({
    rawHeight: box.heightM,
    fallbackHeight: box.hM,
    woodThick: renderArgs.woodThick,
    spanH: renderArgs.spanH,
    isFreePlacement,
  });
  if (height == null) return null;

  const geometryResolved = resolveBoxGeometry({
    box,
    isFreePlacement,
    height,
    renderArgs,
    freeWardrobeBox,
  });
  if (!geometryResolved || !Number.isFinite(geometryResolved.centerY)) return null;

  const boxIdRaw = box.id;
  const boxId = boxIdRaw != null ? String(boxIdRaw) : String(boxIndex);
  const boxPid = isFreePlacement
    ? renderArgs.moduleKeyStr
      ? `sketch_box_free_${renderArgs.moduleKeyStr}_${boxId}`
      : `sketch_box_free_${boxId}`
    : renderArgs.moduleKeyStr
      ? `sketch_box_${renderArgs.moduleKeyStr}_${boxId}`
      : `sketch_box_${boxId}`;

  const boxMat = resolveBoxMaterial({
    getPartMaterial: renderArgs.getPartMaterial,
    isFn: renderArgs.isFn,
    boxPid,
    fallback: renderArgs.bodyMat,
  });

  const halfH = height / 2;
  const state: ResolvedSketchBoxState = {
    box,
    boxId,
    boxPid,
    isFreePlacement,
    height,
    halfH,
    centerY: geometryResolved.centerY,
    sideH: Math.max(renderArgs.woodThick, height - 2 * renderArgs.woodThick),
    boxMat,
    geometry: geometryResolved.geometry,
    innerBottomY: geometryResolved.centerY - halfH + renderArgs.woodThick,
    innerTopY: geometryResolved.centerY + halfH - renderArgs.woodThick,
    regularDepth:
      geometryResolved.geometry.innerD > 0
        ? Math.min(geometryResolved.geometry.innerD, 0.45)
        : geometryResolved.geometry.innerD,
    frontZ: geometryResolved.geometry.innerBackZ + geometryResolved.geometry.innerD,
  };

  renderSketchBoxFrame({ state, renderArgs });
  return { state, absEntry: geometryResolved.absEntry };
}
