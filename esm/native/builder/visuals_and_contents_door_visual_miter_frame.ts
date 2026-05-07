import {
  createDoorVisualCacheKey,
  getCachedDoorVisualGeometry,
  getCachedDoorVisualMaterial,
} from './visuals_and_contents_door_visual_cache.js';
import { DOOR_VISUAL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { ShapeRuntimeLike } from './visuals_and_contents_shared.js';
import type { AppContainer, Object3DLike, ThreeLike } from '../../../types/index.js';
import type { TagDoorVisualPartFn } from './visuals_and_contents_door_visual_support_contracts.js';

function createSeamLineMaterial(args: { App: AppContainer; THREE: ThreeLike; isSketch: boolean }) {
  const { App, THREE, isSketch } = args;
  const lineMat = getCachedDoorVisualMaterial(
    App,
    createDoorVisualCacheKey('door_seam_line_material', [isSketch]),
    () =>
      new THREE.LineBasicMaterial({
        color: isSketch ? 0x000000 : 0x3a3a3a,
        transparent: !isSketch,
        opacity: isSketch ? 1 : 0.18,
        depthWrite: false,
      })
  );
  try {
    lineMat.userData = lineMat.userData || {};
    lineMat.userData.__keepMaterial = true;
  } catch {
    // ignore
  }
  return lineMat;
}

function appendMiterFrameSeamLines(args: {
  App: AppContainer;
  THREE: ThreeLike;
  visualGroup: Object3DLike;
  tagDoorVisualPart: TagDoorVisualPartFn;
  zSign: number;
  outerW: number;
  outerH: number;
  bandW: number;
  faceZ: number;
  isSketch: boolean;
  partPrefix?: string;
}): void {
  const { App, THREE, visualGroup, tagDoorVisualPart, zSign, outerW, outerH, bandW, faceZ, isSketch } = args;
  const partPrefix = args.partPrefix || 'door_frame';
  if (!Number.isFinite(outerW) || !Number.isFinite(outerH) || !Number.isFinite(bandW)) return;
  const miterDims = DOOR_VISUAL_DIMENSIONS.miter;
  const bw = Math.max(
    miterDims.bandMinM,
    Math.min(bandW, outerW / 2 - miterDims.bandEdgeClearanceM, outerH / 2 - miterDims.bandEdgeClearanceM)
  );
  if (!(bw > 0)) return;

  const seamInset = Math.max(miterDims.seamInsetMinM, bw - miterDims.seamInsetBackoffM);
  const seamHalfW = outerW / 2;
  const seamHalfH = outerH / 2;
  const seamZ = faceZ + miterDims.seamZOffsetM * zSign;
  const lineMat = createSeamLineMaterial({ App, THREE, isSketch });

  const addSeam = (x0: number, y0: number, x1: number, y1: number, partId: string) => {
    const g = new THREE.BufferGeometry();
    if (typeof g.setFromPoints === 'function') {
      g.setFromPoints([new THREE.Vector3(x0, y0, seamZ), new THREE.Vector3(x1, y1, seamZ)]);
    }
    const line = new THREE.Line(g, lineMat);
    line.renderOrder = 6;
    tagDoorVisualPart(line, partId);
    visualGroup.add(line);
  };

  addSeam(seamHalfW, seamHalfH, seamHalfW - seamInset, seamHalfH - seamInset, `${partPrefix}_miter_seam_tr`);
  addSeam(
    -seamHalfW,
    seamHalfH,
    -seamHalfW + seamInset,
    seamHalfH - seamInset,
    `${partPrefix}_miter_seam_tl`
  );
  addSeam(
    seamHalfW,
    -seamHalfH,
    seamHalfW - seamInset,
    -seamHalfH + seamInset,
    `${partPrefix}_miter_seam_br`
  );
  addSeam(
    -seamHalfW,
    -seamHalfH,
    -seamHalfW + seamInset,
    -seamHalfH + seamInset,
    `${partPrefix}_miter_seam_bl`
  );
}

export function appendMiterFaceFrameCaps(args: {
  App: AppContainer;
  THREE: ThreeLike;
  visualGroup: Object3DLike;
  tagDoorVisualPart: TagDoorVisualPartFn;
  addOutlines: (mesh: Object3DLike) => void;
  zSign: number;
  outerW: number;
  outerH: number;
  bandW: number;
  faceZ: number;
  material: unknown;
  partPrefix?: string;
  isSketch?: boolean;
  addSeamLines?: boolean;
}): void {
  const {
    App,
    THREE,
    visualGroup,
    tagDoorVisualPart,
    addOutlines,
    zSign,
    outerW,
    outerH,
    bandW,
    faceZ,
    material,
    partPrefix = 'door_frame',
    isSketch = false,
    addSeamLines = false,
  } = args;

  if (!Number.isFinite(outerW) || !Number.isFinite(outerH) || !Number.isFinite(bandW)) return;
  const miterDims = DOOR_VISUAL_DIMENSIONS.miter;
  const bw = Math.max(
    miterDims.bandMinM,
    Math.min(bandW, outerW / 2 - miterDims.bandEdgeClearanceM, outerH / 2 - miterDims.bandEdgeClearanceM)
  );
  if (!(bw > 0)) return;
  const halfW = outerW / 2;
  const halfH = outerH / 2;
  const m = bw;

  const addPoly = (pts: Array<[number, number]>, partId: string) => {
    if (!Array.isArray(pts) || pts.length < 3) return;
    const geometry = getCachedDoorVisualGeometry(
      App,
      createDoorVisualCacheKey(
        'door_miter_face_shape',
        pts.flatMap(([x, y]) => [x, y])
      ),
      () => {
        const shape: ShapeRuntimeLike = new THREE.Shape();
        shape.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
        shape.closePath();
        return new THREE.ShapeGeometry(shape);
      }
    );
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 0, faceZ + miterDims.capSurfaceOffsetM * zSign);
    if (zSign === -1) mesh.rotation.y = Math.PI;
    mesh.renderOrder = 2;
    tagDoorVisualPart(mesh, partId);
    addOutlines(mesh);
    visualGroup.add(mesh);
  };

  addPoly(
    [
      [-halfW, halfH],
      [halfW, halfH],
      [halfW - m, halfH - bw],
      [-halfW + m, halfH - bw],
    ],
    `${partPrefix}_top_miter_cap`
  );
  addPoly(
    [
      [-halfW + m, -halfH + bw],
      [halfW - m, -halfH + bw],
      [halfW, -halfH],
      [-halfW, -halfH],
    ],
    `${partPrefix}_bottom_miter_cap`
  );
  addPoly(
    [
      [-halfW, halfH],
      [-halfW + bw, halfH - m],
      [-halfW + bw, -halfH + m],
      [-halfW, -halfH],
    ],
    `${partPrefix}_left_miter_cap`
  );
  addPoly(
    [
      [halfW - bw, halfH - m],
      [halfW, halfH],
      [halfW, -halfH],
      [halfW - bw, -halfH + m],
    ],
    `${partPrefix}_right_miter_cap`
  );

  if (addSeamLines) {
    appendMiterFrameSeamLines({
      App,
      THREE,
      visualGroup,
      tagDoorVisualPart,
      zSign,
      outerW,
      outerH,
      bandW: bw,
      faceZ,
      isSketch,
      partPrefix,
    });
  }
}

export function appendRoundedMiterDoorFrame(args: {
  App: AppContainer;
  THREE: ThreeLike;
  visualGroup: Object3DLike;
  addOutlines: (mesh: Object3DLike) => void;
  tagDoorVisualPart: TagDoorVisualPartFn;
  zSign: number;
  isSketch: boolean;
  thickness: number;
  mat: unknown;
  outerW: number;
  outerH: number;
  bandW: number;
  roundBulgeScale: number;
  partPrefix?: string;
  zOffset?: number;
}): void {
  const {
    App,
    THREE,
    visualGroup,
    addOutlines,
    tagDoorVisualPart,
    zSign,
    isSketch,
    thickness,
    mat,
    outerW,
    outerH,
    bandW,
    roundBulgeScale,
    partPrefix = 'door_round_frame',
    zOffset = 0,
  } = args;
  if (!Number.isFinite(outerW) || !Number.isFinite(outerH) || !Number.isFinite(bandW)) return;
  const miterDims = DOOR_VISUAL_DIMENSIONS.miter;
  const bw = Math.max(
    miterDims.bandMinM,
    Math.min(bandW, outerW / 2 - miterDims.bandEdgeClearanceM, outerH / 2 - miterDims.bandEdgeClearanceM)
  );
  if (!(bw > 0)) return;
  const halfW = outerW / 2;
  const halfH = outerH / 2;
  const innerHalfW = Math.max(miterDims.bandMinM, halfW - bw);
  const innerHalfH = Math.max(miterDims.bandMinM, halfH - bw);
  if (!(innerHalfW > miterDims.bandMinM) || !(innerHalfH > miterDims.bandMinM)) return;

  const beadDepth = Math.max(
    miterDims.roundedBeadDepthMinM,
    Math.min(
      Math.max(miterDims.bandEdgeClearanceM, thickness * miterDims.roundedBeadThicknessRatio),
      bandW * (miterDims.roundedBeadScaleBase + roundBulgeScale * miterDims.roundedBeadScaleBulgeRatio)
    )
  );
  const bevelSize = Math.max(
    miterDims.roundedBevelSizeMinM,
    Math.min(
      bw * miterDims.roundedBevelSizeBandRatio,
      beadDepth * miterDims.roundedBevelSizeDepthRatio,
      bw / 2 - miterDims.roundedBevelSizeEdgeBackoffM
    )
  );
  const bevelThickness = Math.max(
    miterDims.roundedBevelThicknessMinM,
    Math.min(
      beadDepth *
        (miterDims.roundedBevelThicknessBaseRatio +
          roundBulgeScale * miterDims.roundedBevelThicknessBulgeRatio),
      beadDepth / 2 - miterDims.roundedBevelThicknessDepthBackoffM
    )
  );

  const geo = getCachedDoorVisualGeometry(
    App,
    createDoorVisualCacheKey('door_rounded_miter_frame', [
      outerW,
      outerH,
      bw,
      beadDepth,
      bevelSize,
      bevelThickness,
      roundBulgeScale,
    ]),
    () => {
      const shape = new THREE.Shape();
      shape.moveTo(-halfW, halfH);
      shape.lineTo(halfW, halfH);
      shape.lineTo(halfW, -halfH);
      shape.lineTo(-halfW, -halfH);
      shape.closePath();

      const hole = new THREE.Path();
      hole.moveTo(-innerHalfW, innerHalfH);
      hole.lineTo(-innerHalfW, -innerHalfH);
      hole.lineTo(innerHalfW, -innerHalfH);
      hole.lineTo(innerHalfW, innerHalfH);
      hole.closePath();
      (shape.holes || (shape.holes = [])).push(hole);

      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: beadDepth,
        bevelEnabled: true,
        bevelSize,
        bevelThickness,
        bevelOffset: -Math.min(miterDims.roundedBevelOffsetMaxM, bw * miterDims.roundedBevelOffsetBandRatio),
        bevelSegments: 14,
        steps: 1,
        curveSegments: 16,
      });
      geometry.translate?.(0, 0, -beadDepth / 2);
      return geometry;
    }
  );
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.z = zOffset;
  tagDoorVisualPart(mesh, `${partPrefix}_rounded_ring`);
  addOutlines(mesh);
  visualGroup.add(mesh);

  const outerMiterFaceZ =
    zOffset +
    (beadDepth / 2 +
      Math.max(
        miterDims.roundedOuterFaceZMinM,
        Math.min(
          bevelThickness * miterDims.roundedOuterFaceZBevelRatio,
          beadDepth * miterDims.roundedOuterFaceZDepthRatio
        )
      )) *
      zSign;
  appendMiterFaceFrameCaps({
    App,
    THREE,
    visualGroup,
    tagDoorVisualPart,
    addOutlines,
    zSign,
    outerW,
    outerH,
    bandW: bw,
    faceZ: outerMiterFaceZ,
    material: mat,
    partPrefix,
  });

  try {
    appendMiterFrameSeamLines({
      App,
      THREE,
      visualGroup,
      tagDoorVisualPart,
      zSign,
      outerW,
      outerH,
      bandW: bw,
      faceZ: outerMiterFaceZ,
      isSketch,
      partPrefix,
    });
  } catch {
    // ignore seam lines
  }
}
