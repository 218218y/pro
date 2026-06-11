// Native Builder Door Visuals (ESM) — Mirror
//
// Owns the mirror-door construction path (wood backing + one-or-many mirror placements).
// Kept separate so the canonical `createDoorVisual(...)` seam stays readable.

import { createCanvasViaPlatform } from '../runtime/platform_access.js';
import { getCacheBag } from '../runtime/cache_access.js';
import { readMirrorLayoutFaceSign, resolveMirrorPlacementListInRect } from '../features/mirror_layout.js';
import { __asCanvas, __markMirrorTracked } from './visuals_and_contents_shared.js';

import type { AppContainer, MirrorLayoutList, Object3DLike, ThreeLike } from '../../../types/index.js';
import type { CanvasLike } from './visuals_and_contents_shared.js';

type AddOutlinesFn = (mesh: Object3DLike) => void;

type MirrorDoorVisualArgs = {
  App: AppContainer;
  THREE: ThreeLike;
  w: number;
  h: number;
  thickness: number;
  mat: unknown;
  baseMaterial: unknown | null;
  zSign: number;
  isSketch: boolean;
  mirrorLayout: MirrorLayoutList | null;
  addOutlines: AddOutlinesFn;
};

function getOrCreateSketchPatternCanvas(App: AppContainer, _THREE: ThreeLike): CanvasLike | null {
  // Cache on the runtime cache bag to avoid re-drawing the pattern for every mirror placement.
  // (We still create per-marking textures because texture repeat differs per placement.)
  const cache = getCacheBag(App);
  const key = '__wpDoorMirrorSketchPatternCanvas';
  const existing = __asCanvas(cache[key]);
  if (existing) return existing;

  const canvas = __asCanvas(createCanvasViaPlatform(App, 128, 128));
  if (!canvas) return null;
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, 128, 128);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let j = -128; j < 256; j += 30) {
      ctx.moveTo(j, 0);
      ctx.lineTo(j + 128, 128);
    }
    ctx.stroke();
  } catch {
    // If drawing fails, skip caching and let callers continue without sketch markings.
    return null;
  }

  try {
    if (cache) cache[key] = canvas;
  } catch {
    // ignore
  }
  return canvas;
}

type MirrorDoorDepthLayout = {
  baseDoorThick: number;
  mirrorThick: number;
  adhesiveGap: number;
  mirrorCenterZ: number;
  mirrorFrontZ: number;
};

function resolveMirrorDoorDepthLayout(thickness: number): MirrorDoorDepthLayout {
  const baseDoorThick = Math.max(0.002, thickness);
  const mirrorThick = Math.max(0.002, Math.min(0.004, baseDoorThick * 0.35));
  const adhesiveGap = Math.max(0.0006, Math.min(0.0012, mirrorThick * 0.3));
  const mirrorCenterZ = baseDoorThick / 2 + adhesiveGap + mirrorThick / 2;
  const mirrorFrontZ = baseDoorThick / 2 + adhesiveGap + mirrorThick;
  return { baseDoorThick, mirrorThick, adhesiveGap, mirrorCenterZ, mirrorFrontZ };
}

export function createMirrorDoorVisual(args: MirrorDoorVisualArgs): Object3DLike {
  const { App, THREE, w, h, thickness, mat, baseMaterial, zSign, isSketch, mirrorLayout, addOutlines } = args;

  const visualGroup = new THREE.Group();
  const woodMat = baseMaterial || new THREE.MeshStandardMaterial({ color: 0xe0e0e0 });
  const depthLayout = resolveMirrorDoorDepthLayout(thickness);
  const placementLayouts = Array.isArray(mirrorLayout) && mirrorLayout.length ? mirrorLayout : [null];
  const placements = resolveMirrorPlacementListInRect({
    rect: { minX: -w / 2, maxX: w / 2, minY: -h / 2, maxY: h / 2 },
    layouts: placementLayouts,
  });

  const woodMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, depthLayout.baseDoorThick), woodMat);
  woodMesh.position.z = 0;
  if (typeof addOutlines === 'function') addOutlines(woodMesh);
  visualGroup.add(woodMesh);

  // Sketch-only: a subtle diagonal pattern overlay to distinguish mirrors.
  const sketchCanvas = isSketch ? getOrCreateSketchPatternCanvas(App, THREE) : null;

  for (let i = 0; i < placements.length; i += 1) {
    const placement = placements[i];
    const placementLayout = i < placementLayouts.length ? placementLayouts[i] : null;
    const placementFaceSign = readMirrorLayoutFaceSign(placementLayout, zSign);
    const mirrorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(placement.mirrorWidthM, placement.mirrorHeightM, depthLayout.mirrorThick),
      mat
    );
    mirrorMesh.userData = mirrorMesh.userData || {};
    mirrorMesh.userData.__keepMaterial = true;
    mirrorMesh.userData.__wpMirrorSurface = true;
    mirrorMesh.position.set(
      placement.offsetX,
      placement.offsetY,
      depthLayout.mirrorCenterZ * placementFaceSign
    );
    visualGroup.add(mirrorMesh);

    // Track mirror surfaces for fast reflection updates (avoids full scene traversal on each frame).
    try {
      __markMirrorTracked(App, mirrorMesh);
    } catch {
      // Best-effort only.
    }

    if (sketchCanvas) {
      try {
        const tex = new THREE.CanvasTexture(sketchCanvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(
          Math.max(0.25, placement.mirrorWidthM * 3),
          Math.max(0.25, placement.mirrorHeightM * 3)
        );

        const markGeo = new THREE.PlaneGeometry(placement.mirrorWidthM, placement.mirrorHeightM);
        const markMat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
        });
        const marking = new THREE.Mesh(markGeo, markMat);
        marking.userData = marking.userData || {};
        marking.userData.__keepMaterial = true;

        const markingFaceSign = readMirrorLayoutFaceSign(placementLayout, zSign);
        marking.position.set(
          placement.offsetX,
          placement.offsetY,
          (depthLayout.mirrorFrontZ + 0.001) * markingFaceSign
        );
        visualGroup.add(marking);
      } catch {
        // ignore sketch markings
      }
    }
  }

  return visualGroup;
}
