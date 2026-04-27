import type { RenderSketchBoxContentsArgs } from './render_interior_sketch_boxes_shared.js';
import type {
  SketchRodExtra,
  SketchShelfExtra,
  SketchStorageBarrierExtra,
} from './render_interior_sketch_shared.js';

import { asMaterial, asMesh, asRecordArray } from './render_interior_sketch_shared.js';
import {
  normalizeSketchShelfVariant,
  resolveSketchBoxDividerPlacement,
  resolveSketchBoxSegmentForContent,
} from './render_interior_sketch_layout.js';

function resolvePartMaterial(args: {
  getPartMaterial?: RenderSketchBoxContentsArgs['args']['getPartMaterial'];
  isFn: RenderSketchBoxContentsArgs['args']['isFn'];
  partId: string;
  fallback: unknown;
}): unknown {
  const { getPartMaterial, isFn, partId, fallback } = args;
  try {
    if (isFn(getPartMaterial)) {
      const resolved = getPartMaterial(partId);
      if (resolved) return resolved;
    }
  } catch {
    // ignore
  }
  return fallback;
}

export function renderSketchBoxStaticContents(args: RenderSketchBoxContentsArgs): void {
  const { shell, boxDividers, yFromBoxNorm } = args;
  const {
    createBoard,
    group,
    woodThick,
    currentShelfMat,
    bodyMat,
    getPartMaterial,
    getPartColorValue,
    THREE,
    glassMat,
    addBraceDarkSeams,
    addShelfPins,
    isFn,
  } = args.args;
  const { box, boxPid, centerY, sideH, boxMat, geometry, regularDepth, frontZ } = shell;

  for (let di = 0; di < boxDividers.length; di++) {
    const divider = boxDividers[di];
    const dividerPlacement = resolveSketchBoxDividerPlacement({
      boxCenterX: geometry.centerX,
      innerW: geometry.innerW,
      woodThick,
      dividerXNorm: divider.xNorm,
    });
    const dividerPid = `${boxPid}_divider_${String(divider.id || di)}`;
    const dividerMat = resolvePartMaterial({
      getPartMaterial,
      isFn,
      partId: dividerPid,
      fallback: boxMat,
    });
    createBoard(
      Math.max(0.0001, woodThick),
      Math.max(0.0001, sideH),
      Math.max(0.0001, geometry.innerD),
      dividerPlacement.centerX,
      centerY,
      geometry.innerBackZ + geometry.innerD / 2,
      dividerMat,
      dividerPid
    );
  }

  const boxShelves = asRecordArray<SketchShelfExtra>(box.shelves);
  for (let si = 0; si < boxShelves.length; si++) {
    const shelf = boxShelves[si] || null;
    if (!shelf) continue;
    const variant = normalizeSketchShelfVariant(shelf.variant);
    const isBrace = variant === 'brace';
    const isGlass = variant === 'glass';
    const isDouble = variant === 'double' || !variant;
    const shelfH = isGlass ? 0.018 : isDouble ? Math.max(woodThick, woodThick * 2) : woodThick;
    const shelfY = yFromBoxNorm(shelf.yNorm, shelfH / 2);
    if (shelfY == null) continue;
    const shelfSegment = resolveSketchBoxSegmentForContent({
      dividers: boxDividers,
      boxCenterX: geometry.centerX,
      innerW: geometry.innerW,
      woodThick,
      xNorm: shelf.xNorm,
    });
    let shelfDepth = isBrace ? geometry.innerD : regularDepth;
    const depthRaw = shelf.depthM;
    const depthM = typeof depthRaw === 'number' ? depthRaw : depthRaw != null ? Number(depthRaw) : NaN;
    if (Number.isFinite(depthM) && depthM > 0)
      shelfDepth = Math.min(geometry.innerD, Math.max(woodThick, depthM));
    const shelfPid = `${boxPid}_shelf_${String(shelf.id ?? si)}`;
    let shelfMat = isGlass && glassMat ? glassMat : currentShelfMat;
    try {
      const partColorValue = isFn(getPartColorValue) ? getPartColorValue(shelfPid) : null;
      if (!isGlass && partColorValue && isFn(getPartMaterial)) {
        const resolved = getPartMaterial(shelfPid);
        if (resolved) shelfMat = resolved;
      }
    } catch {
      // ignore
    }
    const shelfInnerW = shelfSegment ? shelfSegment.width : geometry.innerW;
    const shelfCenterX = shelfSegment ? shelfSegment.centerX : geometry.centerX;
    const shelfW = Math.max(0.02, shelfInnerW - (isBrace ? 0.002 : 0.014));
    const shelfZ = geometry.innerBackZ + shelfDepth / 2;
    const mesh = asMesh(
      createBoard(shelfW, shelfH, shelfDepth, shelfCenterX, shelfY, shelfZ, shelfMat, shelfPid)
    );
    if (isBrace) {
      const boxLeftFaceX = shelfSegment ? shelfSegment.leftX : geometry.centerX - geometry.innerW / 2;
      const boxRightFaceX = shelfSegment ? shelfSegment.rightX : geometry.centerX + geometry.innerW / 2;
      addBraceDarkSeams(shelfY, shelfZ, shelfDepth, true, THREE, boxLeftFaceX, boxRightFaceX);
    }
    if (isGlass && mesh && typeof mesh === 'object') {
      mesh.userData = mesh.userData || {};
      mesh.userData.__keepMaterial = true;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.renderOrder = 2;
    }
    addShelfPins(
      shelfCenterX,
      shelfY,
      shelfZ,
      shelfW,
      shelfH,
      shelfDepth,
      !isBrace && (isDouble || isGlass || variant === 'regular')
    );
  }

  const boxStorageBarriers = asRecordArray<SketchStorageBarrierExtra>(box.storageBarriers);
  for (let barrierIndex = 0; barrierIndex < boxStorageBarriers.length; barrierIndex++) {
    const barrier = boxStorageBarriers[barrierIndex] || null;
    if (!barrier) continue;
    let barrierH = Number(barrier.heightM);
    if (!Number.isFinite(barrierH)) barrierH = Number(barrier.hM);
    if (!Number.isFinite(barrierH)) continue;
    barrierH = Math.max(woodThick * 2 + 0.02, Math.min(barrierH, Math.max(woodThick * 2 + 0.02, sideH)));
    const barrierY = yFromBoxNorm(barrier.yNorm, barrierH / 2);
    if (barrierY == null) continue;
    const barrierPid = `${boxPid}_storage_${String(barrier.id ?? barrierIndex)}`;
    const barrierMat = resolvePartMaterial({
      getPartMaterial,
      isFn,
      partId: barrierPid,
      fallback: bodyMat,
    });
    const barrierSegment = resolveSketchBoxSegmentForContent({
      dividers: boxDividers,
      boxCenterX: geometry.centerX,
      innerW: geometry.innerW,
      woodThick,
      xNorm: barrier.xNorm,
    });
    const barrierW = Math.max(0.02, (barrierSegment ? barrierSegment.width : geometry.innerW) - 0.025);
    const barrierX = barrierSegment ? barrierSegment.centerX : geometry.centerX;
    const barrierD = Math.max(0.0001, woodThick);
    const barrierZ = Math.max(
      geometry.innerBackZ + barrierD / 2,
      frontZ - Math.min(0.06, Math.max(0.02, geometry.innerD * 0.35))
    );
    createBoard(barrierW, barrierH, barrierD, barrierX, barrierY, barrierZ, barrierMat, barrierPid);
  }

  const boxRods = asRecordArray<SketchRodExtra>(box.rods);
  if (boxRods.length && THREE) {
    const rodMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 0.35, metalness: 0.8 });
    try {
      const rodMaterial = asMaterial(rodMat);
      if (rodMaterial) rodMaterial.__keepMaterial = true;
    } catch {
      // ignore
    }
    for (let ri = 0; ri < boxRods.length; ri++) {
      const rod = boxRods[ri] || null;
      if (!rod) continue;
      const rodY = yFromBoxNorm(rod.yNorm, 0.015);
      if (rodY == null) continue;
      const rodSegment = resolveSketchBoxSegmentForContent({
        dividers: boxDividers,
        boxCenterX: geometry.centerX,
        innerW: geometry.innerW,
        woodThick,
        xNorm: rod.xNorm,
      });
      const rodLen = Math.max(0.05, (rodSegment ? rodSegment.width : geometry.innerW) - 0.06);
      const rodCenterX = rodSegment ? rodSegment.centerX : geometry.centerX;
      const rodPid = `${boxPid}_rod_${String(rod.id ?? ri)}`;
      const rodMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, rodLen, 12), rodMat);
      if (rodMesh.rotation) rodMesh.rotation.z = Math.PI / 2;
      rodMesh.position?.set?.(rodCenterX, rodY, geometry.innerBackZ + geometry.innerD / 2);
      rodMesh.userData = rodMesh.userData || {};
      rodMesh.userData.partId = rodPid;
      rodMesh.userData.__wpType = 'sketchRod';
      group.add?.(rodMesh);
    }
  }
}
